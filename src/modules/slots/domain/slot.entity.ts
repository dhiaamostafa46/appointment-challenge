export interface SlotBookingInfo {
  id: string;
  clientName: string;
  clientEmail: string;
  status: string;
  createdAt: Date;
}

export class SlotEntity {
  constructor(
    public readonly id: string,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public isBooked: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public bookings: SlotBookingInfo[] = []
  ) {}

  public markAsBooked(): void {
    this.isBooked = true;
    this.updatedAt = new Date();
  }

  public release(): void {
    this.isBooked = false;
    this.updatedAt = new Date();
  }
}
