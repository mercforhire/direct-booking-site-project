import * as React from "react"

type Props = {
  guestName: string
  bookingId: string
  roomName: string
  checkin: string
  checkout: string
  amountPaid: number
}

export function BookingPaymentNotificationEmail({
  guestName,
  bookingId,
  roomName,
  checkin,
  checkout,
  amountPaid,
}: Props) {
  const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/bookings/${bookingId}`
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
      <p style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>
        Payment Received
      </p>
      <p>
        A guest has completed payment for their booking. Here are the details:
      </p>
      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: "16px" }}>
        <tbody>
          <tr>
            <td style={{ padding: "8px 12px 8px 0", fontWeight: "bold", verticalAlign: "top", whiteSpace: "nowrap" }}>
              Guest
            </td>
            <td style={{ padding: "8px 0" }}>{guestName}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 12px 8px 0", fontWeight: "bold", verticalAlign: "top", whiteSpace: "nowrap" }}>
              Room
            </td>
            <td style={{ padding: "8px 0" }}>{roomName}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 12px 8px 0", fontWeight: "bold", verticalAlign: "top", whiteSpace: "nowrap" }}>
              Check-in
            </td>
            <td style={{ padding: "8px 0" }}>{checkin}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 12px 8px 0", fontWeight: "bold", verticalAlign: "top", whiteSpace: "nowrap" }}>
              Check-out
            </td>
            <td style={{ padding: "8px 0" }}>{checkout}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 12px 8px 0", fontWeight: "bold", verticalAlign: "top", whiteSpace: "nowrap" }}>
              Amount Paid
            </td>
            <td style={{ padding: "8px 0" }}>{formattedAmount}</td>
          </tr>
        </tbody>
      </table>
      <p>View the booking details here:</p>
      <p>
        <a href={bookingUrl} style={{ color: "#2563eb" }}>
          {bookingUrl}
        </a>
      </p>
    </div>
  )
}
