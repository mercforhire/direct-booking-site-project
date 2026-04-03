/**
 * Airbnb Multicalendar Price Scraper
 * 
 * Scrapes per-day nightly rates from the host's Airbnb multicalendar page
 * and syncs them to the direct booking site's DatePriceOverride table.
 * 
 * Each landlord has their own Airbnb account and saved session.
 * 
 * Usage:
 *   npx tsx scripts/sync-airbnb-prices.ts leon --login   # Log in to Leon's Airbnb account
 *   npx tsx scripts/sync-airbnb-prices.ts henry --login  # Log in to Henry's Airbnb account
 *   npx tsx scripts/sync-airbnb-prices.ts leon            # Sync Leon's room prices
 *   npx tsx scripts/sync-airbnb-prices.ts henry           # Sync Henry's room prices
 *   npx tsx scripts/sync-airbnb-prices.ts all             # Sync all landlords with saved sessions
 */

import { chromium, type BrowserContext } from 'playwright'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// ── Load .env.local ────────────────────────────────────────

try {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath) && !process.env.DATABASE_URL) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  }
} catch {}

const prisma = new PrismaClient()

const SESSIONS_DIR = path.join(process.cwd(), '.airbnb-sessions')
const DELAY_BETWEEN_LISTINGS_MS = 3000
const YEAR = parseInt(process.env.YEAR || String(new Date().getFullYear()))
const MAX_MONTHS_AHEAD = parseInt(process.env.MAX_MONTHS || '3')

interface ListingMapping {
  airbnbId: string
  roomId: string
  roomName: string
}

// ── Cookie management (per landlord) ───────────────────────

function cookiePath(slug: string): string {
  return path.join(SESSIONS_DIR, `${slug}.json`)
}

async function saveCookies(context: BrowserContext, slug: string) {
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true })
  const cookies = await context.cookies()
  fs.writeFileSync(cookiePath(slug), JSON.stringify(cookies, null, 2))
  console.log(`✓ Saved ${cookies.length} cookies for "${slug}"`)
}

async function loadCookies(context: BrowserContext, slug: string): Promise<boolean> {
  const fp = cookiePath(slug)
  if (!fs.existsSync(fp)) return false
  try {
    const cookies = JSON.parse(fs.readFileSync(fp, 'utf8'))
    await context.addCookies(cookies)
    console.log(`✓ Loaded session for "${slug}"`)
    return true
  } catch {
    return false
  }
}

function hasSession(slug: string): boolean {
  return fs.existsSync(cookiePath(slug))
}

// ── Login flow ─────────────────────────────────────────────

async function loginFlow(slug: string) {
  console.log(`🔐 Opening browser — log in to the Airbnb account for "${slug}"`)
  console.log('   1. Log in to the host account')
  console.log('   2. Make sure you can see the calendar page')
  console.log('   3. Press Enter in this terminal when done\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()
  await page.goto('https://www.airbnb.ca/login')

  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve())
  })

  await saveCookies(context, slug)
  await browser.close()
  console.log(`\n✅ Session saved for "${slug}".`)
}

// ── Price extraction ───────────────────────────────────────

async function scrapePricesFromMulticalendar(
  context: BrowserContext,
  mapping: ListingMapping
): Promise<{ date: string; price: number }[]> {
  console.log(`\n📋 ${mapping.roomName} (Airbnb: ${mapping.airbnbId})`)

  const page = await context.newPage()
  const url = `https://www.airbnb.ca/multicalendar/${mapping.airbnbId}/year/${YEAR}`
  console.log(`   Loading ${url}`)

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(5000)
  } catch (err: any) {
    console.log(`   ⚠️  Navigation error: ${err.message?.slice(0, 80)}`)
    await page.close()
    return []
  }

  if (page.url().includes('/login')) {
    console.log('   ❌ Session expired — run with --login to re-authenticate.')
    await page.close()
    return []
  }

  const prices = await page.evaluate((year: number) => {
    const MONTHS: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    }
    const gridcells = document.querySelectorAll('[role="gridcell"]')
    const results: { date: string; price: number }[] = []

    for (const gc of Array.from(gridcells)) {
      const text = gc.textContent || ''
      const monthMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/)
      const dayMatch = text.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})/)
      const priceMatch = text.match(/\$(\d+(?:\.\d+)?)\s*CAD/)

      if (monthMatch && dayMatch && priceMatch) {
        const month = MONTHS[monthMatch[1]]
        const day = parseInt(dayMatch[1])
        const price = parseFloat(priceMatch[1])
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        results.push({ date: dateStr, price })
      }
    }
    return results
  }, YEAR)

  if (prices.length === 0) {
    console.log(`   ⚠️  No prices extracted — listing may be fully booked or page structure changed`)
  }

  await page.close()

  const today = new Date()
  const cutoff = new Date(today)
  cutoff.setMonth(cutoff.getMonth() + MAX_MONTHS_AHEAD)
  const todayStr = today.toISOString().slice(0, 10)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const filtered = prices.filter(
    (p) => p.date >= todayStr && p.date <= cutoffStr && p.price > 0
  )

  console.log(`   ✓ Extracted ${prices.length} total prices, ${filtered.length} in range`)
  return filtered
}

