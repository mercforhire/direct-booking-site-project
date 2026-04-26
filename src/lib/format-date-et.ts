/**
 * Format a calendar date (Postgres @db.Date) for human-readable display in emails.
 * Reads the UTC date components — Postgres returns DATE columns as midnight UTC,
 * so any timezone west of UTC (including ET) would render the previous day.
 *
 * Example output: "Fri, May 1, 2026"
 */
export function formatDateET(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
