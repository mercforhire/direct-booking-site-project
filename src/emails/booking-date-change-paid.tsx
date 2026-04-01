import * as React from "react"

type Props = {
  guestName: string
  roomName: string
  newCheckin: string
  newCheckout: string
  amountPaid: number
  bookingId: string
  accessToken: string
  landlordSlug: string
}

export function BookingDateChangePaidEmail({
  guestName,
  roomName,
  newCheckin,
  newCheckout,
  amountPaid,
  bookingId,
  accessToken,
  landlordSlug,
}: Props) {
  const formattedAmount = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amountPaid)

  const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${landlordSlug}/bookings/${bookingId}?token=${accessToken}`

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
        Your date change payment for <strong>{roomName}</strong> has been received.
        Your booking has been updated with the new stay dates.
      </p>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "16px",
          marginBottom: "16px",
        }}
      >
        <tbody>
          <tr>
            <td
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #e5e7eb",
                color: "#6b7280",
                width: "40%",
              }}
            >
              Room
            </td>
            <td
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #e5e7eb",
                fontWeight: 600,
              }}
            >
              {roomName}
            </td>
          </tr>
          <tr>
            <td
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #e5e7eb",
                color: "#6b7280",
              }}
            >
              New check-in
            </td>
            <td
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #e5e7eb",
                fontWeight: 600,
                color: "#16a34a",
              }}
            >
              {newCheckin}
            </td>
          </tr>
          <tr>
            <td
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #e5e7eb",
                color: "#6b7280",
              }}
            >
              New check-out
            </td>
            <td
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #e5e7eb",
                fontWeight: 600,
                color: "#16a34a",
              }}
            >
              {newCheckout}
            </td>
          </tr>
          <tr>
            <td
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #e5e7eb",
                color: "#6b7280",
              }}
            >
              Top-up payment
            </td>
            <td
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #e5e7eb",
                fontWeight: 600,
                color: "#16a34a",
              }}
            >
              {formattedAmount}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", color: "#6b7280" }}>Booking reference</td>
            <td
              style={{
                padding: "8px 0",
                fontFamily: "monospace",
                fontSize: "13px",
              }}
            >
              {bookingId}
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        <a href={bookingUrl} style={{ color: "#2563eb" }}>
          View your updated booking
        </a>
      </p>
      <p>Your stay dates have been updated. We look forward to your visit!</p>
    </div>
  )
}
