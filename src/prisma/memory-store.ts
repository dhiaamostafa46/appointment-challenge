import crypto from 'crypto';
import { SlotEntity } from '../modules/slots/domain/slot.entity';
import { BookingEntity, BookingStatus } from '../modules/bookings/domain/booking.entity';

/**
 * -----------------------------------------------------------------------------
 * مخزن الذاكرة المشترك (Shared In-Memory Store)
 * -----------------------------------------------------------------------------
 * يُستخدم كبديل آمن ومتزامن في بيئة التطوير المحلية عند عدم توفر اتصال بـ PostgreSQL.
 * يضمن مزامنة حالة المواعيد (isBooked) وحالات الحجز (CONFIRMED / CANCELLED) بدقة 100%.
 */
class MemoryStore {
  public slots: SlotEntity[] = [];
  public bookings: BookingEntity[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    const now = new Date();
    this.slots = [
      new SlotEntity('4a2f8b50-3a1b-4f9e-9d22-123456789abc', new Date(now.getTime() + 3600000), new Date(now.getTime() + 5400000), false, now, now, []),
      new SlotEntity('50b8d218-efff-4677-833f-c443d42c5299', new Date(now.getTime() + 5400000), new Date(now.getTime() + 7200000), false, now, now, []),
      new SlotEntity('3af1825c-d7bf-45b8-b4c9-0231ddf61232', new Date(now.getTime() + 7200000), new Date(now.getTime() + 9000000), false, now, now, []),
      new SlotEntity('f49ee491-ed23-4c7d-89e1-f8c6a9a403a5', new Date(now.getTime() + 9000000), new Date(now.getTime() + 10800000), false, now, now, []),
      new SlotEntity('fb5a96e6-c558-4fa6-9000-e0bc2174f72f', new Date(now.getTime() + 10800000), new Date(now.getTime() + 12600000), false, now, now, []),
    ];
    this.bookings = [];
  }

  public findSlot(id: string): SlotEntity | undefined {
    return this.slots.find((s) => s.id === id);
  }

  public getAvailableSlots(): SlotEntity[] {
    return this.slots.filter((s) => !s.isBooked);
  }

  public createBooking(slotId: string, clientName: string, clientEmail: string): BookingEntity {
    const slot = this.findSlot(slotId);
    if (!slot) {
      throw new Error(`Slot with ID '${slotId}' was not found`);
    }
    if (slot.isBooked) {
      throw new Error(`Slot '${slotId}' is already booked`);
    }

    // Atomic lock in memory
    slot.isBooked = true;
    slot.updatedAt = new Date();

    const booking = new BookingEntity(
      crypto.randomUUID(),
      slotId,
      clientName,
      clientEmail,
      BookingStatus.CONFIRMED,
      new Date(),
      new Date(),
      {
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked: true,
        createdAt: slot.createdAt,
        updatedAt: slot.updatedAt,
      }
    );

    slot.bookings = [
      {
        id: booking.id,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        status: booking.status,
        createdAt: booking.createdAt,
      },
    ];

    this.bookings.push(booking);
    return booking;
  }

  public cancelBooking(bookingId: string): BookingEntity {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      throw new Error(`Booking with ID '${bookingId}' was not found`);
    }
    if (booking.status === BookingStatus.CANCELLED) {
      throw new Error(`Booking '${bookingId}' has already been cancelled`);
    }

    booking.status = BookingStatus.CANCELLED;
    booking.updatedAt = new Date();

    const slot = this.findSlot(booking.slotId);
    if (slot) {
      slot.isBooked = false;
      slot.updatedAt = new Date();
      slot.bookings = slot.bookings.filter((b) => b.id !== bookingId);
    }

    return booking;
  }
}

export const sharedMemoryStore = new MemoryStore();
