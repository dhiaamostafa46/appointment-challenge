import { Module } from '@nestjs/common';
import { SlotsController } from './presentation/slots.controller';
import { GetAvailableSlotsUseCase } from './application/use-cases/get-available-slots.use-case';
import { GetSlotByIdUseCase } from './application/use-cases/get-slot-by-id.use-case';
import { SLOT_REPOSITORY_TOKEN } from './domain/slot.repository';
import { PrismaSlotRepository } from './infrastructure/prisma-slot.repository';

@Module({
  controllers: [SlotsController],
  providers: [
    GetAvailableSlotsUseCase,
    GetSlotByIdUseCase,
    {
      provide: SLOT_REPOSITORY_TOKEN,
      useClass: PrismaSlotRepository,
    },
  ],
  exports: [SLOT_REPOSITORY_TOKEN, GetAvailableSlotsUseCase, GetSlotByIdUseCase],
})
export class SlotsModule {}
