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

export function BookingAdminDetail({ booking }: { booking: SerializedBooking }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmedPrice, setConfirmedPrice] = useState("")
  const [declineReason, setDeclineReason] = useState("")
  const [approveError, setApproveError] = useState<string | null>(null)
  const [declineError, setDeclineError] = useState<string | null>(null)
  const [markPaidError, setMarkPaidError] = useState<string | null>(null)

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
    new Date(booking.checkout),
    new Date(booking.checkin)
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
            <p className="font-medium">{format(new Date(booking.checkin), "MMMM d, yyyy")}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Check-out</span>
            <p className="font-medium">{format(new Date(booking.checkout), "MMMM d, yyyy")}</p>
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
    </div>
  )
}
