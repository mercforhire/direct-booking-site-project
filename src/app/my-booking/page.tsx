import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Redirect authenticated guests to their most recent booking.
// Unauthenticated users are sent to login, which bounces back here after auth.
export default async function MyBookingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/guest/login?next=/my-booking")
  }

  const booking = await prisma.booking.findFirst({
    where: {
      OR: [{ guestUserId: user.id }, { guestEmail: user.email }],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })

  if (!booking) {
    redirect("/")
  }

  redirect(`/bookings/${booking.id}`)
}
