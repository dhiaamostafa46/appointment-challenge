import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBookingDto } from '../src/modules/bookings/presentation/dto/create-booking.dto';

describe('CreateBookingDto Validation Tests', () => {
  it('passes validation with valid data and trims whitespace automatically', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      slotId: '11111111-1111-4111-8111-111111111111',
      customerName: '   Alex Morgan   ',
      customerEmail: '   alex@example.com   ',
    });

    expect(dto.customerName).toBe('Alex Morgan');
    expect(dto.customerEmail).toBe('alex@example.com');

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails validation when slotId is missing or empty or invalid UUID', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      slotId: 'invalid-uuid-string',
      customerName: 'Alex Morgan',
      customerEmail: 'alex@example.com',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('slotId');
  });

  it('fails validation with invalid email format', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      slotId: '11111111-1111-4111-8111-111111111111',
      customerName: 'Alex Morgan',
      customerEmail: 'invalid-email-address',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('customerEmail');
  });

  it('fails validation when customerName is empty or only whitespace', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      slotId: '11111111-1111-4111-8111-111111111111',
      customerName: '    ',
      customerEmail: 'alex@example.com',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('customerName');
  });
});
