import { Inject, Injectable } from '@nestjs/common';
import { ISlotRepository, SLOT_REPOSITORY_TOKEN } from '../../domain/slot.repository';
import { SlotEntity } from '../../domain/slot.entity';

@Injectable()
export class GetAvailableSlotsUseCase {
  constructor(
    @Inject(SLOT_REPOSITORY_TOKEN)
    private readonly slotRepository: ISlotRepository
  ) {}

  async execute(options?: { availableOnly?: boolean }): Promise<SlotEntity[]> {
    return this.slotRepository.findAll(options);
  }
}
