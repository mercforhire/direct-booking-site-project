"use client"

import { useState, use } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

export default function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ landlord: string }>
}) {
  const { landlord: slug } = use(params)
  const basePath = `/${slug}`

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/${slug}/auth/confirm?type=recovery&next=/${slug}/guest/reset-password` }
    )

    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setSubmitted(true)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <style>{`
        .login-panel { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        .login-panel-delay { animation: fadeUp 0.8s 0.1s cubic-bezier(0.16,1,0.3,1) both; }
        .field-input:focus { border-bottom-color: var(--ll-accent, var(--ll-accent)) !important; outline: none; }
        .field-input::placeholder { color: rgba(240,235,224,0.2); }
        .submit-btn:hover:not(:disabled) { filter: brightness(0.85); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .back-nav:hover { opacity: 1 !important; }
        .back-link:hover { opacity: 0.5 !important; }
      `}</style>

      {/* ── Nav ── */}
      <nav
        className="nav-pad"
        style={{
          display: "flex",
          alignItems: "center",
          padding: "1.4rem 3rem",
          borderBottom: "1px solid color-mix(in srgb, var(--ll-text) 8%, transparent)",
        }}
      >
        <Link
          href={`${basePath}/guest/login`}
          className="back-nav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "var(--ll-text, var(--ll-text))",
            textDecoration: "none",
            fontSize: "0.75rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.45,
            transition: "opacity 0.2s ease",
          }}
        >
          ← Back to sign in
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
              background: "color-mix(in srgb, var(--ll-text) 8%, transparent)",
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
              margin: "0 0 1rem",
            }}
          >
            Reset <span style={{ color: "var(--ll-accent, var(--ll-accent))" }}>Password</span>
          </h1>

          <p
            className="login-panel"
            style={{
              fontSize: "0.82rem",
              opacity: 0.5,
              lineHeight: 1.6,
              marginBottom: "2.25rem",
            }}
          >
            {submitted
              ? "Check your email for a reset link."
              : "Enter your email and we\u2019ll send you a reset link."}
          </p>

          {!submitted && (
            <form
              className="login-panel-delay"
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "2rem" }}
            >
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
                    borderBottom: "1px solid color-mix(in srgb, var(--ll-text) 18%, transparent)",
                    borderRadius: 0,
                    padding: "0.5rem 0",
                    color: "var(--ll-text, var(--ll-text))",
                    fontSize: "0.95rem",
                    fontFamily: "var(--font-dm), sans-serif",
                    transition: "border-bottom-color 0.2s ease",
                    width: "100%",
                  }}
                />
              </div>

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

              <button
                type="submit"
                disabled={loading}
                className="submit-btn brown-btn"
                style={{
                  background: "var(--ll-accent)",
                  color: "var(--ll-text, var(--ll-text))",
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
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
          )}

          {/* Back to sign in */}
          <Link
            href={`${basePath}/guest/login`}
            className="back-link"
            style={{
              display: "block",
              marginTop: "3rem",
              fontSize: "0.65rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              opacity: 0.2,
              color: "var(--ll-text, var(--ll-text))",
              textDecoration: "none",
              textAlign: "center",
              transition: "opacity 0.2s ease",
            }}
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
