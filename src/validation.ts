export interface CreateBookingInput {
  slotId: string;
  clientName: string;
  clientEmail: string;
}

export interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  data?: T;
}

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function isValidNonEmptyString(val: unknown, minLength = 1, maxLength = 255): boolean {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
}

export function validateCreateBookingInput(body: unknown): ValidationResult<CreateBookingInput> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: ['Request body must be a valid JSON object'],
    };
  }

  const { slotId, clientName, clientEmail } = body as Record<string, unknown>;

  if (!isValidNonEmptyString(slotId)) {
    errors.push('slotId is required and must be a non-empty string');
  }

  if (!isValidNonEmptyString(clientName, 2, 100)) {
    errors.push('clientName is required and must be between 2 and 100 characters');
  }

  if (!isValidEmail(clientEmail)) {
    errors.push('clientEmail is required and must be a valid email address');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      slotId: (slotId as string).trim(),
      clientName: (clientName as string).trim(),
      clientEmail: (clientEmail as string).trim().toLowerCase(),
    },
  };
}
