import { Inject, Injectable } from '@nestjs/common';
import {
  BOOKING_REPOSITORY_TOKEN,
  IBookingRepository,
} from '../../domain/booking.repository';
import { BookingEntity } from '../../domain/booking.entity';

@Injectable()
export class ListBookingsUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY_TOKEN)
    private readonly bookingRepository: IBookingRepository
  ) {}

  async execute(): Promise<BookingEntity[]> {
    return this.bookingRepository.findAll();
  }
}
