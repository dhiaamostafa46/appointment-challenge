import { Inject, Injectable } from '@nestjs/common';
import {
  BOOKING_REPOSITORY_TOKEN,
  IBookingRepository,
} from '../../domain/booking.repository';
import { BookingEntity } from '../../domain/booking.entity';
import { BookingNotFoundException } from '../../../../common/errors/domain.exceptions';

@Injectable()
export class GetBookingByIdUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY_TOKEN)
    private readonly bookingRepository: IBookingRepository
  ) {}

  async execute(id: string): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new BookingNotFoundException(id);
    }
    return booking;
  }
}
