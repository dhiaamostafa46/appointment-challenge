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
    const { booking, isFirstCancel } = await this.bookingRepository.cancel(id);

    // Emit event ONLY if this was an active booking being cancelled for the first time
    if (isFirstCancel) {
      this.bookingsGateway.emitSlotReleased(booking.slotId, booking.id);
    }

    return booking;
  }
}
