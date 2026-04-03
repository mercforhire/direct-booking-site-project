"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { submitDateChange, cancelDateChange } from "@/actions/date-change"
import { createDateChangeStripeCheckoutSession } from "@/actions/date-change"
import type { SerializedDateChange } from "./booking-status-view"

type Props = {
  booking: {
    id: string
    status: string
    checkin: string   // ISO string
    checkout: string  // ISO string
  }
  activeDateChange: SerializedDateChange | null
  token: string | null
}

function formatDate(iso: string): string {
  return format(new Date(iso.slice(0, 10) + "T00:00:00"), "MMMM d, yyyy")
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount)
}

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid color-mix(in srgb, var(--ll-text) 20%, transparent)",
  color: "color-mix(in srgb, var(--ll-text) 65%, transparent)",
  borderRadius: "9999px",
  padding: "0.5rem 1.2rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
  transition: "background 0.2s ease",
}

const primaryBtn: React.CSSProperties = {
  background: "var(--ll-accent)",
  border: "none",
  color: "var(--ll-text)",
  borderRadius: "9999px",
  padding: "0.55rem 1.5rem",
  fontSize: "0.75rem",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  cursor: "pointer",
  transition: "background 0.2s ease",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "color-mix(in srgb, var(--ll-text) 5%, transparent)",
  border: "1px solid color-mix(in srgb, var(--ll-text) 12%, transparent)",
  borderRadius: "8px",
  padding: "0.55rem 0.85rem",
  color: "var(--ll-text)",
  fontSize: "0.85rem",
  outline: "none",
  boxSizing: "border-box",
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.7rem",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  opacity: 0.4,
  marginBottom: "0.4rem",
}

