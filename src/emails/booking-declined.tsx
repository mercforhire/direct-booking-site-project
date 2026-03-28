import * as React from "react"

type Props = {
  bookingId: string
  guestName: string
  roomName: string
  declineReason?: string | null
  accessToken?: string
}

export function BookingDeclinedEmail({
  guestName,
  roomName,
  declineReason,
}: Props) {
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
        Unfortunately, your booking request for <strong>{roomName}</strong> has
        been <strong>declined</strong>.
      </p>
      {declineReason && (
        <p>
          Reason: <em>{declineReason}</em>
        </p>
      )}
      <p>
        Please feel free to reach out if you have any questions or would like to
        explore other dates.
      </p>
    </div>
  )
}
