import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Valid UUID of the available slot to book',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID(undefined, { message: 'slotId must be a valid UUID' })
  @IsNotEmpty({ message: 'slotId is required' })
  slotId!: string;

  @ApiProperty({
    description: 'Full name of the customer (trimmed before validation)',
    example: 'Alex Morgan',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'customerName must be a string' })
  @IsNotEmpty({ message: 'customerName cannot be empty' })
  customerName!: string;

  @ApiProperty({
    description: 'Valid contact email address of the customer (trimmed before validation)',
    example: 'alex@example.com',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail({}, { message: 'customerEmail must be a valid email address' })
  @IsNotEmpty({ message: 'customerEmail is required' })
  customerEmail!: string;
}
