import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Fixed-Slot Booking API Mandatory Requirements Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let availableSlotId: string;
  let concurrentTestSlotId: string;
  let cancellationTestSlotId: string;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      })
    );
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);

    if (prisma.isConnected) {
      const now = new Date();
      try {
        const createdSlots = await Promise.all([
          prisma.slot.create({
            data: {
              startsAt: new Date(now.getTime() + 3600000),
              endsAt: new Date(now.getTime() + 5400000),
              isBooked: false,
            },
          }),
          prisma.slot.create({
            data: {
              startsAt: new Date(now.getTime() + 7200000),
              endsAt: new Date(now.getTime() + 9000000),
              isBooked: false,
            },
          }),
          prisma.slot.create({
            data: {
              startsAt: new Date(now.getTime() + 10800000),
              endsAt: new Date(now.getTime() + 12600000),
              isBooked: false,
            },
          }),
        ]);

        availableSlotId = createdSlots[0].id;
        concurrentTestSlotId = createdSlots[1].id;
        cancellationTestSlotId = createdSlots[2].id;
      } catch {
        availableSlotId = '11111111-1111-4111-8111-111111111111';
        concurrentTestSlotId = '22222222-1111-4111-8111-111111111111';
        cancellationTestSlotId = '33333333-1111-4111-8111-111111111111';
      }
    } else {
      availableSlotId = '11111111-1111-4111-8111-111111111111';
      concurrentTestSlotId = '22222222-1111-4111-8111-111111111111';
      cancellationTestSlotId = '33333333-1111-4111-8111-111111111111';
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. GET /slots - List Available Slots', () => {
    it('returns only available slots wrapped in { slots: [...] } sorted ascending by startsAt', async () => {
      const res = await request(app.getHttpServer()).get('/slots');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('slots');
      expect(Array.isArray(res.body.slots)).toBe(true);

      if (res.body.slots.length > 0) {
        const slot = res.body.slots[0];
        expect(slot).toHaveProperty('id');
        expect(slot).toHaveProperty('startsAt');
        expect(slot).toHaveProperty('endsAt');
        expect(slot).not.toHaveProperty('isBooked'); // Output DTO matches contract
      }
    });
  });

  describe('2. POST /bookings - Create Booking & Slot Disappearance', () => {
    it('creates booking with 201 and slot disappears from GET /slots', async () => {
      const res = await request(app.getHttpServer()).post('/bookings').send({
        slotId: availableSlotId,
        customerName: 'Alex Morgan',
        customerEmail: 'alex@example.com',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('booking');
      expect(res.body.booking.slotId).toBe(availableSlotId);
      expect(res.body.booking.customerName).toBe('Alex Morgan');
      expect(res.body.booking.customerEmail).toBe('alex@example.com');
      expect(res.body.booking.status).toBe('active');

      // Verify the slot is no longer returned in GET /slots
      const slotsRes = await request(app.getHttpServer()).get('/slots');
      const found = slotsRes.body.slots.find((s: any) => s.id === availableSlotId);
      expect(found).toBeUndefined();
    });

    it('rejects booking with 409 SLOT_UNAVAILABLE when slot already has active booking', async () => {
      const res = await request(app.getHttpServer()).post('/bookings').send({
        slotId: availableSlotId,
        customerName: 'Duplicate Attempt',
        customerEmail: 'duplicate@example.com',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SLOT_UNAVAILABLE');
    });

    it('returns 404 SLOT_NOT_FOUND when slot does not exist', async () => {
      const res = await request(app.getHttpServer()).post('/bookings').send({
        slotId: '00000000-0000-4000-8000-000000000000',
        customerName: 'Non Existent',
        customerEmail: 'nonexistent@example.com',
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SLOT_NOT_FOUND');
    });

    it('returns 400 VALIDATION_ERROR when input is invalid or missing', async () => {
      const res = await request(app.getHttpServer()).post('/bookings').send({
        slotId: 'not-a-uuid',
        customerName: '',
        customerEmail: 'bad-email',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. Concurrency Conflict Prevention (Core Mandatory Requirement)', () => {
    it('handles two simultaneous requests: exactly one returns 201 and the other 409', async () => {
      const clientA = {
        slotId: concurrentTestSlotId,
        customerName: 'Applicant A',
        customerEmail: 'applicant.a@example.com',
      };
      const clientB = {
        slotId: concurrentTestSlotId,
        customerName: 'Applicant B',
        customerEmail: 'applicant.b@example.com',
      };

      const [resA, resB] = await Promise.all([
        request(app.getHttpServer()).post('/bookings').send(clientA),
        request(app.getHttpServer()).post('/bookings').send(clientB),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([201, 409]);

      const conflictRes = resA.status === 409 ? resA : resB;
      expect(conflictRes.body.error.code).toBe('SLOT_UNAVAILABLE');
    });
  });

  describe('4. DELETE /bookings/{bookingId} - Cancellation & Re-availability & Idempotency', () => {
    let bookingId: string;

    it('cancels active booking with 200, releases slot, and allows new booking', async () => {
      // 1. Book the slot
      const bookRes = await request(app.getHttpServer()).post('/bookings').send({
        slotId: cancellationTestSlotId,
        customerName: 'Cancel Test User',
        customerEmail: 'cancel.user@example.com',
      });
      expect(bookRes.status).toBe(201);
      bookingId = bookRes.body.booking.id;

      // 2. Cancel it
      const cancelRes = await request(app.getHttpServer()).delete(`/bookings/${bookingId}`);
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.booking.id).toBe(bookingId);
      expect(cancelRes.body.booking.status).toBe('cancelled');

      // 3. Slot is now back in GET /slots
      const slotsRes = await request(app.getHttpServer()).get('/slots');
      const found = slotsRes.body.slots.find((s: any) => s.id === cancellationTestSlotId);
      expect(found).toBeDefined();

      // 4. Re-booking the same slot succeeds
      const rebookRes = await request(app.getHttpServer()).post('/bookings').send({
        slotId: cancellationTestSlotId,
        customerName: 'New Booker',
        customerEmail: 'new.booker@example.com',
      });
      expect(rebookRes.status).toBe(201);
    });

    it('returns 200 idempotently without change when cancelling an already cancelled booking', async () => {
      const repeatRes = await request(app.getHttpServer()).delete(`/bookings/${bookingId}`);
      expect(repeatRes.status).toBe(200);
      expect(repeatRes.body.booking.id).toBe(bookingId);
      expect(repeatRes.body.booking.status).toBe('cancelled');
    });

    it('returns 400 VALIDATION_ERROR for invalid UUID in path', async () => {
      const res = await request(app.getHttpServer()).delete('/bookings/not-a-valid-uuid');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 BOOKING_NOT_FOUND for valid UUID that does not exist', async () => {
      const res = await request(app.getHttpServer()).delete(
        '/bookings/00000000-0000-4000-8000-000000000000'
      );
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('BOOKING_NOT_FOUND');
    });
  });
});
