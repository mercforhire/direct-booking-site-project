/**
 * Airbnb Price Scraper
 * 
 * Scrapes per-day nightly rates from your own Airbnb listings and syncs them
 * to the direct booking site's DatePriceOverride table.
 * 
 * Strategy:
 * 1. Load each listing to get the availability calendar (which dates are available)
 * 2. For each available date, load listing with ?check_in=DATE&check_out=NEXT_DAY
 * 3. Extract "1 night x $XX.XX CAD" from the StaysPdpSections API response
 * 4. Write extracted prices as DatePriceOverride rows via Prisma
 * 
 * Run: npx tsx scripts/sync-airbnb-prices.ts
 * 
 * Note: This scrapes YOUR OWN listings to read prices set by Beyond Pricing.
 * Add reasonable delays between requests to avoid triggering rate limits.
 */

import { chromium, type Page, type BrowserContext } from 'playwright'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Map of Airbnb listing ID → room ID in our database
// This must be configured per landlord
interface ListingMapping {
  airbnbId: string
  roomId: string
  roomName: string
}

const DELAY_BETWEEN_DATES_MS = 1500 // 1.5 seconds between per-date requests
const DELAY_BETWEEN_LISTINGS_MS = 5000 // 5 seconds between listings
const MAX_MONTHS_AHEAD = 3 // Only sync prices for the next 3 months
const MAX_DATES_PER_LISTING = parseInt(process.env.MAX_DATES || '999') // Limit for testing

async function getAvailableDates(
  context: BrowserContext,
  airbnbId: string
): Promise<string[]> {
  const page = await context.newPage()
  let calendarData: any = null

  page.on('response', async (r) => {
    if (r.url().includes('PdpAvailabilityCalendar') && !calendarData) {
      try {
        calendarData = await r.json()
      } catch {}
    }
  })

  await page.goto(`https://www.airbnb.ca/rooms/${airbnbId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  })
  await page.waitForTimeout(3000)
  await page.close()

  const months =
    calendarData?.data?.merlin?.pdpAvailabilityCalendar?.calendarMonths || []

  const today = new Date()
  const cutoff = new Date(today)
  cutoff.setMonth(cutoff.getMonth() + MAX_MONTHS_AHEAD)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const todayStr = today.toISOString().slice(0, 10)

  const available: string[] = []
  for (const m of months) {
    for (const d of m.days) {
      if (
        d.available &&
        d.availableForCheckin &&
        d.calendarDate >= todayStr &&
        d.calendarDate <= cutoffStr
      ) {
        available.push(d.calendarDate)
      }
    }
  }

  return available
}

async function getPriceForDate(
  page: Page,
  airbnbId: string,
  dateStr: string
): Promise<number | null> {
  const nextDay = new Date(dateStr + 'T12:00:00Z')
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const checkout = nextDay.toISOString().slice(0, 10)

  let sectionData: any = null
  const handler = async (r: any) => {
    if (r.url().includes('StaysPdpSections') && !sectionData) {
      try {
        sectionData = await r.json()
      } catch {}
    }
  }
  page.on('response', handler)

  try {
    await page.goto(
      `https://www.airbnb.ca/rooms/${airbnbId}?check_in=${dateStr}&check_out=${checkout}&adults=1`,
      { waitUntil: 'domcontentloaded', timeout: 15000 }
    )
    await page.waitForTimeout(2500)
  } catch {
    page.removeListener('response', handler)
    return null
  }

  page.removeListener('response', handler)

  if (!sectionData) return null

  const str = JSON.stringify(sectionData)

  // Extract: "1 night x $87.87 CAD" → 87.87
  const nightlyMatch = str.match(
    /1 night x \$([\d,.]+)\s*CAD/
  )
  if (nightlyMatch) {
    return parseFloat(nightlyMatch[1].replace(',', ''))
  }

  // Fallback: extract from "description":"1 night × $XX.XX"
  const altMatch = str.match(
    /1 night (?:x|×) \$([\d,.]+)/
  )
  if (altMatch) {
    return parseFloat(altMatch[1].replace(',', ''))
  }

  return null
}

