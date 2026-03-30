import { z } from "zod"

export const messageSchema = z.object({
  body: z.string().min(1, "Message cannot be empty"),
})

export const messageSchemaCoerced = z.object({
  body: z.string().min(1).max(2000),
})

export type MessageInput = z.infer<typeof messageSchema>
