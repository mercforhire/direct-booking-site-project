import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// Legacy compatibility redirect — sends all visitors to /my-bookings.
// Unauthenticated users are sent to login, which bounces back to /my-bookings after auth.
export default async function MyBookingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/guest/login?next=/my-bookings")
  }

  redirect("/my-bookings")
}
