"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
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
import { cancelBooking } from "@/actions/cancellation"

type BookingStatus =
  | "PENDING"
  | "APPROVED"
  | "DECLINED"
  | "PAID"
  | "COMPLETED"
  | "CANCELLED"

type SerializedBooking = {
  id: string
  guestName: string
  guestEmail: string
  guestPhone: string
  checkin: string
  checkout: string
  numGuests: number
  estimatedTotal: number
  confirmedPrice: number | null
  stripeSessionId: string | null
  status: BookingStatus
  room: { name: string }
  createdAt: string
  updatedAt: string
  hasPendingExtension: boolean
  paidExtensionsTotal: number
}

function CancelBookingRowAction({ bookingId }: { bookingId: string }) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function handleConfirm() {
    startTransition(async () => {
      await cancelBooking(bookingId, { refundAmount: 0 })
      setOpen(false)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={isPending}>Cancel</Button>
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
          <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Cancelling..." : "Cancel Booking"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved / Awaiting Payment" },
  { value: "DECLINED", label: "Declined" },
  { value: "PAID", label: "Paid" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
]

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

function StatusBadge({ status }: { status: BookingStatus }) {
  const label =
    status === "APPROVED" ? "Approved / Awaiting Payment" : status.charAt(0) + status.slice(1).toLowerCase()
  return (
    <Badge variant={statusBadgeVariant(status)} className={statusBadgeClass(status)}>
      {label}
    </Badge>
  )
}

function BookingsTable({ bookings }: { bookings: SerializedBooking[] }) {
  if (bookings.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No bookings in this category.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Guest</TableHead>
          <TableHead>Room</TableHead>
          <TableHead>Check-in</TableHead>
          <TableHead>Check-out</TableHead>
          <TableHead>Guests</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((b) => (
          <TableRow key={b.id}>
            <TableCell>
              <div className="flex items-center gap-1 flex-wrap">
                <Link
                  href={`/admin/bookings/${b.id}`}
                  className="font-medium hover:underline text-blue-600"
                >
                  {b.guestName}
                </Link>
                {b.hasPendingExtension && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Extension pending
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">{b.id}</div>
            </TableCell>
            <TableCell>{b.room.name}</TableCell>
            <TableCell>{format(new Date(b.checkin.slice(0, 10) + "T00:00:00"), "MMM d, yyyy")}</TableCell>
            <TableCell>{format(new Date(b.checkout.slice(0, 10) + "T00:00:00"), "MMM d, yyyy")}</TableCell>
            <TableCell>{b.numGuests}</TableCell>
            <TableCell>
              {(() => {
                const base = b.status === "PAID" && b.confirmedPrice != null ? b.confirmedPrice : b.estimatedTotal
                const total = base + b.paidExtensionsTotal
                return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(total)
              })()}
              {b.status === "PAID" && b.confirmedPrice != null && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {b.paidExtensionsTotal > 0 ? "incl. extension" : "paid"}
                </div>
              )}
            </TableCell>
            <TableCell>
              <StatusBadge status={b.status} />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/bookings/${b.id}`}>View</Link>
                </Button>
                {b.status === "APPROVED" && (
                  <CancelBookingRowAction bookingId={b.id} />
                )}
                {b.status === "PAID" && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/bookings/${b.id}`}>Cancel (see refund)</Link>
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function BookingAdminList({ bookings }: { bookings: SerializedBooking[] }) {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Bookings</h1>
      <Tabs defaultValue="all">
        <TabsList className="flex-wrap h-auto gap-1">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => {
          const filtered =
            tab.value === "all"
              ? bookings
              : bookings.filter((b) => b.status === tab.value)

          return (
            <TabsContent key={tab.value} value={tab.value}>
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No {tab.label.toLowerCase()} bookings.
                </div>
              ) : (
                <BookingsTable bookings={filtered} />
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
