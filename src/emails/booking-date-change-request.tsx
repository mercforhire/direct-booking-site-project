import * as React from "react"

type Props = {
  guestName: string
  roomName: string
  originalCheckin: string
  originalCheckout: string
  requestedCheckin: string
  requestedCheckout: string
  noteToLandlord: string | null
  bookingId: string
}

export function BookingDateChangeRequestEmail({
  guestName,
  roomName,
  originalCheckin,
  originalCheckout,
  requestedCheckin,
  requestedCheckout,
  noteToLandlord,
  bookingId,
}: Props) {
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/bookings/${bookingId}`
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
        Date Change Request — {roomName}
      </h2>
      <p>{guestName} has requested new dates for their booking.</p>
      <p><strong>Original dates:</strong> {originalCheckin} to {originalCheckout}</p>
      <p><strong>Requested new dates:</strong> {requestedCheckin} to {requestedCheckout}</p>
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
          Review Date Change Request
        </a>
      </p>
    </div>
  )
}
