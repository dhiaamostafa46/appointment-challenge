import { Inject, Injectable } from '@nestjs/common';
import { ISlotRepository, SLOT_REPOSITORY_TOKEN } from '../../domain/slot.repository';
import { SlotEntity } from '../../domain/slot.entity';
import { SlotNotFoundException } from '../../../../common/errors/domain.exceptions';

@Injectable()
export class GetSlotByIdUseCase {
  constructor(
    @Inject(SLOT_REPOSITORY_TOKEN)
    private readonly slotRepository: ISlotRepository
  ) {}

  async execute(id: string): Promise<SlotEntity> {
    const slot = await this.slotRepository.findById(id);
    if (!slot) {
      throw new SlotNotFoundException(id);
    }
    return slot;
  }
}
