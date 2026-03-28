import * as React from "react"

type Props = {
  guestName: string
  bookingId: string
  accessToken: string
  roomName: string
}

export function BookingPaidEmail({
  guestName,
  bookingId,
  accessToken,
  roomName,
}: Props) {
  const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/${bookingId}?token=${accessToken}`

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
        padding: "24px",
        color: "#111",
      }}
    >
      <p>Hi {guestName},</p>
      <p>
        We have received your payment for <strong>{roomName}</strong>. Your
        booking is now confirmed.
      </p>
      <p>You can view your booking details here:</p>
      <p>
        <a href={bookingUrl} style={{ color: "#2563eb" }}>
          {bookingUrl}
        </a>
      </p>
      <p>We look forward to hosting you!</p>
    </div>
  )
}
