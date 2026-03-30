"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format, differenceInCalendarDays } from "date-fns"
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
import { approveBooking, declineBooking } from "@/actions/booking-admin"
import { markBookingAsPaid } from "@/actions/payment"
import { approveExtension, declineExtension } from "@/actions/extension-admin"
import { markExtensionAsPaid } from "@/actions/payment"
import { cancelBooking } from "@/actions/cancellation"
import { approveDateChange, declineDateChange } from "@/actions/date-change"
import { MessageSection, type SerializedMessage } from "@/components/guest/message-section"

export type SerializedDateChange = {
  id: string
  bookingId: string
  requestedCheckin: string
  requestedCheckout: string
  newPrice: number | null
  status: "PENDING" | "APPROVED" | "DECLINED"
  declineReason: string | null
  stripeSessionId: string | null
  createdAt: string
}

type BookingStatus =
  | "PENDING"
  | "APPROVED"
  | "DECLINED"
  | "PAID"
  | "COMPLETED"
  | "CANCELLED"

type SerializedBooking = {
  id: string
  roomId: string
  guestName: string
  guestEmail: string
  guestPhone: string
  guestUserId: string | null
  checkin: string
  checkout: string
  numGuests: number
  selectedAddOnIds: string[]
  noteToLandlord: string | null
  estimatedTotal: number
  status: BookingStatus
  accessToken: string
  confirmedPrice: number | null
  declineReason: string | null
  stripeSessionId: string | null
  createdAt: string
  updatedAt: string
  room: {
    name: string
    addOns: { id: string; name: string; price: number; roomId: string }[]
  }
}

type SerializedExtension = {
  id: string
  bookingId: string
  requestedCheckout: string
  noteToLandlord: string | null
  status: "PENDING" | "APPROVED" | "DECLINED" | "PAID"
  extensionPrice: number | null
  declineReason: string | null
  stripeSessionId: string | null
  createdAt: string
  updatedAt: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount)
}

function statusBadgeVariant(status: BookingStatus): "secondary" | "default" | "destructive" | "outline" {
  switch (status) {
    case "PENDING":
      return "secondary"
    case "APPROVED":
      return "default"
    case "DECLINED":
      return "destructive"
    case "PAID":
      return "default"
    default:
      return "outline"
  }
}

function statusBadgeClass(status: BookingStatus): string {
  if (status === "PAID") return "bg-green-600 text-white hover:bg-green-700"
  return ""
}

function statusLabel(status: BookingStatus): string {
  if (status === "APPROVED") return "Approved / Awaiting Payment"
  return status.charAt(0) + status.slice(1).toLowerCase()
}

