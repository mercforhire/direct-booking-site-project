import * as React from "react"

type Props = {
  guestName: string
  roomName: string
  checkin: string
  checkout: string
  body: string
  bookingId: string
}

export function NewMessageLandlordEmail({
  guestName,
  roomName,
  checkin,
  checkout,
  body,
  bookingId,
}: Props) {
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/bookings/${bookingId}`
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
        New message from {guestName} — {roomName}
      </h2>
      <p>
        {checkin}–{checkout}
      </p>
      <p style={{ whiteSpace: "pre-wrap" }}>{body}</p>
      <p>
        <a href={adminUrl}>View booking</a>
      </p>
    </div>
  )
}
