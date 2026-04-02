/**
 * Pure iCal parser for extracting blocked date ranges from .ics content.
 *
 * Handles Airbnb-style iCal exports with:
 *  - DATE-only values:    DTSTART;VALUE=DATE:20260405
 *  - DateTime values:     DTSTART:20260405T140000Z
 *  - DTEND exclusive per RFC 5545 (DTSTART:Apr5, DTEND:Apr10 = Apr 5–9)
 *  - All SUMMARY values treated equally (Reserved, Not available, etc.)
 */

/** Extract all blocked dates from iCal content as sorted YYYY-MM-DD strings. */
export function parseIcalDates(icsContent: string): string[] {
  const dates = new Set<string>();

  // Split into VEVENT blocks
  const eventBlocks = extractVEvents(icsContent);

  for (const block of eventBlocks) {
    const dtstart = parseDateProp(block, "DTSTART");
    const dtend = parseDateProp(block, "DTEND");

    if (!dtstart) continue;

    // If no DTEND, treat as single-day event
    const end = dtend ?? addDays(dtstart, 1);

    // Expand range: DTSTART inclusive, DTEND exclusive
    let current = dtstart;
    while (current < end) {
      dates.add(formatDate(current));
      current = addDays(current, 1);
    }
  }

  return [...dates].sort();
}

/** Extract raw VEVENT text blocks from iCal content. */
function extractVEvents(ics: string): string[] {
  const blocks: string[] = [];
  // Unfold line continuations per RFC 5545 §3.1
  const unfolded = ics.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  let inEvent = false;
  let current: string[] = [];

  for (const line of lines) {
    if (line.trim() === "BEGIN:VEVENT") {
      inEvent = true;
      current = [];
    } else if (line.trim() === "END:VEVENT") {
      if (inEvent) blocks.push(current.join("\n"));
      inEvent = false;
    } else if (inEvent) {
      current.push(line);
    }
  }

  return blocks;
}

/**
 * Parse a DTSTART or DTEND property from a VEVENT block.
 *
 * Handles formats:
 *   DTSTART;VALUE=DATE:20260405
 *   DTSTART:20260405T140000Z
 *   DTSTART:20260405
 *   DTSTART;TZID=US/Eastern:20260405T140000
 */
function parseDateProp(block: string, prop: "DTSTART" | "DTEND"): Date | null {
  // Match the property line — property name followed by optional params then colon then value
  const regex = new RegExp(`^${prop}[;:](.*)$`, "m");
  const match = block.match(regex);
  if (!match) return null;

  const raw = match[1];
  // Extract value after the last colon (handles ;VALUE=DATE:20260405 and ;TZID=...:20260405T...)
  const colonIdx = raw.lastIndexOf(":");
  const value = colonIdx >= 0 ? raw.substring(colonIdx + 1).trim() : raw.trim();

  return parseDateValue(value);
}

/**
 * Parse a date value string into a UTC midnight Date.
 *
 * 20260405          → April 5, 2026 UTC
 * 20260405T140000Z  → April 5, 2026 UTC (time discarded — we only need the date)
 * 20260405T140000   → April 5, 2026 UTC (local time treated as date-only)
 */
function parseDateValue(value: string): Date | null {
  // Extract YYYYMMDD from the start
  const dateMatch = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!dateMatch) return null;

  const year = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10) - 1; // 0-indexed
  const day = parseInt(dateMatch[3], 10);

  // Use UTC to avoid timezone drift
  return new Date(Date.UTC(year, month, day));
}

/** Add days to a date (returns new Date). */
function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** Format a Date as YYYY-MM-DD. */
function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
