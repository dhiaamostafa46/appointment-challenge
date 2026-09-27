import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBookingDto } from '../src/modules/bookings/presentation/dto/create-booking.dto';

describe('CreateBookingDto Validation Tests', () => {
  it('passes validation with valid data', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      slotId: '4a2f8b50-3a1b-4f9e-9d22-123456789abc',
      clientName: 'Ahmed Al-Mansoor',
      clientEmail: 'ahmed@example.com',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('fails validation when slotId is missing or empty', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      slotId: '',
      clientName: 'Ahmed Al-Mansoor',
      clientEmail: 'ahmed@example.com',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('slotId');
  });

  it('fails validation with invalid email format', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      slotId: '4a2f8b50-3a1b-4f9e-9d22-123456789abc',
      clientName: 'Ahmed Al-Mansoor',
      clientEmail: 'invalid-email',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('clientEmail');
  });

  it('fails validation when clientName is too short', async () => {
    const dto = plainToInstance(CreateBookingDto, {
      slotId: '4a2f8b50-3a1b-4f9e-9d22-123456789abc',
      clientName: 'A',
      clientEmail: 'ahmed@example.com',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('clientName');
  });
});
