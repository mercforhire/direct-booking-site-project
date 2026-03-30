/**
 * Format a Date for human-readable display in Eastern Time.
 * Use for email template date props ONLY — not for DB storage or YYYY-MM-DD serialization.
 *
 * Example output: "Fri, May 1, 2026"
 */
export function formatDateET(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
