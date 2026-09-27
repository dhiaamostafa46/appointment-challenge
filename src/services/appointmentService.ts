import { BookingStatus, Prisma, PrismaClient, Slot } from '@prisma/client';
import crypto from 'crypto';

export const prisma = new PrismaClient();

// Custom Domain Errors
export class SlotNotFoundError extends Error {
  constructor(id: string) {
    super(`Slot with ID '${id}' was not found`);
    this.name = 'SlotNotFoundError';
  }
}

export class BookingNotFoundError extends Error {
  constructor(id: string) {
    super(`Booking with ID '${id}' was not found`);
    this.name = 'BookingNotFoundError';
  }
}

export class SlotAlreadyBookedError extends Error {
  constructor(slotId: string) {
    super(`Slot '${slotId}' is already booked`);
    this.name = 'SlotAlreadyBookedError';
  }
}

export class BookingAlreadyCancelledError extends Error {
  constructor(id: string) {
    super(`Booking '${id}' has already been cancelled`);
    this.name = 'BookingAlreadyCancelledError';
  }
}

// =========================================================================
// In-Memory Fallback Store (for local testing when PostgreSQL is not running)
// =========================================================================

interface InMemorySlot {
  id: string;
  startTime: Date;
  endTime: Date;
  isBooked: boolean;
  createdAt: Date;
  updatedAt: Date;
  bookings: InMemoryBooking[];
}

interface InMemoryBooking {
  id: string;
  slotId: string;
  clientName: string;
  clientEmail: string;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
  slot: InMemorySlot;
}

let useFallbackStore = false;
let warnedAboutFallback = false;

function initFallbackSlots(): InMemorySlot[] {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // We explicitly include the Swagger example UUID as the first slot for frictionless Swagger UI testing
  const slots: InMemorySlot[] = [
    {
      id: '4a2f8b50-3a1b-4f9e-9d22-123456789abc',
      startTime: new Date(new Date(tomorrow).setHours(9, 0, 0, 0)),
      endTime: new Date(new Date(tomorrow).setHours(9, 30, 0, 0)),
      isBooked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      bookings: [],
    },
    {
      id: crypto.randomUUID(),
      startTime: new Date(new Date(tomorrow).setHours(9, 30, 0, 0)),
      endTime: new Date(new Date(tomorrow).setHours(10, 0, 0, 0)),
      isBooked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      bookings: [],
    },
    {
      id: crypto.randomUUID(),
      startTime: new Date(new Date(tomorrow).setHours(10, 0, 0, 0)),
      endTime: new Date(new Date(tomorrow).setHours(10, 30, 0, 0)),
      isBooked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      bookings: [],
    },
    {
      id: crypto.randomUUID(),
      startTime: new Date(new Date(tomorrow).setHours(10, 30, 0, 0)),
      endTime: new Date(new Date(tomorrow).setHours(11, 0, 0, 0)),
      isBooked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      bookings: [],
    },
    {
      id: crypto.randomUUID(),
      startTime: new Date(new Date(tomorrow).setHours(11, 0, 0, 0)),
      endTime: new Date(new Date(tomorrow).setHours(11, 30, 0, 0)),
      isBooked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      bookings: [],
    },
    {
      id: crypto.randomUUID(),
      startTime: new Date(new Date(tomorrow).setHours(13, 0, 0, 0)),
      endTime: new Date(new Date(tomorrow).setHours(13, 30, 0, 0)),
      isBooked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      bookings: [],
    },
  ];

  return slots;
}

const memorySlots: InMemorySlot[] = initFallbackSlots();
const memoryBookings: InMemoryBooking[] = [];

