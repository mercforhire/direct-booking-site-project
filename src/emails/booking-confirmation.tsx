import * as React from "react"

type Props = {
  bookingId: string
  accessToken: string
  guestName: string
  landlordSlug: string
}

export function BookingConfirmationEmail({
  bookingId,
  accessToken,
  guestName,
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
        Your booking request has been received and is currently pending review.
      </p>
      <p>You can view your booking status here:</p>
      <p>
        <a href={bookingUrl} style={{ color: "#2563eb" }}>
          {bookingUrl}
        </a>
      </p>
      <p>We&apos;ll be in touch shortly.</p>
    </div>
  )
}
