import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetAvailableSlotsUseCase } from '../application/use-cases/get-available-slots.use-case';
import { GetSlotByIdUseCase } from '../application/use-cases/get-slot-by-id.use-case';

@ApiTags('Slots')
@Controller('slots')
export class SlotsController {
  constructor(
    private readonly getAvailableSlotsUseCase: GetAvailableSlotsUseCase,
    private readonly getSlotByIdUseCase: GetSlotByIdUseCase
  ) {}

  @Get('available')
  @ApiOperation({ summary: 'List available slots', description: 'Returns all currently available (unbooked) appointment slots.' })
  @ApiResponse({ status: 200, description: 'List of available appointment slots' })
  async getAvailable() {
    return this.getAvailableSlotsUseCase.execute({ availableOnly: true });
  }

  @Get()
  @ApiOperation({ summary: 'List all fixed appointment slots', description: 'Returns all slots, optionally filtered by availability.' })
  @ApiQuery({ name: 'available', required: false, type: Boolean, description: 'Filter by availability' })
  @ApiResponse({ status: 200, description: 'List of appointment slots' })
  async getAll(@Query('available') available?: string) {
    const availableOnly = available === 'true';
    return this.getAvailableSlotsUseCase.execute({ availableOnly });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get slot by ID', description: 'Retrieve slot details along with confirmed booking if any.' })
  @ApiParam({ name: 'id', description: 'Slot UUID' })
  @ApiResponse({ status: 200, description: 'Slot found' })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  async getById(@Param('id') id: string) {
    return this.getSlotByIdUseCase.execute(id);
  }
}
