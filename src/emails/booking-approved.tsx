import * as React from "react"

type Props = {
  guestName: string
  bookingId: string
  accessToken: string
  confirmedPrice: number
  roomName: string
  landlordSlug: string
}

export function BookingApprovedEmail({
  guestName,
  bookingId,
  accessToken,
  confirmedPrice,
  roomName,
  landlordSlug,
}: Props) {
  const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${landlordSlug}/bookings/${bookingId}?token=${accessToken}`
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
        To complete your booking, open your booking page and pay by card
        (via Stripe) or by e-transfer:
      </p>
      <p>
        <a
          href={bookingUrl}
          style={{
            display: "inline-block",
            background: "#2563eb",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          View booking &amp; pay
        </a>
      </p>
      <p style={{ fontSize: "13px", color: "#555" }}>
        If the button doesn&apos;t work, copy this link into your browser:
        <br />
        <a href={bookingUrl} style={{ color: "#2563eb" }}>
          {bookingUrl}
        </a>
      </p>
      <p>We look forward to hosting you!</p>
    </div>
  )
}
