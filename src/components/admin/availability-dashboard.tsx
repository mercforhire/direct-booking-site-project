"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AvailabilityCalendar } from "@/components/admin/availability-calendar"
import { AvailabilitySettingsPanel } from "@/components/admin/availability-settings-panel"
import {
  toggleBlockedDate,
  saveBlockedRange,
} from "@/actions/availability"

/**
 * Format a Date to a YYYY-MM-DD string using LOCAL timezone.
 * Using toISOString() would convert to UTC first, causing an off-by-one
 * error for users in UTC+ timezones (e.g. midnight Mar 26 in UTC+8 is
 * 4pm Mar 25 UTC, so toISOString gives "2026-03-25").
 */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

type RoomForAvailability = {
  id: string
  name: string
  minStayNights: number
  maxStayNights: number
  bookingWindowMonths: number
}

interface AvailabilityDashboardProps {
  rooms: { id: string; name: string }[]
  selectedRoom: RoomForAvailability | null
  blockedDateStrings: string[]
}

export function AvailabilityDashboard({
  rooms,
  selectedRoom,
  blockedDateStrings,
}: AvailabilityDashboardProps) {
  const router = useRouter()

  // Interaction mode: single-click toggles in default mode; range mode is opt-in
  const [mode, setMode] = useState<"single" | "range">("single")

  // Range state — only used in range mode
  const [rangeStart, setRangeStart] = useState<Date | undefined>(undefined)
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>(undefined)

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Optimistic local state for blocked dates — starts from server-provided list.
  // Parse each YYYY-MM-DD string as LOCAL midnight so that react-day-picker's
  // date comparisons (which operate in local time) highlight the correct day.
  // "2026-03-26T00:00:00" (no Z) is parsed as local midnight by the Date
  // constructor, which is what react-day-picker uses for comparisons.
  const [localBlockedDates, setLocalBlockedDates] = useState<Date[]>(() =>
    blockedDateStrings.map((s) => new Date(s + "T00:00:00"))
  )

  function handleRoomChange(value: string) {
    router.push(`/availability?roomId=${value}`)
  }

  function enterRangeMode() {
    setMode("range")
    setRangeStart(undefined)
    setRangeEnd(undefined)
    setError(null)
  }

  function exitRangeMode() {
    setMode("single")
    setRangeStart(undefined)
    setRangeEnd(undefined)
    setError(null)
  }

  async function handleDayClick(date: Date, isCurrentlyBlocked: boolean) {
    if (!selectedRoom) return
    const dateStr = toLocalDateString(date)

    // ── Single mode: immediate toggle ──────────────────────────────────────
    if (mode === "single") {
      // Optimistic update: toggle this date in local state immediately
      const dateTime = date.getTime()
      setLocalBlockedDates((prev) => {
        const exists = prev.some((d) => d.getTime() === dateTime)
        return exists
          ? prev.filter((d) => d.getTime() !== dateTime)
          : [...prev, date]
      })
      setError(null)
      setIsSaving(true)
      try {
        await toggleBlockedDate(selectedRoom.id, dateStr)
        router.refresh()
      } catch {
        // Revert optimistic update on error
        setLocalBlockedDates((prev) => {
          const exists = prev.some((d) => d.getTime() === dateTime)
          return exists
            ? prev.filter((d) => d.getTime() !== dateTime)
            : [...prev, date]
        })
        setError("Failed to save. Please try again.")
      } finally {
        setIsSaving(false)
      }
      return
    }

    // ── Range mode: two-click state machine ────────────────────────────────
    // No range start yet — set first marker
    if (rangeStart === undefined) {
      setRangeStart(date)
      return
    }

    // rangeStart is set but rangeEnd is not
    // Clicking the same date as rangeStart — clear range start
    if (rangeStart.getTime() === date.getTime()) {
      setRangeStart(undefined)
      setError(null)
      return
    }

    // Different date — set range end
    setRangeEnd(date)
  }

  async function handleBlockRange(block: boolean) {
    if (!selectedRoom || !rangeStart || !rangeEnd) return

    // Ensure from <= to
    const from = rangeStart <= rangeEnd ? rangeStart : rangeEnd
    const to = rangeStart <= rangeEnd ? rangeEnd : rangeStart

    const fromStr = toLocalDateString(from)
    const toStr = toLocalDateString(to)

    // Build the full list of dates in the range (inclusive of both ends)
    const rangeDates: Date[] = []
    const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
    const limit = new Date(to.getFullYear(), to.getMonth(), to.getDate())
    while (cursor <= limit) {
      rangeDates.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }

    // Optimistic update
    setLocalBlockedDates((prev) => {
      if (block) {
        const existing = new Set(prev.map((d) => toLocalDateString(d)))
        const toAdd = rangeDates.filter((d) => !existing.has(toLocalDateString(d)))
        return [...prev, ...toAdd]
      } else {
        const toRemove = new Set(rangeDates.map((d) => toLocalDateString(d)))
        return prev.filter((d) => !toRemove.has(toLocalDateString(d)))
      }
    })

    setError(null)
    setIsSaving(true)
    exitRangeMode()
    try {
      await saveBlockedRange(selectedRoom.id, fromStr, toStr, block)
      router.refresh()
    } catch {
      // Revert optimistic update on error
      setLocalBlockedDates((prev) => {
        if (block) {
          const toRemove = new Set(rangeDates.map((d) => toLocalDateString(d)))
          return prev.filter((d) => !toRemove.has(toLocalDateString(d)))
        } else {
          const existing = new Set(prev.map((d) => toLocalDateString(d)))
          const toAdd = rangeDates.filter((d) => !existing.has(toLocalDateString(d)))
          return [...prev, ...toAdd]
        }
      })
      setError("Failed to save. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (rooms.length === 0) {
    return (
      <div className="text-gray-500 text-sm">
        No active rooms found. Add a room first.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Room selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Room:</label>
        <Select
          value={selectedRoom?.id ?? ""}
          onValueChange={handleRoomChange}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a room" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {selectedRoom ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Calendar + controls */}
          <div>
            {/* Calendar header: range mode toggle button */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">
                {mode === "single"
                  ? "Click any date to toggle blocked / unblocked"
                  : null}
              </div>
              {mode === "single" ? (
                <button
                  onClick={enterRangeMode}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                >
                  Select Range
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Range mode active
                  </span>
                  <button
                    onClick={exitRangeMode}
                    disabled={isSaving}
                    className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel Range
                  </button>
                </div>
              )}
            </div>

            <AvailabilityCalendar
              blockedDates={localBlockedDates}
              occupiedDates={[]}
              onDayClick={handleDayClick}
              rangeStart={mode === "range" ? rangeStart : undefined}
              rangeEnd={mode === "range" ? rangeEnd : undefined}
              isSaving={isSaving}
            />

            {/* Reserved space — always rendered so the calendar never jumps */}
            <div className="min-h-[2rem] mt-2 text-sm text-gray-600">
              {mode === "range" && rangeStart && !rangeEnd && (
                <span className="text-blue-600">
                  Start date selected. Click another date to set the range end.
                </span>
              )}
              {mode === "range" && rangeStart && rangeEnd && (
                <span>
                  Range selected:{" "}
                  <span className="font-medium">
                    {toLocalDateString(rangeStart <= rangeEnd ? rangeStart : rangeEnd)}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {toLocalDateString(rangeStart <= rangeEnd ? rangeEnd : rangeStart)}
                  </span>
                </span>
              )}
            </div>

            {/* Range action buttons — only shown in range mode once both ends set */}
            {mode === "range" && rangeStart && rangeEnd && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => handleBlockRange(true)}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Block Range
                </button>
                <button
                  onClick={() => handleBlockRange(false)}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  Unblock Range
                </button>
                <button
                  onClick={() => {
                    setRangeStart(undefined)
                    setRangeEnd(undefined)
                  }}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Settings panel */}
          <div>
            <AvailabilitySettingsPanel room={selectedRoom} />
          </div>
        </div>
      ) : (
        <div className="text-gray-500 text-sm">
          Select a room to manage availability.
        </div>
      )}
    </div>
  )
}
