export class SlotNotFoundException extends Error {
  constructor(slotId: string) {
    super(`Slot with ID '${slotId}' was not found`);
    this.name = 'SlotNotFoundException';
  }
}

export class SlotAlreadyBookedException extends Error {
  constructor(slotId: string) {
    super(`Slot '${slotId}' is already booked`);
    this.name = 'SlotAlreadyBookedException';
  }
}

export class BookingNotFoundException extends Error {
  constructor(bookingId: string) {
    super(`Booking with ID '${bookingId}' was not found`);
    this.name = 'BookingNotFoundException';
  }
}

export class BookingAlreadyCancelledException extends Error {
  constructor(bookingId: string) {
    super(`Booking '${bookingId}' has already been cancelled`);
    this.name = 'BookingAlreadyCancelledException';
  }
}
