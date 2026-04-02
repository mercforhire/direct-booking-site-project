import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const landlord = await prisma.landlord.findUnique({ where: { slug: "henry" } })
  if (!landlord) {
    throw new Error("Landlord with slug 'henry' not found. Create it first via the admin panel.")
  }

  console.log(`Found landlord: ${landlord.name} (${landlord.id})`)

  const rooms = [
    {
      name: "Top Floor Sofa Room (Room 0)",
      description: `Motel style bedroom in a newly renovated house. Private ensuite attached washroom.

10 min walk to Yonge street and Finch subway. Ideal for couple or small family.

If parking is required, please inform us, space limited. For 2 guests requiring 2 beds (full bed + sofa bed), a one-time fee of $20 applies. The space is not suitable for infants and young kids.

Bedroom contains:
• Door has lock and key
• Full size bed
• Narrow Twin Bed (bedding prepared by request or if you have 3 guests)
• Mini fridge
• One pair of slippers per guest
• Table and chairs
• Set of towels per guest
• Brita water filter
• Facial tissue
• 32" TV with Netflix
• Fan and lamp

Private ensuite washroom contains:
• Hair dryer
• Shampoo, conditioner, shower gel
• Toilet paper (1-2 rolls)

Shared kitchen and common area:
• Induction stove, microwave, basic cookware
• Drip coffee machine, water purifier, kettle
• Plates, bowls, dining table, steam iron

No refills for washroom supplies — we provide enough for the first week. Kitchen is for light cooking, no oily/smelly foods. Laundry machines available — bring your own detergent.`,
      location: "Yonge & Finch, Toronto",
      baseNightlyRate: 0,
      cleaningFee: 0,
      extraGuestFee: 0,
      baseGuests: 2,
      maxGuests: 3,
    },
    {
      name: "Top Floor Ensuite Room (Room 1)",
      description: `Motel style bedroom in a newly renovated house. Private ensuite attached washroom.

10 min walk to Yonge street and Finch subway. Ideal for couple or individuals.

If parking is required, please inform us, space limited. The space is not suitable for infants and young kids.

Bedroom contains:
• Door has lock and key
• Full size bed
• Mini fridge
• One pair of slippers per guest
• Table and chairs
• Set of towels per guest
• Brita water filter
• Facial tissue
• 32" TV with Netflix
• Fan and lamp

Private ensuite washroom contains:
• Hair dryer
• Shampoo, conditioner, shower gel
• Toilet paper (1-2 rolls)

Shared kitchen and common area:
• Induction stove, microwave, basic cookware
• Drip coffee machine, water purifier, kettle
• Plates, bowls, dining table, steam iron

No refills for washroom supplies — we provide enough for the first week. Kitchen is for light cooking, no oily/smelly foods. Laundry machines available — bring your own detergent.`,
      location: "Yonge & Finch, Toronto",
      baseNightlyRate: 0,
      cleaningFee: 0,
      extraGuestFee: 0,
      baseGuests: 1,
      maxGuests: 2,
    },
    {
      name: "Top Floor Private Washroom Room (Room 2)",
      description: `Motel style bedroom in a newly renovated house. Private washroom is located in the hallway and is across from the bedroom.

10 min walk to Yonge street and Finch subway. Ideal for couple or individuals.

If parking is required, please inform us, space limited. The space is not suitable for infants and young kids.

Bedroom contains:
• Door has lock and key
• Full size bed
• Mini fridge
• One pair of slippers per guest
• Table and chairs
• Set of towels per guest
• Brita water filter
• Facial tissue
• 32" TV with Netflix
• Fan and lamp

Private dedicated washroom (across hallway) contains:
• Hair dryer
• Shampoo, conditioner, shower gel
• Toilet paper (1-2 rolls)

Shared kitchen and common area:
• Induction stove, microwave, basic cookware
• Drip coffee machine, water purifier, kettle
• Plates, bowls, dining table, steam iron

No refills for washroom supplies — we provide enough for the first week. Kitchen is for light cooking, no oily/smelly foods. Laundry machines available — bring your own detergent.`,
      location: "Yonge & Finch, Toronto",
      baseNightlyRate: 0,
      cleaningFee: 0,
      extraGuestFee: 0,
      baseGuests: 1,
      maxGuests: 2,
    },
    {
      name: "Basement Ensuite Room (Room 3)",
      description: `Motel style basement bedroom and washroom in a newly renovated house. Private ensuite attached washroom.

10 min walk to Yonge street and Finch subway. Ideal for 1 person or couples.

If parking is required, please inform us, space limited.

Bedroom contains:
• Door has lock and key
• Full size bed
• One pair of slippers per guest
• Table and chairs
• Set of towels per guest
• Brita water filter
• Facial tissue
• 32" TV with Netflix
• 500w space heater
• Fan and lamp

Private ensuite washroom contains:
• Hair dryer
• Shampoo, conditioner, shower gel
• Toilet paper (1-2 rolls)

Shared kitchen and common area:
• Induction stove, microwave, basic cookware
• Drip coffee machine, water purifier, kettle
• Plates, bowls, dining table, steam iron

No refills for washroom supplies — we provide enough for the first week. Kitchen is for light cooking, no ventilation fan, no oily/smelly foods. Laundry machines available — bring your own detergent.`,
      location: "Yonge & Finch, Toronto",
      baseNightlyRate: 0,
      cleaningFee: 0,
      extraGuestFee: 0,
      baseGuests: 1,
      maxGuests: 2,
    },
    {
      name: "2 Bedrooms + 2 Washrooms (Room 1+2 Combo)",
      description: `Motel style 2 bedrooms and 2 washrooms in a newly renovated house. Always 2 rooms provided!

Private ensuite attached washroom in one room and a private bathroom in hallway for the other room.

10 min walk to Yonge street and Finch subway. Ideal for 2 friends or 2 couples.

If parking is required, please inform us, space limited. The space is not suitable for infants and young kids.

Each bedroom contains:
• Door has lock and key
• Full size bed
• Mini fridge
• One pair of slippers per guest
• Table and chairs
• Set of towels per guest
• Brita water filter
• Facial tissue
• 32" TV with Netflix
• Fan and lamp

Private washrooms contain:
• Hair dryer
• Shampoo, conditioner, shower gel
• Toilet paper (1-2 rolls)

Shared kitchen and common area:
• Induction stove, microwave, basic cookware
• Drip coffee machine, water purifier, kettle
• Plates, bowls, dining table, steam iron

No refills for washroom supplies — we provide enough for the first week. Kitchen is for light cooking, no oily/smelly foods. Laundry machines available — bring your own detergent.`,
      location: "Yonge & Finch, Toronto",
      baseNightlyRate: 0,
      cleaningFee: 0,
      extraGuestFee: 0,
      baseGuests: 2,
      maxGuests: 4,
    },
  ]

  for (const room of rooms) {
    const created = await prisma.room.create({
      data: {
        ...room,
        landlordId: landlord.id,
      },
    })
    console.log(`Created room: ${created.name} [${created.id}]`)
  }

  console.log(`\nDone! Created ${rooms.length} rooms for ${landlord.name}.`)
  console.log("Photos need to be uploaded via the admin panel (Rooms > Edit > Upload Photos).")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
