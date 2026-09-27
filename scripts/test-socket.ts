import { io, Socket } from 'socket.io-client';
import http from 'http';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

function sendRequest(path: string, method: string, data?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : '';
    const url = new URL(path, BASE_URL);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, body: raw ? JSON.parse(raw) : {} });
          } catch {
            resolve({ status: res.statusCode || 500, body: raw });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  console.log(`🔌 Connecting headless Socket.IO client to: ${BASE_URL} ...`);
  const socket: Socket = io(BASE_URL, {
    transports: ['websocket', 'polling'],
  });

  const receivedEvents: Array<{ event: string; data: any }> = [];

  socket.on('connect', () => {
    console.log(`✅ Socket.IO connected with id: ${socket.id}`);
  });

  socket.on('slot.booked', (data) => {
    console.log(`📡 [Event Received] slot.booked:`, JSON.stringify(data));
    receivedEvents.push({ event: 'slot.booked', data });
  });

  socket.on('slot.released', (data) => {
    console.log(`📡 [Event Received] slot.released:`, JSON.stringify(data));
    receivedEvents.push({ event: 'slot.released', data });
  });

  // Wait for connection
  await new Promise((r) => setTimeout(r, 1000));

  // 1. Fetch available slots
  console.log('1️⃣ Fetching available slots via GET /slots ...');
  const slotsRes = await sendRequest('/slots', 'GET');
  console.log(`   Response: status=${slotsRes.status}, count=${slotsRes.body.slots?.length || 0}`);

  const targetSlot = slotsRes.body.slots?.[0];
  if (!targetSlot) {
    console.error('❌ No available slot found to test.');
    socket.disconnect();
    process.exit(1);
  }

  // 2. Create a booking
  console.log(`2️⃣ Booking slot ${targetSlot.id} via POST /bookings ...`);
  const bookRes = await sendRequest('/bookings', 'POST', {
    slotId: targetSlot.id,
    customerName: 'Socket Test User',
    customerEmail: 'socket.tester@example.com',
  });
  console.log(`   Response: status=${bookRes.status}, bookingId=${bookRes.body.booking?.id}`);

  // Wait for slot.booked event
  await new Promise((r) => setTimeout(r, 800));
  const bookedEvent = receivedEvents.find((e) => e.event === 'slot.booked');
  if (!bookedEvent || bookedEvent.data.slotId !== targetSlot.id || bookedEvent.data.available !== false) {
    console.error('❌ Expected slot.booked event with available: false, but received:', bookedEvent);
    socket.disconnect();
    process.exit(1);
  }
  console.log('   ✅ slot.booked verified with { available: false }');

  // 3. Cancel the booking
  const bookingId = bookRes.body.booking.id;
  console.log(`3️⃣ Cancelling booking ${bookingId} via DELETE /bookings/${bookingId} ...`);
  const cancelRes = await sendRequest(`/bookings/${bookingId}`, 'DELETE');
  console.log(`   Response: status=${cancelRes.status}, status=${cancelRes.body.booking?.status}`);

  // Wait for slot.released event
  await new Promise((r) => setTimeout(r, 800));
  const releasedEvent = receivedEvents.find((e) => e.event === 'slot.released');
  if (!releasedEvent || releasedEvent.data.slotId !== targetSlot.id || releasedEvent.data.available !== true) {
    console.error('❌ Expected slot.released event with available: true, but received:', releasedEvent);
    socket.disconnect();
    process.exit(1);
  }
  console.log('   ✅ slot.released verified with { available: true }');

  console.log('🎉 Headless Socket.IO test completed with 100% success!');
  socket.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error running socket test:', err);
  process.exit(1);
});
