import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.room.updateMany({
    data: { minStayNights: 1 },
  });
  console.log(`Updated ${result.count} rooms to minStayNights = 1`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
