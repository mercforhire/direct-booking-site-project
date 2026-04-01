"use client"

import { useState, Suspense, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

function GuestLoginForm({ basePath }: { basePath: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const justReset = searchParams.get("reset") === "1"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    const next = searchParams.get("next") ?? `${basePath}/my-bookings`
    window.location.href = next
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <style>{`
        .login-panel { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .login-panel-delay { animation: fadeUp 0.8s 0.1s cubic-bezier(0.16,1,0.3,1) both; }
        .field-input:focus { border-bottom-color: var(--ll-accent, #d4956a) !important; outline: none; }
        .field-input::placeholder { color: rgba(240,235,224,0.2); }
        .submit-btn:hover:not(:disabled) { filter: brightness(0.85); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .forgot-link:hover { opacity: 0.6 !important; }
        .back-link:hover { opacity: 0.5 !important; }
        .back-nav:hover { opacity: 1 !important; }
      `}</style>

      {/* ── Nav ── */}
      <nav
        className="nav-pad"
        style={{
          display: "flex",
          alignItems: "center",
          padding: "1.4rem 3rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Link
          href={basePath}
          className="back-nav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "var(--ll-text, #f0ebe0)",
            textDecoration: "none",
            fontSize: "0.75rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.45,
            transition: "opacity 0.2s ease",
          }}
        >
          ← Back
        </Link>
      </nav>

      {/* ── Centered form ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 2rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: "300px" }}>
          {/* Accent rule */}
          <div
            className="login-panel"
            style={{
              width: "100%",
              height: "1px",
              background: "rgba(255,255,255,0.08)",
              marginBottom: "2.25rem",
            }}
          />

          {/* Headline */}
          <h1
            className="login-panel"
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "3rem",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              lineHeight: 0.9,
              margin: "0 0 2.25rem",
            }}
          >
            Welcome <span style={{ color: "var(--ll-accent, #d4956a)" }}>Back</span>
          </h1>

          {/* Reset success banner */}
          {justReset && (
            <div
              className="login-panel-delay"
              style={{
                marginBottom: "1.75rem",
                padding: "0.75rem 1rem",
                border: "1px solid rgba(212,149,106,0.35)",
                borderRadius: "6px",
                background: "rgba(212,149,106,0.08)",
                fontSize: "0.78rem",
                color: "var(--ll-accent, #d4956a)",
                lineHeight: 1.6,
              }}
            >
              Password updated — sign in with your new password.
            </div>
          )}

          {/* Form */}
          <form
            className="login-panel-delay"
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            {/* Email */}
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
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="field-input"
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 0,
                  padding: "0.5rem 0",
                  color: "var(--ll-text, #f0ebe0)",
                  fontSize: "0.95rem",
                  fontFamily: "var(--font-dm), sans-serif",
                  transition: "border-bottom-color 0.2s ease",
                  width: "100%",
                }}
              />
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label
                htmlFor="password"
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  opacity: 0.35,
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="field-input"
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 0,
                  padding: "0.5rem 0",
                  color: "var(--ll-text, #f0ebe0)",
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
                role="alert"
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
              className="submit-btn brown-btn"
              style={{
                background: "#7c3d18",
                color: "var(--ll-text, #f0ebe0)",
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
              {loading ? "Signing in…" : "Sign In"}
            </button>

            {/* Forgot password */}
            <div style={{ textAlign: "center", marginTop: "-0.75rem" }}>
              <Link
                href={`${basePath}/guest/forgot-password`}
                className="forgot-link"
                style={{
                  fontSize: "0.68rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  opacity: 0.3,
                  color: "var(--ll-text, #f0ebe0)",
                  textDecoration: "none",
                  transition: "opacity 0.2s ease",
                }}
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign-up nudge */}
            <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
              <Link
                href={`${basePath}/guest/signup`}
                className="forgot-link"
                style={{
                  fontSize: "0.68rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  opacity: 0.3,
                  color: "var(--ll-text, #f0ebe0)",
                  textDecoration: "none",
                  transition: "opacity 0.2s ease",
                }}
              >
                No account? Create one
              </Link>
            </div>
          </form>

          {/* Back link */}
          <Link
            href={basePath}
            className="back-link"
            style={{
              display: "block",
              marginTop: "3rem",
              fontSize: "0.65rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              opacity: 0.2,
              color: "var(--ll-text, #f0ebe0)",
              textDecoration: "none",
              textAlign: "center",
              transition: "opacity 0.2s ease",
            }}
          >
            ← Back to rooms
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function GuestLoginPage({
  params,
}: {
  params: Promise<{ landlord: string }>
}) {
  const { landlord: slug } = use(params)
  const basePath = `/${slug}`

  return (
    <Suspense>
      <GuestLoginForm basePath={basePath} />
    </Suspense>
  )
}
