import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import BookingHistoryList from "@/components/guest/booking-history-list"
import SignOutButton from "@/components/guest/sign-out-button"

export const dynamic = "force-dynamic"

export default async function MyBookingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/guest/login?next=/my-bookings")

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [{ guestUserId: user.id }, { guestEmail: user.email ?? undefined }],
    },
    include: {
      room: {
        select: { name: true, photos: { take: 1, select: { url: true } } },
      },
    },
    orderBy: { checkin: "desc" },
  })

  // Coerce Prisma Decimals for Client Component serialization
  const serialized = bookings.map((b) => ({
    id: b.id,
    guestName: b.guestName,
    checkin: b.checkin,
    checkout: b.checkout,
    numGuests: b.numGuests,
    status: b.status,
    confirmedPrice: b.confirmedPrice !== null ? Number(b.confirmedPrice) : null,
    estimatedTotal: Number(b.estimatedTotal),
    room: b.room,
  }))

  const firstName = serialized[0]?.guestName?.split(" ")[0] ?? "there"

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const twelveMonthsAgo = new Date(today)
  twelveMonthsAgo.setMonth(today.getMonth() - 12)

  const upcoming = serialized
    .filter((b) => new Date(b.checkin) >= today)
    .sort(
      (a, b) =>
        new Date(a.checkin).getTime() - new Date(b.checkin).getTime()
    )

  const past = serialized
    .filter((b) => {
      const c = new Date(b.checkin)
      return c < today && c >= twelveMonthsAgo
    })
    .sort(
      (a, b) =>
        new Date(b.checkin).getTime() - new Date(a.checkin).getTime()
    )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {serialized.length > 0 ? `${firstName}'s Bookings` : "Your Bookings"}
        </h1>
        <SignOutButton />
      </div>
      <BookingHistoryList upcoming={upcoming} past={past} />
    </div>
  )
}
