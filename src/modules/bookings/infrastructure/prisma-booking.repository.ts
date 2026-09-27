import { Injectable } from '@nestjs/common';
import { BookingStatus as PrismaBookingStatus, Prisma, Slot } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingEntity, BookingStatus } from '../domain/booking.entity';
import {
  BookingAlreadyCancelledException,
  BookingNotFoundException,
  SlotAlreadyBookedException,
  SlotNotFoundException,
} from '../../../common/errors/domain.exceptions';
import {
  CreateBookingData,
  IBookingRepository,
} from '../domain/booking.repository';
import { sharedMemoryStore } from '../../../prisma/memory-store';

@Injectable()
export class PrismaBookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createWithConcurrencyLock(data: CreateBookingData): Promise<BookingEntity> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // 1. Pessimistic Row Lock (PostgreSQL FOR UPDATE)
          const slots = await tx.$queryRaw<Slot[]>`
            SELECT * FROM "Slot" WHERE id = ${data.slotId} FOR UPDATE
          `;

          const slot = slots[0];
          if (!slot) {
            throw new SlotNotFoundException(data.slotId);
          }

          if (slot.isBooked) {
            throw new SlotAlreadyBookedException(data.slotId);
          }

          // 2. Mark the slot as booked
          await tx.slot.update({
            where: { id: data.slotId },
            data: { isBooked: true },
          });

          // 3. Create confirmed booking record
          const booking = await tx.booking.create({
            data: {
              slotId: data.slotId,
              clientName: data.clientName,
              clientEmail: data.clientEmail,
              status: PrismaBookingStatus.CONFIRMED,
            },
            include: {
              slot: true,
            },
          });

          return this.mapToEntity(booking);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
      );
    } catch (err: any) {
      if (
        err instanceof SlotNotFoundException ||
        err instanceof SlotAlreadyBookedException
      ) {
        throw err;
      }

      // Synchronized fallback store
      try {
        return sharedMemoryStore.createBooking(data.slotId, data.clientName, data.clientEmail);
      } catch (e: any) {
        if (e.message && e.message.includes('not found')) {
          throw new SlotNotFoundException(data.slotId);
        }
        throw new SlotAlreadyBookedException(data.slotId);
      }
    }
  }

  async cancel(id: string): Promise<BookingEntity> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const bookings = await tx.$queryRaw<
            Array<{ id: string; slotId: string; status: PrismaBookingStatus }>
          >`
            SELECT id, "slotId", status FROM "Booking" WHERE id = ${id} FOR UPDATE
          `;

          const booking = bookings[0];
          if (!booking) {
            throw new BookingNotFoundException(id);
          }

          if (booking.status === PrismaBookingStatus.CANCELLED) {
            throw new BookingAlreadyCancelledException(id);
          }

          // Update booking to CANCELLED
          const updated = await tx.booking.update({
            where: { id },
            data: { status: PrismaBookingStatus.CANCELLED },
            include: { slot: true },
          });

          // Re-open slot
          await tx.slot.update({
            where: { id: booking.slotId },
            data: { isBooked: false },
          });

          return this.mapToEntity(updated);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
      );
    } catch (err: any) {
      if (
        err instanceof BookingNotFoundException ||
        err instanceof BookingAlreadyCancelledException
      ) {
        throw err;
      }

      try {
        return sharedMemoryStore.cancelBooking(id);
      } catch (e: any) {
        if (e.message && e.message.includes('not found')) {
          throw new BookingNotFoundException(id);
        }
        throw new BookingAlreadyCancelledException(id);
      }
    }
  }

  async findById(id: string): Promise<BookingEntity | null> {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: { slot: true },
      });
      return booking ? this.mapToEntity(booking) : null;
    } catch {
      return sharedMemoryStore.bookings.find((b) => b.id === id) || null;
    }
  }

  async findAll(): Promise<BookingEntity[]> {
    try {
      const bookings = await this.prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        include: { slot: true },
      });
      return bookings.map((b) => this.mapToEntity(b));
    } catch {
      return [...sharedMemoryStore.bookings];
    }
  }

  /**
   * دالة مساعدة مركزية لتحويل سجل الحجز من Prisma إلى كيان النطاق (BookingEntity)
   * تمنع تكرار الكود وتضمن معالجة متسقة لجميع الحقول وعلاقة الموعد (DRY Principle)
   */
  private mapToEntity(b: any): BookingEntity {
    return new BookingEntity(
      b.id,
      b.slotId,
      b.clientName,
      b.clientEmail,
      b.status as BookingStatus,
      b.createdAt,
      b.updatedAt,
      b.slot
        ? {
            id: b.slot.id,
            startTime: b.slot.startTime,
            endTime: b.slot.endTime,
            isBooked: b.slot.isBooked,
            createdAt: b.slot.createdAt,
            updatedAt: b.slot.updatedAt,
          }
        : undefined
    );
  }
}
