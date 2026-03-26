import { createUploadthing, type FileRouter } from "uploadthing/next"
import { createClient } from "@/lib/supabase/server"

const f = createUploadthing()

export const ourFileRouter = {
  roomPhotoUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 20 } })
    .middleware(async () => {
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) throw new Error("Unauthorized")
      return { userId: user.id }
    })
    .onUploadComplete(async ({ file }) => {
      // Return url and key to client — client then calls a server action to persist
      return { url: file.ufsUrl, key: file.key }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
