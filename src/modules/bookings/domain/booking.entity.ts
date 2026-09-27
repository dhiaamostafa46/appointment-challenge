export enum BookingStatus {
  active = 'active',
  cancelled = 'cancelled',
}

export class BookingEntity {
  constructor(
    public readonly id: string,
    public readonly slotId: string,
    public readonly customerName: string,
    public readonly customerEmail: string,
    public status: BookingStatus,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public slot?: {
      id: string;
      startsAt: Date;
      endsAt: Date;
      isBooked: boolean;
      createdAt: Date;
      updatedAt: Date;
    }
  ) {}

  public cancel(): void {
    this.status = BookingStatus.cancelled;
    this.updatedAt = new Date();
  }

  public isActive(): boolean {
    return this.status === BookingStatus.active;
  }
}
