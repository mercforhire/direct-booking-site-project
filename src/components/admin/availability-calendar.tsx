"use client"

import { useRef, useCallback, useEffect } from "react"
import { DayPicker, type DayButtonProps } from "react-day-picker"
import "react-day-picker/style.css"

interface AvailabilityCalendarProps {
  blockedDates: Date[]
  occupiedDates: Date[] // Phase 4 placeholder — always [] for now
  onDayClick: (date: Date, isCurrentlyBlocked: boolean) => void
  onRangeSelect?: (start: Date, end: Date) => void
  rangeStart: Date | undefined
  rangeEnd: Date | undefined
  isSaving: boolean
  // NEW:
  priceOverrideMap: Record<string, number>
  baseNightlyRate: number
}

/** Returns all dates strictly between two dates (exclusive of both endpoints). */
function getDatesInRange(start: Date, end: Date): Date[] {
  const from = start <= end ? start : end
  const to = start <= end ? end : start
  const dates: Date[] = []
  // Use local date constructor and setDate to avoid UTC-offset drift
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1)
  const limit = new Date(to.getFullYear(), to.getMonth(), to.getDate() - 1)
  while (cursor <= limit) {
    dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export function AvailabilityCalendar({
  blockedDates,
  occupiedDates,
  onDayClick,
  onRangeSelect,
  rangeStart,
  rangeEnd,
  isSaving,
  priceOverrideMap,
  baseNightlyRate,
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

  // Drag state — refs to avoid re-renders during drag
  const isDragging = useRef(false)
  const dragStart = useRef<Date | null>(null)
  const dragEnd = useRef<Date | null>(null)

  // Refs to keep priceOverrideMap and baseNightlyRate fresh inside the DayButton useCallback
  const priceOverrideMapRef = useRef(priceOverrideMap)
  const baseNightlyRateRef = useRef(baseNightlyRate)
  useEffect(() => { priceOverrideMapRef.current = priceOverrideMap }, [priceOverrideMap])
  useEffect(() => { baseNightlyRateRef.current = baseNightlyRate }, [baseNightlyRate])

  const handleDragStart = useCallback((date: Date) => {
    isDragging.current = true
    dragStart.current = date
    dragEnd.current = date
    onRangeSelect?.(date, date)
  }, [onRangeSelect])

  const handleDragMove = useCallback((date: Date) => {
    if (!isDragging.current || !dragStart.current) return
    if (dragEnd.current?.getTime() === date.getTime()) return
    dragEnd.current = date
    onRangeSelect?.(dragStart.current, date)
  }, [onRangeSelect])

  const handleDragEnd = useCallback(() => {
    isDragging.current = false
    // dragStart/dragEnd already committed via onRangeSelect during move
  }, [])

  // Custom DayButton that adds drag + touch handlers and price badge
  const DayButton = useCallback(({ children, modifiers: _m, day, ...props }: DayButtonProps) => {
    const date = day.date

    function onMouseDown(e: React.MouseEvent<HTMLButtonElement>) {
      if (e.button !== 0) return
      e.preventDefault()
      handleDragStart(date)
    }

    function onMouseEnter() {
      handleDragMove(date)
    }

    function onMouseUp() {
      handleDragEnd()
    }

    function onTouchStart(e: React.TouchEvent<HTMLButtonElement>) {
      e.preventDefault()
      handleDragStart(date)
    }

    function onTouchMove(e: React.TouchEvent<HTMLButtonElement>) {
      if (!isDragging.current) return
      const touch = e.touches[0]
      const el = document.elementFromPoint(touch.clientX, touch.clientY)
      const btn = el?.closest("button[data-drag-date]")
      const dateStr = btn?.getAttribute("data-drag-date")
      if (dateStr) handleDragMove(new Date(dateStr + "T00:00:00"))
    }

    function onTouchEnd() {
      handleDragEnd()
    }

    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    const dateKey = `${y}-${m}-${d}`

    const isBlocked = !!_m.blocked
    const overridePrice = priceOverrideMapRef.current[dateKey]
    const displayPrice = overridePrice ?? baseNightlyRateRef.current

    return (
      <button
        {...props}
        data-drag-date={dateKey}
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
        {!isBlocked && (
          <span className={
            overridePrice !== undefined
              ? "block text-[9px] font-semibold text-blue-600 leading-tight"
              : "block text-[9px] text-gray-400 leading-tight"
          }>
            ${displayPrice}
          </span>
        )}
      </button>
    )
  }, [handleDragStart, handleDragMove, handleDragEnd])

  function handleDayClick(date: Date, dayModifiers: Record<string, boolean>) {
    // Suppress click if it was the end of a drag (start !== end)
    if (dragStart.current && dragEnd.current &&
        dragStart.current.getTime() !== dragEnd.current.getTime()) {
      dragStart.current = null
      dragEnd.current = null
      return
    }
    dragStart.current = null
    dragEnd.current = null
    const isBlocked = !!dayModifiers.blocked
    onDayClick(date, isBlocked)
  }

  return (
    <div
      className={isSaving ? "opacity-50 pointer-events-none select-none" : "select-none"}
      aria-busy={isSaving}
      onMouseLeave={() => { isDragging.current = false }}
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
        components={{ DayButton }}
      />
      {isSaving && (
        <p className="text-xs text-gray-500 mt-1 text-center">Saving...</p>
      )}
    </div>
  )
}
