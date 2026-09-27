import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BookingEntity } from '../domain/booking.entity';

@WebSocketGateway({ cors: { origin: '*' } })
export class BookingsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log(`[Socket.IO] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[Socket.IO] Client disconnected: ${client.id}`);
  }

  emitBookingCreated(booking: BookingEntity) {
    if (this.server) {
      this.server.emit('booking:created', booking);
      this.server.emit('slot:booked', {
        slotId: booking.slotId,
        bookingId: booking.id,
        timestamp: new Date().toISOString(),
      });
    }
  }

  emitBookingCancelled(booking: BookingEntity) {
    if (this.server) {
      this.server.emit('booking:cancelled', {
        id: booking.id,
        slotId: booking.slotId,
        timestamp: new Date().toISOString(),
      });
      this.server.emit('slot:available', {
        slotId: booking.slotId,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