async function syncListingPrices(
  context: BrowserContext,
  mapping: ListingMapping
): Promise<{ date: string; price: number }[]> {
  console.log(`\n📋 ${mapping.roomName} (Airbnb: ${mapping.airbnbId})`)

  // Step 1: Get available dates
  const availableDates = await getAvailableDates(context, mapping.airbnbId)
  console.log(`   ${availableDates.length} available dates in next ${MAX_MONTHS_AHEAD} months`)

  if (availableDates.length === 0) return []

  // Step 2: Get price for each available date
  const page = await context.newPage()
  const prices: { date: string; price: number }[] = []
  let errors = 0
  const datesToProcess = availableDates.slice(0, MAX_DATES_PER_LISTING)

  for (let i = 0; i < datesToProcess.length; i++) {
    const dateStr = datesToProcess[i]
    const price = await getPriceForDate(page, mapping.airbnbId, dateStr)

    if (price !== null) {
      prices.push({ date: dateStr, price })
      process.stdout.write(`   ${dateStr}: $${price}`)
      if ((i + 1) % 5 === 0 || i === datesToProcess.length - 1) {
        process.stdout.write('\n')
      } else {
        process.stdout.write('  |  ')
      }
    } else {
      errors++
      if (errors > 5) {
        console.log(`   ⚠️  Too many errors, stopping this listing`)
        break
      }
    }

    // Rate limit
    if (i < datesToProcess.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_DATES_MS))
    }
  }

  await page.close()
  console.log(`   ✓ Extracted ${prices.length} prices (${errors} errors)`)

  return prices
}

async function writePricesToDB(
  roomId: string,
  prices: { date: string; price: number }[]
) {
  if (prices.length === 0) return

  // Upsert each price override
  let written = 0
  for (const { date, price } of prices) {
    await prisma.datePriceOverride.upsert({
      where: {
        roomId_date: {
          roomId,
          date: new Date(date + 'T12:00:00.000Z'),
        },
      },
      update: { price },
      create: {
        roomId,
        date: new Date(date + 'T12:00:00.000Z'),
        price,
      },
    })
    written++
  }

  console.log(`   💾 Wrote ${written} price overrides to DB`)
}

async function main() {
  // Load room-to-Airbnb mappings from database
  // Rooms that have iCal sources with Airbnb URLs contain the listing ID
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    include: {
      icalSources: true,
      landlord: { select: { name: true } },
    },
  })

  // Build mappings from rooms that have Airbnb listing IDs
  // We'll also accept a manual mapping passed via env or args
  const mappings: ListingMapping[] = []

  // Check for manual mapping in environment: AIRBNB_MAPPINGS=roomId:airbnbId,roomId:airbnbId
  const envMappings = process.env.AIRBNB_MAPPINGS
  if (envMappings) {
    for (const pair of envMappings.split(',')) {
      const [roomId, airbnbId] = pair.trim().split(':')
      const room = rooms.find((r) => r.id === roomId)
      if (room && airbnbId) {
        mappings.push({
          airbnbId,
          roomId,
          roomName: `${room.landlord.name} — ${room.name}`,
        })
      }
    }
  }

  // Also extract from iCal source URLs that contain Airbnb listing IDs
  for (const room of rooms) {
    for (const source of room.icalSources) {
      const match = source.url.match(/airbnb\.\w+\/calendar\/ical\/(\d+)/)
      if (match) {
        // Only add if not already in mappings
        if (!mappings.find((m) => m.roomId === room.id && m.airbnbId === match[1])) {
          mappings.push({
            airbnbId: match[1],
            roomId: room.id,
            roomName: `${room.landlord.name} — ${room.name}`,
          })
        }
      }
    }
  }

  if (mappings.length === 0) {
    console.log('No Airbnb listing mappings found.')
    console.log('Set AIRBNB_MAPPINGS=roomId1:airbnbListingId1,roomId2:airbnbListingId2')
    console.log('Or add iCal sources with Airbnb URLs to rooms in the admin UI.')
    return
  }

  console.log(`🔄 Syncing prices for ${mappings.length} listing(s)...\n`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  })

  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i]
    try {
      const prices = await syncListingPrices(context, mapping)
      await writePricesToDB(mapping.roomId, prices)
    } catch (err) {
      console.error(`   ❌ Error syncing ${mapping.roomName}:`, err)
    }

    if (i < mappings.length - 1) {
      console.log(`   ⏳ Waiting ${DELAY_BETWEEN_LISTINGS_MS / 1000}s before next listing...`)
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_LISTINGS_MS))
    }
  }

  await browser.close()
  await prisma.$disconnect()
  console.log('\n✅ Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
