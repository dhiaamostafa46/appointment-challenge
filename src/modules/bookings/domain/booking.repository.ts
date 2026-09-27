import { BookingEntity } from './booking.entity';

export interface CreateBookingData {
  slotId: string;
  customerName: string;
  customerEmail: string;
}

export interface IBookingRepository {
  createWithConcurrencyLock(data: CreateBookingData): Promise<BookingEntity>;
  cancel(id: string): Promise<{ booking: BookingEntity; isFirstCancel: boolean }>;
  findById(id: string): Promise<BookingEntity | null>;
  findAll(): Promise<BookingEntity[]>;
}

export const BOOKING_REPOSITORY_TOKEN = Symbol('IBookingRepository');
