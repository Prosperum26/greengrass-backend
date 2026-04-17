import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Email address', example: 'student@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Full name', example: 'Nguyen Van A' })
  @IsString()
  fullName!: string;

  @ApiProperty({
    description: 'Password (min 6 characters)',
    example: 'password123',
  })
  @IsString()
  @MinLength(6)
  password!: string;
}
