import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateBookingUseCase } from '../application/use-cases/create-booking.use-case';
import { CancelBookingUseCase } from '../application/use-cases/cancel-booking.use-case';
import { ValidationException } from '../../../common/errors/domain.exceptions';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly cancelBookingUseCase: CancelBookingUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new appointment booking',
    description:
      'Reserves an available slot with strict concurrency conflict prevention. Rejects concurrent duplicates with 409 SLOT_UNAVAILABLE.',
  })
  @ApiResponse({
    status: 201,
    description: 'Booking successfully confirmed',
    schema: {
      type: 'object',
      properties: {
        booking: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '22222222-2222-4222-8222-222222222222' },
            slotId: { type: 'string', format: 'uuid', example: '11111111-1111-4111-8111-111111111111' },
            customerName: { type: 'string', example: 'Alex Morgan' },
            customerEmail: { type: 'string', example: 'alex@example.com' },
            status: { type: 'string', example: 'active' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed on inputs or malformed JSON',
    schema: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'customerEmail must be a valid email address' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Slot not found for given UUID',
    schema: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'SLOT_NOT_FOUND' },
            message: { type: 'string', example: "Slot with ID '...' was not found" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Slot already has an active booking (concurrency conflict)',
    schema: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'SLOT_UNAVAILABLE' },
            message: { type: 'string', example: 'This slot already has an active booking.' },
          },
        },
      },
    },
  })
  async createBooking(@Body() dto: CreateBookingDto) {
    const booking = await this.createBookingUseCase.execute({
      slotId: dto.slotId,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
    });

    return {
      booking: {
        id: booking.id,
        slotId: booking.slotId,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        status: booking.status,
      },
    };
  }

  @Delete(':bookingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel an appointment booking',
    description:
      'Cancels an active booking and immediately releases the slot. Repeating cancellation on an already cancelled booking returns 200 without change.',
  })
  @ApiParam({
    name: 'bookingId',
    description: 'UUID of the booking to cancel',
    example: '22222222-2222-4222-8222-222222222222',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking cancelled (or already cancelled idempotently)',
    schema: {
      type: 'object',
      properties: {
        booking: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '22222222-2222-4222-8222-222222222222' },
            slotId: { type: 'string', format: 'uuid', example: '11111111-1111-4111-8111-111111111111' },
            customerName: { type: 'string', example: 'Alex Morgan' },
            customerEmail: { type: 'string', example: 'alex@example.com' },
            status: { type: 'string', example: 'cancelled' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid UUID format',
    schema: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string', example: 'Invalid bookingId UUID format' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found for given UUID',
    schema: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'BOOKING_NOT_FOUND' },
            message: { type: 'string', example: "Booking with ID '...' was not found" },
          },
        },
      },
    },
  })
  async cancelBooking(
    @Param(
      'bookingId',
      new ParseUUIDPipe({
        exceptionFactory: () => new ValidationException('Invalid bookingId UUID format'),
      })
    )
    bookingId: string
  ) {
    const booking = await this.cancelBookingUseCase.execute(bookingId);

    return {
      booking: {
        id: booking.id,
        slotId: booking.slotId,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        status: booking.status,
      },
    };
  }
}
