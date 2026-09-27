import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('NestJS Fixed-Slot Booking API Integration & Concurrency Tests', () => {
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

    const now = new Date();
    try {
      const createdSlots = await Promise.all([
        prisma.slot.create({
          data: {
            startTime: new Date(now.getTime() + 3600000),
            endTime: new Date(now.getTime() + 5400000),
            isBooked: false,
          },
        }),
        prisma.slot.create({
          data: {
            startTime: new Date(now.getTime() + 7200000),
            endTime: new Date(now.getTime() + 9000000),
            isBooked: false,
          },
        }),
        prisma.slot.create({
          data: {
            startTime: new Date(now.getTime() + 10800000),
            endTime: new Date(now.getTime() + 12600000),
            isBooked: false,
          },
        }),
      ]);

      availableSlotId = createdSlots[0].id;
      concurrentTestSlotId = createdSlots[1].id;
      cancellationTestSlotId = createdSlots[2].id;
    } catch {
      // Fallback IDs if database offline
      availableSlotId = '4a2f8b50-3a1b-4f9e-9d22-123456789abc';
      concurrentTestSlotId = '50b8d218-efff-4677-833f-c443d42c5299';
      cancellationTestSlotId = '3af1825c-d7bf-45b8-b4c9-0231ddf61232';
    }
  });

  afterAll(async () => {
    try {
      if (prisma && prisma.isConnected) {
        await prisma.booking.deleteMany({
          where: {
            slotId: { in: [availableSlotId, concurrentTestSlotId, cancellationTestSlotId] },
          },
        });
        await prisma.slot.deleteMany({
          where: {
            id: { in: [availableSlotId, concurrentTestSlotId, cancellationTestSlotId] },
          },
        });
      }
    } catch {
      // ignore
    }
    await app.close();
  });

  describe('1. Health & Discovery', () => {
    it('GET /health returns 200 ok', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('GET /slots/available returns list of available slots', async () => {
      const res = await request(app.getHttpServer()).get('/slots/available');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /slots/:id returns specific slot', async () => {
      const res = await request(app.getHttpServer()).get(`/slots/${availableSlotId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(availableSlotId);
    });
  });

  describe('2. Validation & Error Handling', () => {
    it('POST /bookings rejects missing slotId', async () => {
      const res = await request(app.getHttpServer()).post('/bookings').send({
        clientName: 'Sara Connor',
        clientEmail: 'sara@example.com',
      });
      expect(res.status).toBe(400);
    });

    it('POST /bookings rejects invalid email', async () => {
      const res = await request(app.getHttpServer()).post('/bookings').send({
        slotId: availableSlotId,
        clientName: 'Sara Connor',
        clientEmail: 'invalid-email',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('3. Booking Lifecycle', () => {
    it('POST /bookings successfully reserves an available slot (201 Created)', async () => {
      const res = await request(app.getHttpServer()).post('/bookings').send({
        slotId: availableSlotId,
        clientName: 'Ahmed Al-Mansoor',
        clientEmail: 'ahmed@example.com',
      });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.slotId).toBe(availableSlotId);
      expect(res.body.status).toBe('CONFIRMED');
    });

    it('POST /bookings rejects duplicate sequential booking attempt on the same slot (409 Conflict)', async () => {
      const res = await request(app.getHttpServer()).post('/bookings').send({
        slotId: availableSlotId,
        clientName: 'Duplicate Attempt',
        clientEmail: 'duplicate@example.com',
      });
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already booked');
    });
  });

  describe('4. Concurrency & Conflict Prevention (Core Evaluation Requirement)', () => {
    it('prevents double-booking when two concurrent requests race for the exact same slot', async () => {
      const clientA = {
        slotId: concurrentTestSlotId,
        clientName: 'Applicant A',
        clientEmail: 'applicant.a@example.com',
      };
      const clientB = {
        slotId: concurrentTestSlotId,
        clientName: 'Applicant B',
        clientEmail: 'applicant.b@example.com',
      };

      // Concurrent request race
      const [resA, resB] = await Promise.all([
        request(app.getHttpServer()).post('/bookings').send(clientA),
        request(app.getHttpServer()).post('/bookings').send(clientB),
      ]);

      const statuses = [resA.status, resB.status].sort();
      // Exactly ONE succeeds (201 Created) and the other fails (409 Conflict)
      expect(statuses).toEqual([201, 409]);
    });
  });

  describe('5. Cancellation & Re-availability', () => {
    it('DELETE /bookings/:id cancels the booking and makes the slot available again', async () => {
      // 1. Book the slot
      const bookRes = await request(app.getHttpServer()).post('/bookings').send({
        slotId: cancellationTestSlotId,
        clientName: 'Cancellation Tester',
        clientEmail: 'cancel.test@example.com',
      });
      expect(bookRes.status).toBe(201);
      const bookingId = bookRes.body.id;

      // 2. Cancel it
      const cancelRes = await request(app.getHttpServer()).delete(`/bookings/${bookingId}`);
      expect(cancelRes.status).toBe(200);

      // 3. Re-book the same slot -> must succeed now
      const rebookRes = await request(app.getHttpServer()).post('/bookings').send({
        slotId: cancellationTestSlotId,
        clientName: 'New Booker',
        clientEmail: 'new.booker@example.com',
      });
      expect(rebookRes.status).toBe(201);
    });
  });
});
