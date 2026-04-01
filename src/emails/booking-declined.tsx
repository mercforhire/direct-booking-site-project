import * as React from "react"

type Props = {
  guestName: string
  bookingId: string
  accessToken: string
  declineReason: string | null
  roomName: string
  landlordSlug: string
}

export function BookingDeclinedEmail({
  guestName,
  bookingId,
  accessToken,
  declineReason,
  roomName,
  landlordSlug,
}: Props) {
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
        We&apos;re sorry to let you know that your booking request for{" "}
        <strong>{roomName}</strong> has been <strong>declined</strong>.
      </p>
      {declineReason !== null && (
        <p>
          Reason: <em>{declineReason}</em>
        </p>
      )}
      <p>
        Please feel free to reach out if you have any questions or would like to
        explore other dates.
      </p>
      <p>You can view your booking details here:</p>
      <p>
        <a href={bookingUrl} style={{ color: "#2563eb" }}>
          {bookingUrl}
        </a>
      </p>
    </div>
  )
}
