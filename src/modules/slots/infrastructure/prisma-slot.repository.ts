import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ISlotRepository } from '../domain/slot.repository';
import { SlotEntity } from '../domain/slot.entity';

import { sharedMemoryStore } from '../../../prisma/memory-store';

@Injectable()
export class PrismaSlotRepository implements ISlotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(options?: { availableOnly?: boolean }): Promise<SlotEntity[]> {
    try {
      const where: Prisma.SlotWhereInput = {};
      if (options?.availableOnly) {
        where.isBooked = false;
      }

      const slots = await this.prisma.slot.findMany({
        where,
        orderBy: { startTime: 'asc' },
        include: {
          bookings: {
            where: { status: BookingStatus.CONFIRMED },
            select: { id: true, clientName: true, clientEmail: true, status: true, createdAt: true },
          },
        },
      });

      return slots.map(
        (s) =>
          new SlotEntity(
            s.id,
            s.startTime,
            s.endTime,
            s.isBooked,
            s.createdAt,
            s.updatedAt,
            s.bookings.map((b) => ({
              id: b.id,
              clientName: b.clientName,
              clientEmail: b.clientEmail,
              status: b.status,
              createdAt: b.createdAt,
            }))
          )
      );
    } catch {
      let filtered = [...sharedMemoryStore.slots];
      if (options?.availableOnly) {
        filtered = filtered.filter((s) => !s.isBooked);
      }
      return filtered;
    }
  }

  async findById(id: string): Promise<SlotEntity | null> {
    try {
      const slot = await this.prisma.slot.findUnique({
        where: { id },
        include: {
          bookings: {
            where: { status: BookingStatus.CONFIRMED },
            select: { id: true, clientName: true, clientEmail: true, status: true, createdAt: true },
          },
        },
      });

      if (!slot) return null;

      return new SlotEntity(
        slot.id,
        slot.startTime,
        slot.endTime,
        slot.isBooked,
        slot.createdAt,
        slot.updatedAt,
        slot.bookings.map((b) => ({
          id: b.id,
          clientName: b.clientName,
          clientEmail: b.clientEmail,
          status: b.status,
          createdAt: b.createdAt,
        }))
      );
    } catch {
      const slot = sharedMemoryStore.findSlot(id);
      return slot || null;
    }
  }
}
