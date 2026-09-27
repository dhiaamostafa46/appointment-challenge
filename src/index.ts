import 'dotenv/config';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { bookingRouter, slotRouter } from './controllers/appointmentController';
import * as service from './services/appointmentService';

export const app = express();
export const httpServer = http.createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
  },
});

app.set('io', io);
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*' }));
app.use(express.json({ limit: '32kb' }));

// Serve Interactive Testing Dashboard
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  return res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OpenAPI Documentation via Swagger UI
const openapiFile = path.resolve(process.cwd(), 'openapi.yaml');
const swaggerDocument = YAML.load(openapiFile);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Serve raw openapi specification
app.get('/openapi.yaml', (_req: Request, res: Response) => {
  return res.sendFile(openapiFile);
});
app.get('/openapi.json', (_req: Request, res: Response) => {
  return res.json(swaggerDocument);
});

// Core API Routers
app.use('/slots', slotRouter);
app.use('/bookings', bookingRouter);

// Centralized Error Handling Middleware
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof service.SlotNotFoundError || error instanceof service.BookingNotFoundError) {
    return res.status(404).json({ error: (error as Error).message });
  }

  if (error instanceof service.SlotAlreadyBookedError) {
    return res.status(409).json({ error: (error as Error).message });
  }

  if (error instanceof service.BookingAlreadyCancelledError) {
    return res.status(400).json({ error: (error as Error).message });
  }

  // Handle Prisma unique constraint violation (P2002) as conflict
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  ) {
    return res.status(409).json({ error: 'Slot is already booked' });
  }

  console.error('Unhandled server error:', error);
  return res.status(500).json({ error: 'Internal server error' });
});

// Socket.IO connection logging
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

if (require.main === module) {
  const port = Number(process.env.PORT ?? 4000);
  httpServer.listen(port, () => {
    console.log(`Appointment Booking API listening on http://localhost:${port}`);
    console.log(`Interactive API Documentation: http://localhost:${port}/docs`);
  });
}

export async function shutdown() {
  io.close();
  await service.prisma.$disconnect();
}

export { service };
export { prisma } from './services/appointmentService';
