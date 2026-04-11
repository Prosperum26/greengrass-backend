import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

/**
 * DTO for check-in request
 */
export class CheckInDto {
  /**
   * The QR token for verification
   */
  @IsString()
  @IsNotEmpty()
  qrToken: string;
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