async function withDbFallback<T>(prismaFn: () => Promise<T>, fallbackFn: () => Promise<T>): Promise<T> {
  if (useFallbackStore) {
    return fallbackFn();
  }

  try {
    return await prismaFn();
  } catch (error: any) {
    const isConnError =
      error?.name === 'PrismaClientInitializationError' ||
      error?.code === 'P1001' ||
      error?.code === 'P1000' ||
      error?.code === 'P1012' ||
      (typeof error?.message === 'string' && error.message.includes("Can't reach database server"));

    if (isConnError) {
      if (!warnedAboutFallback) {
        console.warn('⚠️  PostgreSQL is not reachable locally. Operating in in-memory mode for local testing.');
        warnedAboutFallback = true;
      }
      useFallbackStore = true;
      return fallbackFn();
    }
    throw error;
  }
}

// =========================================================================
// Service Functions
// =========================================================================

/**
 * List all fixed slots, optionally filtered by availability.
 */
export async function listSlots(options: { availableOnly?: boolean } = {}) {
  return withDbFallback(
    async () => {
      const where: Prisma.SlotWhereInput = {};
      if (options.availableOnly) {
        where.isBooked = false;
      }

      return prisma.slot.findMany({
        where,
        orderBy: { startTime: 'asc' },
        include: {
          bookings: {
            where: { status: BookingStatus.CONFIRMED },
            select: { id: true, clientName: true, clientEmail: true, status: true, createdAt: true },
          },
        },
      });
    },
    async () => {
      let filtered = [...memorySlots];
      if (options.availableOnly) {
        filtered = filtered.filter((s) => !s.isBooked);
      }
      return filtered.map((s) => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        isBooked: s.isBooked,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        bookings: s.bookings
          .filter((b) => b.status === BookingStatus.CONFIRMED)
          .map((b) => ({
            id: b.id,
            clientName: b.clientName,
            clientEmail: b.clientEmail,
            status: b.status,
            createdAt: b.createdAt,
          })),
      }));
    }
  );
}

/**
 * Retrieve a single slot by ID.
 */
export async function getSlot(id: string) {
  return withDbFallback(
    async () => {
      return prisma.slot.findUnique({
        where: { id },
        include: {
          bookings: {
            where: { status: BookingStatus.CONFIRMED },
          },
        },
      });
    },
    async () => {
      const slot = memorySlots.find((s) => s.id === id);
      if (!slot) return null;
      return {
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked: slot.isBooked,
        createdAt: slot.createdAt,
        updatedAt: slot.updatedAt,
        bookings: slot.bookings
          .filter((b) => b.status === BookingStatus.CONFIRMED)
          .map((b) => ({
            id: b.id,
            clientName: b.clientName,
            clientEmail: b.clientEmail,
            status: b.status,
            createdAt: b.createdAt,
          })),
      };
    }
  );
}

/**
 * Books a fixed slot with strict concurrency conflict prevention.
 */
