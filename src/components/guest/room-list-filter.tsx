"use client"

import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { DayPicker, type DateRange } from "react-day-picker"
import "react-day-picker/style.css"

export function RoomListFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [range, setRange] = useState<DateRange | undefined>(undefined)
  const [guests, setGuests] = useState<number>(1)

  function updateFilter(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      params.set(key, value)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleRangeSelect(r: DateRange | undefined) {
    setRange(r)
    if (r?.from && r?.to) {
      updateFilter({
        checkin: r.from.toLocaleDateString("en-CA"),
        checkout: r.to.toLocaleDateString("en-CA"),
      })
    }
  }

  function handleGuestsChange(n: number) {
    setGuests(n)
    updateFilter({ guests: String(n) })
  }

  function handleClear() {
    setRange(undefined)
    setGuests(1)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("checkin")
    params.delete("checkout")
    params.delete("guests")
    router.push(`${pathname}?${params.toString()}`)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">
        Filter by dates &amp; guests
      </h2>
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className="flex-1">
          <DayPicker
            mode="range"
            selected={range}
            onSelect={handleRangeSelect}
            disabled={[{ before: today }]}
          />
        </div>
        <div className="flex flex-col gap-3 md:pt-2">
          <div>
            <label
              htmlFor="guests-input"
              className="block text-sm text-gray-600 mb-1"
            >
              Guests
            </label>
            <input
              id="guests-input"
              type="number"
              min={1}
              value={guests}
              onChange={(e) => handleGuestsChange(Number(e.target.value))}
              className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-sm text-gray-500 underline hover:text-gray-700 text-left"
          >
            Clear filters
          </button>
        </div>
      </div>
    </div>
  )
}
