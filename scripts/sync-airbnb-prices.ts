/**
 * Airbnb Multicalendar Price Scraper
 * 
 * Scrapes per-day nightly rates from the host's Airbnb multicalendar page
 * (one page load per listing = all 365 days with prices) and syncs them
 * to the direct booking site's DatePriceOverride table.
 * 
 * Authentication: Uses saved browser session cookies. Run with --login
 * the first time to open a visible browser, log in manually, and save cookies.
 * Subsequent runs reuse the saved session automatically.
 * 
 * Usage:
 *   npx tsx scripts/sync-airbnb-prices.ts --login    # First time: log in and save session
 *   npx tsx scripts/sync-airbnb-prices.ts             # Daily: scrape prices using saved session
 *   MAX_LISTINGS=1 npx tsx scripts/sync-airbnb-prices.ts  # Test with 1 listing
 */

import { chromium, type BrowserContext } from 'playwright'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { config } from 'dotenv'

// Load .env.local (Next.js convention) so DATABASE_URL is available
config({ path: '.env.local' })

const prisma = new PrismaClient()

const COOKIES_PATH = path.join(process.cwd(), '.airbnb-session.json')
const DELAY_BETWEEN_LISTINGS_MS = 3000
const MAX_LISTINGS = parseInt(process.env.MAX_LISTINGS || '999')
const YEAR = parseInt(process.env.YEAR || String(new Date().getFullYear()))
const MAX_MONTHS_AHEAD = parseInt(process.env.MAX_MONTHS || '3')

interface ListingMapping {
  airbnbId: string
  roomId: string
  roomName: string
}

// ── Cookie management ──────────────────────────────────────

async function saveCookies(context: BrowserContext) {
  const cookies = await context.cookies()
  fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2))
  console.log(`✓ Saved ${cookies.length} cookies to ${COOKIES_PATH}`)
}

async function loadCookies(context: BrowserContext): Promise<boolean> {
  if (!fs.existsSync(COOKIES_PATH)) return false
  try {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf8'))
    await context.addCookies(cookies)
    console.log(`✓ Loaded ${cookies.length} cookies from saved session`)
    return true
  } catch {
    return false
  }
}

// ── Login flow ─────────────────────────────────────────────

async function loginFlow() {
  console.log('🔐 Opening browser for manual login...')
  console.log('   1. Log in to your Airbnb host account')
  console.log('   2. Once logged in, navigate to any multicalendar page')
  console.log('   3. Press Enter in this terminal when done\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()
  await page.goto('https://www.airbnb.ca/login')

  // Wait for user to press Enter
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve())
  })

  await saveCookies(context)
  await browser.close()
  console.log('\n✅ Session saved. Run without --login to scrape prices.')
}

// ── Price extraction from multicalendar ────────────────────

