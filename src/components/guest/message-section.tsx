"use client"

import { useEffect, useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
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
        // Success — clear textarea and refresh immediately (don't wait for next poll tick)
        setBody("")
        router.refresh()
      }
    })
  }

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Messages</h2>

      <div className="rounded-lg border border-gray-200 p-4 space-y-4">
        {/* Message thread */}
        <div className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id}>
                <p className="text-xs text-muted-foreground">
                  {msg.senderName} &middot;{" "}
                  {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                </p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap mt-0.5">
                  {msg.body}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Send form */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message..."
            rows={3}
            disabled={isPending}
          />
          <Button
            onClick={handleSend}
            disabled={isPending || !body.trim()}
          >
            {isPending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  )
}
