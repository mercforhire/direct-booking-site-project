"use client"

import { useState, useMemo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { DateRange } from "react-day-picker"
import { differenceInDays } from "date-fns"
import { bookingSchema, type BookingFormValues } from "@/lib/validations/booking"
import { calculatePriceEstimate } from "@/lib/price-estimate"
import { submitBooking } from "@/actions/booking"
import { BookingRangePicker } from "@/components/guest/booking-range-picker"
import { BookingPriceSummary } from "@/components/guest/booking-price-summary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox" // shadcn checkbox (Radix based)
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import SignOutButton from "@/components/guest/sign-out-button"

interface BookingFormRoom {
  id: string
  name: string
  baseNightlyRate: number
  cleaningFee: number
  extraGuestFee: number
  baseGuests: number
  maxGuests: number
  bookingWindowMonths: number
  minStayNights: number
  maxStayNights: number
  addOns: Array<{ id: string; name: string; price: number }>
}

interface BookingFormSettings {
  serviceFeePercent: number
  depositAmount: number
}

interface BookingFormProps {
  room: BookingFormRoom
  settings: BookingFormSettings
  blockedDateStrings: string[]
  perDayRates?: Record<string, number>
  defaultCheckin?: string
  defaultCheckout?: string
  defaultGuests?: number
  isLoggedIn?: boolean
  prefillData?: { name: string; email: string; phone: string }
  guestUserId?: string
}

export function BookingForm({
  room,
  settings,
  blockedDateStrings,
  perDayRates,
  defaultCheckin,
  defaultCheckout,
  defaultGuests = 1,
  isLoggedIn = false,
  prefillData,
  guestUserId,
}: BookingFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema) as any,
    defaultValues: {
      roomId: room.id,
      checkin: defaultCheckin ?? "",
      checkout: defaultCheckout ?? "",
      numGuests: defaultGuests,
      selectedAddOnIds: [],
      noteToLandlord: "",
      guestName: prefillData?.name ?? "",
      guestEmail: prefillData?.email ?? "",
      guestPhone: prefillData?.phone ?? "",
      estimatedTotal: 0,
      createAccount: false,
      password: "",
      guestUserId: guestUserId ?? "",
    },
  })

  // Watch all fields used for live pricing and validation
  const checkin = watch("checkin")
  const checkout = watch("checkout")
  const numGuests = watch("numGuests")
  const selectedAddOnIds = watch("selectedAddOnIds")
  const createAccount = watch("createAccount")

  // Compute DateRange for the range picker from the RHF string fields
  const dateRangeValue: DateRange | undefined =
    checkin && checkout
      ? {
          from: new Date(checkin + "T00:00:00"),
          to: new Date(checkout + "T00:00:00"),
        }
      : checkin
        ? { from: new Date(checkin + "T00:00:00"), to: undefined }
        : undefined

  // Handle DateRange change — sync back to RHF string fields
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setValue(
      "checkin",
      range?.from ? range.from.toLocaleDateString("en-CA") : ""
    )
    setValue("checkout", range?.to ? range.to.toLocaleDateString("en-CA") : "")
  }

  // Live price estimate
  const estimate = useMemo(() => {
    return calculatePriceEstimate({
      checkin: checkin || undefined,
      checkout: checkout || undefined,
      numGuests,
      selectedAddOnIds,
      addOns: room.addOns,
      baseNightlyRate: room.baseNightlyRate,
      cleaningFee: room.cleaningFee,
      extraGuestFee: room.extraGuestFee,
      baseGuests: room.baseGuests,
      serviceFeePercent: settings.serviceFeePercent,
      depositAmount: settings.depositAmount,
      perDayRates,
    })
  }, [
    checkin,
    checkout,
    numGuests,
    selectedAddOnIds,
    room.addOns,
    room.baseNightlyRate,
    room.cleaningFee,
    room.extraGuestFee,
    room.baseGuests,
    settings.serviceFeePercent,
    settings.depositAmount,
    perDayRates,
  ])

  // Keep estimatedTotal in sync with the live estimate
  useEffect(() => {
    setValue("estimatedTotal", estimate?.total ?? 0)
  }, [estimate, setValue])

  // Submit button disabled logic
  const isSubmitDisabled = useMemo(() => {
    if (isSubmitting) return true
    if (!checkin || !checkout) return true

    const checkinDate = new Date(checkin + "T00:00:00")
    const checkoutDate = new Date(checkout + "T00:00:00")
    const nights = differenceInDays(checkoutDate, checkinDate)

    if (nights <= 0) return true
    if (nights < room.minStayNights || nights > room.maxStayNights) return true

    // Check booking window
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const windowEnd = new Date(today)
    windowEnd.setMonth(windowEnd.getMonth() + room.bookingWindowMonths)
    if (checkinDate < today || checkoutDate > windowEnd) return true

    // Check for blocked dates within range (checkin inclusive, checkout exclusive)
    const blockedSet = new Set(blockedDateStrings)
    const cursor = new Date(checkinDate)
    while (cursor < checkoutDate) {
      const dateStr = cursor.toLocaleDateString("en-CA")
      if (blockedSet.has(dateStr)) return true
      cursor.setDate(cursor.getDate() + 1)
    }

    return false
  }, [
    isSubmitting,
    checkin,
    checkout,
    room.minStayNights,
    room.maxStayNights,
    room.bookingWindowMonths,
    blockedDateStrings,
  ])

  const onSubmit = async (data: BookingFormValues) => {
    setSubmitError(null)
    const result = await submitBooking(data)
    // submitBooking calls redirect() on success — Next.js throws internally.
    // If we reach here, it returned an error object.
    if (result && "error" in result) {
      setSubmitError("There was a problem submitting your request. Please try again.")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Top-level submit error */}
      {submitError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left column — form fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Section 1: Dates + guests */}
          <section className="bk-section">
            <div className="bk-section-label">Step 1</div>
            <h2>Dates &amp; guests</h2>
            <BookingRangePicker
              blockedDateStrings={blockedDateStrings}
              bookingWindowMonths={room.bookingWindowMonths}
              minStayNights={room.minStayNights}
              maxStayNights={room.maxStayNights}
              value={dateRangeValue}
              onChange={handleDateRangeChange}
              perDayRates={perDayRates}
              baseNightlyRate={room.baseNightlyRate}
            />
            <div style={{ marginTop: "1rem", maxWidth: "200px" }}>
              <Label htmlFor="numGuests">
                Number of guests
              </Label>
              <Input
                id="numGuests"
                type="number"
                min={1}
                max={room.maxGuests}
                style={{ marginTop: "0.35rem" }}
                {...register("numGuests", { valueAsNumber: true })}
              />
              {errors.numGuests && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.numGuests.message}
                </p>
              )}
            </div>
          </section>

          {/* Section 2: Add-ons */}
          {room.addOns.length > 0 && (
            <section className="bk-section">
              <div className="bk-section-label">Optional</div>
              <h2>Add-ons</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {room.addOns.map((addOn) => {
                  const isChecked = selectedAddOnIds.includes(addOn.id)
                  return (
                    <div
                      key={addOn.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.6rem 0.75rem",
                        borderRadius: "8px",
                        background: isChecked ? "rgba(212,149,106,0.08)" : "transparent",
                        border: `1px solid ${isChecked ? "color-mix(in srgb, var(--ll-accent) 30%, transparent)" : "color-mix(in srgb, var(--ll-text) 6%, transparent)"}`,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Checkbox
                        id={`addon-${addOn.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked: boolean | "indeterminate") => {
                          if (checked === true) {
                            setValue("selectedAddOnIds", [...selectedAddOnIds, addOn.id])
                          } else {
                            setValue("selectedAddOnIds", selectedAddOnIds.filter((id) => id !== addOn.id))
                          }
                        }}
                      />
                      <Label
                        htmlFor={`addon-${addOn.id}`}
                        style={{ cursor: "pointer", flex: 1, margin: 0 }}
                      >
                        {addOn.name}
                      </Label>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: addOn.price === 0 ? "color-mix(in srgb, var(--ll-accent) 80%, transparent)" : "color-mix(in srgb, var(--ll-text) 55%, transparent)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {addOn.price === 0 ? "Free" : `+$${addOn.price.toFixed(2)}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Section 3: Note to landlord */}
          <section className="bk-section">
            <div className="bk-section-label">Optional</div>
            <h2>Note to landlord</h2>
            <Textarea
              placeholder="Any questions or special requests?"
              style={{ minHeight: "90px" }}
              {...register("noteToLandlord")}
            />
          </section>

          {/* Section 4: Guest info */}
          <section className="bk-section">
            <div className="bk-section-label">Step 2</div>
            <h2>Your information</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <Label htmlFor="guestName">Name</Label>
                <Input
                  id="guestName"
                  type="text"
                  autoComplete="name"
                  style={{
                    marginTop: "0.35rem",
                    ...(isLoggedIn ? { opacity: 0.6, cursor: "default" } : {}),
                  }}
                  readOnly={isLoggedIn}
                  {...register("guestName")}
                />
                {errors.guestName && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.guestName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="guestEmail">Email</Label>
                <Input
                  id="guestEmail"
                  type="email"
                  autoComplete="email"
                  style={{
                    marginTop: "0.35rem",
                    ...(isLoggedIn ? { opacity: 0.6, cursor: "default" } : {}),
                  }}
                  readOnly={isLoggedIn}
                  {...register("guestEmail")}
                />
                {errors.guestEmail && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.guestEmail.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="guestPhone">Phone</Label>
                <Input
                  id="guestPhone"
                  type="tel"
                  autoComplete="tel"
                  style={{
                    marginTop: "0.35rem",
                    ...(isLoggedIn ? { opacity: 0.6, cursor: "default" } : {}),
                  }}
                  readOnly={isLoggedIn}
                  {...register("guestPhone")}
                />
                {errors.guestPhone && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.guestPhone.message}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Section 5: Signed-in banner OR account creation */}
          {isLoggedIn ? (
            <section className="bk-section" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ color: "var(--ll-accent)", fontSize: "1rem", flexShrink: 0 }}>&#10003;</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                  Signed in as {prefillData?.name}
                </div>
                <div style={{ fontSize: "0.72rem", opacity: 0.45, marginTop: "2px" }}>
                  {prefillData?.email}
                </div>
              </div>
              <SignOutButton />
            </section>
          ) : (
            <section className="bk-section">
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                }}
              >
                <Checkbox
                  id="createAccount"
                  checked={createAccount}
                  onCheckedChange={(checked: boolean | "indeterminate") => {
                    setValue("createAccount", checked === true)
                  }}
                  style={{ marginTop: "1px", flexShrink: 0 }}
                />
                <div>
                  <Label htmlFor="createAccount" style={{ cursor: "pointer", display: "block" }}>
                    Save my booking to an account
                  </Label>
                  <p style={{ fontSize: "0.72rem", opacity: 0.4, marginTop: "2px", margin: "2px 0 0" }}>
                    Free — lets you view this booking and future ones anytime
                  </p>
                </div>
              </div>

              {createAccount && (
                <div style={{ marginTop: "1rem", marginLeft: "1.75rem", maxWidth: "240px" }}>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    style={{ marginTop: "0.35rem" }}
                    {...register("password")}
                  />
                  {errors.password && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Hidden field for guestUserId */}
          <input type="hidden" {...register("guestUserId")} />

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="bk-submit-btn"
          >
            {isSubmitting ? "Submitting…" : "Request to Book"}
          </button>
        </div>

        {/* Right column — sticky price summary (desktop) */}
        <BookingPriceSummary
          estimate={estimate}
          addOns={room.addOns}
          selectedAddOnIds={selectedAddOnIds}
          baseNightlyRate={room.baseNightlyRate}
          className="md:sticky md:top-8 price-card"
        />
      </div>
    </form>
  )
}
