import { SlotEntity } from './slot.entity';

export interface ISlotRepository {
  findAll(options?: { availableOnly?: boolean }): Promise<SlotEntity[]>;
  findById(id: string): Promise<SlotEntity | null>;
}

export const SLOT_REPOSITORY_TOKEN = Symbol('ISlotRepository');
