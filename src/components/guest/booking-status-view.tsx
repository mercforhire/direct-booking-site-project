"use client"

import { useTransition } from "react"
import { format } from "date-fns"
import { createStripeCheckoutSession } from "@/actions/payment"
import { ExtensionSection, type SerializedExtension } from "./extension-section"
import { DateChangeSection } from "./date-change-section"
import { MessageSection, type SerializedMessage } from "./message-section"

// All Decimal fields coerced to number at RSC boundary
export type SerializedBooking = {
  id: string
  roomId: string
  guestName: string
  guestEmail: string
  guestPhone: string
  guestUserId: string | null
  checkin: string
  checkout: string
  numGuests: number
  selectedAddOnIds: string[]
  noteToLandlord: string | null
  estimatedTotal: number
  confirmedPrice: number | null
  stripeSessionId: string | null
  refundAmount: number | null
  cancelledAt: string | null
  status: string
  accessToken: string
  createdAt: string
  updatedAt: string
  room: {
    name: string
    location: string | null
    addOns: Array<{ id: string; name: string; price: number }>
  }
}

export type SerializedDateChange = {
  id: string
  bookingId: string
  requestedCheckin: string
  requestedCheckout: string
  newPrice: number | null
  status: "PENDING" | "APPROVED" | "DECLINED" | "PAID"
  declineReason: string | null
  stripeSessionId: string | null
  createdAt: string
}

type Props = {
  booking: SerializedBooking
  showSuccessBanner: boolean
  showPaidBanner: boolean
  showExtensionPaidBanner?: boolean
  showDateChangePaidBanner?: boolean
  etransferEmail: string | null
  activeExtension?: SerializedExtension | null
  activeDateChange?: SerializedDateChange | null
  blockedDates?: string[]
  messages: SerializedMessage[]
  token: string | null
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending review",
  APPROVED: "Approved",
  DECLINED: "Declined",
  PAID: "Paid",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

const STATUS_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  PENDING:   { bg: "rgba(251,191,36,0.1)",   border: "rgba(251,191,36,0.3)",   color: "#fcd34d" },
  APPROVED:  { bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.3)",   color: "#6ee7b7" },
  PAID:      { bg: "rgba(52,211,153,0.14)",  border: "rgba(52,211,153,0.4)",   color: "#34d399" },
  DECLINED:  { bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.3)",  color: "#f87171" },
  CANCELLED: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", color: "rgba(240,235,224,0.4)" },
  COMPLETED: { bg: "rgba(212,149,106,0.1)",  border: "rgba(212,149,106,0.3)",  color: "#d4956a" },
}

function formatDate(iso: string): string {
  return format(new Date(iso.slice(0, 10) + "T00:00:00"), "MMMM d, yyyy")
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount)
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: "9999px",
        padding: "0.28rem 0.85rem",
        fontSize: "0.7rem",
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: "5px", height: "5px", borderRadius: "9999px", background: s.color, display: "inline-block", flexShrink: 0 }} />
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function CancellationNotice({ booking }: { booking: SerializedBooking }) {
  const isStripe = !!booking.stripeSessionId
  const hasPayment = booking.refundAmount !== null

  return (
    <div
      style={{
        background: "rgba(248,113,113,0.08)",
        border: "1px solid rgba(248,113,113,0.25)",
        borderRadius: "10px",
        padding: "1.1rem 1.25rem",
      }}
    >
      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#f87171", marginBottom: "0.4rem", letterSpacing: "0.04em" }}>
        Booking Cancelled
      </div>
      {!hasPayment && (
        <p style={{ fontSize: "0.82rem", color: "rgba(240,235,224,0.55)", margin: 0 }}>
          This booking was cancelled. No payment was taken.
        </p>
      )}
      {hasPayment && isStripe && (
        <p style={{ fontSize: "0.82rem", color: "rgba(240,235,224,0.65)", margin: 0 }}>
          Refund of {formatCurrency(booking.refundAmount!)} will be returned to your card within 5–10 business days.
        </p>
      )}
      {hasPayment && !isStripe && (
        <p style={{ fontSize: "0.82rem", color: "rgba(240,235,224,0.65)", margin: 0 }}>
          Refund of {formatCurrency(booking.refundAmount!)} will be sent via e-transfer.
        </p>
      )}
    </div>
  )
}

