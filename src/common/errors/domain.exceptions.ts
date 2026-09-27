/**
 * -----------------------------------------------------------------------------
 * أخطاء نطاق العمل (Domain Exceptions)
 * -----------------------------------------------------------------------------
 * استثناءات نقية ومجردة من أي تفاصيل HTTP أو Prisma.
 * يتم إطلاقها داخل الـ Domain أو الـ Use Cases، ويقوم GlobalHttpExceptionFilter
 * بتحويل كل خطأ إلى كود الحالة (HTTP Status Code) المناسب.
 */

/** خطأ: الموعد المطلوب غير موجود في النظام (ينتج عنه 404 Not Found) */
export class SlotNotFoundException extends Error {
  constructor(slotId: string) {
    super(`Slot with ID '${slotId}' was not found`);
    this.name = 'SlotNotFoundException';
  }
}

/** خطأ: الموعد محجوز مسبقاً من قِبل عميل آخر (ينتج عنه 409 Conflict) */
export class SlotAlreadyBookedException extends Error {
  constructor(slotId: string) {
    super(`Slot '${slotId}' is already booked`);
    this.name = 'SlotAlreadyBookedException';
  }
}

/** خطأ: الحجز المطلوب غير موجود (ينتج عنه 404 Not Found) */
export class BookingNotFoundException extends Error {
  constructor(bookingId: string) {
    super(`Booking with ID '${bookingId}' was not found`);
    this.name = 'BookingNotFoundException';
  }
}

/** خطأ: الحجز تم إلغاؤه مسبقاً (ينتج عنه 400 Bad Request) */
export class BookingAlreadyCancelledException extends Error {
  constructor(bookingId: string) {
    super(`Booking '${bookingId}' has already been cancelled`);
    this.name = 'BookingAlreadyCancelledException';
  }
}
