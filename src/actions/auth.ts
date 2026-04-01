"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export async function createGuestAccount(data: {
  name: string
  email: string
  phone: string
  password: string
}): Promise<{ error: string } | { success: true }> {
  // Validate inputs
  if (!data.name.trim()) {
    return { error: "Name is required." }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.email)) {
    return { error: "Please enter a valid email address." }
  }

  if (!data.phone.trim()) {
    return { error: "Phone number is required." }
  }

  if (data.password.length < 8) {
    return { error: "Password must be at least 8 characters." }
  }

  // Create admin client (same pattern as src/actions/booking.ts)
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: createError } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { role: "guest", name: data.name, phone: data.phone },
  })

  if (createError) {
    const code = (createError as { code?: string }).code ?? ""
    const msg = createError.message.toLowerCase()
    if (
      code === "email_exists" ||
      msg.includes("already registered") ||
      msg.includes("already exists") ||
      msg.includes("duplicate")
    ) {
      return { error: "An account with this email already exists." }
    }
    return { error: "Could not create account. Please try again." }
  }

  return { success: true }
}
