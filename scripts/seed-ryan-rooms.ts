import { prisma } from "../src/lib/prisma"

const LANDLORD_SLUG = "ryan"
const BASE_RATE = 50

const ICAL = {
  room1: "https://www.airbnb.ca/calendar/ical/1673444537348428262.ics?t=258205ef14b440b5b87bb9382a761bcb",
  room3: "https://www.airbnb.ca/calendar/ical/1664892121244443216.ics?t=cae439f6a6d24546a62bf68877ebd285",
  room4: "https://www.airbnb.ca/calendar/ical/1664629282443394066.ics?t=d0596f5ce99a4bdebb414f4d10aae9ba",
  room5: "https://www.airbnb.ca/calendar/ical/1664618416783754444.ics?t=05e91ef060de40eda843a480a78b0784",
  combo: "https://www.airbnb.ca/calendar/ical/1664636996151124469.ics?t=407aaa86c8bf48e1af15510a605d8df5",
} as const

const SHARED_DESC_HEADER =
  "Much better location than the map location.\n\n" +
  "+1.4 km from Don Mills Station (Line 4 – Sheppard)\n" +
  "+1 km to grocery stores, restaurants & daily amenities along Sheppard Ave E\n" +
  "+25–30 minutes to Toronto Pearson Airport by car\n\n" +
  "Walking distance to Sheppard Ave, close to Fairview Mall and Don Mills subway.\n\n"

const ROOMS: Array<{
  key: keyof typeof ICAL
  name: string
  description: string
  maxGuests: number
  icalSources: Array<{ label: string; url: string }>
}> = [
  {
    key: "room1",
    name: "Comfy 2nd floor Ensuite near Don Mills Station /1",
    description:
      SHARED_DESC_HEADER +
      "2nd floor room in a peaceful compact house in a quiet neighbourhood. Ensuite washroom.\n\n" +
      "Shared kitchen on basement floor.\n\n" +
      "Parking space limited, always ask if we have space.\n\n" +
      "The space\nYou will have your own private room and washroom.\nThe kitchen will be shared by other guests.\n\n" +
      "No refills for washroom supplies, we provide enough for first week.",
    maxGuests: 2,
    icalSources: [{ label: "Airbnb — Room 1", url: ICAL.room1 }],
  },
  {
    key: "room3",
    name: "Comfy 1st floor room near Don Mills Station /3",
    description:
      SHARED_DESC_HEADER +
      "Enjoy a budget homely stay at this centrally located place. This house is nestled in a quiet neighborhood in Toronto. Perfect place to relax after a busy day exploring the city.\n\n" +
      "The space\nYou will have your own private room and washroom.\nThe kitchen will be shared by other guests.\n\n" +
      "Parking space limited, always ask if we have space.\n\n" +
      "No refills for washroom supplies, we provide enough for first week.",
    maxGuests: 2,
    icalSources: [{ label: "Airbnb — Room 3", url: ICAL.room3 }],
  },
  {
    key: "room4",
    name: "Comfy Cozy Trip Room near Don Mills Station /A",
    description:
      SHARED_DESC_HEADER +
      "Enjoy a budget basement room at this centrally located place. This house is nestled in a quiet neighborhood in Toronto. Perfect place to relax after a busy day exploring the city.\n\n" +
      "The space\nYou will have your own private room.\nThe kitchen and the bathroom will be shared by other guests.\nShared washroom in hallway with another room.\n\n" +
      "Parking space limited, always ask if we have space.\n\n" +
      "No refills for washroom supplies, we provide enough for first week.",
    maxGuests: 2,
    icalSources: [
      { label: "Airbnb — Room 4 (A)", url: ICAL.room4 },
      { label: "Airbnb — Basement combo (A+B)", url: ICAL.combo },
    ],
  },
  {
    key: "room5",
    name: "Comfy Cozy Trip Room near Don Mills Station /B",
    description:
      SHARED_DESC_HEADER +
      "Enjoy a budget basement room at this centrally located place. This house is nestled in a quiet neighborhood in Toronto. Perfect place to relax after a busy day exploring the city.\n\n" +
      "The space\nYou will have your own private room.\nThe kitchen and the bathroom will be shared by other guests.\nShared washroom in hallway with another room.\n\n" +
      "Parking space limited, always ask if we have space.\n\n" +
      "No refills for washroom supplies, we provide enough for first week.",
    maxGuests: 2,
    icalSources: [
      { label: "Airbnb — Room 5 (B)", url: ICAL.room5 },
      { label: "Airbnb — Basement combo (A+B)", url: ICAL.combo },
    ],
  },
  {
    key: "combo",
    name: "Comfy Cozy Trip 2 Rooms near Don Mills Station A+B",
    description:
      SHARED_DESC_HEADER +
      "Enjoy both basement rooms at this centrally located place. This house is nestled in a quiet neighborhood in Toronto. Perfect place to relax after a busy day exploring the city.\n\n" +
      "The space\nYou will have your own private rooms.\nThe kitchen will be shared by other guests.\nPrivate washroom in hallway for both rooms.\n\n" +
      "Parking space limited, always ask if we have space.\n\n" +
      "No refills for washroom supplies, we provide enough for first week.",
    maxGuests: 4,
    icalSources: [
      { label: "Airbnb — Basement combo (A+B)", url: ICAL.combo },
      { label: "Airbnb — Room 4 (A)", url: ICAL.room4 },
      { label: "Airbnb — Room 5 (B)", url: ICAL.room5 },
    ],
  },
]

async function main() {
  const dryRun = !process.argv.includes("--commit")

  const landlord = await prisma.landlord.findUnique({
    where: { slug: LANDLORD_SLUG },
    select: { id: true, address: true, name: true },
  })
  if (!landlord) throw new Error(`Landlord "${LANDLORD_SLUG}" not found`)

  console.log(`\n${dryRun ? "[DRY RUN]" : "[COMMITTING]"} landlord=${landlord.name} (${landlord.id})`)
  console.log(`location for all rooms: "${landlord.address}"\n`)

  for (const r of ROOMS) {
    console.log(`• ${r.name}`)
    console.log(`    maxGuests=${r.maxGuests}, baseNightlyRate=$${BASE_RATE}`)
    console.log(`    icalSources: ${r.icalSources.length}`)
    for (const s of r.icalSources) console.log(`      - ${s.label}`)
  }

  if (dryRun) {
    console.log("\n→ Re-run with --commit to insert.")
    return
  }

  for (const r of ROOMS) {
    await prisma.$transaction(async (tx) => {
      const created = await tx.room.create({
        data: {
          name: r.name,
          description: r.description,
          location: landlord.address,
          baseNightlyRate: BASE_RATE,
          cleaningFee: 0,
          extraGuestFee: 0,
          baseGuests: 1,
          maxGuests: r.maxGuests,
          isActive: true,
          landlordId: landlord.id,
        },
      })
      await tx.icalSource.createMany({
        data: r.icalSources.map((s) => ({ roomId: created.id, url: s.url, label: s.label })),
      })
      console.log(`✓ created room ${created.id} — ${r.name}`)
    })
  }

  console.log("\nDone.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
