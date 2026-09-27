import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateBookingUseCase } from '../application/use-cases/create-booking.use-case';
import { CancelBookingUseCase } from '../application/use-cases/cancel-booking.use-case';
import { GetBookingByIdUseCase } from '../application/use-cases/get-booking-by-id.use-case';
import { ListBookingsUseCase } from '../application/use-cases/list-bookings.use-case';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly cancelBookingUseCase: CancelBookingUseCase,
    private readonly getBookingByIdUseCase: GetBookingByIdUseCase,
    private readonly listBookingsUseCase: ListBookingsUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create booking for a fixed slot',
    description: 'Reserves a fixed slot. Uses PostgreSQL row-level locking (SELECT ... FOR UPDATE) to strictly prevent double booking.',
  })
  @ApiResponse({ status: 201, description: 'Booking successfully created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Slot is already booked' })
  async create(@Body() createBookingDto: CreateBookingDto) {
    return this.createBookingUseCase.execute(createBookingDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all bookings', description: 'Returns a list of all bookings in the system.' })
  @ApiResponse({ status: 200, description: 'List of bookings' })
  async getAll() {
    return this.listBookingsUseCase.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID', description: 'Retrieves details of a specific booking.' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking found' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async getById(@Param('id') id: string) {
    return this.getBookingByIdUseCase.execute(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Cancel a booking',
    description: 'Cancels an active booking, sets status to CANCELLED, and immediately makes the slot available again.',
  })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking cancelled and slot re-opened' })
  @ApiResponse({ status: 400, description: 'Booking has already been cancelled' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async cancel(@Param('id') id: string) {
    const booking = await this.cancelBookingUseCase.execute(id);
    return {
      message: 'Booking cancelled successfully. Slot is now available for new reservations.',
      booking,
    };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking (POST alias)' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  @ApiResponse({ status: 200, description: 'Booking cancelled and slot re-opened' })
  async cancelPostAlias(@Param('id') id: string) {
    return this.cancel(id);
  }
}
