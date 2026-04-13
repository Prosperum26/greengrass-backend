import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { CheckinService } from './checkin.service';
import {
  CheckInDto,
  CheckInResponseDto,
  QrResponseDto,
} from './dto/checkin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { Roles } from '../events/decorators/roles.decorator';
import { RolesGuard } from '../events/guards/roles.guard';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

/**
 * Controller for check-in operations
 * Handles QR generation and check-in processing
 */
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  @Roles('ORGANIZER')
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
  @Roles('STUDENT')
  @UsePipes(new ValidationPipe({ transform: true }))
  async checkIn(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() checkInDto: CheckInDto,
    @Req() req: RequestWithUser,
  ): Promise<CheckInResponseDto> {
    const userId = req.user.sub;
    return this.checkinService.checkIn(userId, eventId, checkInDto.qrToken);
  }

  /**
   * Get list of participants who have checked in
   * For organizer dashboard
   *
   * @param eventId - The event ID
   * @returns List of checked-in participants
   */
  @Get(':eventId/checked-in')
  @Roles('ORGANIZER')
  async getCheckedInParticipants(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<Array<{ userId: string; checkInTime: Date; status: string }>> {
    return this.checkinService.getCheckedInParticipants(eventId);
  }

  /**
   * Get check-in statistics for an event
   * For organizer dashboard
   *
   * @param eventId - The event ID
   * @returns Check-in statistics
   */
  @Get(':eventId/check-in-stats')
  @Roles('ORGANIZER')
  async getCheckInStats(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<{
    totalRegistered: number;
    checkedIn: number;
    completed: number;
    checkInRate: number;
  }> {
    return this.checkinService.getCheckInStats(eventId);
  }
}