// ── DB write ───────────────────────────────────────────────

async function writePricesToDB(
  roomId: string,
  prices: { date: string; price: number }[]
) {
  if (prices.length === 0) return
  let written = 0
  for (const { date, price } of prices) {
    await prisma.datePriceOverride.upsert({
      where: { roomId_date: { roomId, date: new Date(date + 'T12:00:00.000Z') } },
      update: { price },
      create: { roomId, date: new Date(date + 'T12:00:00.000Z'), price },
    })
    written++
  }
  console.log(`   💾 Wrote ${written} price overrides to DB`)
}

// ── Sync one landlord ──────────────────────────────────────

async function syncLandlord(slug: string) {
  // Load landlord settings to get price multiplier
  const landlord = await prisma.landlord.findFirst({
    where: { slug },
    select: { id: true, name: true },
  })
  if (!landlord) {
    console.log(`\nLandlord "${slug}" not found.`)
    return
  }

  const settings = await prisma.settings.findUnique({
    where: { landlordId: landlord.id },
    select: { priceMultiplier: true },
  })
  const multiplier = settings ? Number(settings.priceMultiplier) : 1.15
  console.log(`\n📊 Price multiplier for "${slug}": ${multiplier}x`)

  const rooms = await prisma.room.findMany({
    where: { isActive: true, landlord: { slug } },
    include: {
      icalSources: true,
      landlord: { select: { name: true } },
    },
  })

  const mappings: ListingMapping[] = []
  for (const room of rooms) {
    for (const source of room.icalSources) {
      const match = source.url.match(/airbnb\.\w+\/calendar\/ical\/(\d+)/)
      if (match) {
        mappings.push({
          airbnbId: match[1],
          roomId: room.id,
          roomName: `${room.landlord.name} — ${room.name}`,
        })
      }
    }
  }

  if (mappings.length === 0) {
    console.log(`No Airbnb-linked rooms found for "${slug}".`)
    return
  }

  console.log(`🔄 Syncing ${mappings.length} listing(s) for "${slug}"...\n`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  })

  const hasCookies = await loadCookies(context, slug)
  if (!hasCookies) {
    console.log(`❌ No saved session for "${slug}". Run: npx tsx scripts/sync-airbnb-prices.ts ${slug} --login`)
    await browser.close()
    return
  }

  for (let i = 0; i < mappings.length; i++) {
    try {
      const prices = await scrapePricesFromMulticalendar(context, mappings[i])
      // Apply price multiplier and round to nearest dollar
      const adjusted = prices.map((p) => ({
        date: p.date,
        price: Math.round(p.price * multiplier),
      }))
      await writePricesToDB(mappings[i].roomId, adjusted)
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message?.slice(0, 100)}`)
    }
    if (i < mappings.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_LISTINGS_MS))
    }
  }

  await browser.close()
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const slug = args.find((a) => !a.startsWith('--'))
  const isLogin = args.includes('--login')

  if (!slug) {
    console.log('Usage:')
    console.log('  npx tsx scripts/sync-airbnb-prices.ts <landlord> --login   # Save Airbnb session')
    console.log('  npx tsx scripts/sync-airbnb-prices.ts <landlord>            # Sync prices')
    console.log('  npx tsx scripts/sync-airbnb-prices.ts all                   # Sync all with sessions')
    console.log('\nExamples:')
    console.log('  npx tsx scripts/sync-airbnb-prices.ts leon --login')
    console.log('  npx tsx scripts/sync-airbnb-prices.ts leon')
    console.log('  npx tsx scripts/sync-airbnb-prices.ts henry --login')
    console.log('  npx tsx scripts/sync-airbnb-prices.ts henry')
    console.log('  npx tsx scripts/sync-airbnb-prices.ts all')
    await prisma.$disconnect()
    return
  }

  if (isLogin) {
    if (slug === 'all') {
      console.log('Cannot use --login with "all". Log in to each landlord separately.')
    } else {
      await loginFlow(slug)
    }
    await prisma.$disconnect()
    return
  }

  if (slug === 'all') {
    // Sync all landlords that have saved sessions
    const landlords = await prisma.landlord.findMany({ select: { slug: true } })
    for (const l of landlords) {
      if (hasSession(l.slug)) {
        await syncLandlord(l.slug)
      } else {
        console.log(`\n⏭️  Skipping "${l.slug}" — no saved session`)
      }
    }
  } else {
    await syncLandlord(slug)
  }

  await prisma.$disconnect()
  console.log('\n✅ Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
