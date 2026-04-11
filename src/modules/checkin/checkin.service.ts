import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QrUtil } from './utils/qr.util';
import { CheckInLogger } from './logs/checkin.logger';
import { CheckInFailReason } from './constants/checkin.constants';
import { CheckInResponseDto, QrResponseDto } from './dto/checkin.dto';
import { EventStatus, RegistrationStatus } from '@prisma/client';

/**
 * Service for handling check-in operations
 * Includes dynamic QR generation, verification, and logging
 */
@Injectable()
export class CheckinService {
  private readonly logger = new CheckInLogger();
  private readonly qrSecret: string;

  constructor(private readonly prisma: PrismaService) {
    this.qrSecret =
      process.env.QR_SECRET || 'default-secret-change-in-production';
  }

  /**
   * Generate a dynamic QR token for an event
   * Used by organizers to display QR for check-in
   *
   * @param eventId - The event ID
   * @returns QR response with token and expiration info
   */
  async generateQrToken(eventId: string): Promise<QrResponseDto> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      this.logger.logEventNotFound(eventId);
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const qrToken = QrUtil.generateQrToken(eventId, this.qrSecret);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30000); // 30 seconds expiration

    return {
      eventId,
      qrToken,
      generatedAt: now,
      expiresAt,
    };
  }

  /**
   * Process a check-in for a user at an event
   * Validates QR token, checks registration status, and awards points
   *
   * @param userId - The user ID checking in
   * @param eventId - The event ID
   * @param qrToken - The QR token to verify
   * @returns Check-in response with success status
   */
  async checkIn(
    userId: string,
    eventId: string,
    qrToken: string,
  ): Promise<CheckInResponseDto> {
    // Step 1: Find event
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      this.logger.logFailure(
        userId,
        eventId,
        CheckInFailReason.EVENT_NOT_FOUND,
      );
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Check if event is ongoing or upcoming (allow check-in)
    if (event.status === EventStatus.COMPLETED) {
      this.logger.logFailure(
        userId,
        eventId,
        CheckInFailReason.EVENT_NOT_FOUND,
        'Event already completed',
      );
      throw new BadRequestException('Event has already completed');
    }

    // Step 2: Check if user is registered for this event
    const registration = await this.prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    if (!registration) {
      this.logger.logNotRegistered(userId, eventId);
      throw new BadRequestException(
        'You must register for this event before checking in',
      );
    }

    // Step 3: Check for duplicate check-in
    if (
      registration.status === RegistrationStatus.CHECKED_IN ||
      registration.status === RegistrationStatus.COMPLETED
    ) {
      this.logger.logDuplicateAttempt(userId, eventId);
      throw new ConflictException('You have already checked in for this event');
    }

    // Step 4: Verify QR token
    const isValidQr = QrUtil.verifyQrToken(eventId, qrToken, this.qrSecret);

    if (!isValidQr) {
      this.logger.logInvalidQr(userId, eventId);
      throw new BadRequestException('Invalid or expired QR code');
    }

    // Step 5: Save check-in (update registration)
    const updatedRegistration = await this.prisma.eventRegistration.update({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
      data: {
        status: RegistrationStatus.CHECKED_IN,
        checkInTime: new Date(),
      },
    });

    // Step 6: Call stub for adding points
    this.addPoints(userId, eventId, event.points);

    // Step 7: Log success
    this.logger.logSuccess(userId, eventId);

    // Step 8: Return response
    return {
      success: true,
      message: 'Check-in successful',
      checkInTime: updatedRegistration.checkInTime ?? undefined,
      pointsAwarded: event.points,
    };
  }

  /**
   * Stub function for adding points to user
   * TODO: Implement actual point awarding logic with gamification service
   *
   * @param userId - The user ID
   * @param eventId - The event ID
   * @param points - Points to award
   */
  private addPoints(userId: string, eventId: string, points: number): void {
    // TODO: Implement point awarding logic
    // This should integrate with gamification service
    // For now, just log the intent
    console.log(
      `[POINTS_STUB] Would add ${points} points to user ${userId} for event ${eventId}`,
    );
  }
}
