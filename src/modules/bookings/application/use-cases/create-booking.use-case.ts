import { Inject, Injectable } from '@nestjs/common';
import {
  BOOKING_REPOSITORY_TOKEN,
  CreateBookingData,
  IBookingRepository,
} from '../../domain/booking.repository';
import { BookingEntity } from '../../domain/booking.entity';
import { BookingsGateway } from '../../presentation/bookings.gateway';

@Injectable()
export class CreateBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY_TOKEN)
    private readonly bookingRepository: IBookingRepository,
    private readonly bookingsGateway: BookingsGateway
  ) {}

  async execute(data: CreateBookingData): Promise<BookingEntity> {
    const booking = await this.bookingRepository.createWithConcurrencyLock({
      slotId: data.slotId.trim(),
      customerName: data.customerName.trim(),
      customerEmail: data.customerEmail.trim(),
    });

    // Broadcast real-time slot.booked event (only on success, no customer info)
    this.bookingsGateway.emitSlotBooked(booking.slotId, booking.id);

    return booking;
  }
}
