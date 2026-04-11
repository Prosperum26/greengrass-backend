import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CheckinService } from './checkin.service';
import {
  CheckInDto,
  CheckInResponseDto,
  QrResponseDto,
} from './dto/checkin.dto';

/**
 * Controller for check-in operations
 * Handles QR generation and check-in processing
 */
@Controller('events')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  /**
   * Get dynamic QR token for an event (Organizer use)
   * Token rotates every 30 seconds
   *
   * @param eventId - The event ID
   * @returns QR token response
   */
  @Get(':eventId/qr')
  async getQrToken(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<QrResponseDto> {
    return this.checkinService.generateQrToken(eventId);
  }

  /**
   * Check-in to an event using QR token
   *
   * @param eventId - The event ID
   * @param checkInDto - The check-in request with QR token
   * @returns Check-in response
   */
  @Post(':eventId/check-in')
  @UsePipes(new ValidationPipe({ transform: true }))
  async checkIn(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() checkInDto: CheckInDto,
  ): Promise<CheckInResponseDto> {
    // TODO: Get userId from authenticated user (JWT token)
    // For now, using a placeholder - this should come from JWT guard
    const userId = 'temp-user-id'; // Replace with actual user from JWT

    return this.checkinService.checkIn(userId, eventId, checkInDto.qrToken);
  }
}
