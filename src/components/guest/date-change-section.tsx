"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { submitDateChange, cancelDateChange } from "@/actions/date-change"
import { createDateChangeStripeCheckoutSession } from "@/actions/date-change"
import type { SerializedDateChange } from "./booking-status-view"

type Props = {
  booking: {
    id: string
    status: string
    checkin: string   // ISO string
    checkout: string  // ISO string
  }
  activeDateChange: SerializedDateChange | null
}

function formatDate(iso: string): string {
  return format(new Date(iso.slice(0, 10) + "T00:00:00"), "MMMM d, yyyy")
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount)
}

export function DateChangeSection({ booking, activeDateChange }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [requestedCheckin, setRequestedCheckin] = useState("")
  const [requestedCheckout, setRequestedCheckout] = useState("")
  const [noteToLandlord, setNoteToLandlord] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isStripeLoading, startStripeTransition] = useTransition()

  // Internal guard: only show for APPROVED or PAID bookings
  if (booking.status !== "APPROVED" && booking.status !== "PAID") {
    return null
  }

  function handleSubmit() {
    setValidationError(null)
    if (!requestedCheckin || !requestedCheckout) {
      setValidationError("Both check-in and check-out dates are required.")
      return
    }
    if (requestedCheckin >= requestedCheckout) {
      setValidationError("Check-out must be after check-in.")
      return
    }
    startTransition(async () => {
      const result = await submitDateChange(booking.id, {
        requestedCheckin,
        requestedCheckout,
        noteToLandlord: noteToLandlord.trim() || null,
      })
      if (result && "error" in result) {
        setValidationError("Failed to submit request. Please try again.")
        return
      }
      setSubmitted(true)
      setShowForm(false)
    })
  }

  function handleCancel() {
    startTransition(async () => {
      await cancelDateChange(booking.id)
    })
  }

  function handleStripePayment(dateChangeId: string) {
    startStripeTransition(async () => {
      await createDateChangeStripeCheckoutSession(dateChangeId)
    })
  }

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Date Change Request</h2>

      {/* PENDING state */}
      {activeDateChange?.status === "PENDING" && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-3">
          <p className="text-sm text-yellow-800">
            Date change requested:{" "}
            <strong>{formatDate(activeDateChange.requestedCheckin)}</strong>
            {" to "}
            <strong>{formatDate(activeDateChange.requestedCheckout)}</strong>{" "}
            — awaiting landlord approval.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isPending}>
                {isPending ? "Cancelling..." : "Cancel Request"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel date change request?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove your pending date change request. You can submit a new one after.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Request</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel}>
                  Yes, Cancel Request
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* APPROVED state */}
      {activeDateChange?.status === "APPROVED" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Badge>Approved</Badge>
              <span className="text-sm text-gray-600">
                Date change to{" "}
                <strong>{formatDate(activeDateChange.requestedCheckin)}</strong>
                {" – "}
                <strong>{formatDate(activeDateChange.requestedCheckout)}</strong>
              </span>
            </div>
          </div>

          {/* Stripe top-up payment */}
          {activeDateChange.stripeSessionId !== null && activeDateChange.newPrice !== null && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
              <h3 className="font-medium text-gray-900">Payment Required</h3>
              <p className="text-sm text-gray-500">
                A top-up payment of{" "}
                <strong>{formatCurrency(activeDateChange.newPrice)}</strong> is required to confirm your new dates.
              </p>
              <form
                action={() => {
                  handleStripePayment(activeDateChange.id)
                }}
              >
                <button
                  type="submit"
                  disabled={isStripeLoading}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isStripeLoading ? "Redirecting to Stripe..." : "Pay by Card"}
                </button>
              </form>
            </div>
          )}

          {/* E-transfer top-up */}
          {activeDateChange.stripeSessionId === null && activeDateChange.newPrice !== null && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-4 text-blue-800 text-sm">
              Payment of{" "}
              <strong>{formatCurrency(activeDateChange.newPrice)}</strong> required via e-transfer to confirm your new dates.
            </div>
          )}

          {/* No payment required */}
          {activeDateChange.newPrice === null && (
            <div className="rounded-md bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
              Your dates have been updated.
            </div>
          )}
        </div>
      )}

      {/* DECLINED state */}
      {activeDateChange?.status === "DECLINED" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="destructive">Declined</Badge>
            <span className="text-sm text-red-800">Date change request declined</span>
          </div>
          {activeDateChange.declineReason && (
            <p className="text-sm text-red-700">
              Reason: {activeDateChange.declineReason}
            </p>
          )}
        </div>
      )}

      {/* No active request — show request form or submit button */}
      {activeDateChange === null && (
        <div>
          {submitted ? (
            <div className="rounded-md bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
              Date change request submitted — we&apos;ll email you once it&apos;s reviewed.
            </div>
          ) : !showForm ? (
            <Button variant="outline" onClick={() => setShowForm(true)}>
              Request Date Change
            </Button>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
              <h3 className="font-medium text-gray-900">Request new dates</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="new-checkin"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    New Check-in
                  </label>
                  <input
                    id="new-checkin"
                    type="date"
                    value={requestedCheckin}
                    onChange={(e) => setRequestedCheckin(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-checkout"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    New Check-out
                  </label>
                  <input
                    id="new-checkout"
                    type="date"
                    value={requestedCheckout}
                    onChange={(e) => setRequestedCheckout(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="date-change-note"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Note to landlord (optional)
                </label>
                <textarea
                  id="date-change-note"
                  rows={3}
                  value={noteToLandlord}
                  onChange={(e) => setNoteToLandlord(e.target.value)}
                  placeholder="Any notes for your date change request..."
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {validationError && (
                <p className="text-sm text-red-600">{validationError}</p>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={isPending}
                >
                  {isPending ? "Submitting..." : "Submit Request"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setRequestedCheckin("")
                    setRequestedCheckout("")
                    setNoteToLandlord("")
                    setValidationError(null)
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
