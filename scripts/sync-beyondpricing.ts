/**
 * Beyond Pricing Calendar Scraper
 * 
 * Scrapes per-day nightly rates from Beyond Pricing's dashboard calendar
 * and syncs them to the direct booking site's DatePriceOverride table.
 * 
 * Runs in visible browser mode (Beyond Pricing sessions don't survive
 * headless cookie replay).
 * 
 * Usage:
 *   npx tsx scripts/sync-beyondpricing.ts          # Scrape all mapped listings
 *   npx tsx scripts/sync-beyondpricing.ts --dry-run # Show prices without writing to DB
 */

import { chromium, type Page } from 'playwright'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// ── Load .env.local ────────────────────────────────────────

try {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
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
      process.env[key] = val
    }
  }
} catch {}

const prisma = new PrismaClient()

const DELAY_BETWEEN_MONTHS_MS = 4000
const DELAY_BETWEEN_LISTINGS_MS = 3000
const INITIAL_LOAD_TIMEOUT_MS = 30000
const MAX_MONTHS_AHEAD = parseInt(process.env.MAX_MONTHS || '6')
const DRY_RUN = process.argv.includes('--dry-run')
// Optional positional landlord-name filter. Matches the leading word before "—" in BP_MAPPINGS labels.
// e.g.  npx tsx scripts/sync-beyondpricing.ts ryan
const LANDLORD_FILTER = process.argv.slice(2).find((a) => !a.startsWith('-'))?.toLowerCase()

// ── Beyond Pricing listing ID → Room ID mapping ───────────
// Add new mappings here as listings are added to Beyond Pricing

const BP_MAPPINGS: { bpId: string; roomId: string; label: string }[] = [
  // Leon's (9 Highhill Dr)
  { bpId: '2898094', roomId: 'cmn7yb9pe0000vn0m9exir75a', label: 'Leon — Master bedroom (Room 1)' },
  { bpId: '2898101', roomId: 'cmn957tym0000vnd2zh5cd6y3', label: 'Leon — Studio room (Room 4)' },
  { bpId: '2898103', roomId: 'cmn959y9n000vvnd2mj24b37m', label: 'Leon — 2 rooms dining area (Room 5+6)' },
  { bpId: '2898111', roomId: 'cmn93z48x0002vni3udz1j7on', label: 'Leon — Cozy room (Room 3)' },
  // Henry's (18 Logandale Rd)
  { bpId: '3248251', roomId: 'cmnh1tr8w0001vnz2z5r5yfy7', label: 'Henry — Sofa room (Room 0)' },
  { bpId: '3307999', roomId: 'cmnh1tre50003vnz2ruiokvpx', label: 'Henry — Ensuite washroom (Room 1)' },
  { bpId: '3308388', roomId: 'cmnh1trgi0005vnz2ffnyo17g', label: 'Henry — Private washroom (Room 2)' },
  { bpId: '3394525', roomId: 'cmnh1triv0007vnz2ssnn7o4c', label: 'Henry — Basement Ensuite (Room 3)' },
  { bpId: '3248293', roomId: 'cmnh1trnf0009vnz26x63rsgh', label: 'Henry — 2 Bedrooms Combo (Room 1+2)' },
  // Jane's (8 Allenbury / Don Mills)
  { bpId: '3171069', roomId: 'cmnhvghsy0001vn9zs9zr3tt8', label: 'Jane — 2nd floor Room 1' },
  { bpId: '4209382', roomId: 'cmnhvghyg0003vn9zozanyvio', label: 'Jane — Room 2 (monthly)' },
  { bpId: '3173635', roomId: 'cmnhvgi2g0005vn9zmv72r4q6', label: 'Jane — 2nd floor Room 3' },
  { bpId: '4209704', roomId: 'cmnhvgi4s0007vn9zymeru0tt', label: 'Jane — Room 4 (monthly)' },
  { bpId: '4500408', roomId: 'cmnhvgi700009vn9zn3a6bl4j', label: 'Jane — Room 5 (monthly)' },
  { bpId: '2898201', roomId: 'cmnhvgi9c000bvn9zu2qde9ez', label: 'Jane — Room 6' },
  // Anna's (339 Byng / Bayview)
  { bpId: '4427268', roomId: 'cmnii27n50001vnn949rkgye4', label: 'Anna — Cozy Trip R2' },
  { bpId: '4428366', roomId: 'cmnii28az0004vnn9tckggqvu', label: 'Anna — Cozy Trip R5' },
  { bpId: '4427439', roomId: 'cmnii28n00007vnn9ng6ofunr', label: 'Anna — Family Trip B1' },
  { bpId: '4427440', roomId: 'cmnii28zm000avnn9iuu6jkdz', label: 'Anna — Romance Trip B2' },
  { bpId: '4427438', roomId: 'cmo10y8k50001lh04bk2cbzn9', label: 'Anna — Ensuite R1' },
  // Kelly's (124 New Forest / Kennedy)
  { bpId: '4223348', roomId: 'cmnjimczz0001vnanznfw7cwb', label: 'Kelly — Family 2 Beds /1' },
  { bpId: '4209833', roomId: 'cmnjimdxj0006vnandlbkxx2c', label: "Kelly — Couple's Room /3" },
  { bpId: '4247644', roomId: 'cmnjimec40009vnanyjw0xly5', label: 'Kelly — Ensuite Room /4' },
  { bpId: '4223349', roomId: 'cmnjimeqp000cvnanirnhhrxd', label: 'Kelly — Basement Suite' },
  // Rose's (302 Cook Rd / York U)
  { bpId: '4286592', roomId: 'cmnjtb0as0001vn9adr5sz4gz', label: 'Rose — 0C Cozy ensuite' },
  { bpId: '4210625', roomId: 'cmnjtb0zv0004vn9alm2f4fin', label: 'Rose — 0B Cozy ensuite' },
  { bpId: '4275995', roomId: 'cmnjtb1e80007vn9abmjktv46', label: 'Rose — 1A Ensuite' },
  { bpId: '4209363', roomId: 'cmnjtb1pz000avn9arxotexn0', label: 'Rose — 2B Ensuite' },
  { bpId: '4273195', roomId: 'cmnjtb21z000dvn9ayzlempud', label: 'Rose — 2D Sofa room' },
  { bpId: '4209361', roomId: 'cmnjtb2e1000gvn9a0pxyy1s4', label: 'Rose — 2C Cozy room' },
  { bpId: '4209362', roomId: 'cmnjtb2qm000jvn9am5r0h513', label: 'Rose — 3E Ensuite top floor' },
  // Ryan's (7 Margaret Ave / Don Mills)
  { bpId: '4504762', roomId: 'cmp976b3s0001vnz9q6azo2t9', label: 'Ryan — 2nd floor Ensuite (Room 1)' },
  { bpId: '4448042', roomId: 'cmp976bpw0004vnz9rq3bgyds', label: 'Ryan — 1st floor (Room 3)' },
  { bpId: '4442767', roomId: 'cmp976c6m0007vnz9db52ba23', label: 'Ryan — Basement A (Room 4)' },
  { bpId: '4440356', roomId: 'cmp976cnm000bvnz9m9bfrqwo', label: 'Ryan — Basement B (Room 5)' },
  { bpId: '4442769', roomId: 'cmp976d5i000fvnz90yvwhubj', label: 'Ryan — Basement Combo (A+B)' },
]

