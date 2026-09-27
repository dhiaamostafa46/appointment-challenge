import {
  isValidEmail,
  isValidNonEmptyString,
  validateCreateBookingInput,
} from '../src/validation';

describe('Booking Input Validation Unit Tests', () => {
  it('validates email formats accurately', () => {
    expect(isValidEmail('valid.user@example.com')).toBe(true);
    expect(isValidEmail('user+tag@domain.co.uk')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('no-at-sign.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });

  it('validates non-empty string constraints', () => {
    expect(isValidNonEmptyString('valid string')).toBe(true);
    expect(isValidNonEmptyString('   ')).toBe(false);
    expect(isValidNonEmptyString('', 1)).toBe(false);
    expect(isValidNonEmptyString('a', 2)).toBe(false); // Below min length
    expect(isValidNonEmptyString('ab', 2)).toBe(true);
    expect(isValidNonEmptyString(null)).toBe(false);
  });

  it('rejects invalid create booking payloads with informative error messages', () => {
    const emptyResult = validateCreateBookingInput({});
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.errors.length).toBeGreaterThan(0);
    expect(emptyResult.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('slotId is required'),
        expect.stringContaining('clientName is required'),
        expect.stringContaining('clientEmail is required'),
      ])
    );

    const invalidEmailResult = validateCreateBookingInput({
      slotId: 'uuid-1234',
      clientName: 'Sarah Connor',
      clientEmail: 'not-an-email',
    });
    expect(invalidEmailResult.isValid).toBe(false);
    expect(invalidEmailResult.errors).toContain('clientEmail is required and must be a valid email address');

    const shortNameResult = validateCreateBookingInput({
      slotId: 'uuid-1234',
      clientName: 'A',
      clientEmail: 'sarah@example.com',
    });
    expect(shortNameResult.isValid).toBe(false);
    expect(shortNameResult.errors).toContain('clientName is required and must be between 2 and 100 characters');
  });

  it('accepts and sanitizes valid booking inputs', () => {
    const validResult = validateCreateBookingInput({
      slotId: '  uuid-9999  ',
      clientName: '  John Doe  ',
      clientEmail: '  JOHN@EXAMPLE.COM  ',
    });

    expect(validResult.isValid).toBe(true);
    expect(validResult.errors).toHaveLength(0);
    expect(validResult.data).toEqual({
      slotId: 'uuid-9999',
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
    });
  });
});
