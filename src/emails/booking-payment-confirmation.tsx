import * as React from "react"

type Props = {
  guestName: string
  roomName: string
  checkin: string
  checkout: string
  amountPaid: number
  bookingId: string
}

export function BookingPaymentConfirmationEmail({
  guestName,
  roomName,
  checkin,
  checkout,
  amountPaid,
  bookingId,
}: Props) {
  const formattedAmount = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amountPaid)

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
        Your payment for <strong>{roomName}</strong> has been received. Your
        booking is now confirmed.
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
              Check-out
            </td>
            <td
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #e5e7eb",
                fontWeight: 600,
              }}
            >
              {checkout}
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
              Amount paid
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
            <td
              style={{
                padding: "8px 0",
                color: "#6b7280",
              }}
            >
              Booking reference
            </td>
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
      <p>We look forward to hosting you!</p>
    </div>
  )
}
