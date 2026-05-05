import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for check-in request
 */
export class CheckInDto {
  /**
   * The QR token for verification
   */
  @ApiProperty({
    description: 'QR token from event organizer',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  qrToken!: string;

  /**
   * User's current latitude for location validation
   */
  @ApiProperty({
    description: 'User latitude for location validation',
    example: 10.7769,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userLatitude?: number;

  /**
   * User's current longitude for location validation
   */
  @ApiProperty({
    description: 'User longitude for location validation',
    example: 106.7009,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userLongitude?: number;
}

/**
 * DTO for check-in response
 */
export class CheckInResponseDto {
  /**
   * Whether the check-in was successful
   */
  success: boolean;

  /**
   * Message describing the result
   */
  message: string;

  /**
   * The check-in timestamp (if successful)
   */
  checkInTime?: Date;

  /**
   * Points awarded (if successful)
   */
  pointsAwarded?: number;

  /**
   * Distance from event location (if check-in failed due to location)
   */
  @ApiProperty({
    description: 'Distance from event location in meters',
    example: 125.5,
    required: false,
  })
  distanceToEvent?: number;

  /**
   * Required check-in radius for the event
   */
  @ApiProperty({
    description: 'Required check-in radius in meters',
    example: 50.0,
    required: false,
  })
  requiredRadius?: number;
}

/**
 * DTO for generating QR code (organizer use)
 */
export class GenerateQrDto {
  /**
   * The event ID to generate QR for
   */
  @IsUUID()
  @IsNotEmpty()
  eventId: string;
}

/**
 * DTO for QR code response
 */
export class QrResponseDto {
  /**
   * The event ID
   */
  eventId: string;

  /**
   * The generated QR token
   */
  qrToken: string;

  /**
   * When the token was generated
   */
  generatedAt: Date;

  /**
   * When the token expires
   */
  expiresAt: Date;
}
