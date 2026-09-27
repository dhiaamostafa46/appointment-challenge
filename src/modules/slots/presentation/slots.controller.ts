import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetAvailableSlotsUseCase } from '../application/use-cases/get-available-slots.use-case';

@ApiTags('Slots')
@Controller('slots')
export class SlotsController {
  constructor(private readonly getAvailableSlotsUseCase: GetAvailableSlotsUseCase) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List available appointment slots',
    description:
      'Returns only available (unbooked) slots sorted ascending by startsAt then id. Returns {"slots": []} if none are available.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available appointment slots',
    schema: {
      type: 'object',
      properties: {
        slots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid', example: '11111111-1111-4111-8111-111111111111' },
              startsAt: { type: 'string', format: 'date-time', example: '2030-01-15T09:00:00.000Z' },
              endsAt: { type: 'string', format: 'date-time', example: '2030-01-15T09:30:00.000Z' },
            },
          },
        },
      },
      example: {
        slots: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            startsAt: '2030-01-15T09:00:00.000Z',
            endsAt: '2030-01-15T09:30:00.000Z',
          },
        ],
      },
    },
  })
  async listAvailableSlots(): Promise<{
    slots: Array<{ id: string; startsAt: Date; endsAt: Date }>;
  }> {
    const slots = await this.getAvailableSlotsUseCase.execute();
    return {
      slots: slots.map((s) => ({
        id: s.id,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
      })),
    };
  }
}
