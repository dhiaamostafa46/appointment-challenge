import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding fixed appointment slots...');

  // Reset database safely
  await prisma.booking.deleteMany();
  await prisma.slot.deleteMany();

  // Predefined fixed 30-minute appointment slots with startsAt and endsAt
  const fixedSlots = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      startsAt: new Date('2030-01-15T09:00:00.000Z'),
      endsAt: new Date('2030-01-15T09:30:00.000Z'),
      isBooked: false,
    },
    {
      id: '22222222-1111-4111-8111-111111111111',
      startsAt: new Date('2030-01-15T09:30:00.000Z'),
      endsAt: new Date('2030-01-15T10:00:00.000Z'),
      isBooked: false,
    },
    {
      id: '33333333-1111-4111-8111-111111111111',
      startsAt: new Date('2030-01-15T10:00:00.000Z'),
      endsAt: new Date('2030-01-15T10:30:00.000Z'),
      isBooked: false,
    },
    {
      id: '44444444-1111-4111-8111-111111111111',
      startsAt: new Date('2030-01-15T10:30:00.000Z'),
      endsAt: new Date('2030-01-15T11:00:00.000Z'),
      isBooked: false,
    },
    {
      id: '55555555-1111-4111-8111-111111111111',
      startsAt: new Date('2030-01-15T11:00:00.000Z'),
      endsAt: new Date('2030-01-15T11:30:00.000Z'),
      isBooked: false,
    },
    {
      id: '66666666-1111-4111-8111-111111111111',
      startsAt: new Date('2030-01-15T11:30:00.000Z'),
      endsAt: new Date('2030-01-15T12:00:00.000Z'),
      isBooked: false,
    },
    {
      id: '77777777-1111-4111-8111-111111111111',
      startsAt: new Date('2030-01-15T13:00:00.000Z'),
      endsAt: new Date('2030-01-15T13:30:00.000Z'),
      isBooked: false,
    },
    {
      id: '88888888-1111-4111-8111-111111111111',
      startsAt: new Date('2030-01-15T13:30:00.000Z'),
      endsAt: new Date('2030-01-15T14:00:00.000Z'),
      isBooked: false,
    },
    {
      id: '99999999-1111-4111-8111-111111111111',
      startsAt: new Date('2030-01-15T14:00:00.000Z'),
      endsAt: new Date('2030-01-15T14:30:00.000Z'),
      isBooked: false,
    },
    {
      id: 'aaaaaaaa-1111-4111-8111-111111111111',
      startsAt: new Date('2030-01-15T14:30:00.000Z'),
      endsAt: new Date('2030-01-15T15:00:00.000Z'),
      isBooked: false,
    },
  ];

  await prisma.slot.createMany({
    data: fixedSlots,
  });

  console.log(`Successfully seeded ${fixedSlots.length} available appointment slots.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
