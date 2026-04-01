import * as React from "react"

type Props = {
  guestName: string
  roomName: string
  requestedCheckout: string // "YYYY-MM-DD"
  declineReason: string | null
  bookingId: string
  accessToken: string
  landlordSlug: string
}

export function BookingExtensionDeclinedEmail({
  guestName,
  roomName,
  requestedCheckout,
  declineReason,
  bookingId,
  accessToken,
  landlordSlug,
}: Props) {
  const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${landlordSlug}/bookings/${bookingId}?token=${accessToken}`

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
        Extension Declined — {roomName}
      </h2>
      <p>Hi {guestName},</p>
      <p>
        Your extension request to {requestedCheckout} for <strong>{roomName}</strong> has been declined.
      </p>
      {declineReason && (
        <p><strong>Reason:</strong> {declineReason}</p>
      )}
      <p>
        <a href={bookingUrl} style={{ color: "#2563eb" }}>
          View your booking
        </a>
      </p>
    </div>
  )
}
