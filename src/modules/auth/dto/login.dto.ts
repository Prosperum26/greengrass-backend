import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Email address', example: 'student@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Password', example: 'password123' })
  @IsString()
  password!: string;
}