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
}

export function BookingForm({
  room,
  settings,
  blockedDateStrings,
  perDayRates,
  defaultCheckin,
  defaultCheckout,
  defaultGuests = 1,
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
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      estimatedTotal: 0,
      createAccount: false,
      password: "",
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

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8 items-start">
        {/* Left column — form fields */}
        <div className="space-y-8">

          {/* Section 1: Dates + guests */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Dates &amp; guests
            </h2>
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
            <div className="mt-4 max-w-xs">
              <Label htmlFor="numGuests" className="text-sm font-medium">
                Guests
              </Label>
              <Input
                id="numGuests"
                type="number"
                min={1}
                max={room.maxGuests}
                className="mt-1"
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
            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                Add-ons
              </h2>
              <div className="space-y-3">
                {room.addOns.map((addOn) => {
                  const isChecked = selectedAddOnIds.includes(addOn.id)
                  return (
                    <div key={addOn.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`addon-${addOn.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked: boolean | "indeterminate") => {
                          if (checked === true) {
                            setValue("selectedAddOnIds", [
                              ...selectedAddOnIds,
                              addOn.id,
                            ])
                          } else {
                            setValue(
                              "selectedAddOnIds",
                              selectedAddOnIds.filter((id) => id !== addOn.id)
                            )
                          }
                        }}
                      />
                      <Label
                        htmlFor={`addon-${addOn.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {addOn.name} &mdash;{" "}
                        {addOn.price === 0 ? "Free" : `$${addOn.price.toFixed(2)}`}
                      </Label>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Section 3: Note to landlord */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Note to landlord
            </h2>
            <Textarea
              placeholder="Any questions or special requests?"
              className="min-h-[100px]"
              {...register("noteToLandlord")}
            />
          </section>

          {/* Section 4: Guest info */}
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Your information
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="guestName" className="text-sm font-medium">
                  Name
                </Label>
                <Input
                  id="guestName"
                  type="text"
                  autoComplete="name"
                  className="mt-1"
                  {...register("guestName")}
                />
                {errors.guestName && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.guestName.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="guestEmail" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="guestEmail"
                  type="email"
                  autoComplete="email"
                  className="mt-1"
                  {...register("guestEmail")}
                />
                {errors.guestEmail && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.guestEmail.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="guestPhone" className="text-sm font-medium">
                  Phone
                </Label>
                <Input
                  id="guestPhone"
                  type="tel"
                  autoComplete="tel"
                  className="mt-1"
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

          {/* Section 5: Optional account creation */}
          <section>
            <div className="flex items-center gap-3">
              <Checkbox
                id="createAccount"
                checked={createAccount}
                onCheckedChange={(checked: boolean | "indeterminate") => {
                  setValue("createAccount", checked === true)
                }}
              />
              <Label
                htmlFor="createAccount"
                className="text-sm cursor-pointer"
              >
                Create a free account to view this booking anytime
              </Label>
            </div>

            {createAccount && (
              <div className="mt-3 ml-7">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 max-w-xs"
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

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full"
          >
            {isSubmitting ? "Submitting…" : "Request to Book"}
          </Button>
        </div>

        {/* Right column — sticky price summary (desktop) */}
        <BookingPriceSummary
          estimate={estimate}
          addOns={room.addOns}
          selectedAddOnIds={selectedAddOnIds}
          baseNightlyRate={room.baseNightlyRate}
          className="md:sticky md:top-8"
        />
      </div>
    </form>
  )
}
