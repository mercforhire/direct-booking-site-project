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
  const [rangeStart, setRangeStart] = useState<Date | undefined>(undefined)
  const [rangeEnd, setRangeEnd] = useState<Date | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const blockedDates = blockedDateStrings.map(
    (s) => new Date(s + "T00:00:00.000Z")
  )

  function handleRoomChange(value: string) {
    router.push(`/availability?roomId=${value}`)
  }

  async function handleDayClick(date: Date, isCurrentlyBlocked: boolean) {
    if (!selectedRoom) return
    const dateStr = date.toISOString().slice(0, 10)

    // Both range markers set — clicking resets range and toggles single date
    if (rangeStart !== undefined && rangeEnd !== undefined) {
      setRangeStart(undefined)
      setRangeEnd(undefined)
      setError(null)
      setIsSaving(true)
      try {
        await toggleBlockedDate(selectedRoom.id, dateStr)
        router.refresh()
      } catch {
        setError("Failed to save. Please try again.")
      } finally {
        setIsSaving(false)
      }
      return
    }

    // No range start yet — set first marker
    if (rangeStart === undefined) {
      setRangeStart(date)
      return
    }

    // rangeStart is set but rangeEnd is not
    // Clicking the same date as rangeStart — clear range and toggle
    if (rangeStart.getTime() === date.getTime()) {
      setRangeStart(undefined)
      setError(null)
      setIsSaving(true)
      try {
        await toggleBlockedDate(selectedRoom.id, dateStr)
        router.refresh()
      } catch {
        setError("Failed to save. Please try again.")
      } finally {
        setIsSaving(false)
      }
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

    const fromStr = from.toISOString().slice(0, 10)
    const toStr = to.toISOString().slice(0, 10)

    setError(null)
    setIsSaving(true)
    try {
      await saveBlockedRange(selectedRoom.id, fromStr, toStr, block)
      router.refresh()
      setRangeStart(undefined)
      setRangeEnd(undefined)
    } catch {
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

      {/* Range action buttons */}
      {rangeStart && rangeEnd && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Range selected:{" "}
            <span className="font-medium">
              {(rangeStart <= rangeEnd ? rangeStart : rangeEnd)
                .toISOString()
                .slice(0, 10)}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {(rangeStart <= rangeEnd ? rangeEnd : rangeStart)
                .toISOString()
                .slice(0, 10)}
            </span>
          </span>
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

      {rangeStart && !rangeEnd && (
        <div className="text-sm text-blue-600">
          First date selected. Click another date to set the range end.
        </div>
      )}

      {selectedRoom ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Calendar */}
          <div>
            <AvailabilityCalendar
              blockedDates={blockedDates}
              occupiedDates={[]}
              onDayClick={handleDayClick}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              isSaving={isSaving}
            />
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
