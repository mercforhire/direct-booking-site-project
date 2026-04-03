"use client"

import { useCallback, useRef, useEffect } from "react"
import { DayPicker, type DateRange, type DayButtonProps } from "react-day-picker"
import "react-day-picker/style.css"
import { addMonths } from "date-fns"

interface BookingRangePickerProps {
  blockedDateStrings: string[] // ["2025-05-15", ...] — YYYY-MM-DD local dates
  bookingWindowMonths: number
  minStayNights: number
  maxStayNights: number
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  perDayRates?: Record<string, number>
  baseNightlyRate?: number
}

export function BookingRangePicker({
  blockedDateStrings,
  bookingWindowMonths,
  minStayNights,
  maxStayNights,
  value,
  onChange,
  perDayRates,
  baseNightlyRate,
}: BookingRangePickerProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const windowEnd = addMonths(today, bookingWindowMonths)

  // Parse each blocked date string as local midnight — prevents UTC off-by-one
  const blockedDates = blockedDateStrings.map((s) => new Date(s + "T00:00:00"))

  // Refs keep price data fresh inside the memoised DayButton
  const perDayRatesRef = useRef(perDayRates)
  const baseNightlyRateRef = useRef(baseNightlyRate)
  useEffect(() => { perDayRatesRef.current = perDayRates }, [perDayRates])
  useEffect(() => { baseNightlyRateRef.current = baseNightlyRate }, [baseNightlyRate])

  const DayButton = useCallback(({ children, modifiers: _m, day, ...props }: DayButtonProps) => {
    const date = day.date
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    const dateKey = `${y}-${m}-${d}`

    const isBlocked = !!_m.blocked || !!_m.disabled
    const base = baseNightlyRateRef.current
    const override = perDayRatesRef.current?.[dateKey]
    const displayPrice = override ?? base

    return (
      <button {...props}>
        {children}
        {!isBlocked && displayPrice !== undefined && (
          <span
            style={{
              display: "block",
              fontSize: "9px",
              lineHeight: 1.2,
              fontWeight: override !== undefined ? 600 : 400,
              color: override !== undefined ? "#d4956a" : "rgba(240,235,224,0.35)",
            }}
          >
            ${displayPrice}
          </span>
        )}
      </button>
    )
  }, [])

  // Build a Set for fast blocked-date lookup
  const blockedSet = new Set(blockedDateStrings)

  // Custom range selection handler:
  // - Blocked dates can be selected as checkout (guest leaves that morning)
  // - Blocked dates cannot be selected as checkin
  // - Ranges cannot span across blocked nights
  const handleSelect = useCallback(
    (range: DateRange | undefined) => {
      if (!range) {
        onChange(undefined)
        return
      }

      const { from, to } = range

      // If only a start date is being selected (first click), reject if blocked
      if (from && !to) {
        const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`
        if (blockedSet.has(fromStr)) {
          // Don't allow blocked date as checkin
          onChange(undefined)
          return
        }
        onChange({ from, to: undefined })
        return
      }

      // Both from and to are set — validate the range
      if (from && to) {
        // Check that no blocked night exists between checkin (inclusive) and checkout (exclusive)
        const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
        const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
        while (cursor < end) {
          const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
          if (blockedSet.has(dateStr)) {
            // Blocked night in range — reject
            onChange(undefined)
            return
          }
          cursor.setDate(cursor.getDate() + 1)
        }
        // Valid range — checkout day can be blocked (guest leaves that morning)
        onChange({ from, to })
        return
      }

      onChange(range)
    },
    [blockedSet, onChange]
  )

  return (
    <DayPicker
      mode="range"
      selected={value}
      onSelect={handleSelect}
      min={minStayNights}
      max={maxStayNights}
      disabled={[{ before: today }, { after: windowEnd }]}
      modifiers={{ blocked: blockedDates }}
      modifiersClassNames={{ blocked: "line-through opacity-50" }}
      components={{ DayButton }}
    />
  )
}
