"use client"

import { useState, Suspense, use } from "react"
import { createClient } from "@/lib/supabase/client"
import { createGuestAccount } from "@/actions/auth"
import Link from "next/link"

function GuestSignupForm({ basePath }: { basePath: string }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await createGuestAccount({ name, email, phone, password })

    if ("error" in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Auto sign-in after account creation
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)
    if (signInError) {
      setError("Account created but sign-in failed. Please sign in manually.")
      return
    }

    window.location.href = `${basePath}/my-bookings`
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
            Create <span style={{ color: "var(--ll-accent, #d4956a)" }}>Account</span>
          </h1>

          {/* Form */}
          <form
            className="login-panel-delay"
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
          >
            {/* Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label
                htmlFor="name"
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  opacity: 0.35,
                }}
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                autoComplete="name"
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

            {/* Phone */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label
                htmlFor="phone"
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  opacity: 0.35,
                }}
              >
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                required
                autoComplete="tel"
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
                placeholder="Min. 8 characters"
                required
                autoComplete="new-password"
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
              {loading ? "Creating…" : "Create Account"}
            </button>

            {/* Already have account */}
            <div style={{ textAlign: "center", marginTop: "-0.75rem" }}>
              <Link
                href={`${basePath}/guest/login`}
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
                Already have an account? Sign in
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

export default function GuestSignupPage({
  params,
}: {
  params: Promise<{ landlord: string }>
}) {
  const { landlord: slug } = use(params)
  const basePath = `/${slug}`

  return (
    <Suspense>
      <GuestSignupForm basePath={basePath} />
    </Suspense>
  )
}
