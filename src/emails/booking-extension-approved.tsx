import * as React from "react"

type Props = {
  guestName: string
  roomName: string
  requestedCheckout: string // "YYYY-MM-DD"
  extensionPrice: number
  bookingId: string
  accessToken: string
  landlordSlug: string
}

export function BookingExtensionApprovedEmail({
  guestName,
  roomName,
  requestedCheckout,
  extensionPrice,
  bookingId,
  accessToken,
  landlordSlug,
}: Props) {
  const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${landlordSlug}/bookings/${bookingId}?token=${accessToken}`
  const formattedPrice = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(extensionPrice)

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
        Extension Approved — {roomName}
      </h2>
      <p>Hi {guestName},</p>
      <p>Your extension request has been approved.</p>
      <p><strong>New checkout date:</strong> {requestedCheckout}</p>
      <p><strong>Extension price:</strong> {formattedPrice}</p>
      <p>Please visit your booking page to complete payment:</p>
      <p>
        <a
          href={bookingUrl}
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
          Pay for Extension
        </a>
      </p>
    </div>
  )
}
