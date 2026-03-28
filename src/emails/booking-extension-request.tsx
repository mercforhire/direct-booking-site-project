import * as React from "react"

type Props = {
  guestName: string
  roomName: string
  requestedCheckout: string // "YYYY-MM-DD"
  noteToLandlord: string | null
  bookingId: string
}

export function BookingExtensionRequestEmail({
  guestName,
  roomName,
  requestedCheckout,
  noteToLandlord,
  bookingId,
}: Props) {
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/bookings/${bookingId}`
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
        Extension Request — {roomName}
      </h2>
      <p>{guestName} has requested an extension for their booking.</p>
      <p><strong>New checkout date:</strong> {requestedCheckout}</p>
      {noteToLandlord && (
        <p><strong>Note from guest:</strong> {noteToLandlord}</p>
      )}
      <p>
        <a
          href={adminUrl}
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
          Review Extension Request
        </a>
      </p>
    </div>
  )
}