export async function createBooking(input: {
  slotId: string;
  clientName: string;
  clientEmail: string;
}) {
  return withDbFallback(
    async () => {
      return prisma.$transaction(
        async (tx) => {
          // 1. Lock the slot row exclusively for update
          const slots = await tx.$queryRaw<Slot[]>`
            SELECT * FROM "Slot" WHERE id = ${input.slotId} FOR UPDATE
          `;

          const slot = slots[0];
          if (!slot) {
            throw new SlotNotFoundError(input.slotId);
          }

          if (slot.isBooked) {
            throw new SlotAlreadyBookedError(input.slotId);
          }

          // 2. Mark the slot as booked
          await tx.slot.update({
            where: { id: input.slotId },
            data: { isBooked: true },
          });

          // 3. Create confirmed booking record
          const booking = await tx.booking.create({
            data: {
              slotId: input.slotId,
              clientName: input.clientName,
              clientEmail: input.clientEmail,
              status: BookingStatus.CONFIRMED,
            },
            include: {
              slot: true,
            },
          });

          return booking;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
      );
    },
    async () => {
      // In-memory atomic reservation
      const slot = memorySlots.find((s) => s.id === input.slotId);
      if (!slot) {
        throw new SlotNotFoundError(input.slotId);
      }

      if (slot.isBooked) {
        throw new SlotAlreadyBookedError(input.slotId);
      }

      slot.isBooked = true;
      slot.updatedAt = new Date();

      const booking: InMemoryBooking = {
        id: crypto.randomUUID(),
        slotId: input.slotId,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        status: BookingStatus.CONFIRMED,
        createdAt: new Date(),
        updatedAt: new Date(),
        slot,
      };

      slot.bookings.push(booking);
      memoryBookings.push(booking);

      return {
        id: booking.id,
        slotId: booking.slotId,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        status: booking.status,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        slot: {
          id: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBooked: slot.isBooked,
          createdAt: slot.createdAt,
          updatedAt: slot.updatedAt,
        },
      };
    }
  );
}

/**
 * Cancels an active booking and immediately makes the slot available again.
 */
export async function cancelBooking(bookingId: string) {
  return withDbFallback(
    async () => {
      return prisma.$transaction(
        async (tx) => {
          const bookings = await tx.$queryRaw<
            Array<{ id: string; slotId: string; status: BookingStatus }>
          >`
            SELECT id, "slotId", status FROM "Booking" WHERE id = ${bookingId} FOR UPDATE
          `;

          const booking = bookings[0];
          if (!booking) {
            throw new BookingNotFoundError(bookingId);
          }

          if (booking.status === BookingStatus.CANCELLED) {
            throw new BookingAlreadyCancelledError(bookingId);
          }

          // 1. Update booking status to CANCELLED
          const updatedBooking = await tx.booking.update({
            where: { id: bookingId },
            data: { status: BookingStatus.CANCELLED },
            include: { slot: true },
          });

          // 2. Make the slot available again
          await tx.slot.update({
            where: { id: booking.slotId },
            data: { isBooked: false },
          });

          return updatedBooking;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
      );
    },
    async () => {
      const booking = memoryBookings.find((b) => b.id === bookingId);
      if (!booking) {
        throw new BookingNotFoundError(bookingId);
      }

      if (booking.status === BookingStatus.CANCELLED) {
        throw new BookingAlreadyCancelledError(bookingId);
      }

      booking.status = BookingStatus.CANCELLED;
      booking.updatedAt = new Date();

      const slot = memorySlots.find((s) => s.id === booking.slotId) || booking.slot;
      slot.isBooked = false;
      slot.updatedAt = new Date();

      return {
        id: booking.id,
        slotId: booking.slotId,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        status: booking.status,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        slot: {
          id: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBooked: slot.isBooked,
          createdAt: slot.createdAt,
          updatedAt: slot.updatedAt,
        },
      };
    }
  );
}

/**
 * Retrieve a booking by ID.
 */
export async function getBooking(id: string) {
  return withDbFallback(
    async () => {
      return prisma.booking.findUnique({
        where: { id },
        include: { slot: true },
      });
    },
    async () => {
      const booking = memoryBookings.find((b) => b.id === id);
      if (!booking) return null;
      return {
        id: booking.id,
        slotId: booking.slotId,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        status: booking.status,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        slot: {
          id: booking.slot.id,
          startTime: booking.slot.startTime,
          endTime: booking.slot.endTime,
          isBooked: booking.slot.isBooked,
          createdAt: booking.slot.createdAt,
          updatedAt: booking.slot.updatedAt,
        },
      };
    }
  );
}

/**
 * List all bookings.
 */
export async function listBookings(filters?: { status?: BookingStatus }) {
  return withDbFallback(
    async () => {
      return prisma.booking.findMany({
        where: filters?.status ? { status: filters.status } : undefined,
        orderBy: { createdAt: 'desc' },
        include: { slot: true },
      });
    },
    async () => {
      let list = [...memoryBookings];
      if (filters?.status) {
        list = list.filter((b) => b.status === filters.status);
      }
      return list.map((booking) => ({
        id: booking.id,
        slotId: booking.slotId,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        status: booking.status,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        slot: {
          id: booking.slot.id,
          startTime: booking.slot.startTime,
          endTime: booking.slot.endTime,
          isBooked: booking.slot.isBooked,
          createdAt: booking.slot.createdAt,
          updatedAt: booking.slot.updatedAt,
        },
      }));
    }
  );
}
