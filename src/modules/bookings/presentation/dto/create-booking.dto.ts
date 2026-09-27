import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'UUID of the slot to reserve',
    example: '4a2f8b50-3a1b-4f9e-9d22-123456789abc',
  })
  @IsString()
  @IsNotEmpty({ message: 'slotId is required and must be a non-empty string' })
  slotId!: string;

  @ApiProperty({
    description: 'Full name of the client',
    example: 'Ahmed Al-Mansoor',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @Length(2, 100, { message: 'clientName must be between 2 and 100 characters' })
  clientName!: string;

  @ApiProperty({
    description: 'Valid contact email address',
    example: 'ahmed@example.com',
  })
  @IsEmail({}, { message: 'clientEmail must be a valid email address' })
  clientEmail!: string;
}
