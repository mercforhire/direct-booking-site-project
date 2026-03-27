"use client"

import { DayPicker, type DateRange } from "react-day-picker"
import "react-day-picker/style.css"
import { addMonths } from "date-fns"

interface BookingRangePickerProps {
  blockedDateStrings: string[] // ["2025-05-15", ...] — YYYY-MM-DD local dates
  bookingWindowMonths: number
  minStayNights: number
  maxStayNights: number
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}

export function BookingRangePicker({
  blockedDateStrings,
  bookingWindowMonths,
  minStayNights,
  maxStayNights,
  value,
  onChange,
}: BookingRangePickerProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const windowEnd = addMonths(today, bookingWindowMonths)

  // Parse each blocked date string as local midnight — prevents UTC off-by-one
  const blockedDates = blockedDateStrings.map((s) => new Date(s + "T00:00:00"))

  return (
    <DayPicker
      mode="range"
      selected={value}
      onSelect={onChange}
      min={minStayNights}
      max={maxStayNights}
      disabled={[{ before: today }, { after: windowEnd }, ...blockedDates]}
      excludeDisabled
      modifiers={{ blocked: blockedDates }}
      modifiersClassNames={{ blocked: "line-through opacity-50" }}
    />
  )
}