// ── Price extraction ───────────────────────────────────────

async function waitForCalendarReady(page: Page, timeoutMs: number): Promise<boolean> {
  // Wait for day cells to appear
  try {
    await page.waitForSelector('[data-day]', { timeout: timeoutMs })
  } catch {
    return false
  }

  // Then wait for at least some prices to populate inside those cells
  try {
    await page.waitForFunction(
      () => {
        const cells = document.querySelectorAll('[data-day]')
        let withPrice = 0
        for (const cell of Array.from(cells)) {
          if (/\$\d+/.test(cell.textContent || '')) withPrice++
        }
        return withPrice >= 3
      },
      { timeout: timeoutMs, polling: 500 }
    )
    return true
  } catch {
    return false
  }
}

async function extractMonthPrices(page: Page): Promise<{ date: string; price: number }[]> {
  return await page.evaluate(() => {
    const results: { date: string; price: number }[] = []
    const dayCells = document.querySelectorAll('[data-day]')

    for (const cell of Array.from(dayCells)) {
      const dateStr = cell.getAttribute('data-day')
      if (!dateStr) continue

      // Price is inside a child div — extract $ amount from cell text
      const text = cell.textContent || ''
      const priceMatch = text.match(/\$(\d+)/)
      if (priceMatch) {
        results.push({ date: dateStr, price: parseInt(priceMatch[1], 10) })
      }
    }

    return results
  })
}

async function clickMonth(page: Page, monthLabel: string): Promise<boolean> {
  try {
    const clicked = await page.evaluate((label) => {
      const upper = label.toUpperCase()
      const els = document.querySelectorAll('div, span, button, a')
      for (const el of Array.from(els)) {
        const text = el.textContent?.trim().toUpperCase() || ''
        // Match if text equals the label, or starts with it (handles "APR\n" etc.)
        if ((text === upper || text === upper + '\n') && el.clientHeight > 0 && el.clientWidth < 100) {
          ;(el as HTMLElement).click()
          return true
        }
      }
      // Fallback: look for elements whose innerText (not textContent) matches
      for (const el of Array.from(els)) {
        const inner = (el as HTMLElement).innerText?.trim().toUpperCase() || ''
        if (inner === upper && el.clientHeight > 0 && el.clientWidth < 100) {
          ;(el as HTMLElement).click()
          return true
        }
      }
      return false
    }, monthLabel)
    return clicked
  } catch {
    return false
  }
}

