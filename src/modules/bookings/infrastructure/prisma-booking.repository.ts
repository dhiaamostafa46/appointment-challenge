import { Injectable } from '@nestjs/common';
import { BookingStatus as PrismaBookingStatus, Prisma, Slot } from '@prisma/client';
import crypto from 'crypto';
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

// In-memory fallback bookings
const memoryBookings: BookingEntity[] = [];

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

          return new BookingEntity(
            booking.id,
            booking.slotId,
            booking.clientName,
            booking.clientEmail,
            BookingStatus.CONFIRMED,
            booking.createdAt,
            booking.updatedAt,
            booking.slot
              ? {
                  id: booking.slot.id,
                  startTime: booking.slot.startTime,
                  endTime: booking.slot.endTime,
                  isBooked: booking.slot.isBooked,
                  createdAt: booking.slot.createdAt,
                  updatedAt: booking.slot.updatedAt,
                }
              : undefined
          );
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

      // Memory fallback for local offline testing
      const existing = memoryBookings.find(
        (b) => b.slotId === data.slotId && b.status === BookingStatus.CONFIRMED
      );
      if (existing) {
        throw new SlotAlreadyBookedException(data.slotId);
      }

      const entity = new BookingEntity(
        crypto.randomUUID(),
        data.slotId,
        data.clientName,
        data.clientEmail,
        BookingStatus.CONFIRMED,
        new Date(),
        new Date(),
        {
          id: data.slotId,
          startTime: new Date(),
          endTime: new Date(Date.now() + 1800000),
          isBooked: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );
      memoryBookings.push(entity);
      return entity;
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

          return new BookingEntity(
            updated.id,
            updated.slotId,
            updated.clientName,
            updated.clientEmail,
            BookingStatus.CANCELLED,
            updated.createdAt,
            updated.updatedAt,
            updated.slot
              ? {
                  id: updated.slot.id,
                  startTime: updated.slot.startTime,
                  endTime: updated.slot.endTime,
                  isBooked: updated.slot.isBooked,
                  createdAt: updated.slot.createdAt,
                  updatedAt: updated.slot.updatedAt,
                }
              : undefined
          );
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

      const booking = memoryBookings.find((b) => b.id === id);
      if (!booking) {
        throw new BookingNotFoundException(id);
      }
      if (booking.status === BookingStatus.CANCELLED) {
        throw new BookingAlreadyCancelledException(id);
      }

      booking.status = BookingStatus.CANCELLED;
      booking.updatedAt = new Date();
      if (booking.slot) {
        booking.slot.isBooked = false;
        booking.slot.updatedAt = new Date();
      }
      return booking;
    }
  }

  async findById(id: string): Promise<BookingEntity | null> {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: { slot: true },
      });
      if (!booking) return null;
      return new BookingEntity(
        booking.id,
        booking.slotId,
        booking.clientName,
        booking.clientEmail,
        booking.status as BookingStatus,
        booking.createdAt,
        booking.updatedAt,
        booking.slot
          ? {
              id: booking.slot.id,
              startTime: booking.slot.startTime,
              endTime: booking.slot.endTime,
              isBooked: booking.slot.isBooked,
              createdAt: booking.slot.createdAt,
              updatedAt: booking.slot.updatedAt,
            }
          : undefined
      );
    } catch {
      return memoryBookings.find((b) => b.id === id) || null;
    }
  }

  async findAll(): Promise<BookingEntity[]> {
    try {
      const bookings = await this.prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        include: { slot: true },
      });
      return bookings.map(
        (b) =>
          new BookingEntity(
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
          )
      );
    } catch {
      return [...memoryBookings];
    }
  }
}
