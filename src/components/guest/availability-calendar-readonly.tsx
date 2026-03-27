"use client"

import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"

interface AvailabilityCalendarReadonlyProps {
  blockedDateStrings: string[]
  bookingWindowMonths: number
  minStayNights: number
}

export function AvailabilityCalendarReadonly({
  blockedDateStrings,
  bookingWindowMonths,
  minStayNights,
}: AvailabilityCalendarReadonlyProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const windowEnd = new Date(today)
  windowEnd.setMonth(windowEnd.getMonth() + bookingWindowMonths)

  const blockedDates = blockedDateStrings.map(
    (s) => new Date(s + "T00:00:00.000Z")
  )

  return (
    <div>
      <DayPicker
        disabled={[
          { before: today },
          { after: windowEnd },
          ...blockedDates,
        ]}
        modifiers={{ blocked: blockedDates }}
        modifiersClassNames={{
          blocked: "line-through opacity-50",
        }}
      />
      <p className="text-sm text-gray-600 mt-2">
        Minimum stay:{" "}
        {minStayNights} {minStayNights === 1 ? "night" : "nights"}
      </p>
    </div>
  )
}
