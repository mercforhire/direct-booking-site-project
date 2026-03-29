import * as React from "react"

type Props = {
  guestName: string
  roomName: string
  checkin: string // "YYYY-MM-DD"
  checkout: string // "YYYY-MM-DD"
  refundAmount: number | null
  paymentMethod: "stripe" | "etransfer" | "none"
  bookingId: string
  accessToken: string
}

export function BookingCancelledEmail({
  guestName,
  roomName,
  checkin,
  checkout,
  refundAmount,
  paymentMethod,
  bookingId,
  accessToken,
}: Props) {
  const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/${bookingId}?token=${accessToken}`

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
        Booking Cancelled — {roomName}
      </h2>
      <p>Hi {guestName},</p>
      <p>Your booking for <strong>{roomName}</strong> has been cancelled.</p>
      <p>
        <strong>Check-in:</strong> {checkin}
        <br />
        <strong>Check-out:</strong> {checkout}
      </p>
      {paymentMethod === "stripe" && refundAmount !== null && (
        <>
          <p>
            Refund of ${refundAmount.toFixed(2)} will be returned to your card within 5–10 business
            days.
          </p>
          <p>Stripe refunds typically take 5–10 business days to appear on your statement.</p>
        </>
      )}
      {paymentMethod === "etransfer" && refundAmount !== null && (
        <p>Refund of ${refundAmount.toFixed(2)} will be sent via e-transfer.</p>
      )}
      {paymentMethod === "none" && (
        <p>This booking was cancelled. No payment was taken.</p>
      )}
      <p>
        <a href={bookingUrl} style={{ color: "#2563eb" }}>
          View your booking
        </a>
      </p>
    </div>
  )
}
