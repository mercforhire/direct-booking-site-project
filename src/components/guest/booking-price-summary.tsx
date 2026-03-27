"use client"

import { useState } from "react"
import { Separator } from "@/components/ui/separator"
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
      ? `Price estimate — $${estimate.total.toFixed(2)}`
      : "Select dates"

  const priceContent =
    estimate == null ? (
      <p className="text-sm text-gray-500">
        Select dates to see price estimate.
      </p>
    ) : (
      <div className="space-y-2 text-sm">
        {/* Nightly rate */}
        <div className="flex justify-between">
          <span>
            ${baseNightlyRate.toFixed(2)} &times; {estimate.nights}{" "}
            {estimate.nights === 1 ? "night" : "nights"}
          </span>
          <span>${estimate.nightlyTotal.toFixed(2)}</span>
        </div>

        {/* Cleaning fee */}
        <div className="flex justify-between">
          <span>Cleaning fee</span>
          <span>${estimate.cleaningFee.toFixed(2)}</span>
        </div>

        {/* Extra guest fee — only when applicable */}
        {estimate.extraGuestTotal > 0 && (
          <div className="flex justify-between">
            <span>Extra guest fee</span>
            <span>${estimate.extraGuestTotal.toFixed(2)}</span>
          </div>
        )}

        {/* Selected add-ons */}
        {addOns
          .filter((a) => selectedAddOnIds.includes(a.id))
          .map((a) => (
            <div key={a.id} className="flex justify-between">
              <span>{a.name}</span>
              <span>${a.price.toFixed(2)}</span>
            </div>
          ))}

        {/* Deposit */}
        <div className="flex justify-between">
          <span>Deposit</span>
          <span>${estimate.depositAmount.toFixed(2)}</span>
        </div>

        {/* Service fee */}
        <div className="flex justify-between">
          <span>Service fee ({estimate.serviceFeePercent}%)</span>
          <span>${estimate.serviceFee.toFixed(2)}</span>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>${estimate.total.toFixed(2)}</span>
        </div>

        <p className="text-xs text-gray-400 mt-1">
          Final price set by landlord at approval
        </p>
      </div>
    )

  return (
    <div
      className={[
        "border rounded-lg p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Mobile toggle — hidden on desktop */}
      <button
        type="button"
        className="w-full text-left md:hidden text-sm font-medium text-gray-800 flex items-center justify-between select-none"
        onClick={() => setMobileOpen((o) => !o)}
      >
        <span>{summaryTitle}</span>
        <span className={["text-gray-400 text-xs transition-transform", mobileOpen ? "rotate-180" : ""].join(" ")}>
          &#9660;
        </span>
      </button>

      {/* Content: always visible on desktop, toggled on mobile */}
      <div className={["md:block pt-3", mobileOpen ? "block" : "hidden md:block"].join(" ")}>
        {priceContent}
      </div>
    </div>
  )
}
