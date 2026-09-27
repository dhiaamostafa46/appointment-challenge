export class SlotEntity {
  constructor(
    public readonly id: string,
    public readonly startsAt: Date,
    public readonly endsAt: Date,
    public isBooked: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public bookings?: Array<{
      id: string;
      customerName: string;
      customerEmail: string;
      status: string;
      createdAt: Date;
    }>
  ) {}
}
