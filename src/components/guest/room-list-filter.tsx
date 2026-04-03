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
  const [open, setOpen] = useState(false)

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
    setOpen(false)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const checkin = searchParams.get("checkin")
  const checkout = searchParams.get("checkout")
  const hasFilter = Boolean(checkin || checkout)

  const filterLabel = checkin && checkout
    ? `${checkin} → ${checkout} · ${guests} guest${guests !== 1 ? "s" : ""}`
    : "Check availability"

  return (
    <div style={{ marginBottom: "2rem", marginTop: "2rem" }}>
      <style>{`
        /* Override DayPicker for dark olive theme */
        .rdp-root {
          --rdp-accent-color: var(--ll-accent) !important;
          --rdp-accent-background-color: rgba(212,149,106,0.15) !important;
          --rdp-range_middle-background-color: rgba(212,149,106,0.12) !important;
          --rdp-range_start-date-background-color: var(--ll-accent) !important;
          --rdp-range_end-date-background-color: var(--ll-accent) !important;
          --rdp-range_start-color: var(--ll-text) !important;
          --rdp-range_end-color: var(--ll-text) !important;
          --rdp-today-color: var(--ll-accent) !important;
          --rdp-disabled-opacity: 0.25 !important;
          --rdp-outside-opacity: 0.3 !important;
          color: var(--ll-text) !important;
          background: transparent !important;
        }
        .rdp-root button {
          color: var(--ll-text) !important;
        }
        .rdp-root button:hover:not(:disabled) {
          background: rgba(212,149,106,0.15) !important;
        }
        .rdp-day_button { border-radius: 6px !important; }
        .rdp-month_caption { color: var(--ll-text) !important; font-size: 0.85rem !important; letter-spacing: 0.06em !important; }
        .rdp-weekday { color: color-mix(in srgb, var(--ll-text) 35%, transparent) !important; font-size: 0.68rem !important; letter-spacing: 0.08em !important; }
        .rdp-nav button { color: var(--ll-text) !important; opacity: 0.6; }
        .rdp-nav button:hover { opacity: 1; background: color-mix(in srgb, var(--ll-text) 6%, transparent) !important; }
        .filter-toggle:hover { border-color: color-mix(in srgb, var(--ll-text) 30%, transparent) !important; }
        .clear-btn:hover { color: var(--ll-text) !important; opacity: 1 !important; }
        .guest-btn:hover { border-color: color-mix(in srgb, var(--ll-text) 40%, transparent) !important; }
      `}</style>

      {/* Toggle button */}
      <button
        type="button"
        className="filter-toggle"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          background: "transparent",
          border: "1px solid color-mix(in srgb, var(--ll-text) 14%, transparent)",
          borderRadius: "9999px",
          padding: "0.6rem 1.4rem",
          color: hasFilter ? "var(--ll-accent)" : "color-mix(in srgb, var(--ll-text) 55%, transparent)",
          fontSize: "0.75rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "border-color 0.2s ease",
        }}
      >
        <span>{open ? "▲" : "▼"}</span>
        <span>{filterLabel}</span>
        {hasFilter && (
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--ll-accent)",
              flexShrink: 0,
            }}
          />
        )}
      </button>

      {/* Expandable panel */}
      {open && (
        <div
          style={{
            marginTop: "0.75rem",
            background: "color-mix(in srgb, var(--ll-text) 4%, transparent)",
            border: "1px solid color-mix(in srgb, var(--ll-text) 8%, transparent)",
            borderRadius: "12px",
            padding: "1.75rem 2rem",
            display: "flex",
            flexDirection: "row",
            gap: "2.5rem",
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          {/* Calendar */}
          <div>
            <div
              style={{
                fontSize: "0.65rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                opacity: 0.4,
                marginBottom: "0.75rem",
              }}
            >
              Select Dates
            </div>
            <DayPicker
              mode="range"
              selected={range}
              onSelect={handleRangeSelect}
              disabled={[{ before: today }]}
            />
          </div>

          {/* Guests + actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", paddingTop: "0.25rem" }}>
            <div>
              <div
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  opacity: 0.4,
                  marginBottom: "0.75rem",
                }}
              >
                Guests
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button
                  type="button"
                  className="guest-btn"
                  onClick={() => handleGuestsChange(Math.max(1, guests - 1))}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    border: "1px solid color-mix(in srgb, var(--ll-text) 20%, transparent)",
                    background: "transparent",
                    color: "var(--ll-text)",
                    fontSize: "1.1rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "border-color 0.2s ease",
                  }}
                >
                  −
                </button>
                <span style={{ fontSize: "1rem", fontWeight: 600, minWidth: "1.5rem", textAlign: "center" }}>
                  {guests}
                </span>
                <button
                  type="button"
                  className="guest-btn"
                  onClick={() => handleGuestsChange(guests + 1)}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    border: "1px solid color-mix(in srgb, var(--ll-text) 20%, transparent)",
                    background: "transparent",
                    color: "var(--ll-text)",
                    fontSize: "1.1rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "border-color 0.2s ease",
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {hasFilter && (
              <button
                type="button"
                className="clear-btn"
                onClick={handleClear}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "color-mix(in srgb, var(--ll-text) 40%, transparent)",
                  fontSize: "0.72rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  textAlign: "left",
                  padding: 0,
                  transition: "opacity 0.2s ease",
                }}
              >
                ✕ Clear filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
