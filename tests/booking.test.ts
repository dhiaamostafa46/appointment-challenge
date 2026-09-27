import request from 'supertest';
import { app, io, prisma } from '../src';

describe('Fixed-Slot Booking API Integration & Concurrency Tests', () => {
  let availableSlotId: string;
  let concurrentTestSlotId: string;
  let cancellationTestSlotId: string;

  beforeAll(async () => {
    // Seed initial test slots directly if needed
    const now = new Date();

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
  });

  afterAll(async () => {
    io.close();
    // Cleanup created test data
    try {
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
    } catch {
      // ignore cleanup errors on shutdown
    }
    await prisma.$disconnect();
  });

  describe('Health & Slot Discovery', () => {
    it('returns ok for health check', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });

    it('lists available slots and filters accurately', async () => {
      const res = await request(app).get('/slots/available');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const found = res.body.find((s: { id: string }) => s.id === availableSlotId);
      expect(found).toBeDefined();
      expect(found.isBooked).toBe(false);
    });

    it('retrieves single slot by ID', async () => {
      const res = await request(app).get(`/slots/${availableSlotId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(availableSlotId);
    });

    it('returns 404 for non-existent slot', async () => {
      const res = await request(app).get('/slots/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });
  });

  describe('Input Validation', () => {
    it('rejects booking with missing slotId', async () => {
      const res = await request(app).post('/bookings').send({
        clientName: 'Sara Ahmed',
        clientEmail: 'sara@example.com',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details).toContain('slotId is required and must be a non-empty string');
    });

    it('rejects booking with invalid email format', async () => {
      const res = await request(app).post('/bookings').send({
        slotId: availableSlotId,
        clientName: 'Sara Ahmed',
        clientEmail: 'not-valid-email',
      });
      expect(res.status).toBe(400);
      expect(res.body.details).toContain('clientEmail is required and must be a valid email address');
    });

    it('rejects booking for a non-existent slot ID', async () => {
      const res = await request(app).post('/bookings').send({
        slotId: '00000000-0000-0000-0000-000000000000',
        clientName: 'Sara Ahmed',
        clientEmail: 'sara@example.com',
      });
      expect(res.status).toBe(404);
    });
  });

  describe('Successful Booking Flow', () => {
    it('successfully reserves an available slot', async () => {
      const res = await request(app).post('/bookings').send({
        slotId: availableSlotId,
        clientName: 'Kareem Fahad',
        clientEmail: 'kareem@example.com',
      });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.slotId).toBe(availableSlotId);
      expect(res.body.clientName).toBe('Kareem Fahad');
      expect(res.body.clientEmail).toBe('kareem@example.com');
      expect(res.body.status).toBe('CONFIRMED');

      // Verify slot is now marked as booked
      const slotRes = await request(app).get(`/slots/${availableSlotId}`);
      expect(slotRes.body.isBooked).toBe(true);

      // Verify slot no longer appears in available slots
      const availableRes = await request(app).get('/slots/available');
      const foundInAvailable = availableRes.body.find((s: { id: string }) => s.id === availableSlotId);
      expect(foundInAvailable).toBeUndefined();
    });

    it('rejects subsequent sequential booking attempt on the same slot (409 Conflict)', async () => {
      const res = await request(app).post('/bookings').send({
        slotId: availableSlotId,
        clientName: 'Duplicate Attempt',
        clientEmail: 'duplicate@example.com',
      });
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already booked');
    });
  });

  describe('Concurrency & Conflict Prevention (Core Evaluation Requirement)', () => {
    it('prevents double-booking when two concurrent requests compete for the same slot', async () => {
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

      // Send both requests simultaneously
      const [resA, resB] = await Promise.all([
        request(app).post('/bookings').send(clientA),
        request(app).post('/bookings').send(clientB),
      ]);

      const statuses = [resA.status, resB.status].sort();

      // Exactly ONE request must succeed (201 Created) and the other must fail with conflict (409 Conflict)
      expect(statuses).toEqual([201, 409]);

      const successResponse = resA.status === 201 ? resA : resB;
      const conflictResponse = resA.status === 409 ? resA : resB;

      expect(successResponse.body.id).toBeDefined();
      expect(conflictResponse.body.error).toContain('already booked');

      // Check database state: exactly 1 CONFIRMED booking must exist for this slot
      const confirmedBookings = await prisma.booking.findMany({
        where: {
          slotId: concurrentTestSlotId,
          status: 'CONFIRMED',
        },
      });
      expect(confirmedBookings.length).toBe(1);
    });
  });

  describe('Cancellation and Re-availability Flow', () => {
    it('cancels booking and makes the slot available again for new reservations', async () => {
      // 1. First book the cancellation test slot
      const bookRes = await request(app).post('/bookings').send({
        slotId: cancellationTestSlotId,
        clientName: 'Initial Booker',
        clientEmail: 'initial@example.com',
      });
      expect(bookRes.status).toBe(201);
      const bookingId = bookRes.body.id;

      // Slot is booked
      let slotCheck = await request(app).get(`/slots/${cancellationTestSlotId}`);
      expect(slotCheck.body.isBooked).toBe(true);

      // 2. Cancel the booking
      const cancelRes = await request(app).delete(`/bookings/${bookingId}`);
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.booking.status).toBe('CANCELLED');

      // 3. Verify slot is now available again
      slotCheck = await request(app).get(`/slots/${cancellationTestSlotId}`);
      expect(slotCheck.body.isBooked).toBe(false);

      const availableRes = await request(app).get('/slots/available');
      const foundInAvailable = availableRes.body.find(
        (s: { id: string }) => s.id === cancellationTestSlotId
      );
      expect(foundInAvailable).toBeDefined();

      // 4. Verify we can successfully re-book the released slot
      const rebookRes = await request(app).post('/bookings').send({
        slotId: cancellationTestSlotId,
        clientName: 'Second Booker',
        clientEmail: 'second@example.com',
      });
      expect(rebookRes.status).toBe(201);
      expect(rebookRes.body.clientName).toBe('Second Booker');

      // 5. Attempting to cancel an already cancelled booking returns 400 Bad Request
      const duplicateCancelRes = await request(app).delete(`/bookings/${bookingId}`);
      expect(duplicateCancelRes.status).toBe(400);
      expect(duplicateCancelRes.body.error).toContain('already been cancelled');
    });
  });
});
