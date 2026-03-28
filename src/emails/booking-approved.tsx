import * as React from "react"

type Props = {
  guestName: string
  bookingId: string
  accessToken: string
  confirmedPrice: number
  roomName: string
}

export function BookingApprovedEmail({
  guestName,
  bookingId,
  accessToken,
  confirmedPrice,
  roomName,
}: Props) {
  const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/${bookingId}?token=${accessToken}`
  const formattedPrice = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(confirmedPrice)

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
        Great news! Your booking request for <strong>{roomName}</strong> has
        been <strong>approved</strong>.
      </p>
      <p>
        Confirmed price: <strong>{formattedPrice}</strong>
      </p>
      <p>
        Payment instructions will be sent in a follow-up message. In the
        meantime, you can view your booking details here:
      </p>
      <p>
        <a href={bookingUrl} style={{ color: "#2563eb" }}>
          {bookingUrl}
        </a>
      </p>
      <p>We look forward to hosting you!</p>
    </div>
  )
}
