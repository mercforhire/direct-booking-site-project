import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getLandlordBySlug } from "@/lib/landlord"

export const dynamic = "force-dynamic"

// Legacy compatibility redirect — sends all visitors to /{slug}/my-bookings.
export default async function LandlordMyBookingPage({
  params,
}: {
  params: Promise<{ landlord: string }>
}) {
  const { landlord: slug } = await params
  const landlord = await getLandlordBySlug(slug)
  if (!landlord) notFound()

  const base = `/${slug}`

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`${base}/guest/login?next=${base}/my-bookings`)
  }

  redirect(`${base}/my-bookings`)
}
