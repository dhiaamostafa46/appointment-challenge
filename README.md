# Fixed-Slot Appointment Booking API (Elham Tech Challenge)

A robust, production-grade RESTful API for fixed-slot appointment bookings built with **TypeScript**, **Express**, **PostgreSQL**, and **Prisma ORM**. Features strict concurrency conflict prevention, real-time status broadcasting via **Socket.IO**, and interactive **OpenAPI 3.0 / Swagger** documentation.

---

## Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Quick Start with Docker](#quick-start-with-docker)
- [Local Development Setup](#local-development-setup)
- [API Documentation (Swagger UI)](#api-documentation-swagger-ui)
- [Real-Time Updates (Socket.IO)](#real-time-updates-socketio)
- [Concurrency Conflict Prevention](#concurrency-conflict-prevention)
- [Key Architectural Decisions](#key-architectural-decisions)
- [Potential Improvements & Production Readiness](#potential-improvements--production-readiness)
- [AI Disclosure Statement](#ai-disclosure-statement)
- [Time Spent & Completion Status](#time-spent--completion-status)

---

## Overview & Architecture

The system provides a clean, predictable workflow for managing fixed appointment slots:
1. **Seed Data:** Predefined fixed slots (e.g., 30-minute intervals) are populated via Prisma seed (`prisma/seed.ts`).
2. **Slot Discovery:** Clients query available (unbooked) slots.
3. **Reserving a Slot:** Clients submit a booking request for a specific `slotId`.
4. **Zero Double-Booking Guarantee:** Even if multiple requests for the same slot arrive at the exact same millisecond, exactly one succeeds (`201 Created`), while all others are rejected with a clear conflict error (`409 Conflict`).
5. **Slot Re-availability on Cancellation:** When a booking is cancelled, its status is updated to `CANCELLED`, and the slot is immediately released and available again for new reservations.
6. **Real-Time Push Notifications:** Socket.IO emits events when slots are booked or released.

---

## Quick Start with Docker

The easiest way to run the database, migrations, seeds, and the API:

```bash
docker compose up --build
```

This single command will:
1. Start a **PostgreSQL 15** container with a healthcheck.
2. Build the TypeScript application image.
3. Automatically execute Prisma migrations (`npm run migrate`).
4. Automatically seed the database with available fixed slots (`npm run seed`).
5. Start the server on `http://localhost:4000`.

- **Swagger Documentation:** [http://localhost:4000/docs](http://localhost:4000/docs)
- **Health Check:** [http://localhost:4000/health](http://localhost:4000/health)

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ instance running locally (or via Docker: `docker compose up -d db`)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and verify your PostgreSQL credentials:
```bash
cp .env.example .env
```
Default `.env`:
```env
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/appointment_db?schema=public"
PORT=4000
CORS_ORIGIN=*
```

### 3. Generate Prisma Client, Apply Migrations & Seed
```bash
npm run generate
npm run migrate
npm run seed
```

### 4. Run the Tests
```bash
# Run validation unit tests (runs without database dependency)
npm run test:unit

# Run full integration and concurrency test suite against PostgreSQL
npm run test:integration

# Or run all test suites
npm test
```

### 5. Start the Development Server
```bash
npm run dev
```

Or build and run in production mode:
```bash
npm run build
npm start
```

---

## API Documentation (Swagger UI)

Interactive Swagger UI is accessible at:
👉 **`http://localhost:4000/docs`**

Raw OpenAPI specifications are also served at:
- YAML: `http://localhost:4000/openapi.yaml`
- JSON: `http://localhost:4000/openapi.json`

### Route Summary

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/health` | Server health check and timestamp | `200` |
| `GET` | `/slots` | List all slots (supports `?available=true`) | `200` |
| `GET` | `/slots/available` | Shortcut to list only available (unbooked) slots | `200` |
| `GET` | `/slots/:id` | Get single slot details | `200`, `404` |
| `POST` | `/bookings` | Book a fixed slot (with concurrency lock) | `201`, `400`, `404`, `409` |
| `GET` | `/bookings` | List all bookings | `200` |
| `GET` | `/bookings/:id` | Get details of a specific booking | `200`, `404` |
| `DELETE` | `/bookings/:id` | Cancel a booking and re-open the slot | `200`, `400`, `404` |
| `POST` | `/bookings/:id/cancel` | Cancel booking (POST alias) | `200`, `400`, `404` |

---

## Real-Time Updates (Socket.IO)

The API broadcasts Socket.IO events to connected clients whenever slot states change:

- **`booking:created`**: Emitted when a new booking is confirmed.
  ```json
  { "id": "...", "slotId": "...", "clientName": "...", "status": "CONFIRMED" }
  ```
- **`slot:booked`**: Emitted when a slot is reserved.
  ```json
  { "slotId": "...", "bookingId": "...", "timestamp": "2026-10-01T10:00:00.000Z" }
  ```
- **`booking:cancelled`**: Emitted when a booking is cancelled.
  ```json
  { "id": "...", "slotId": "...", "timestamp": "2026-10-01T10:00:00.000Z" }
  ```
- **`slot:available`**: Emitted when a slot is released back to available status.
  ```json
  { "slotId": "...", "timestamp": "2026-10-01T10:00:00.000Z" }
  ```

---

## Concurrency Conflict Prevention

### The Problem
When two or more users attempt to book the exact same slot at the same millisecond, standard "check-then-insert" logic (`findFirst` followed by `create`) suffers from a **race condition**: both queries check availability before either write occurs, resulting in double-booking.

### Our Solution (Defense in Depth)

1. **Pessimistic Row-Level Lock (`SELECT ... FOR UPDATE`) inside an ACID Transaction:**
   ```typescript
   return prisma.$transaction(async (tx) => {
     // 1. Lock the slot row exclusively in PostgreSQL
     const [slot] = await tx.$queryRaw<Slot[]>`
       SELECT * FROM "Slot" WHERE id = ${input.slotId} FOR UPDATE
     `;

     if (!slot) throw new SlotNotFoundError(input.slotId);
     if (slot.isBooked) throw new SlotAlreadyBookedError(input.slotId);

     // 2. Mark slot booked & create booking atomically
     await tx.slot.update({ where: { id: input.slotId }, data: { isBooked: true } });
     return tx.booking.create({ ... });
   }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
   ```
   - The first transaction obtains an exclusive row lock on the target slot row.
   - Any concurrent transaction attempting to read that slot `FOR UPDATE` will block until the first transaction commits or rolls back.
   - Once unblocked, the second transaction reads the committed state where `isBooked === true`, and immediately aborts with `SlotAlreadyBookedError` (`409 Conflict`).

2. **Database-Level Partial Unique Index (Fail-Safe Defense):**
   ```sql
   CREATE UNIQUE INDEX "unique_active_slot_booking" 
   ON "Booking"("slotId") 
   WHERE "status" = 'CONFIRMED';
   ```
   Even if an application-level bug bypassed row locking, PostgreSQL's storage engine enforces that only **one** active (`CONFIRMED`) booking can ever exist per `slotId`.

3. **Re-availability on Cancellation:**
   Cancellation operates inside a serialized transaction: the booking status becomes `CANCELLED`, the slot's `isBooked` flag is reverted to `false`, and the partial index allows a future confirmed booking for that slot without primary key conflicts.

---

## Key Architectural Decisions

1. **Express with Clean Separation of Concerns:**
   - **`src/validation.ts`**: Pure functions for payload validation and sanitization.
   - **`src/services/appointmentService.ts`**: Database interaction, transaction boundaries, and domain errors.
   - **`src/controllers/appointmentController.ts`**: HTTP translation, input validation calls, and Socket.IO emission.
   - **`src/index.ts`**: Server lifecycle, middleware orchestration, and centralized error mapping.
2. **Explicit Slot Model (`Slot` + `Booking`):**
   Modeling fixed slots as distinct entities enables indexing on `startTime` and `isBooked`, keeping `GET /slots/available` high-performing ($O(1)$ indexed lookup) without table scans.
3. **No Unnecessary Authentication / Bloat:**
   Strict adherence to the challenge guidelines ("لا نقاط لميزات إضافية غير مطلوبة. لا يتطلب تسجيل دخول"). This ensures reviewer testing is friction-free.
4. **Idempotent Seed Script:**
   The seed script safely flushes and repopulates standard fixed slots across upcoming dates for reproducible automated tests.

---

## Potential Improvements & Production Readiness

- **Optimistic Locking with Versioning:** For high-throughput scenarios where lock contention might be an issue, an optimistic concurrency control pattern (`version` column) could be evaluated.
- **Rate Limiting:** Protect `/bookings` from denial-of-service spamming using `express-rate-limit` or Redis token bucket.
- **Provider / Resource Multi-Tenancy:** Adding a `resourceId` / `providerId` to support multi-provider scheduling across multiple calendars.
- **Idempotency Keys:** Supporting `Idempotency-Key` headers on `POST /bookings` to safely handle network timeouts and client retries without double charging or duplicate calls.
- **Automated Expiring Holds:** A temporary reservation state (e.g. 5-minute hold while user fills out form) backed by Redis TTL or PostgreSQL background worker.

---

## AI Disclosure Statement

In compliance with the challenge submission requirements:
- **Tools Used:** Antigravity AI pair programming assistant with Claude/Gemini LLM engine.
- **Supervision & Verification:** AI was utilized to draft initial boilerplate, migration SQL syntax, and Swagger schema definitions. Every line of business logic, concurrency locking mechanism (`FOR UPDATE`), schema design, and test cases were thoroughly reviewed, manually verified, and tested against automated suites.
- **Confidence:** Full comprehension of all architectural choices, concurrency edge cases, and code structure; fully prepared to explain and modify any component live during the technical interview.

---

## Time Spent & Completion Status

- **Target Duration:** 2–3 hours.
- **Actual Time Spent:** ~2 hours (Architecture design, PostgreSQL Prisma migration, Concurrency implementation, OpenAPI 3.0 specification, Socket.IO integration, unit and concurrency testing).
- **Completion Status:** **100% complete**. All requirements specified in the challenge brief have been implemented and validated with zero missing components.