export function BookingAdminDetail({
  booking,
  activeExtension,
  activeDateChange,
  depositAmount,
  totalPaid,
  messages,
}: {
  booking: SerializedBooking
  activeExtension?: SerializedExtension | null
  activeDateChange?: SerializedDateChange | null
  depositAmount: number
  totalPaid?: number | null
  messages: SerializedMessage[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmedPrice, setConfirmedPrice] = useState("")
  const [declineReason, setDeclineReason] = useState("")
  const [approveError, setApproveError] = useState<string | null>(null)
  const [declineError, setDeclineError] = useState<string | null>(null)
  const [markPaidError, setMarkPaidError] = useState<string | null>(null)
  const [extensionPrice, setExtensionPrice] = useState("")
  const [extensionDeclineReason, setExtensionDeclineReason] = useState("")
  const [approveExtError, setApproveExtError] = useState<string | null>(null)
  const [declineExtError, setDeclineExtError] = useState<string | null>(null)
  const [markExtPaidError, setMarkExtPaidError] = useState<string | null>(null)
  const [isCancelPending, startCancelTransition] = useTransition()
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [refundAmountInput, setRefundAmountInput] = useState<string>(
    String(totalPaid ?? booking.confirmedPrice ?? 0)
  )
  const [isDateChangePending, startDateChangeTransition] = useTransition()
  const [newPriceInput, setNewPriceInput] = useState("")
  const [declineReasonInput, setDeclineReasonInput] = useState("")
  const [dateChangeError, setDateChangeError] = useState<string | null>(null)

  async function handleMarkAsPaid() {
    setMarkPaidError(null)
    startTransition(async () => {
      const result = await markBookingAsPaid(booking.id)
      if ("error" in result) {
        if (result.error === "not_approved") {
          setMarkPaidError("This booking is no longer in an approved state.")
        } else {
          setMarkPaidError("Failed to mark booking as paid. Please try again.")
        }
      } else {
        router.refresh()
      }
    })
  }

  const nights = differenceInCalendarDays(
    new Date(booking.checkout.slice(0, 10) + "T00:00:00"),
    new Date(booking.checkin.slice(0, 10) + "T00:00:00")
  )

  const selectedAddOns = booking.room.addOns.filter((a) =>
    booking.selectedAddOnIds.includes(a.id)
  )

  async function handleApprove() {
    setApproveError(null)
    startTransition(async () => {
      const result = await approveBooking(booking.id, {
        confirmedPrice: Number(confirmedPrice),
      })
      if ("error" in result) {
        if (result.error === "not_pending") {
          setApproveError("This booking has already been processed.")
        } else {
          setApproveError("Failed to approve booking. Please try again.")
        }
      } else {
        router.refresh()
      }
    })
  }

  async function handleDecline() {
    setDeclineError(null)
    startTransition(async () => {
      const result = await declineBooking(booking.id, {
        declineReason: declineReason || undefined,
      })
      if ("error" in result) {
        if (result.error === "not_pending") {
          setDeclineError("This booking has already been processed.")
        } else {
          setDeclineError("Failed to decline booking. Please try again.")
        }
      } else {
        router.refresh()
      }
    })
  }

  async function handleApproveExtension() {
    if (!activeExtension) return
    setApproveExtError(null)
    startTransition(async () => {
      const result = await approveExtension(activeExtension.id, {
        extensionPrice: Number(extensionPrice),
      })
      if ("error" in result) {
        setApproveExtError("Failed to approve extension. Please try again.")
      } else {
        router.refresh()
      }
    })
  }

  async function handleDeclineExtension() {
    if (!activeExtension) return
    setDeclineExtError(null)
    startTransition(async () => {
      const result = await declineExtension(activeExtension.id, {
        declineReason: extensionDeclineReason || undefined,
      })
      if ("error" in result) {
        setDeclineExtError("Failed to decline extension. Please try again.")
      } else {
        router.refresh()
      }
    })
  }

  async function handleMarkExtensionAsPaid() {
    if (!activeExtension) return
    setMarkExtPaidError(null)
    startTransition(async () => {
      const result = await markExtensionAsPaid(activeExtension.id)
      if ("error" in result) {
        setMarkExtPaidError("Failed to mark extension as paid. Please try again.")
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/bookings" className="text-sm text-blue-600 hover:underline">
          &larr; Back to Bookings
        </Link>
        <span className="text-muted-foreground text-sm">
          #{booking.id.slice(-8).toUpperCase()}
        </span>
        <Badge
          variant={statusBadgeVariant(booking.status)}
          className={statusBadgeClass(booking.status)}
        >
          {statusLabel(booking.status)}
        </Badge>
      </div>

      {/* Booking Details */}
      <div className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold text-lg">Booking Details</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Room</span>
            <p className="font-medium">{booking.room.name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Guest Name</span>
            <p className="font-medium">{booking.guestName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Email</span>
            <p className="font-medium">{booking.guestEmail}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Phone</span>
            <p className="font-medium">{booking.guestPhone}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Check-in</span>
            <p className="font-medium">{format(new Date(booking.checkin.slice(0, 10) + "T00:00:00"), "MMMM d, yyyy")}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Check-out</span>
            <p className="font-medium">{format(new Date(booking.checkout.slice(0, 10) + "T00:00:00"), "MMMM d, yyyy")}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Nights</span>
            <p className="font-medium">{nights}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Guests</span>
            <p className="font-medium">{booking.numGuests}</p>
          </div>
          {selectedAddOns.length > 0 && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Add-ons</span>
              <p className="font-medium">
                {selectedAddOns.map((a) => a.name).join(", ")}
              </p>
            </div>
          )}
          {booking.noteToLandlord && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Note to Landlord</span>
              <p className="font-medium whitespace-pre-wrap">{booking.noteToLandlord}</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Estimated Total</span>
            <p className="font-medium">
              {new Intl.NumberFormat("en-CA", {
                style: "currency",
                currency: "CAD",
              }).format(booking.estimatedTotal)}
            </p>
          </div>
          {booking.confirmedPrice != null && (
            <div>
              <span className="text-muted-foreground">Confirmed Price</span>
              <p className="font-medium text-green-700">
                {new Intl.NumberFormat("en-CA", {
                  style: "currency",
                  currency: "CAD",
                }).format(booking.confirmedPrice)}
              </p>
            </div>
          )}
          {booking.declineReason && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Decline Reason</span>
              <p className="font-medium whitespace-pre-wrap">{booking.declineReason}</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Submitted</span>
            <p className="font-medium">
              {format(new Date(booking.createdAt), "MMM d, yyyy h:mm a")}
            </p>
          </div>
        </div>
      </div>

      {/* Approve / Decline — only shown for PENDING */}
      {booking.status === "PENDING" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Approve Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold">Approve Booking</h2>
            <div>
              <label
                htmlFor="confirmedPrice"
                className="block text-sm font-medium mb-1"
              >
                Confirmed Price (CAD)
              </label>
              <input
                id="confirmedPrice"
                type="number"
                min="0"
                step="0.01"
                required
                value={confirmedPrice}
                onChange={(e) => setConfirmedPrice(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. 1250.00"
              />
            </div>
            {approveError && (
              <p className="text-sm text-destructive">{approveError}</p>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="default"
                  disabled={isPending || !confirmedPrice}
                >
                  Approve
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Approve this booking?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will set the confirmed price to{" "}
                    {new Intl.NumberFormat("en-CA", {
                      style: "currency",
                      currency: "CAD",
                    }).format(Number(confirmedPrice) || 0)}{" "}
                    CAD and notify the guest.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleApprove}
                    disabled={isPending}
                  >
                    {isPending ? "Approving..." : "Approve"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Decline Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold">Decline Booking</h2>
            <div>
              <label
                htmlFor="declineReason"
                className="block text-sm font-medium mb-1"
              >
                Reason (optional)
              </label>
              <textarea
                id="declineReason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                placeholder="Optional reason for declining..."
              />
            </div>
            {declineError && (
              <p className="text-sm text-destructive">{declineError}</p>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isPending}>
                  Decline
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Decline this booking?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will decline the booking request and notify the guest.
                    {declineReason && (
                      <> Reason: &ldquo;{declineReason}&rdquo;</>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDecline}
                    disabled={isPending}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {isPending ? "Declining..." : "Decline"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Mark as Paid — only shown for APPROVED */}
      {booking.status === "APPROVED" && (
        <div className="border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Payment</h2>
          <p className="text-sm text-muted-foreground">
            Manually mark this booking as paid if the guest has paid via e-transfer or another offline method.
          </p>
          {markPaidError && (
            <p className="text-sm text-destructive">{markPaidError}</p>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="default" disabled={isPending}>
                Mark as Paid
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark this booking as paid?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will update the booking status to Paid and send a payment confirmation email to the guest.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleMarkAsPaid}
                  disabled={isPending}
                >
                  {isPending ? "Marking as paid..." : "Mark as Paid"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Cancel Section — shown for APPROVED and PAID bookings */}
      {(booking.status === "APPROVED" || booking.status === "PAID") && (
        <div className="border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Cancel Booking</h2>

          {booking.status === "APPROVED" && (
            <>
              <p className="text-sm text-muted-foreground">
                This booking has not been paid. No refund is required.
              </p>
              {cancelError && (
                <p className="text-sm text-destructive">{cancelError}</p>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isCancelPending}>
                    Cancel Booking
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This booking has not been paid. No refund is required. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setCancelError(null)
                        startCancelTransition(async () => {
                          const result = await cancelBooking(booking.id, { refundAmount: 0 })
                          if ("error" in result && result.error === "not_cancellable") {
                            setCancelError("This booking can no longer be cancelled.")
                          }
                        })
                      }}
                      disabled={isCancelPending}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      {isCancelPending ? "Cancelling..." : "Cancel Booking"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {booking.status === "PAID" && (() => {
            const today = new Date().toISOString().slice(0, 10)
            const checkinStr = booking.checkin.slice(0, 10)
            const isPreCheckin = today < checkinStr
            const isStripe = !!booking.stripeSessionId
            return (
              <>
                <p className="text-sm text-muted-foreground">
                  This booking has been paid. Issuing a refund will process through the original payment method.
                </p>
                <div className="space-y-2">
                  {isStripe ? (
                    <>
                      <p className="text-sm font-medium">
                        Refund Amount (CAD): {formatCurrency(totalPaid ?? booking.confirmedPrice ?? 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Stripe will automatically refund each payment at the original charged amount. Refunds typically take 5–10 business days.
                      </p>
                    </>
                  ) : (
                    <>
                      <label htmlFor="refundAmount" className="block text-sm font-medium">
                        Refund Amount (CAD)
                      </label>
                      <input
                        id="refundAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={refundAmountInput}
                        onChange={(e) => setRefundAmountInput(e.target.value)}
                        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      {isPreCheckin ? (
                        <p className="text-sm text-muted-foreground">
                          Pre-check-in cancellation. Deposit is included — standard for pre-check-in since no damage is possible.
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Mid-stay cancellation — deposit ({formatCurrency(depositAmount)}) is included in the pre-filled amount. Adjust if withholding for potential damages.
                        </p>
                      )}
                    </>
                  )}
                  {cancelError && (
                    <p className="text-sm text-destructive">{cancelError}</p>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isCancelPending}>
                      Cancel Booking &amp; Refund
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {isStripe
                          ? `Stripe will automatically refund ${formatCurrency(totalPaid ?? booking.confirmedPrice ?? 0)} CAD across all payments. This action cannot be undone.`
                          : `A refund of ${formatCurrency(Number(refundAmountInput) || 0)} CAD will be issued manually via e-transfer. This action cannot be undone.`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          setCancelError(null)
                          startCancelTransition(async () => {
                            const result = await cancelBooking(booking.id, {
                              refundAmount: isStripe
                                ? (totalPaid ?? booking.confirmedPrice ?? 0)
                                : Number(refundAmountInput),
                            })
                            if ("error" in result) {
                              if (result.error === "stripe_refund_failed") {
                                const detail = "message" in result && result.message ? ` (${result.message})` : ""
                                setCancelError(`Stripe refund failed — booking NOT cancelled.${detail}`)
                              } else if (result.error === "not_cancellable") {
                                setCancelError("This booking can no longer be cancelled.")
                              } else {
                                setCancelError("Failed to cancel booking. Please try again.")
                              }
                            }
                            // On success: revalidatePath will refresh the page — no explicit close needed
                          })
                        }}
                        disabled={isCancelPending}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      >
                        {isCancelPending ? "Cancelling..." : "Cancel Booking"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )
          })()}
        </div>
      )}

      {/* Date Change Request Section */}
      {activeDateChange && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Date Change Request</h2>
          <div className="rounded-lg border p-4 space-y-2">
            <p className="text-sm">
              <span className="font-medium">Requested dates:</span>{" "}
              {format(new Date(activeDateChange.requestedCheckin.slice(0, 10) + "T00:00:00"), "MMMM d, yyyy")} &rarr;{" "}
              {format(new Date(activeDateChange.requestedCheckout.slice(0, 10) + "T00:00:00"), "MMMM d, yyyy")}
            </p>
            <p className="text-sm">
              <span className="font-medium">Status:</span>{" "}
              <Badge>{activeDateChange.status}</Badge>
            </p>

            {activeDateChange.status === "PENDING" && (
              <div className="flex gap-2 pt-2">
                {/* Approve button with price input */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm">Approve</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Approve Date Change</AlertDialogTitle>
                      <AlertDialogDescription>
                        Set the new confirmed price for the updated dates.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                      <label className="text-sm font-medium">New Price (CAD)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newPriceInput}
                        onChange={(e) => setNewPriceInput(e.target.value)}
                        className="mt-1 w-full rounded border px-3 py-2 text-sm"
                        placeholder={String(booking.confirmedPrice ?? "")}
                      />
                      {dateChangeError && (
                        <p className="text-sm text-destructive mt-1">{dateChangeError}</p>
                      )}
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={isDateChangePending}
                        onClick={() => {
                          setDateChangeError(null)
                          startDateChangeTransition(async () => {
                            const result = await approveDateChange(activeDateChange.id, {
                              newPrice: Number(newPriceInput),
                            })
                            if (result?.error) {
                              setDateChangeError(
                                typeof result.error === "string" ? result.error : "Failed to approve"
                              )
                            }
                          })
                        }}
                      >
                        {isDateChangePending ? "Approving..." : "Approve"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Decline button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Decline
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Decline Date Change</AlertDialogTitle>
                    </AlertDialogHeader>
                    <div className="py-2">
                      <label className="text-sm font-medium">Reason (optional)</label>
                      <textarea
                        value={declineReasonInput}
                        onChange={(e) => setDeclineReasonInput(e.target.value)}
                        className="mt-1 w-full rounded border px-3 py-2 text-sm"
                        rows={2}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={isDateChangePending}
                        onClick={() => {
                          startDateChangeTransition(async () => {
                            await declineDateChange(activeDateChange.id, {
                              declineReason: declineReasonInput || undefined,
                            })
                          })
                        }}
                      >
                        {isDateChangePending ? "Declining..." : "Decline"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {activeDateChange.status === "APPROVED" && (
              <p className="text-sm text-muted-foreground">
                Approved — awaiting guest payment (new price:{" "}
                {formatCurrency(activeDateChange.newPrice ?? 0)})
              </p>
            )}
          </div>
        </section>
      )}

      {/* Extension Request Section — disabled for v1.0 */}
      {false && activeExtension && (
        <div className="border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Extension Request</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Requested checkout</span>
              <p className="font-medium">
                {format(new Date(activeExtension.requestedCheckout.slice(0, 10) + "T00:00:00"), "MMMM d, yyyy")}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p className="font-medium capitalize">{activeExtension.status.toLowerCase()}</p>
            </div>
            {activeExtension.extensionPrice != null && (
              <div>
                <span className="text-muted-foreground">Extension price</span>
                <p className="font-medium">
                  {new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
                    activeExtension.extensionPrice
                  )}
                </p>
              </div>
            )}
            {activeExtension.noteToLandlord && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Guest note</span>
                <p className="font-medium">{activeExtension.noteToLandlord}</p>
              </div>
            )}
            {activeExtension.declineReason && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Decline reason</span>
                <p className="font-medium">{activeExtension.declineReason}</p>
              </div>
            )}
          </div>

          {/* Approve / Decline — only for PENDING */}
          {activeExtension.status === "PENDING" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {/* Approve */}
              <div className="border rounded-lg p-3 space-y-2">
                <h3 className="font-medium text-sm">Approve Extension</h3>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extensionPrice}
                  onChange={(e) => setExtensionPrice(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Extension price (CAD)"
                />
                {approveExtError && <p className="text-sm text-destructive">{approveExtError}</p>}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="default" size="sm" disabled={isPending || !extensionPrice}>
                      Approve
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Approve this extension?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Extension price:{" "}
                        {new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(
                          Number(extensionPrice) || 0
                        )}{" "}
                        CAD. The guest will be notified and can pay.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleApproveExtension} disabled={isPending}>
                        {isPending ? "Approving..." : "Approve"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Decline */}
              <div className="border rounded-lg p-3 space-y-2">
                <h3 className="font-medium text-sm">Decline Extension</h3>
                <textarea
                  value={extensionDeclineReason}
                  onChange={(e) => setExtensionDeclineReason(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={2}
                  placeholder="Optional reason..."
                />
                {declineExtError && <p className="text-sm text-destructive">{declineExtError}</p>}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isPending}>
                      Decline
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Decline this extension?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The guest will be notified that their extension was declined.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeclineExtension}
                        disabled={isPending}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      >
                        {isPending ? "Declining..." : "Decline"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {/* Mark Extension as Paid — only for APPROVED */}
          {activeExtension.status === "APPROVED" && (
            <div className="mt-2">
              {markExtPaidError && (
                <p className="text-sm text-destructive mb-2">{markExtPaidError}</p>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default" size="sm" disabled={isPending}>
                    Mark Extension as Paid
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mark extension as paid?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the extension as paid and update the booking checkout date to{" "}
                      {format(new Date(activeExtension.requestedCheckout.slice(0, 10) + "T00:00:00"), "MMMM d, yyyy")}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleMarkExtensionAsPaid} disabled={isPending}>
                      {isPending ? "Marking as paid..." : "Mark as Paid"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      )}

      {/* Messages section */}
      <MessageSection bookingId={booking.id} token={null} messages={messages} />
    </div>
  )
}
