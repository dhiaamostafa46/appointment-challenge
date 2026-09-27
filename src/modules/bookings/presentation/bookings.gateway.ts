import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class BookingsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    // Client connected
  }

  handleDisconnect(client: Socket) {
    // Client disconnected
  }

  /**
   * Broadcasted when a slot is successfully booked.
   * Payload complies strictly with challenge specification (no customer data):
   * { slotId, bookingId, available: false }
   */
  emitSlotBooked(slotId: string, bookingId: string): void {
    if (this.server) {
      this.server.emit('slot.booked', {
        slotId,
        bookingId,
        available: false,
      });
    }
  }

  /**
   * Broadcasted when an active booking is cancelled.
   * Payload complies strictly with challenge specification (no customer data):
   * { slotId, bookingId, available: true }
   */
  emitSlotReleased(slotId: string, bookingId: string): void {
    if (this.server) {
      this.server.emit('slot.released', {
        slotId,
        bookingId,
        available: true,
      });
    }
  }
}
