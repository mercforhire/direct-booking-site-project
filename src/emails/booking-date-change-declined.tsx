import * as React from "react"

type Props = {
  guestName: string
  roomName: string
  requestedCheckin: string  // "YYYY-MM-DD"
  requestedCheckout: string // "YYYY-MM-DD"
  declineReason: string | null
  bookingId: string
  accessToken: string
  landlordSlug: string
}

export function BookingDateChangeDeclinedEmail({
  guestName,
  roomName,
  requestedCheckin,
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
        Date Change Declined — {roomName}
      </h2>
      <p>Hi {guestName},</p>
      <p>Your date change request has been declined.</p>
      <p>
        <strong>Requested check-in:</strong> {requestedCheckin}
        <br />
        <strong>Requested check-out:</strong> {requestedCheckout}
      </p>
      {declineReason && (
        <p><strong>Reason:</strong> {declineReason}</p>
      )}
      <p>
        Please{" "}
        <a href={bookingUrl} style={{ color: "#2563eb" }}>
          view your booking
        </a>{" "}
        for details or to submit a new request.
      </p>
    </div>
  )
}
