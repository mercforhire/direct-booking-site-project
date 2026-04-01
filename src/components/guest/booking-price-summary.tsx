"use client"

import type React from "react"
import { useState } from "react"
import type { PriceEstimate } from "@/lib/price-estimate"

interface BookingPriceSummaryProps {
  estimate: PriceEstimate | null
  addOns: Array<{ id: string; name: string; price: number }>
  selectedAddOnIds: string[]
  baseNightlyRate: number
  className?: string
}

export function BookingPriceSummary({
  estimate,
  addOns,
  selectedAddOnIds,
  baseNightlyRate,
  className,
}: BookingPriceSummaryProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const summaryTitle =
    estimate != null
      ? `Estimate — $${estimate.total.toFixed(2)}`
      : "Price estimate"

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    fontSize: "0.8rem",
    color: "rgba(240,235,224,0.65)",
  }

  const priceContent =
    estimate == null ? (
      <p style={{ fontSize: "0.8rem", opacity: 0.4, margin: 0 }}>
        Select dates to see your price breakdown.
      </p>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        {/* Nightly rate */}
        <div style={rowStyle}>
          <span>
            {estimate.nightlyTotal === baseNightlyRate * estimate.nights
              ? `$${baseNightlyRate.toFixed(2)} \u00d7 ${estimate.nights} ${estimate.nights === 1 ? "night" : "nights"}`
              : `${estimate.nights} ${estimate.nights === 1 ? "night" : "nights"} (per-day pricing)`}
          </span>
          <span>${estimate.nightlyTotal.toFixed(2)}</span>
        </div>

        {/* Cleaning fee */}
        <div style={rowStyle}>
          <span>Cleaning fee</span>
          <span>${estimate.cleaningFee.toFixed(2)}</span>
        </div>

        {/* Extra guest fee — only when applicable */}
        {estimate.extraGuestTotal > 0 && (
          <div style={rowStyle}>
            <span>Extra guest fee</span>
            <span>${estimate.extraGuestTotal.toFixed(2)}</span>
          </div>
        )}

        {/* Selected add-ons */}
        {addOns
          .filter((a) => selectedAddOnIds.includes(a.id))
          .map((a) => (
            <div key={a.id} style={rowStyle}>
              <span>{a.name}</span>
              <span>${a.price.toFixed(2)}</span>
            </div>
          ))}

        {/* Deposit */}
        <div style={rowStyle}>
          <span>Deposit</span>
          <span>${estimate.depositAmount.toFixed(2)}</span>
        </div>

        {/* Service fee */}
        <div style={rowStyle}>
          <span>Service fee ({estimate.serviceFeePercent}%)</span>
          <span>${estimate.serviceFee.toFixed(2)}</span>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "0.25rem 0" }} />

        {/* Total */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontSize: "0.92rem",
            fontWeight: 600,
            color: "#f0ebe0",
          }}
        >
          <span>Total estimate</span>
          <span style={{ color: "#d4956a" }}>${estimate.total.toFixed(2)}</span>
        </div>

        <p style={{ fontSize: "0.68rem", opacity: 0.35, margin: "0.1rem 0 0", lineHeight: 1.5 }}>
          Final price confirmed by Leon at approval
        </p>
      </div>
    )

  return (
    <div
      className={["border rounded-lg p-4", className].filter(Boolean).join(" ")}
      style={{ padding: "1.25rem" }}
    >
      {/* Mobile toggle — hidden on desktop */}
      <button
        type="button"
        className="w-full text-left md:hidden flex items-center justify-between select-none"
        style={{
          fontSize: "0.78rem",
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: "inherit",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
        onClick={() => setMobileOpen((o) => !o)}
      >
        <span>{summaryTitle}</span>
        <span
          style={{
            fontSize: "0.65rem",
            opacity: 0.4,
            transition: "transform 0.2s ease",
            transform: mobileOpen ? "rotate(180deg)" : "none",
            display: "inline-block",
          }}
        >
          &#9660;
        </span>
      </button>

      {/* Content: always visible on desktop, toggled on mobile */}
      <div className={["md:block", mobileOpen ? "block" : "hidden md:block"].join(" ")}
        style={{ paddingTop: "0.75rem" }}
      >
        {priceContent}
      </div>
    </div>
  )
}
