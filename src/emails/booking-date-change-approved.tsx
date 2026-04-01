import * as React from "react"

type Props = {
  guestName: string
  roomName: string
  newCheckin: string  // "YYYY-MM-DD"
  newCheckout: string // "YYYY-MM-DD"
  newPrice: number
  paymentAction: "topup_stripe" | "topup_etransfer" | "refund_stripe" | "refund_etransfer" | "none"
  refundAmount?: number
  checkoutUrl?: string
  bookingId: string
  accessToken: string
  landlordSlug: string
}

export function BookingDateChangeApprovedEmail({
  guestName,
  roomName,
  newCheckin,
  newCheckout,
  newPrice,
  paymentAction,
  refundAmount,
  checkoutUrl,
  bookingId,
  accessToken,
  landlordSlug,
}: Props) {
  const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${landlordSlug}/bookings/${bookingId}?token=${accessToken}`

  const formattedPrice = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(newPrice)

  const formattedRefund =
    refundAmount !== undefined
      ? new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(refundAmount)
      : null

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
        Date Change Approved — {roomName}
      </h2>
      <p>Hi {guestName},</p>
      <p>Your date change request has been approved.</p>
      <p><strong>New check-in:</strong> {newCheckin}</p>
      <p><strong>New check-out:</strong> {newCheckout}</p>
      <p><strong>New price:</strong> {formattedPrice}</p>

      {paymentAction === "topup_stripe" && checkoutUrl && (
        <>
          <p>A top-up payment is required to confirm your new dates. Please complete payment using the link below:</p>
          <p>
            <a
              href={checkoutUrl}
              style={{
                display: "inline-block",
                backgroundColor: "#2563eb",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: "500",
                marginTop: "8px",
              }}
            >
              Complete Top-Up Payment
            </a>
          </p>
        </>
      )}

      {paymentAction === "topup_etransfer" && (
        <p>
          A top-up e-transfer is required for the price difference. Your landlord will be in touch
          with payment details. Your new dates have been confirmed.
        </p>
      )}

      {paymentAction === "refund_stripe" && formattedRefund && (
        <p>
          A partial refund of <strong>{formattedRefund}</strong> has been issued to your card
          and should appear within 5–10 business days.
        </p>
      )}

      {paymentAction === "refund_etransfer" && formattedRefund && (
        <p>
          A partial e-transfer refund of <strong>{formattedRefund}</strong> will be sent to you
          by your landlord.
        </p>
      )}

      {paymentAction === "none" && (
        <p>Your dates have been updated. No payment change required.</p>
      )}

      <p>
        <a href={bookingUrl} style={{ color: "#2563eb" }}>
          View your booking
        </a>
      </p>
    </div>
  )
}
