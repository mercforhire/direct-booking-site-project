"use server"

import { prisma } from "@/lib/prisma"
import { getLandlordForAdmin } from "@/lib/landlord"
import { roomSchemaCoerced } from "@/lib/validations/room"
import { revalidatePath } from "next/cache"

export async function createRoom(data: unknown) {
  const landlord = await getLandlordForAdmin()
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
        landlordId: landlord.id,
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
  revalidatePath("/admin/rooms")
  return { room }
}

export async function updateRoom(id: string, data: unknown) {
  const landlord = await getLandlordForAdmin()
  const parsed = roomSchemaCoerced.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  // Verify room belongs to this landlord
  const existing = await prisma.room.findUnique({ where: { id }, select: { landlordId: true } })
  if (!existing || existing.landlordId !== landlord.id) throw new Error("Room not found")

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
  revalidatePath("/admin/rooms")
  revalidatePath(`/admin/rooms/${id}`)
  return { room }
}

export async function deleteRoom(id: string) {
  const landlord = await getLandlordForAdmin()

  // Verify room belongs to this landlord
  const existing = await prisma.room.findUnique({ where: { id }, select: { landlordId: true } })
  if (!existing || existing.landlordId !== landlord.id) throw new Error("Room not found")

  const bookingCount = await prisma.booking.count({ where: { roomId: id } })
  if (bookingCount > 0) {
    return { error: `Cannot delete room with ${bookingCount} existing booking${bookingCount !== 1 ? "s" : ""}. Cancel all bookings first, or mark the room as inactive instead.` }
  }
  await prisma.room.delete({ where: { id } })
  revalidatePath("/rooms")
  revalidatePath("/admin/rooms")
  return { success: true }
}
