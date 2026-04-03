"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        background: "transparent",
        border: "1px solid color-mix(in srgb, var(--ll-text) 18%, transparent)",
        borderRadius: "9999px",
        color: "color-mix(in srgb, var(--ll-text) 50%, transparent)",
        fontSize: "0.7rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding: "0.42rem 1.2rem",
        cursor: "pointer",
        transition: "border-color 0.2s ease, color 0.2s ease",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ll-text) 35%, transparent)"
        e.currentTarget.style.color = "color-mix(in srgb, var(--ll-text) 80%, transparent)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ll-text) 18%, transparent)"
        e.currentTarget.style.color = "color-mix(in srgb, var(--ll-text) 50%, transparent)"
      }}
    >
      Sign out
    </button>
  )
}