export function DateChangeSection({ booking, activeDateChange, token }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [requestedCheckin, setRequestedCheckin] = useState("")
  const [requestedCheckout, setRequestedCheckout] = useState("")
  const [noteToLandlord, setNoteToLandlord] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isStripeLoading, startStripeTransition] = useTransition()

  if (booking.status !== "APPROVED" && booking.status !== "PAID" && activeDateChange?.status !== "PAID") {
    return null
  }

  // PAID state
  if (activeDateChange?.status === "PAID") {
    return (
      <div
        style={{
          background: "rgba(52,211,153,0.08)",
          border: "1px solid rgba(52,211,153,0.22)",
          borderRadius: "10px",
          padding: "1.1rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.65rem",
        }}
      >
        <span style={{ fontSize: "1rem" }}>✓</span>
        <span style={{ fontSize: "0.85rem", color: "#6ee7b7" }}>
          Date change confirmed. New dates:{" "}
          <strong>{formatDate(activeDateChange.requestedCheckin)}</strong>
          {" — "}
          <strong>{formatDate(activeDateChange.requestedCheckout)}</strong>
        </span>
      </div>
    )
  }

  function handleSubmit() {
    setValidationError(null)
    if (!requestedCheckin || !requestedCheckout) {
      setValidationError("Both check-in and check-out dates are required.")
      return
    }
    if (requestedCheckin >= requestedCheckout) {
      setValidationError("Check-out must be after check-in.")
      return
    }
    startTransition(async () => {
      const result = await submitDateChange(booking.id, {
        requestedCheckin,
        requestedCheckout,
        noteToLandlord: noteToLandlord.trim() || null,
      })
      if (result && "error" in result) {
        setValidationError("Failed to submit request. Please try again.")
        return
      }
      setSubmitted(true)
      setShowForm(false)
    })
  }

  function handleCancel() {
    startTransition(async () => {
      await cancelDateChange(booking.id, token)
    })
  }

  function handleStripePayment(dateChangeId: string) {
    startStripeTransition(async () => {
      await createDateChangeStripeCheckoutSession(dateChangeId)
    })
  }

  const sectionLabel = (
    <div
      style={{
        fontSize: "0.63rem",
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        opacity: 0.35,
        marginBottom: "0.75rem",
      }}
    >
      Date Change Request
    </div>
  )

  return (
    <div style={{ marginTop: "0.25rem" }}>
      {sectionLabel}

      {/* PENDING */}
      {activeDateChange?.status === "PENDING" && (
        <div
          style={{
            background: "rgba(251,191,36,0.07)",
            border: "1px solid rgba(251,191,36,0.22)",
            borderRadius: "10px",
            padding: "1.1rem 1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.85rem",
          }}
        >
          <p style={{ fontSize: "0.85rem", color: "#fcd34d", margin: 0, lineHeight: 1.6 }}>
            Date change requested:{" "}
            <strong>{formatDate(activeDateChange.requestedCheckin)}</strong>
            {" to "}
            <strong>{formatDate(activeDateChange.requestedCheckout)}</strong>
            {" "}— awaiting Leon&apos;s approval.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button style={ghostBtn} disabled={isPending}>
                {isPending ? "Cancelling…" : "Cancel Request"}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel date change request?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove your pending date change request. You can submit a new one after.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Request</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel}>
                  Yes, Cancel Request
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* APPROVED */}
      {activeDateChange?.status === "APPROVED" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div
            style={{
              background: "rgba(52,211,153,0.08)",
              border: "1px solid rgba(52,211,153,0.22)",
              borderRadius: "10px",
              padding: "1rem 1.25rem",
              fontSize: "0.85rem",
              color: "#6ee7b7",
            }}
          >
            Approved: {" "}
            <strong>{formatDate(activeDateChange.requestedCheckin)}</strong>
            {" – "}
            <strong>{formatDate(activeDateChange.requestedCheckout)}</strong>
          </div>

          {/* Stripe top-up */}
          {activeDateChange.stripeSessionId !== null && activeDateChange.newPrice !== null && (
            <div
              style={{
                background: "color-mix(in srgb, var(--ll-text) 3%, transparent)",
                border: "1px solid color-mix(in srgb, var(--ll-text) 7%, transparent)",
                borderRadius: "10px",
                padding: "1.25rem",
              }}
            >
              <div style={{ fontSize: "0.88rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                Payment Required
              </div>
              <p style={{ fontSize: "0.78rem", opacity: 0.55, marginBottom: "1rem", lineHeight: 1.5 }}>
                A top-up of <strong style={{ color: "var(--ll-accent)" }}>{formatCurrency(activeDateChange.newPrice)}</strong> is required to confirm your new dates.
              </p>
              <form action={() => handleStripePayment(activeDateChange.id)}>
                <button type="submit" disabled={isStripeLoading} style={{ ...primaryBtn, opacity: isStripeLoading ? 0.5 : 1 }}>
                  {isStripeLoading ? "Redirecting to Stripe…" : "Pay by Card"}
                </button>
              </form>
            </div>
          )}

          {/* E-transfer top-up */}
          {activeDateChange.stripeSessionId === null && activeDateChange.newPrice !== null && (
            <div
              style={{
                background: "rgba(212,149,106,0.07)",
                border: "1px solid rgba(212,149,106,0.22)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
                fontSize: "0.85rem",
                color: "var(--ll-accent)",
              }}
            >
              Payment of <strong>{formatCurrency(activeDateChange.newPrice)}</strong> required via e-transfer to confirm your new dates.
            </div>
          )}

          {/* No payment required */}
          {activeDateChange.newPrice === null && (
            <div
              style={{
                background: "rgba(52,211,153,0.07)",
                border: "1px solid rgba(52,211,153,0.2)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
                fontSize: "0.85rem",
                color: "#6ee7b7",
              }}
            >
              Your dates have been updated — no additional payment required.
            </div>
          )}
        </div>
      )}

      {/* DECLINED */}
      {activeDateChange?.status === "DECLINED" && (
        <div
          style={{
            background: "rgba(248,113,113,0.07)",
            border: "1px solid rgba(248,113,113,0.22)",
            borderRadius: "10px",
            padding: "1.1rem 1.25rem",
          }}
        >
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#f87171", marginBottom: "0.35rem" }}>
            Date change declined
          </div>
          {activeDateChange.declineReason && (
            <p style={{ fontSize: "0.82rem", color: "color-mix(in srgb, var(--ll-text) 55%, transparent)", margin: 0, lineHeight: 1.5 }}>
              Reason: {activeDateChange.declineReason}
            </p>
          )}
        </div>
      )}

      {/* No active request */}
      {activeDateChange === null && (
        <div>
          {submitted ? (
            <div
              style={{
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.22)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
                fontSize: "0.85rem",
                color: "#6ee7b7",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>✓</span>
              <span>Date change request submitted — Leon will email you once it&apos;s reviewed.</span>
            </div>
          ) : !showForm ? (
            <button style={ghostBtn} onClick={() => setShowForm(true)}>
              Request Date Change
            </button>
          ) : (
            <div
              style={{
                background: "color-mix(in srgb, var(--ll-text) 3%, transparent)",
                border: "1px solid color-mix(in srgb, var(--ll-text) 7%, transparent)",
                borderRadius: "10px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>Request new dates</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label htmlFor="new-checkin" style={labelStyle}>New Check-in</label>
                  <input
                    id="new-checkin"
                    type="date"
                    value={requestedCheckin}
                    onChange={(e) => setRequestedCheckin(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="new-checkout" style={labelStyle}>New Check-out</label>
                  <input
                    id="new-checkout"
                    type="date"
                    value={requestedCheckout}
                    onChange={(e) => setRequestedCheckout(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="date-change-note" style={labelStyle}>Note to Leon (optional)</label>
                <textarea
                  id="date-change-note"
                  rows={3}
                  value={noteToLandlord}
                  onChange={(e) => setNoteToLandlord(e.target.value)}
                  placeholder="Any notes for your date change request…"
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
              </div>

              {validationError && (
                <p style={{ fontSize: "0.78rem", color: "#f87171", margin: 0 }}>{validationError}</p>
              )}

              <div style={{ display: "flex", gap: "0.65rem" }}>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending}
                  style={{ ...primaryBtn, opacity: isPending ? 0.5 : 1, cursor: isPending ? "not-allowed" : "pointer" }}
                >
                  {isPending ? "Submitting…" : "Submit Request"}
                </button>
                <button
                  type="button"
                  style={ghostBtn}
                  onClick={() => {
                    setShowForm(false)
                    setRequestedCheckin("")
                    setRequestedCheckout("")
                    setNoteToLandlord("")
                    setValidationError(null)
                  }}
                  disabled={isPending}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
