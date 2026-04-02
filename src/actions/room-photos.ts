"use server"

import { prisma } from "@/lib/prisma"
import { getLandlordIdsForAdmin } from "@/lib/landlord"
import { revalidatePath } from "next/cache"
import { UTApi } from "uploadthing/server"

const utapi = new UTApi()

async function verifyRoomOwnership(roomId: string, landlordIds: string[]) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { landlordId: true } })
  if (!room || !landlordIds.includes(room.landlordId)) throw new Error("Room not found")
}

// Called after UploadThing completes — persists photo to DB with next position
export async function addPhoto(roomId: string, url: string, key: string) {
  const landlordIds = await getLandlordIdsForAdmin()
  await verifyRoomOwnership(roomId, landlordIds)
  const existing = await prisma.roomPhoto.findMany({
    where: { roomId },
    orderBy: { position: "desc" },
    take: 1,
  })
  const nextPosition = existing.length > 0 ? existing[0].position + 1 : 0
  const photo = await prisma.roomPhoto.create({
    data: { roomId, url, key, position: nextPosition },
  })
  revalidatePath(`/admin/rooms/${roomId}`)
  return { photo }
}

// Called after drag-to-reorder — updates all position integers in a transaction
export async function savePhotoOrder(roomId: string, orderedIds: string[]) {
  const landlordIds = await getLandlordIdsForAdmin()
  await verifyRoomOwnership(roomId, landlordIds)
  await prisma.$transaction(
    orderedIds.map((id, position) =>
      prisma.roomPhoto.update({ where: { id }, data: { position } })
    )
  )
  revalidatePath(`/admin/rooms/${roomId}`)
  return { success: true }
}

// Deletes photo from DB and UploadThing CDN
export async function deletePhoto(photoId: string, key: string, roomId: string) {
  const landlordIds = await getLandlordIdsForAdmin()
  await verifyRoomOwnership(roomId, landlordIds)
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
  revalidatePath(`/admin/rooms/${roomId}`)
  return { success: true }
}
