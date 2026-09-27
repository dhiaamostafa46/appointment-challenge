import { Module } from '@nestjs/common';
import { BookingsController } from './presentation/bookings.controller';
import { BookingsGateway } from './presentation/bookings.gateway';
import { CreateBookingUseCase } from './application/use-cases/create-booking.use-case';
import { CancelBookingUseCase } from './application/use-cases/cancel-booking.use-case';
import { GetBookingByIdUseCase } from './application/use-cases/get-booking-by-id.use-case';
import { ListBookingsUseCase } from './application/use-cases/list-bookings.use-case';
import { BOOKING_REPOSITORY_TOKEN } from './domain/booking.repository';
import { PrismaBookingRepository } from './infrastructure/prisma-booking.repository';

@Module({
  controllers: [BookingsController],
  providers: [
    BookingsGateway,
    CreateBookingUseCase,
    CancelBookingUseCase,
    GetBookingByIdUseCase,
    ListBookingsUseCase,
    {
      provide: BOOKING_REPOSITORY_TOKEN,
      useClass: PrismaBookingRepository,
    },
  ],
  exports: [BOOKING_REPOSITORY_TOKEN, BookingsGateway],
})
export class BookingsModule {}
