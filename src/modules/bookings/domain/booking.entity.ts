export enum BookingStatus {
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export class BookingEntity {
  constructor(
    public readonly id: string,
    public readonly slotId: string,
    public readonly clientName: string,
    public readonly clientEmail: string,
    public status: BookingStatus,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public slot?: {
      id: string;
      startTime: Date;
      endTime: Date;
      isBooked: boolean;
      createdAt: Date;
      updatedAt: Date;
    }
  ) {}

  public cancel(): void {
    this.status = BookingStatus.CANCELLED;
    this.updatedAt = new Date();
  }

  public isConfirmed(): boolean {
    return this.status === BookingStatus.CONFIRMED;
  }
}