function PaymentSection({
  booking,
  etransferEmail,
}: {
  booking: SerializedBooking
  etransferEmail: string | null
}) {
  const [isPending, startTransition] = useTransition()

  if (booking.status === "PAID") {
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
          marginTop: "1rem",
        }}
      >
        <span style={{ fontSize: "1.1rem" }}>✓</span>
        <span style={{ fontSize: "0.85rem", color: "#6ee7b7" }}>
          Payment received — Your host will be in touch with check-in details.
        </span>
      </div>
    )
  }

  if (booking.status !== "APPROVED") return null

  return (
    <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div
        style={{
          fontSize: "0.63rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          opacity: 0.35,
        }}
      >
        Complete your payment
      </div>

      {/* Pay by Card */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "10px",
          padding: "1.25rem",
        }}
      >
        <div style={{ fontSize: "0.88rem", fontWeight: 600, marginBottom: "0.4rem" }}>Pay by Card</div>
        <p style={{ fontSize: "0.78rem", opacity: 0.5, marginBottom: "1rem", lineHeight: 1.5 }}>
          Pay securely online using a credit or debit card via Stripe.
        </p>
        <form
          action={() => {
            startTransition(async () => {
              await createStripeCheckoutSession(booking.id)
            })
          }}
        >
          <button
            type="submit"
            disabled={isPending}
            style={{
              background: "#7c3d18",
              color: "#f0ebe0",
              border: "none",
              borderRadius: "9999px",
              padding: "0.7rem 1.8rem",
              fontSize: "0.78rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.5 : 1,
              transition: "background 0.2s ease",
            }}
          >
            {isPending ? "Redirecting to Stripe…" : "Pay by Card"}
          </button>
        </form>
      </div>

      {/* Pay by E-Transfer */}
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "10px",
          padding: "1.25rem",
        }}
      >
        <div style={{ fontSize: "0.88rem", fontWeight: 600, marginBottom: "0.85rem" }}>Pay by E-Transfer</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          {[
            ["Amount", booking.confirmedPrice != null ? formatCurrency(booking.confirmedPrice) : "—"],
            ["Send to", etransferEmail ?? "Contact host for e-transfer details"],
            ["Reference", booking.id],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "0.8rem" }}>
              <span style={{ opacity: 0.45 }}>{label}</span>
              <span
                style={{
                  fontWeight: label === "Reference" ? 400 : 500,
                  fontFamily: label === "Reference" ? "monospace" : "inherit",
                  fontSize: label === "Reference" ? "0.7rem" : "0.8rem",
                  opacity: label === "Reference" ? 0.55 : 1,
                  maxWidth: "60%",
                  textAlign: "right",
                  wordBreak: "break-all",
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "0.68rem", opacity: 0.3, marginTop: "0.75rem", lineHeight: 1.5 }}>
          Use your booking ID as the reference when sending.
        </p>
      </div>
    </div>
  )
}

