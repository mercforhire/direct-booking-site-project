/**
 * Beyond Pricing Listing Discovery
 *
 * Enumerates every listing on the Beyond Pricing account with its listing ID
 * and name, so sync-beyondpricing.ts mappings can be diffed against reality.
 *
 * Opens a visible browser. If the saved session is stale, log in manually —
 * the script polls for a successful login rather than waiting on stdin.
 *
 * Usage:
 *   npx tsx scripts/list-beyondpricing-listings.ts
 */

import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const SESSION_FILE = path.join(process.cwd(), '.airbnb-sessions', 'beyondpricing.json')
const OUT_FILE = path.join(process.cwd(), '.bp-listings.json')
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000

async function main() {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
  })

  if (fs.existsSync(SESSION_FILE)) {
    try {
      await context.addCookies(JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')))
      console.log('✓ Loaded saved Beyond Pricing session')
    } catch {
      console.log('⚠️  Saved session unreadable — manual login needed')
    }
  }

  const page = await context.newPage()
  await page.goto('https://v2.beyondpricing.com/dashboard', { waitUntil: 'domcontentloaded', timeout: 60000 })

  // Poll for login instead of blocking on stdin
  const deadline = Date.now() + LOGIN_TIMEOUT_MS
  let announced = false
  while (Date.now() < deadline) {
    if (!page.url().includes('/login') && !page.url().includes('/signin')) break
    if (!announced) {
      console.log('\n🔐 Session expired. Log in to Beyond Pricing in the open browser window.')
      console.log('   Waiting up to 5 minutes...\n')
      announced = true
    }
    await page.waitForTimeout(2000)
  }
  if (page.url().includes('/login') || page.url().includes('/signin')) {
    console.log('❌ Still not logged in — aborting.')
    await browser.close()
    process.exit(1)
  }
  console.log(`✓ Logged in — at ${page.url()}`)

  // Save the refreshed session for later runs
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true })
  fs.writeFileSync(SESSION_FILE, JSON.stringify(await context.cookies(), null, 2))
  console.log('✓ Saved refreshed session')

  await page.waitForTimeout(4000)

  // Strategy 1: Beyond Pricing's own API, called from page context so auth applies
  let listings: { id: string; name: string }[] = []
  const apiCandidates = [
    'https://api.beyondpricing.com/v1/listings?limit=500',
    'https://api.beyondpricing.com/v1/listings',
    '/api/listings',
  ]
  for (const url of apiCandidates) {
    try {
      const data: any = await page.evaluate(async (u) => {
        const r = await fetch(u, { credentials: 'include' })
        if (!r.ok) return { __err: r.status }
        return await r.json()
      }, url)
      if (data && !data.__err) {
        const arr = Array.isArray(data) ? data : data.data || data.listings || data.results || []
        if (Array.isArray(arr) && arr.length) {
          listings = arr
            .map((l: any) => ({
              id: String(l.id ?? l.listingId ?? l.listing_id ?? ''),
              name: String(l.title ?? l.name ?? l.nickname ?? l.listingName ?? '(unnamed)'),
            }))
            .filter((l) => l.id)
          if (listings.length) {
            console.log(`✓ Found ${listings.length} listings via API: ${url}`)
            break
          }
        }
      }
    } catch {}
  }

  // Strategy 2: scrape the listings page DOM for /dashboard/pricing/<id> links
  if (!listings.length) {
    console.log('… API route did not work, scraping the listings page instead')
    for (const url of [
      'https://v2.beyondpricing.com/dashboard/listings',
      'https://v2.beyondpricing.com/dashboard',
    ]) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForTimeout(6000)
      // Scroll to force lazy-loaded rows to render
      for (let i = 0; i < 12; i++) {
        await page.evaluate(() => window.scrollBy(0, 1200))
        await page.waitForTimeout(600)
      }
      const found = await page.evaluate(() => {
        const out: { id: string; name: string }[] = []
        const seen = new Set<string>()
        for (const a of Array.from(document.querySelectorAll('a[href*="/pricing/"]'))) {
          const href = (a as HTMLAnchorElement).getAttribute('href') || ''
          const m = href.match(/\/pricing\/(\d+)/)
          if (!m || seen.has(m[1])) continue
          seen.add(m[1])
          const row = a.closest('tr, li, [role="row"]') || a
          const name = (row.textContent || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120)
          out.push({ id: m[1], name: name || '(unnamed)' })
        }
        return out
      })
      if (found.length) {
        listings = found
        console.log(`✓ Scraped ${found.length} listings from ${url}`)
        break
      }
    }
  }

  if (!listings.length) {
    console.log('❌ Could not enumerate listings. Leaving the browser open for 60s to inspect.')
    await page.waitForTimeout(60000)
  } else {
    console.log('\n=== BEYOND PRICING LISTINGS ===')
    for (const l of listings) console.log(`${l.id}\t${l.name}`)
    fs.writeFileSync(OUT_FILE, JSON.stringify(listings, null, 2))
    console.log(`\n💾 Wrote ${listings.length} listings to ${OUT_FILE}`)
  }

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
