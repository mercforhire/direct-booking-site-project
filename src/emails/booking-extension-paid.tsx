import * as React from "react"

type Props = {
  guestName: string
  roomName: string
  checkin: string
  newCheckout: string
  extensionAmountPaid: number
  bookingId: string
  accessToken: string
  landlordSlug: string
}

export function BookingExtensionPaidEmail({
  guestName,
  roomName,
  checkin,
  newCheckout,
  extensionAmountPaid,
  bookingId,
  accessToken,
  landlordSlug,
}: Props) {
  const formattedAmount = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(extensionAmountPaid)

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
        Your extension payment for <strong>{roomName}</strong> has been received.
        Your booking has been updated with the new checkout date.
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
              Check-in
            </td>
            <td
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #e5e7eb",
                fontWeight: 600,
              }}
            >
              {checkin}
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
              Extension payment
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
      <p>We look forward to continuing your stay!</p>
    </div>
  )
}
