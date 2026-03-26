"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { roomSchemaCoerced } from "@/lib/validations/room"
import { revalidatePath } from "next/cache"

async function requireAuth() {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")
  return session
}

export async function createRoom(data: unknown) {
  await requireAuth()
  const parsed = roomSchemaCoerced.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { addOns, ...roomData } = parsed.data
  const room = await prisma.$transaction(async (tx) => {
    const created = await tx.room.create({
      data: {
        ...roomData,
        baseNightlyRate: roomData.baseNightlyRate,
        cleaningFee: roomData.cleaningFee,
        extraGuestFee: roomData.extraGuestFee,
      },
    })
    if (addOns.length > 0) {
      await tx.addOn.createMany({
        data: addOns.map((a) => ({ roomId: created.id, name: a.name, price: a.price })),
      })
    }
    return created
  })
  revalidatePath("/rooms")
  return { room }
}

export async function updateRoom(id: string, data: unknown) {
  await requireAuth()
  const parsed = roomSchemaCoerced.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const { addOns, ...roomData } = parsed.data
  const room = await prisma.$transaction(async (tx) => {
    const updated = await tx.room.update({ where: { id }, data: roomData })
    await tx.addOn.deleteMany({ where: { roomId: id } })
    if (addOns.length > 0) {
      await tx.addOn.createMany({
        data: addOns.map((a) => ({ roomId: id, name: a.name, price: a.price })),
      })
    }
    return updated
  })
  revalidatePath("/rooms")
  revalidatePath(`/rooms/${id}`)
  return { room }
}

export async function deleteRoom(id: string) {
  await requireAuth()
  await prisma.room.delete({ where: { id } })
  revalidatePath("/rooms")
  return { success: true }
}
