import * as React from "react"

type Props = {
  bookingId: string
  guestName: string
  roomName: string
  confirmedPrice: number
  accessToken: string
}

export function BookingApprovedEmail({
  bookingId,
  guestName,
  roomName,
  confirmedPrice,
  accessToken,
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
        Great news! Your booking for <strong>{roomName}</strong> has been{" "}
        <strong>approved</strong>.
      </p>
      <p>
        Confirmed price: <strong>${confirmedPrice}</strong>
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
