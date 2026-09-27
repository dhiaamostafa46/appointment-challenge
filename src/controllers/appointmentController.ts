import { NextFunction, Request, Response, Router } from 'express';
import * as service from '../services/appointmentService';
import { validateCreateBookingInput } from '../validation';

export const slotRouter = Router();
export const bookingRouter = Router();

function asyncRoute(handler: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

// ==========================================
// Slots Endpoints
// ==========================================

/**
 * GET /slots/available
 * Fast convenience route to list only available slots.
 */
slotRouter.get(
  '/available',
  asyncRoute(async (_req, res) => {
    const slots = await service.listSlots({ availableOnly: true });
    return res.json(slots);
  })
);

/**
 * GET /slots
 * List slots, optionally filtered by ?available=true
 */
slotRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const availableOnly = req.query.available === 'true';
    const slots = await service.listSlots({ availableOnly });
    return res.json(slots);
  })
);

/**
 * GET /slots/:id
 * Retrieve a specific slot with its booking status.
 */
slotRouter.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const slot = await service.getSlot(req.params.id);
    if (!slot) {
      return res.status(404).json({ error: `Slot with ID '${req.params.id}' not found` });
    }
    return res.json(slot);
  })
);

// ==========================================
// Bookings Endpoints
// ==========================================

/**
 * POST /bookings
 * Book a fixed slot. Prevents double-booking even under concurrent calls.
 */
bookingRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const validation = validateCreateBookingInput(req.body);
    if (!validation.isValid || !validation.data) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
    }

    const booking = await service.createBooking(validation.data);

    // Broadcast real-time Socket.IO updates
    const io = req.app.get('io');
    if (io) {
      io.emit('booking:created', booking);
      io.emit('slot:booked', {
        slotId: booking.slotId,
        bookingId: booking.id,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(201).json(booking);
  })
);

/**
 * GET /bookings
 * List all bookings.
 */
bookingRouter.get(
  '/',
  asyncRoute(async (_req, res) => {
    const bookings = await service.listBookings();
    return res.json(bookings);
  })
);

/**
 * GET /bookings/:id
 * Retrieve a specific booking.
 */
bookingRouter.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const booking = await service.getBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: `Booking with ID '${req.params.id}' not found` });
    }
    return res.json(booking);
  })
);

/**
 * Handler for cancelling a booking (used by DELETE /bookings/:id and POST /bookings/:id/cancel)
 */
async function handleCancellation(req: Request, res: Response) {
  const cancelledBooking = await service.cancelBooking(req.params.id);

  // Broadcast real-time Socket.IO updates
  const io = req.app.get('io');
  if (io) {
    io.emit('booking:cancelled', {
      id: cancelledBooking.id,
      slotId: cancelledBooking.slotId,
      timestamp: new Date().toISOString(),
    });
    io.emit('slot:available', {
      slotId: cancelledBooking.slotId,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(200).json({
    message: 'Booking cancelled successfully. Slot is now available for new reservations.',
    booking: cancelledBooking,
  });
}

/**
 * DELETE /bookings/:id
 * Cancel booking and restore slot availability.
 */
bookingRouter.delete('/:id', asyncRoute(handleCancellation));

/**
 * POST /bookings/:id/cancel
 * Alternate cancellation endpoint.
 */
bookingRouter.post('/:id/cancel', asyncRoute(handleCancellation));
