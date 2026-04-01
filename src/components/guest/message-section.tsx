"use client"

import { useEffect, useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { submitMessage, sendMessageAsLandlord } from "@/actions/messaging"

export type SerializedMessage = {
  id: string
  sender: "GUEST" | "LANDLORD"
  senderName: string
  body: string
  createdAt: string // ISO string — serialized at RSC boundary
}

type Props = {
  bookingId: string
  token: string | null // null = admin/landlord mode
  messages: SerializedMessage[]
}

export function MessageSection({ bookingId, token, messages }: Props) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [isPending, startTransition] = useTransition()

  // Poll every 15 seconds to pick up new messages from the other party
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
    }, 15_000)
    return () => clearInterval(id)
  }, [router])

  function handleSend() {
    if (!body.trim() || isPending) return
    startTransition(async () => {
      let result: { error?: unknown; success?: boolean } | undefined
      if (token !== null) {
        result = await submitMessage(bookingId, token, { body: body.trim() })
      } else {
        result = await sendMessageAsLandlord(bookingId, { body: body.trim() })
      }
      if (!result || !("error" in result)) {
        setBody("")
        router.refresh()
      }
    })
  }

  const isGuest = token !== null

  return (
    <div style={{ marginTop: "0.25rem" }}>
      <div
        style={{
          fontSize: "0.63rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          opacity: 0.35,
          marginBottom: "0.75rem",
        }}
      >
        Messages
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        {/* Message thread */}
        <div
          style={{
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            minHeight: messages.length === 0 ? "80px" : undefined,
          }}
        >
          {messages.length === 0 ? (
            <p style={{ fontSize: "0.8rem", opacity: 0.3, margin: 0 }}>
              No messages yet. Send Leon a message below.
            </p>
          ) : (
            messages.map((msg) => {
              const isGuestMsg = msg.sender === "GUEST"
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isGuestMsg ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      background: isGuestMsg
                        ? "rgba(212,149,106,0.14)"
                        : "rgba(255,255,255,0.06)",
                      border: `1px solid ${isGuestMsg ? "rgba(212,149,106,0.22)" : "rgba(255,255,255,0.09)"}`,
                      borderRadius: isGuestMsg ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                      padding: "0.65rem 0.9rem",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.85rem",
                        color: "#f0ebe0",
                        whiteSpace: "pre-wrap",
                        margin: 0,
                        lineHeight: 1.6,
                      }}
                    >
                      {msg.body}
                    </p>
                  </div>
                  <p
                    style={{
                      fontSize: "0.65rem",
                      opacity: 0.3,
                      marginTop: "0.25rem",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {msg.senderName} &middot; {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
              )
            })
          )}
        </div>

        {/* Send form */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "1rem 1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.65rem",
          }}
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message to Leon…"
            rows={3}
            disabled={isPending}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              padding: "0.65rem 0.85rem",
              color: "#f0ebe0",
              fontSize: "0.85rem",
              resize: "vertical",
              transition: "border-color 0.2s ease",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(212,149,106,0.5)" }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending || !body.trim()}
              style={{
                background: "#7c3d18",
                color: "#f0ebe0",
                border: "none",
                borderRadius: "9999px",
                padding: "0.55rem 1.5rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: isPending || !body.trim() ? "not-allowed" : "pointer",
                opacity: isPending || !body.trim() ? 0.4 : 1,
                transition: "background 0.2s ease, opacity 0.15s ease",
              }}
            >
              {isPending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
