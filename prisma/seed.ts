import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function main() {
  console.log('Seeding fixed appointment slots...');

  // Clean existing data for an idempotent seed
  await prisma.booking.deleteMany();
  await prisma.slot.deleteMany();

  // Create standard 30-minute slots starting from tomorrow
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 1);
  baseDate.setHours(9, 0, 0, 0); // Tomorrow at 09:00 AM

  const slotIntervals = [
    { startHour: 9, startMin: 0, endHour: 9, endMin: 30 },
    { startHour: 9, startMin: 30, endHour: 10, endMin: 0 },
    { startHour: 10, startMin: 0, endHour: 10, endMin: 30 },
    { startHour: 10, startMin: 30, endHour: 11, endMin: 0 },
    { startHour: 11, startMin: 0, endHour: 11, endMin: 30 },
    { startHour: 13, startMin: 0, endHour: 13, endMin: 30 },
    { startHour: 13, startMin: 30, endHour: 14, endMin: 0 },
    { startHour: 14, startMin: 0, endHour: 14, endMin: 30 },
    { startHour: 14, startMin: 30, endHour: 15, endMin: 0 },
    { startHour: 15, startMin: 0, endHour: 15, endMin: 30 },
  ];

  const slotsData = slotIntervals.map(({ startHour, startMin, endHour, endMin }) => {
    const startTime = new Date(baseDate);
    startTime.setHours(startHour, startMin, 0, 0);

    const endTime = new Date(baseDate);
    endTime.setHours(endHour, endMin, 0, 0);

    return {
      startTime,
      endTime,
      isBooked: false,
    };
  });

  await prisma.slot.createMany({
    data: slotsData,
  });

  const count = await prisma.slot.count();
  console.log(`Successfully seeded ${count} available appointment slots.`);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
