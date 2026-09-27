import { Inject, Injectable } from '@nestjs/common';
import {
  BOOKING_REPOSITORY_TOKEN,
  IBookingRepository,
} from '../../domain/booking.repository';
import { BookingEntity } from '../../domain/booking.entity';
import { BookingsGateway } from '../../presentation/bookings.gateway';

@Injectable()
export class CancelBookingUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY_TOKEN)
    private readonly bookingRepository: IBookingRepository,
    private readonly bookingsGateway: BookingsGateway
  ) {}

  async execute(id: string): Promise<BookingEntity> {
    const cancelledBooking = await this.bookingRepository.cancel(id);
    this.bookingsGateway.emitBookingCancelled(cancelledBooking);
    return cancelledBooking;
  }
}
