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

export function AvailabilityCalendar({
  blockedDates,
  occupiedDates,
  onDayClick,
  rangeStart,
  rangeEnd,
  isSaving,
}: AvailabilityCalendarProps) {
  const modifiers = {
    blocked: blockedDates,
    occupied: occupiedDates,
    rangeStart: rangeStart ? [rangeStart] : [],
    rangeEnd: rangeEnd ? [rangeEnd] : [],
  }

  const modifiersClassNames = {
    blocked: "rdp-day-blocked",
    occupied: "rdp-day-occupied",
    rangeStart: "rdp-day-range-start",
    rangeEnd: "rdp-day-range-end",
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
          border-radius: 4px;
        }
        .rdp-day-range-start button:hover,
        .rdp-day-range-end button:hover {
          background-color: #2563eb;
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
