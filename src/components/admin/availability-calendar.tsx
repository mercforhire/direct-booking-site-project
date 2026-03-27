"use client"

import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"

interface AvailabilityCalendarProps {
  blockedDates: Date[]
  occupiedDates: Date[] // Phase 4 placeholder — always [] for now
  onDayClick: (date: Date, isCurrentlyBlocked: boolean) => void
  rangeStart: Date | undefined
  rangeEnd: Date | undefined
  isSaving: boolean
}

/** Returns all dates strictly between two dates (exclusive of both endpoints). */
function getDatesInRange(start: Date, end: Date): Date[] {
  const from = start <= end ? start : end
  const to = start <= end ? end : start
  const dates: Date[] = []
  // Walk from the day after `from` up to the day before `to`
  const cursor = new Date(from)
  cursor.setUTCDate(cursor.getUTCDate() + 1)
  const limit = new Date(to)
  limit.setUTCDate(limit.getUTCDate() - 1)
  while (cursor <= limit) {
    dates.push(new Date(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

export function AvailabilityCalendar({
  blockedDates,
  occupiedDates,
  onDayClick,
  rangeStart,
  rangeEnd,
  isSaving,
}: AvailabilityCalendarProps) {
  const rangeMidDates =
    rangeStart && rangeEnd ? getDatesInRange(rangeStart, rangeEnd) : []

  const modifiers = {
    blocked: blockedDates,
    occupied: occupiedDates,
    rangeStart: rangeStart ? [rangeStart] : [],
    rangeEnd: rangeEnd ? [rangeEnd] : [],
    rangeMid: rangeMidDates,
  }

  const modifiersClassNames = {
    blocked: "rdp-day-blocked",
    occupied: "rdp-day-occupied",
    rangeStart: "rdp-day-range-start",
    rangeEnd: "rdp-day-range-end",
    rangeMid: "rdp-day-range-mid",
  }

  function handleDayClick(date: Date, dayModifiers: Record<string, boolean>) {
    const isBlocked = !!dayModifiers.blocked
    onDayClick(date, isBlocked)
  }

  return (
    <div
      className={isSaving ? "opacity-50 pointer-events-none" : ""}
      aria-busy={isSaving}
    >
      <style>{`
        .rdp-day-blocked button {
          background-color: #ffe4e6;
          color: #9f1239;
          border-radius: 4px;
        }
        .rdp-day-blocked button:hover {
          background-color: #fecdd3;
        }
        .rdp-day-occupied button {
          background-color: #fef3c7;
          color: #92400e;
          border-radius: 4px;
        }
        .rdp-day-range-start button,
        .rdp-day-range-end button {
          background-color: #3b82f6;
          color: white;
          border-radius: 50%;
        }
        .rdp-day-range-start button:hover,
        .rdp-day-range-end button:hover {
          background-color: #2563eb;
        }
        /* Range middle: continuous light-blue band with no border-radius */
        .rdp-day-range-mid {
          background-color: #dbeafe;
        }
        .rdp-day-range-mid button {
          background-color: transparent;
          color: #1e40af;
          border-radius: 0;
          width: 100%;
        }
        .rdp-day-range-mid button:hover {
          background-color: #bfdbfe;
        }
        /* Extend the band to the cell edges so adjacent days connect */
        .rdp-day-range-start {
          background: linear-gradient(to right, transparent 50%, #dbeafe 50%);
        }
        .rdp-day-range-end {
          background: linear-gradient(to left, transparent 50%, #dbeafe 50%);
        }
      `}</style>
      <DayPicker
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
        onDayClick={handleDayClick}
        showOutsideDays={false}
      />
      {isSaving && (
        <p className="text-xs text-gray-500 mt-1 text-center">Saving...</p>
      )}
    </div>
  )
}