async function scrapePricesFromMulticalendar(
  context: BrowserContext,
  mapping: ListingMapping
): Promise<{ date: string; price: number }[]> {
  console.log(`\n📋 ${mapping.roomName} (Airbnb: ${mapping.airbnbId})`)

  const page = await context.newPage()
  const url = `https://www.airbnb.ca/multicalendar/${mapping.airbnbId}/year/${YEAR}`
  console.log(`   Loading ${url}`)

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
  } catch (err: any) {
    console.log(`   ⚠️  Navigation error: ${err.message?.slice(0, 80)}`)
    await page.close()
    return []
  }

  // Check if we're redirected to login
  if (page.url().includes('/login')) {
    console.log('   ❌ Session expired — redirected to login. Run with --login to re-authenticate.')
    await page.close()
    return []
  }

  // Extract prices from the calendar grid
  // The multicalendar shows day cells with prices. We need to find
  // the DOM structure and extract date + price pairs.
  const prices = await page.evaluate(() => {
    const results: { date: string; price: number }[] = []

    // Strategy 1: Look for calendar day cells with data attributes and price text
    // Airbnb multicalendar uses td or div cells with date data and price display
    const cells = document.querySelectorAll('[data-testid*="calendar-day"], [data-testid*="day-cell"], td[data-date], [class*="CalendarDay"]')
    
    if (cells.length > 0) {
      cells.forEach((cell) => {
        const dateAttr = cell.getAttribute('data-date') || 
                        cell.getAttribute('data-testid')?.match(/\d{4}-\d{2}-\d{2}/)?.[0]
        const priceText = cell.textContent?.match(/\$(\d+(?:\.\d+)?)/)?.[1]
        if (dateAttr && priceText) {
          results.push({ date: dateAttr, price: parseFloat(priceText) })
        }
      })
    }

    // Strategy 2: Look for aria-label patterns like "April 5, 2026, $87"
    if (results.length === 0) {
      const allElements = document.querySelectorAll('[aria-label]')
      allElements.forEach((el) => {
        const label = el.getAttribute('aria-label') || ''
        // Match patterns like "April 5, 2026, $87" or "Apr 5, $87.87"
        const priceMatch = label.match(/\$(\d+(?:\.\d+)?)/)
        const dateMatch = label.match(/(\w+ \d{1,2},?\s*\d{4})/)
        if (priceMatch && dateMatch) {
          try {
            const d = new Date(dateMatch[1])
            if (!isNaN(d.getTime())) {
              const dateStr = d.toISOString().slice(0, 10)
              results.push({ date: dateStr, price: parseFloat(priceMatch[1]) })
            }
          } catch {}
        }
      })
    }

    // Strategy 3: Search for price spans near date elements
    if (results.length === 0) {
      // Find all elements containing dollar amounts
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      )
      const priceNodes: { text: string; parent: Element }[] = []
      let node
      while ((node = walker.nextNode())) {
        if (node.textContent?.match(/^\$\d+/)) {
          priceNodes.push({ text: node.textContent, parent: node.parentElement! })
        }
      }
      // Report count for debugging
      if (priceNodes.length > 0) {
        (window as any).__priceNodeCount = priceNodes.length
        // Sample a few
        ;(window as any).__priceSamples = priceNodes.slice(0, 5).map(n => ({
          text: n.text,
          parentTag: n.parent.tagName,
          parentClass: n.parent.className?.substring(0, 60),
          ariaLabel: n.parent.closest('[aria-label]')?.getAttribute('aria-label')?.substring(0, 100),
        }))
      }
    }

    return results
  })

  // If strategies 1-3 failed, get debug info
  if (prices.length === 0) {
    const debugInfo = await page.evaluate(() => ({
      priceNodeCount: (window as any).__priceNodeCount || 0,
      priceSamples: (window as any).__priceSamples || [],
      title: document.title,
      url: window.location.href,
      bodyText: document.body.innerText.substring(0, 500),
    }))
    console.log(`   ℹ️  No prices extracted via standard strategies`)
    console.log(`   Title: ${debugInfo.title}`)
    console.log(`   Price nodes found: ${debugInfo.priceNodeCount}`)
    if (debugInfo.priceSamples.length > 0) {
      console.log(`   Samples:`)
      debugInfo.priceSamples.forEach((s: any) => {
        console.log(`     "${s.text}" in <${s.parentTag} class="${s.parentClass}">`)
        if (s.ariaLabel) console.log(`       aria-label: "${s.ariaLabel}"`)
      })
    }
    console.log(`   Body preview: ${debugInfo.bodyText.substring(0, 200)}`)
    
    // Take a screenshot for debugging
    const screenshotPath = path.join(process.cwd(), `debug-multical-${mapping.airbnbId}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: false })
    console.log(`   📸 Screenshot saved: ${screenshotPath}`)
  }

  await page.close()

  // Filter to dates within the configured range
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

// ── Main ───────────────────────────────────────────────────

async function main() {
  const isLogin = process.argv.includes('--login')

  if (isLogin) {
    await loginFlow()
    await prisma.$disconnect()
    return
  }

  // Load room-to-Airbnb mappings from iCal source URLs
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    include: {
      icalSources: true,
      landlord: { select: { name: true } },
    },
  })

  const mappings: ListingMapping[] = []

  // Manual override via env var
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

  // Extract from iCal source URLs
  for (const room of rooms) {
    for (const source of room.icalSources) {
      const match = source.url.match(/airbnb\.\w+\/calendar\/ical\/(\d+)/)
      if (match) {
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

  const toProcess = mappings.slice(0, MAX_LISTINGS)

  if (toProcess.length === 0) {
    console.log('No Airbnb listing mappings found.')
    await prisma.$disconnect()
    return
  }

  console.log(`🔄 Syncing prices for ${toProcess.length} listing(s)...\n`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  })

  const hasCookies = await loadCookies(context)
  if (!hasCookies) {
    console.log('❌ No saved session found. Run with --login first.')
    await browser.close()
    await prisma.$disconnect()
    return
  }

  for (let i = 0; i < toProcess.length; i++) {
    const mapping = toProcess[i]
    try {
      const prices = await scrapePricesFromMulticalendar(context, mapping)
      await writePricesToDB(mapping.roomId, prices)
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message?.slice(0, 100)}`)
    }

    if (i < toProcess.length - 1) {
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
