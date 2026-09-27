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
      if (options?.availableOnly !== false) {
        where.isBooked = false;
      }

      const slots = await this.prisma.slot.findMany({
        where,
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        include: {
          bookings: {
            where: { status: BookingStatus.active },
            select: { id: true, customerName: true, customerEmail: true, status: true, createdAt: true },
          },
        },
      });

      return slots.map((s) => this.mapToEntity(s));
    } catch {
      let filtered = [...sharedMemoryStore.slots];
      if (options?.availableOnly !== false) {
        filtered = filtered.filter((s) => !s.isBooked);
      }
      return filtered.sort((a, b) => {
        const timeDiff = a.startsAt.getTime() - b.startsAt.getTime();
        return timeDiff !== 0 ? timeDiff : a.id.localeCompare(b.id);
      });
    }
  }

  async findById(id: string): Promise<SlotEntity | null> {
    try {
      const slot = await this.prisma.slot.findUnique({
        where: { id },
        include: {
          bookings: {
            where: { status: BookingStatus.active },
            select: { id: true, customerName: true, customerEmail: true, status: true, createdAt: true },
          },
        },
      });

      return slot ? this.mapToEntity(slot) : null;
    } catch {
      const slot = sharedMemoryStore.findSlot(id);
      return slot || null;
    }
  }

  private mapToEntity(s: any): SlotEntity {
    return new SlotEntity(
      s.id,
      s.startsAt,
      s.endsAt,
      s.isBooked,
      s.createdAt,
      s.updatedAt,
      (s.bookings || []).map((b: any) => ({
        id: b.id,
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        status: b.status,
        createdAt: b.createdAt,
      }))
    );
  }
}
