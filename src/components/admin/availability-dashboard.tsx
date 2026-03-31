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
import { Input } from "@/components/ui/input"
import { AvailabilityCalendar } from "@/components/admin/availability-calendar"
import { AvailabilitySettingsPanel } from "@/components/admin/availability-settings-panel"
import {
  toggleBlockedDate,
  saveBlockedRange,
} from "@/actions/availability"
import {
  setDatePriceOverride,
  clearDatePriceOverride,
  setRangePriceOverride,
  clearRangePriceOverride,
} from "@/actions/pricing"

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
  priceOverrideMap: Record<string, number>
  baseNightlyRate: number
}

export function AvailabilityDashboard({
  rooms,
  selectedRoom,
  blockedDateStrings,
  priceOverrideMap,
  baseNightlyRate,
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

  // Optimistic local state for price overrides — mirrors localBlockedDates pattern
  const [localPriceOverrides, setLocalPriceOverrides] = useState<Record<string, number>>(
    () => priceOverrideMap
  )

  // Inline edit panel state
  const [popoverDate, setPopoverDate] = useState<string | null>(null)
  const [popoverIsBlocked, setPopoverIsBlocked] = useState(false)
  const [popoverWantsBlocked, setPopoverWantsBlocked] = useState(false)
  const [popoverPriceInput, setPopoverPriceInput] = useState("")

  // Range price input state
  const [showRangePriceInput, setShowRangePriceInput] = useState(false)
  const [rangePriceInput, setRangePriceInput] = useState("")

  function handleRoomChange(value: string) {
    router.push(`/availability?roomId=${value}`)
  }

  function enterRangeMode() {
    setMode("range")
    setRangeStart(undefined)
    setRangeEnd(undefined)
    setError(null)
  }

  function handleRangeSelect(start: Date, end: Date) {
    if (start.getTime() === end.getTime()) return // single tap — let onDayClick handle it
    setMode("range")
    setError(null)
    const from = start <= end ? start : end
    const to = start <= end ? end : start
    setRangeStart(from)
    setRangeEnd(to)
  }

  function exitRangeMode() {
    setMode("single")
    setRangeStart(undefined)
    setRangeEnd(undefined)
    setError(null)
    setShowRangePriceInput(false)
    setRangePriceInput("")
  }

  async function handleDayClick(date: Date, isCurrentlyBlocked: boolean) {
    if (!selectedRoom) return
    const dateStr = toLocalDateString(date)

    // ── Single mode: open inline edit panel instead of immediate toggle ──
    if (mode === "single") {
      const currentOverride = localPriceOverrides[dateStr]
      setPopoverDate(dateStr)
      setPopoverIsBlocked(isCurrentlyBlocked)
      setPopoverWantsBlocked(isCurrentlyBlocked)
      setPopoverPriceInput(currentOverride !== undefined ? String(currentOverride) : "")
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

  async function handlePopoverClose() {
    if (!selectedRoom || !popoverDate) { setPopoverDate(null); return }
    const dateStr = popoverDate
    const priceNum = popoverPriceInput.trim() === "" ? null : Number(popoverPriceInput)
    const isValid = priceNum === null || (!isNaN(priceNum) && priceNum > 0)

    setPopoverDate(null)

    // Handle block toggle if changed
    if (popoverWantsBlocked !== popoverIsBlocked) {
      const date = new Date(dateStr + "T00:00:00")
      const dateTime = date.getTime()
      // Optimistic update
      setLocalBlockedDates((prev) => {
        const exists = prev.some((d) => d.getTime() === dateTime)
        return exists
          ? prev.filter((d) => d.getTime() !== dateTime)
          : [...prev, date]
      })
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
        setError("Failed to save block state. Please try again.")
      } finally {
        setIsSaving(false)
      }
    }

    // Handle price override
    if (isValid) {
      if (priceNum === null) {
        setLocalPriceOverrides(prev => { const next = { ...prev }; delete next[dateStr]; return next })
        setIsSaving(true)
        try { await clearDatePriceOverride(selectedRoom.id, dateStr); router.refresh() }
        catch { setError("Failed to save price. Please try again.") }
        finally { setIsSaving(false) }
      } else {
        setLocalPriceOverrides(prev => ({ ...prev, [dateStr]: priceNum }))
        setIsSaving(true)
        try { await setDatePriceOverride(selectedRoom.id, dateStr, priceNum); router.refresh() }
        catch {
          setLocalPriceOverrides(prev => { const next = { ...prev }; delete next[dateStr]; return next })
          setError("Failed to save price. Please try again.")
        }
        finally { setIsSaving(false) }
      }
    }
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

  async function handleSetRangePrice() {
    if (!selectedRoom || !rangeStart || !rangeEnd) return
    const price = Number(rangePriceInput)
    if (isNaN(price) || price <= 0) return
    const from = rangeStart <= rangeEnd ? rangeStart : rangeEnd
    const to = rangeStart <= rangeEnd ? rangeEnd : rangeStart
    const fromStr = toLocalDateString(from)
    const toStr = toLocalDateString(to)

    // Optimistic update: overwrite all dates in range
    const rangeDates: Record<string, number> = {}
    const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
    const limit = new Date(to.getFullYear(), to.getMonth(), to.getDate())
    while (cursor <= limit) {
      rangeDates[toLocalDateString(cursor)] = price
      cursor.setDate(cursor.getDate() + 1)
    }
    setLocalPriceOverrides(prev => ({ ...prev, ...rangeDates }))

    setShowRangePriceInput(false)
    setRangePriceInput("")
    exitRangeMode()
    setIsSaving(true)
    try {
      await setRangePriceOverride(selectedRoom.id, fromStr, toStr, price)
      router.refresh()
    } catch {
      setLocalPriceOverrides(prev => {
        const next = { ...prev }
        Object.keys(rangeDates).forEach(k => delete next[k])
        return next
      })
      setError("Failed to save range price. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleClearRangePrice() {
    if (!selectedRoom || !rangeStart || !rangeEnd) return
    const from = rangeStart <= rangeEnd ? rangeStart : rangeEnd
    const to = rangeStart <= rangeEnd ? rangeEnd : rangeStart
    const fromStr = toLocalDateString(from)
    const toStr = toLocalDateString(to)

    // Build list of dateKeys to remove from local state
    const rangeDateKeys: string[] = []
    const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
    const limit = new Date(to.getFullYear(), to.getMonth(), to.getDate())
    while (cursor <= limit) {
      rangeDateKeys.push(toLocalDateString(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }

    // Optimistic update: remove all overrides in range
    const removed: Record<string, number> = {}
    setLocalPriceOverrides(prev => {
      const next = { ...prev }
      rangeDateKeys.forEach(k => { if (next[k] !== undefined) { removed[k] = next[k]; delete next[k] } })
      return next
    })

    exitRangeMode()
    setIsSaving(true)
    try {
      await clearRangePriceOverride(selectedRoom.id, fromStr, toStr)
      router.refresh()
    } catch {
      // Revert optimistic update on error
      setLocalPriceOverrides(prev => ({ ...prev, ...removed }))
      setError("Failed to clear range price. Please try again.")
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
                  ? "Click any date to edit price or block/unblock"
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
              onRangeSelect={handleRangeSelect}
              rangeStart={mode === "range" ? rangeStart : undefined}
              rangeEnd={mode === "range" ? rangeEnd : undefined}
              isSaving={isSaving}
              priceOverrideMap={localPriceOverrides}
              baseNightlyRate={baseNightlyRate}
            />

            {/* Inline edit panel — rendered below the calendar, not floating */}
            {popoverDate && (
              <div className="mt-3 p-3 border rounded-lg bg-white shadow-sm space-y-3 w-64">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Edit {popoverDate}</span>
                  <button onClick={handlePopoverClose} className="text-xs text-gray-500 hover:text-gray-800">Done</button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Blocked</label>
                  <input
                    type="checkbox"
                    checked={popoverWantsBlocked}
                    onChange={e => setPopoverWantsBlocked(e.target.checked)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Price per night (empty = base rate)</label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder={`${baseNightlyRate} (base rate)`}
                    value={popoverPriceInput}
                    onChange={e => setPopoverPriceInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handlePopoverClose()}
                    className="w-full"
                  />
                </div>
              </div>
            )}

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
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2">
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
                {!showRangePriceInput && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowRangePriceInput(true)}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-sm font-medium rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      Set Range Price
                    </button>
                    <button
                      onClick={handleClearRangePrice}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Clear Range Price
                    </button>
                  </div>
                )}
                {showRangePriceInput && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Price per night"
                      value={rangePriceInput}
                      onChange={e => setRangePriceInput(e.target.value)}
                      className="w-36"
                    />
                    <button
                      onClick={handleSetRangePrice}
                      disabled={isSaving || !rangePriceInput}
                      className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setShowRangePriceInput(false)}
                      className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Settings panel */}
          <div>
            <AvailabilitySettingsPanel key={selectedRoom.id} room={selectedRoom} />
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
