import * as React from "react"

type Props = {
  guestName: string
  roomName: string
  checkin: string   // "YYYY-MM-DD"
  checkout: string  // "YYYY-MM-DD"
  body: string
  bookingId: string
  accessToken: string
  landlordSlug: string
}

export function NewMessageGuestEmail({
  guestName,
  roomName,
  checkin,
  checkout,
  body,
  bookingId,
  accessToken,
  landlordSlug,
}: Props) {
  const guestUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${landlordSlug}/bookings/${bookingId}?token=${accessToken}`
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", padding: "24px", color: "#111" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "4px" }}>
        Host
      </h2>
      <p style={{ margin: "0 0 4px 0", color: "#6b7280", fontSize: "14px" }}>
        {roomName}, {checkin}–{checkout}
      </p>
      <p style={{ margin: "0 0 16px 0", fontSize: "14px" }}>Hi {guestName},</p>
      <div
        style={{
          backgroundColor: "#f9f9f9",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          padding: "12px 16px",
          whiteSpace: "pre-line",
          fontSize: "14px",
          lineHeight: "1.6",
          marginBottom: "24px",
        }}
      >
        {body}
      </div>
      <p style={{ margin: 0 }}>
        <a
          href={guestUrl}
          style={{
            display: "inline-block",
            backgroundColor: "#2563eb",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "6px",
            textDecoration: "none",
            fontWeight: "500",
            fontSize: "14px",
          }}
        >
          View booking and reply
        </a>
      </p>
    </div>
  )
}
