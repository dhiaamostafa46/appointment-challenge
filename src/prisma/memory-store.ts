import crypto from 'crypto';
import { SlotEntity } from '../modules/slots/domain/slot.entity';
import { BookingEntity, BookingStatus } from '../modules/bookings/domain/booking.entity';

class MemoryStore {
  public slots: SlotEntity[] = [];
  public bookings: BookingEntity[] = [];

  constructor() {
    this.reset();
  }

  public reset(): void {
    const fixedSlotsData = [
      { id: '11111111-1111-4111-8111-111111111111', startsAt: '2030-01-15T09:00:00.000Z', endsAt: '2030-01-15T09:30:00.000Z' },
      { id: '22222222-1111-4111-8111-111111111111', startsAt: '2030-01-15T09:30:00.000Z', endsAt: '2030-01-15T10:00:00.000Z' },
      { id: '33333333-1111-4111-8111-111111111111', startsAt: '2030-01-15T10:00:00.000Z', endsAt: '2030-01-15T10:30:00.000Z' },
      { id: '44444444-1111-4111-8111-111111111111', startsAt: '2030-01-15T10:30:00.000Z', endsAt: '2030-01-15T11:00:00.000Z' },
      { id: '55555555-1111-4111-8111-111111111111', startsAt: '2030-01-15T11:00:00.000Z', endsAt: '2030-01-15T11:30:00.000Z' },
      { id: '66666666-1111-4111-8111-111111111111', startsAt: '2030-01-15T11:30:00.000Z', endsAt: '2030-01-15T12:00:00.000Z' },
      { id: '77777777-1111-4111-8111-111111111111', startsAt: '2030-01-15T13:00:00.000Z', endsAt: '2030-01-15T13:30:00.000Z' },
      { id: '88888888-1111-4111-8111-111111111111', startsAt: '2030-01-15T13:30:00.000Z', endsAt: '2030-01-15T14:00:00.000Z' },
      { id: '99999999-1111-4111-8111-111111111111', startsAt: '2030-01-15T14:00:00.000Z', endsAt: '2030-01-15T14:30:00.000Z' },
      { id: 'aaaaaaaa-1111-4111-8111-111111111111', startsAt: '2030-01-15T14:30:00.000Z', endsAt: '2030-01-15T15:00:00.000Z' },
    ];

    const now = new Date();
    this.slots = fixedSlotsData.map(
      (s) => new SlotEntity(s.id, new Date(s.startsAt), new Date(s.endsAt), false, now, now, [])
    );
    this.bookings = [];
  }

  public findSlot(id: string): SlotEntity | undefined {
    return this.slots.find((s) => s.id === id);
  }

  public getAvailableSlots(): SlotEntity[] {
    return this.slots
      .filter((s) => !s.isBooked)
      .sort((a, b) => {
        const timeDiff = a.startsAt.getTime() - b.startsAt.getTime();
        return timeDiff !== 0 ? timeDiff : a.id.localeCompare(b.id);
      });
  }

  public createBooking(slotId: string, customerName: string, customerEmail: string): BookingEntity {
    const slot = this.findSlot(slotId);
    if (!slot) {
      throw new Error(`SLOT_NOT_FOUND: Slot with ID '${slotId}' was not found`);
    }
    if (slot.isBooked) {
      throw new Error(`SLOT_UNAVAILABLE: This slot already has an active booking.`);
    }

    slot.isBooked = true;
    slot.updatedAt = new Date();

    const booking = new BookingEntity(
      crypto.randomUUID(),
      slotId,
      customerName,
      customerEmail,
      BookingStatus.active,
      new Date(),
      new Date(),
      {
        id: slot.id,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        isBooked: true,
        createdAt: slot.createdAt,
        updatedAt: slot.updatedAt,
      }
    );

    slot.bookings = [
      {
        id: booking.id,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        status: booking.status,
        createdAt: booking.createdAt,
      },
    ];

    this.bookings.push(booking);
    return booking;
  }

  public cancelBooking(bookingId: string): { booking: BookingEntity; isFirstCancel: boolean } {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      throw new Error(`BOOKING_NOT_FOUND: Booking with ID '${bookingId}' was not found`);
    }

    // Idempotent cancellation: if already cancelled, return 200 without change
    if (booking.status === BookingStatus.cancelled) {
      return { booking, isFirstCancel: false };
    }

    booking.status = BookingStatus.cancelled;
    booking.updatedAt = new Date();

    const slot = this.findSlot(booking.slotId);
    if (slot) {
      slot.isBooked = false;
      slot.updatedAt = new Date();
      slot.bookings = (slot.bookings || []).filter((b) => b.id !== bookingId);
    }

    return { booking, isFirstCancel: true };
  }
}

export const sharedMemoryStore = new MemoryStore();
