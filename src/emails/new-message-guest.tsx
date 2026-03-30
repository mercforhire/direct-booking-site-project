import * as React from "react"

type Props = {
  guestName: string
  roomName: string
  checkin: string
  checkout: string
  body: string
  bookingId: string
  accessToken: string
}

export function NewMessageGuestEmail({
  guestName,
  roomName,
  checkin,
  checkout,
  body,
  bookingId,
  accessToken,
}: Props) {
  const guestUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/${bookingId}?token=${accessToken}`
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", padding: "24px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>
        New message from your host — {roomName}
      </h2>
      <p>Hi {guestName},</p>
      <p>
        {checkin}–{checkout}
      </p>
      <p style={{ whiteSpace: "pre-wrap" }}>{body}</p>
      <p>
        <a href={guestUrl}>View booking</a>
      </p>
    </div>
  )
}
