import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const adminUserId = process.env.ADMIN_USER_ID
  if (!adminUserId) {
    throw new Error(
      "ADMIN_USER_ID environment variable is required for seeding. " +
      "Get your Supabase admin user ID from the Supabase dashboard (Authentication > Users)."
    )
  }

  // Upsert the High Hill landlord
  const landlord = await prisma.landlord.upsert({
    where: { slug: "highhill" },
    create: {
      slug: "highhill",
      name: "Leon's Home",
      ownerName: "Leon",
      address: "9 Highhill Dr, Scarborough, ON",
      email: process.env.LANDLORD_EMAIL ?? "highhill@uptrendinvestments.net",
      phone: null,
      bgColor: "#3a392a",
      textColor: "#f0ebe0",
      accentColor: "#d4956a",
      adminUserId,
    },
    update: {
      adminUserId,
      email: process.env.LANDLORD_EMAIL ?? "highhill@uptrendinvestments.net",
    },
  })

  console.log(`Landlord seeded: ${landlord.name} (${landlord.slug}) [${landlord.id}]`)

  // Backfill: assign all rooms without a landlordId to this landlord
  const orphanRooms = await prisma.room.updateMany({
    where: {
      NOT: { landlordId: landlord.id },
    },
    data: { landlordId: landlord.id },
  })
  if (orphanRooms.count > 0) {
    console.log(`Assigned ${orphanRooms.count} orphan rooms to ${landlord.slug}`)
  }

  // Backfill: migrate Settings from id="global" to landlord-scoped
  const globalSettings = await prisma.settings.findUnique({
    where: { id: "global" },
  })

  if (globalSettings) {
    // Check if landlord-scoped settings already exist
    const existingLandlordSettings = await prisma.settings.findUnique({
      where: { landlordId: landlord.id },
    })

    if (!existingLandlordSettings) {
      // Create new landlord-scoped settings with data from global
      await prisma.settings.create({
        data: {
          landlordId: landlord.id,
          serviceFeePercent: globalSettings.serviceFeePercent,
          depositAmount: globalSettings.depositAmount,
          etransferEmail: globalSettings.etransferEmail,
        },
      })
      console.log("Created landlord-scoped settings from global settings")
    }

    // Delete the old global row
    await prisma.settings.delete({ where: { id: "global" } })
    console.log("Deleted old global settings row")
  } else {
    // Ensure settings exist for this landlord
    await prisma.settings.upsert({
      where: { landlordId: landlord.id },
      create: {
        landlordId: landlord.id,
        serviceFeePercent: 14,
        depositAmount: 100,
      },
      update: {},
    })
    console.log("Ensured landlord settings exist")
  }

  console.log("Seed complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
