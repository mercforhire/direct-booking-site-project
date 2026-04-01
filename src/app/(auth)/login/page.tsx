"use client"

import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
import { Bebas_Neue, DM_Sans } from "next/font/google"

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
})

const dm = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
})

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })
    setLoading(false)
    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div
      className={`${bebas.variable} ${dm.variable}`}
      style={{
        minHeight: "100vh",
        background: "#3a392a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-dm), sans-serif",
        color: "#f0ebe0",
        padding: "2rem",
      }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-panel { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both; }
        .magic-input:focus { border-bottom-color: #d4956a !important; outline: none; }
        .magic-input::placeholder { color: rgba(240,235,224,0.2); }
        .submit-btn:hover:not(:disabled) { background: #6a3214 !important; }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .back-link:hover { opacity: 0.7 !important; }
      `}</style>

      {sent ? (
        /* ── Sent state ── */
        <div
          className="login-panel"
          style={{
            width: "100%",
            maxWidth: "320px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "0.85rem",
              letterSpacing: "0.25em",
              opacity: 0.35,
              textTransform: "uppercase",
            }}
          >
            Admin
          </div>

          {/* Thin accent line */}
          <div
            style={{
              width: "32px",
              height: "1px",
              background: "#d4956a",
              margin: "0 auto",
            }}
          />

          <div
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "2rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            Check Your Email
          </div>

          <p
            style={{
              fontSize: "0.82rem",
              opacity: 0.5,
              lineHeight: 1.7,
              marginTop: "0.25rem",
            }}
          >
            A sign-in link has been sent to
            <br />
            <span style={{ color: "#d4956a", opacity: 1 }}>{email}</span>
          </p>
        </div>
      ) : (
        /* ── Form state ── */
        <div
          className="login-panel"
          style={{
            width: "100%",
            maxWidth: "300px",
            display: "flex",
            flexDirection: "column",
            gap: "0",
          }}
        >
          {/* Label */}
          <div
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "0.8rem",
              letterSpacing: "0.28em",
              opacity: 0.3,
              textTransform: "uppercase",
              marginBottom: "1.5rem",
            }}
          >
            Admin Access
          </div>

          {/* Accent rule */}
          <div
            style={{
              width: "100%",
              height: "1px",
              background: "rgba(255,255,255,0.08)",
              marginBottom: "2.5rem",
            }}
          />

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "3rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              lineHeight: 0.9,
              margin: "0 0 2.25rem",
            }}
          >
            Sign In
          </h1>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2rem",
            }}
          >
            {/* Email — bottom border only */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label
                htmlFor="email"
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  opacity: 0.35,
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                className="magic-input"
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 0,
                  padding: "0.5rem 0",
                  color: "#f0ebe0",
                  fontSize: "0.95rem",
                  fontFamily: "var(--font-dm), sans-serif",
                  transition: "border-bottom-color 0.2s ease",
                  width: "100%",
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#e07070",
                  margin: "-1rem 0 0",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="submit-btn"
              style={{
                background: "#7c3d18",
                color: "#f0ebe0",
                border: "none",
                borderRadius: "9999px",
                padding: "0.85rem",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "background 0.2s ease",
                fontFamily: "var(--font-dm), sans-serif",
              }}
            >
              {loading ? "Sending…" : "Send Magic Link"}
            </button>
          </form>

          {/* Back link */}
          <a
            href="/"
            className="back-link"
            style={{
              marginTop: "2.5rem",
              fontSize: "0.65rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              opacity: 0.22,
              color: "#f0ebe0",
              textDecoration: "none",
              textAlign: "center",
              transition: "opacity 0.2s ease",
            }}
          >
            ← Back
          </a>
        </div>
      )}
    </div>
  )
}