async function scrapeListing(
  page: Page,
  bpId: string,
  label: string
): Promise<{ date: string; price: number }[]> {
  console.log(`\n📋 ${label} (BP: ${bpId})`)

  await page.goto(`https://v2.beyondpricing.com/dashboard/pricing/${bpId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })

  if (page.url().includes('/login')) {
    console.log('   ❌ Session expired')
    return []
  }

  // Wait for the calendar to actually render with prices populated
  const ready = await waitForCalendarReady(page, INITIAL_LOAD_TIMEOUT_MS)
  if (!ready) {
    console.log('   ⚠️  Calendar did not load in time — skipping')
    return []
  }
  // Extra settle time so all visible prices finish rendering
  await page.waitForTimeout(1500)

  const allPrices: { date: string; price: number }[] = []

  // Extract prices from the initially loaded month first
  const initialPrices = await extractMonthPrices(page)
  allPrices.push(...initialPrices)
  console.log(`   Initial load: ${initialPrices.length} prices`)

  // Get current month name from the calendar
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const now = new Date()
  const startMonth = now.getMonth() // 0-indexed

  for (let offset = 1; offset < MAX_MONTHS_AHEAD; offset++) {
    const monthIdx = (startMonth + offset) % 12
    const monthLabel = MONTHS[monthIdx]

    // Click the month in the sidebar — retry briefly in case the UI is still settling
    let clicked = false
    for (let attempt = 0; attempt < 3; attempt++) {
      clicked = await clickMonth(page, monthLabel)
      if (clicked) break
      await page.waitForTimeout(1500)
    }
    if (!clicked) {
      console.log(`   ⚠️  Could not click month ${monthLabel}`)
      continue
    }

    // Wait for the new month's prices to render before extracting
    const ready = await waitForCalendarReady(page, DELAY_BETWEEN_MONTHS_MS * 3)
    if (!ready) {
      console.log(`   ⚠️  ${monthLabel} did not finish loading`)
      continue
    }
    await page.waitForTimeout(800)

    // Extract prices for this month
    const monthPrices = await extractMonthPrices(page)
    allPrices.push(...monthPrices)
    console.log(`   ${monthLabel}: ${monthPrices.length} prices`)
  }

  // Deduplicate by date (in case of overlap)
  const seen = new Map<string, number>()
  for (const p of allPrices) {
    seen.set(p.date, p.price)
  }

  const today = now.toISOString().slice(0, 10)
  const filtered = [...seen.entries()]
    .filter(([date]) => date >= today)
    .map(([date, price]) => ({ date, price }))
    .sort((a, b) => a.date.localeCompare(b.date))

  console.log(`   ✓ ${filtered.length} unique future prices`)
  return filtered
}

// ── DB write ───────────────────────────────────────────────

async function writePricesToDB(
  roomId: string,
  prices: { date: string; price: number }[]
) {
  if (prices.length === 0) return

  // Get landlord's price multiplier
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { landlord: { select: { id: true } } },
  })
  if (!room) return

  const settings = await prisma.settings.findUnique({
    where: { landlordId: room.landlord.id },
    select: { priceMultiplier: true },
  })
  const multiplier = settings ? Number(settings.priceMultiplier) : 1.15

  let written = 0
  for (const { date, price } of prices) {
    const adjustedPrice = Math.round(price * multiplier)
    await prisma.datePriceOverride.upsert({
      where: { roomId_date: { roomId, date: new Date(date + 'T12:00:00.000Z') } },
      update: { price: adjustedPrice },
      create: { roomId, date: new Date(date + 'T12:00:00.000Z'), price: adjustedPrice },
    })
    written++
  }

  console.log(`   💾 Wrote ${written} prices (×${multiplier} multiplier)`)
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  const mappings = LANDLORD_FILTER
    ? BP_MAPPINGS.filter((m) => m.label.toLowerCase().startsWith(LANDLORD_FILTER + ' '))
    : BP_MAPPINGS

  if (mappings.length === 0) {
    console.log(`No mappings match landlord filter "${LANDLORD_FILTER}".`)
    return
  }

  const filterNote = LANDLORD_FILTER ? ` (filtered to "${LANDLORD_FILTER}")` : ''
  console.log(`🔄 Beyond Pricing sync — ${mappings.length} listings${filterNote}, ${MAX_MONTHS_AHEAD} months ahead`)
  if (DRY_RUN) console.log('   (dry run — no DB writes)\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  })

  const page = await context.newPage()
  console.log('🔐 Log in to Beyond Pricing, then press Enter.\n')
  await page.goto('https://v2.beyondpricing.com/login')
  await new Promise<void>((resolve) => { process.stdin.once('data', () => resolve()) })

  for (let i = 0; i < mappings.length; i++) {
    const m = mappings[i]
    try {
      const prices = await scrapeListing(page, m.bpId, m.label)

      if (DRY_RUN) {
        prices.slice(0, 5).forEach(p => console.log(`   ${p.date}: $${p.price}`))
        if (prices.length > 5) console.log(`   ... and ${prices.length - 5} more`)
      } else {
        await writePricesToDB(m.roomId, prices)
      }
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message}`)
    }

    if (i < mappings.length - 1) {
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
