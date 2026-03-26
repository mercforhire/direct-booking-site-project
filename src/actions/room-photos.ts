"use server"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { UTApi } from "uploadthing/server"

const utapi = new UTApi()

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")
  return user
}

// Called after UploadThing completes — persists photo to DB with next position
export async function addPhoto(roomId: string, url: string, key: string) {
  await requireAuth()
  const existing = await prisma.roomPhoto.findMany({
    where: { roomId },
    orderBy: { position: "desc" },
    take: 1,
  })
  const nextPosition = existing.length > 0 ? existing[0].position + 1 : 0
  const photo = await prisma.roomPhoto.create({
    data: { roomId, url, key, position: nextPosition },
  })
  revalidatePath(`/rooms/${roomId}`)
  return { photo }
}

// Called after drag-to-reorder — updates all position integers in a transaction
export async function savePhotoOrder(roomId: string, orderedIds: string[]) {
  await requireAuth()
  await prisma.$transaction(
    orderedIds.map((id, position) =>
      prisma.roomPhoto.update({ where: { id }, data: { position } })
    )
  )
  revalidatePath(`/rooms/${roomId}`)
  return { success: true }
}

// Deletes photo from DB and UploadThing CDN
export async function deletePhoto(photoId: string, key: string, roomId: string) {
  await requireAuth()
  await prisma.roomPhoto.delete({ where: { id: photoId } })
  // Renumber remaining photos to keep positions contiguous
  const remaining = await prisma.roomPhoto.findMany({
    where: { roomId },
    orderBy: { position: "asc" },
  })
  await prisma.$transaction(
    remaining.map((p, position) =>
      prisma.roomPhoto.update({ where: { id: p.id }, data: { position } })
    )
  )
  // Delete from CDN
  await utapi.deleteFiles([key])
  revalidatePath(`/rooms/${roomId}`)
  return { success: true }
}
