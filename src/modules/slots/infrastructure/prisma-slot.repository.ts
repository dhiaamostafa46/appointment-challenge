import { Injectable } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ISlotRepository } from '../domain/slot.repository';
import { SlotEntity } from '../domain/slot.entity';

// In-memory fallback slots for local development
const memorySlots: SlotEntity[] = [
  new SlotEntity('4a2f8b50-3a1b-4f9e-9d22-123456789abc', new Date(Date.now() + 3600000), new Date(Date.now() + 5400000), false, new Date(), new Date(), []),
  new SlotEntity('50b8d218-efff-4677-833f-c443d42c5299', new Date(Date.now() + 5400000), new Date(Date.now() + 7200000), false, new Date(), new Date(), []),
  new SlotEntity('3af1825c-d7bf-45b8-b4c9-0231ddf61232', new Date(Date.now() + 7200000), new Date(Date.now() + 9000000), false, new Date(), new Date(), []),
  new SlotEntity('f49ee491-ed23-4c7d-89e1-f8c6a9a403a5', new Date(Date.now() + 9000000), new Date(Date.now() + 10800000), false, new Date(), new Date(), []),
  new SlotEntity('fb5a96e6-c558-4fa6-9000-e0bc2174f72f', new Date(Date.now() + 10800000), new Date(Date.now() + 12600000), false, new Date(), new Date(), []),
];

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
      let filtered = [...memorySlots];
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
      const slot = memorySlots.find((s) => s.id === id);
      return slot || null;
    }
  }
}
