import * as React from "react"

type Props = {
  guestName: string
  bookingId: string
  roomName: string
  checkin: string
  checkout: string
  numGuests: number
  estimatedTotal: number
}

export function BookingNotificationEmail({
  guestName,
  bookingId,
  roomName,
  checkin,
  checkout,
  numGuests,
  estimatedTotal,
}: Props) {
  const bookingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/bookings/${bookingId}`
  const formattedTotal = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(estimatedTotal)

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
        New Booking Request
      </p>
      <p>
        A new booking request has been submitted. Here are the details:
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
              Guests
            </td>
            <td style={{ padding: "8px 0" }}>{numGuests}</td>
          </tr>
          <tr>
            <td style={{ padding: "8px 12px 8px 0", fontWeight: "bold", verticalAlign: "top", whiteSpace: "nowrap" }}>
              Estimated Total
            </td>
            <td style={{ padding: "8px 0" }}>{formattedTotal}</td>
          </tr>
        </tbody>
      </table>
      <p>View the booking details and respond here:</p>
      <p>
        <a href={bookingUrl} style={{ color: "#2563eb" }}>
          {bookingUrl}
        </a>
      </p>
    </div>
  )
}
