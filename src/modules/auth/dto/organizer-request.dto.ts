import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrganizerRequestDto {
  @ApiProperty({
    description: 'Email address',
    example: 'organizer@example.com',
  })
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

  @ApiProperty({
    description: 'Organization name',
    example: 'CLB Moi Truong Xanh',
  })
  @IsString()
  organizationName!: string;

  @ApiPropertyOptional({ description: 'Organization description' })
  @IsOptional()
  @IsString()
  description?: string;
}
