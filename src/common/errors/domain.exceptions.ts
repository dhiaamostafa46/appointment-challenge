export class DomainException extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class SlotNotFoundException extends DomainException {
  constructor(slotId: string) {
    super('SLOT_NOT_FOUND', `Slot with ID '${slotId}' was not found`, 404);
  }
}

export class SlotUnavailableException extends DomainException {
  constructor(message = 'This slot already has an active booking.') {
    super('SLOT_UNAVAILABLE', message, 409);
  }
}

export class BookingNotFoundException extends DomainException {
  constructor(bookingId: string) {
    super('BOOKING_NOT_FOUND', `Booking with ID '${bookingId}' was not found`, 404);
  }
}

export class ValidationException extends DomainException {
  constructor(message = 'Validation failed') {
    super('VALIDATION_ERROR', message, 400);
  }
}