export function BookingStatusView({
  booking,
  showSuccessBanner,
  showPaidBanner,
  showExtensionPaidBanner,
  showDateChangePaidBanner,
  etransferEmail,
  activeExtension,
  activeDateChange,
  blockedDates = [],
  messages,
  token,
}: Props) {
  const checkinStr = booking.checkin.slice(0, 10)
  const checkoutStr = booking.checkout.slice(0, 10)

  const selectedAddOns = booking.room.addOns.filter((a) =>
    booking.selectedAddOnIds.includes(a.id)
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

      {/* ── Banners ───────────────────────────────────────── */}
      {showSuccessBanner && (
        <div className="bs-banner-success">
          <span style={{ fontSize: "1rem" }}>✓</span>
          <span>Request submitted — Your host will email you once it&apos;s reviewed.</span>
        </div>
      )}
      {showPaidBanner && (
        <div className="bs-banner-success">
          <span style={{ fontSize: "1rem" }}>✓</span>
          <span>Payment successful — your booking is now confirmed.</span>
        </div>
      )}
      {showDateChangePaidBanner && (
        <div className="bs-banner-success">
          <span style={{ fontSize: "1rem" }}>✓</span>
          <span>Date change confirmed — your new dates are now active.</span>
        </div>
      )}

      {/* ── Header: room name + status ────────────────────── */}
      <div style={{ marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <h1
            style={{
              fontFamily: "var(--font-bebas)",
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              lineHeight: 0.9,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              margin: 0,
              color: "#f0ebe0",
            }}
          >
            {booking.room.name}
          </h1>
          <StatusPill status={booking.status} />
        </div>
        {booking.room.location && (
          <p style={{ fontSize: "0.78rem", opacity: 0.45, marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span>📍</span> {booking.room.location}
          </p>
        )}
      </div>

      {/* ── Dates ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <div className="bs-card" style={{ padding: "1rem 1.25rem" }}>
          <div className="bs-label">Check-in</div>
          <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#f0ebe0" }}>{formatDate(checkinStr)}</div>
        </div>
        <div className="bs-card" style={{ padding: "1rem 1.25rem" }}>
          <div className="bs-label">Check-out</div>
          <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#f0ebe0" }}>{formatDate(checkoutStr)}</div>
        </div>
      </div>

      {/* ── Booking details card ──────────────────────────── */}
      <div className="bs-card">
        {/* Guests */}
        <div className="bs-row">
          <div className="bs-label">Guests</div>
          <div className="bs-value">{booking.numGuests} {booking.numGuests === 1 ? "guest" : "guests"}</div>
        </div>

        {/* Add-ons */}
        {selectedAddOns.length > 0 && (
          <div className="bs-row">
            <div className="bs-label">Add-ons</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.1rem" }}>
              {selectedAddOns.map((addon) => (
                <div key={addon.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#f0ebe0" }}>
                  <span>{addon.name}</span>
                  <span style={{ opacity: 0.65 }}>{formatCurrency(addon.price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note to landlord */}
        {booking.noteToLandlord && (
          <div className="bs-row">
            <div className="bs-label">Note to host</div>
            <div className="bs-value" style={{ whiteSpace: "pre-line", opacity: 0.75, lineHeight: 1.6 }}>
              {booking.noteToLandlord}
            </div>
          </div>
        )}

        {/* Estimated total */}
        <div className="bs-row" style={{ borderBottom: booking.confirmedPrice != null ? undefined : "none" }}>
          <div className="bs-label">Estimated total</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span
              style={{
                fontFamily: "var(--font-bebas)",
                fontSize: "1.8rem",
                letterSpacing: "0.04em",
                color: booking.confirmedPrice != null ? "rgba(212,149,106,0.4)" : "#d4956a",
                lineHeight: 1,
                textDecoration: booking.confirmedPrice != null ? "line-through" : "none",
              }}
            >
              {formatCurrency(booking.estimatedTotal)}
            </span>
          </div>
          {booking.confirmedPrice == null && (
            <p style={{ fontSize: "0.68rem", opacity: 0.3, marginTop: "0.25rem", lineHeight: 1.5 }}>
              Final price confirmed at approval
            </p>
          )}
        </div>

        {/* Confirmed price — shown after landlord approves */}
        {booking.confirmedPrice != null && (
          <div className="bs-row" style={{ borderBottom: "none" }}>
            <div className="bs-label" style={{ color: "#6ee7b7" }}>Confirmed price</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span
                style={{
                  fontFamily: "var(--font-bebas)",
                  fontSize: "2rem",
                  letterSpacing: "0.04em",
                  color: "#d4956a",
                  lineHeight: 1,
                }}
              >
                {formatCurrency(booking.confirmedPrice)}
              </span>
            </div>
            <p style={{ fontSize: "0.68rem", opacity: 0.3, marginTop: "0.25rem", lineHeight: 1.5 }}>
              This is the amount you will be charged
            </p>
          </div>
        )}
      </div>

      {/* ── Cancellation notice ───────────────────────────── */}
      {booking.status === "CANCELLED" && <CancellationNotice booking={booking} />}

      {/* ── Payment section ───────────────────────────────── */}
      <PaymentSection booking={booking} etransferEmail={etransferEmail} />

      {/* ── Date change section — hidden for now, use messaging instead ── */}
      {/* {booking.status !== "CANCELLED" && booking.status !== "DECLINED" && booking.status !== "COMPLETED" && (
        <DateChangeSection
          booking={{ id: booking.id, status: booking.status, checkin: booking.checkin, checkout: booking.checkout }}
          activeDateChange={activeDateChange ?? null}
          token={token}
        />
      )} */}

      {/* ── Messages section ──────────────────────────────── */}
      <MessageSection bookingId={booking.id} token={token} messages={messages} />

      {/* ── Booking reference ─────────────────────────────── */}
      <p
        style={{
          fontSize: "0.65rem",
          opacity: 0.25,
          textAlign: "center",
          marginTop: "0.5rem",
          letterSpacing: "0.08em",
          fontFamily: "monospace",
        }}
      >
        Booking ref: {booking.id}
      </p>
    </div>
  )
}
