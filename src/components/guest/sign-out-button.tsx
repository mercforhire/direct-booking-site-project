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
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: "9999px",
        color: "rgba(240,235,224,0.5)",
        fontSize: "0.7rem",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding: "0.42rem 1.2rem",
        cursor: "pointer",
        transition: "border-color 0.2s ease, color 0.2s ease",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"
        e.currentTarget.style.color = "rgba(240,235,224,0.8)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"
        e.currentTarget.style.color = "rgba(240,235,224,0.5)"
      }}
    >
      Sign out
    </button>
  )
}
