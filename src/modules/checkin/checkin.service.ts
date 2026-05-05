import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { QrUtil } from './utils/qr.util';
import { CheckInLogger } from './logs/checkin.logger';
import { CheckInFailReason } from './constants/checkin.constants';
import { CheckInResponseDto, QrResponseDto } from './dto/checkin.dto';
import { isWithinRange, isValidCoordinates } from './utils/distance.util';
import {
  EventStatus,
  RegistrationStatus,
  PointReason,
  Event,
} from '@prisma/client';

// Temporary type extensions until Prisma migration is run
interface EventWithLocation extends Omit<Event, 'checkinRadius'> {
  checkinRadius?: number;
}

interface EventRegistrationWithLocation {
  userId: string;
  eventId: string;
  status: RegistrationStatus;
  checkInTime?: Date;
  checkinLatitude?: number;
  checkinLongitude?: number;
  user: {
    fullName: string;
  };
}

interface EventRegistrationUpdateData {
  status: RegistrationStatus;
  checkInTime: Date;
  checkinLatitude?: number;
  checkinLongitude?: number;
}

/**
 * Service for handling check-in operations
 * Includes dynamic QR generation, verification, and logging
 */
@Injectable()
export class CheckinService {
  private readonly logger = new CheckInLogger();
  private readonly qrSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamificationService: GamificationService,
    private readonly configService: ConfigService,
  ) {
    const qrSecret = this.configService.get<string>('QR_SECRET');
    if (!qrSecret) {
      throw new Error('QR_SECRET environment variable is required');
    }
    this.qrSecret = qrSecret;
  }

  /**
   * Generate a dynamic QR token for an event
   * Used by organizers to display QR for check-in
   *
   * @param eventId - The event ID
   * @returns QR response with token and expiration info
   */
  async generateQrToken(
    eventId: string,
    organizerId: string,
    userRole?: string,
  ): Promise<QrResponseDto> {
    await this.ensureOrganizerOwnsEvent(eventId, organizerId, userRole);

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
   * Validates QR token, checks registration status, validates location, and awards points
   *
   * @param userId - The user ID checking in
   * @param eventId - The event ID
   * @param qrToken - The QR token to verify
   * @param userLatitude - Optional user latitude for location validation
   * @param userLongitude - Optional user longitude for location validation
   * @returns Check-in response with success status
   */
  async checkIn(
    userId: string,
    eventId: string,
    qrToken: string,
    userLatitude?: number,
    userLongitude?: number,
  ): Promise<CheckInResponseDto> {
    // Step 1: Find event
    const eventResult = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!eventResult) {
      this.logger.logFailure(
        userId,
        eventId,
        CheckInFailReason.EVENT_NOT_FOUND,
      );
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const event: EventWithLocation = {
      ...eventResult,
      checkinRadius: (eventResult as EventWithLocation).checkinRadius || 50.0,
    };

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

    // Step 5: Validate location if coordinates provided
    if (userLatitude && userLongitude) {
      if (!isValidCoordinates(userLatitude, userLongitude)) {
        this.logger.logFailure(
          userId,
          eventId,
          CheckInFailReason.INVALID_LOCATION,
          'Invalid GPS coordinates provided',
        );
        throw new BadRequestException('Invalid GPS coordinates provided');
      }

      const { isWithinRange: inRange, distance } = isWithinRange(
        userLatitude,
        userLongitude,
        event.latitude,
        event.longitude,
        event.checkinRadius || 50.0, // Default to 50m if not set
      );

      if (!inRange) {
        this.logger.logFailure(
          userId,
          eventId,
          CheckInFailReason.OUT_OF_RANGE,
          `User is ${distance.toFixed(2)}m away from event (required: ${event.checkinRadius || 50.0}m)`,
        );

        return {
          success: false,
          message: `Bạn đang cách sự kiện ${distance.toFixed(0)}m. Vui lòng di chuyển đến trong phạm vi ${event.checkinRadius || 50}m để check-in.`,
          distanceToEvent: distance,
          requiredRadius: event.checkinRadius || 50.0,
        };
      }
    } else {
      // If no location provided, check if event requires location validation
      if (event.checkinRadius && event.checkinRadius > 0) {
        this.logger.logFailure(
          userId,
          eventId,
          CheckInFailReason.LOCATION_REQUIRED,
          'Location coordinates required for check-in',
        );
        throw new BadRequestException(
          'Vị trí của bạn là bắt buộc để check-in sự kiện này. Vui lòng bật định vị và thử lại.',
        );
      }
    }

    // Step 6: Save check-in (update registration)
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
        checkinLatitude: userLatitude,
        checkinLongitude: userLongitude,
      } as EventRegistrationUpdateData,
    });

    // Step 6: Add points and update streak via gamification service
    await this.gamificationService.addPoints({
      userId,
      amount: event.points,
      reason: PointReason.CHECK_IN,
      eventId,
    });
    await this.gamificationService.updateStreak(userId);

    // Step 7: Award First Green Step badge for first successful check-in
    await this.gamificationService.awardFirstEventBadge(userId);

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
   * Get list of participants who have checked in for an event
   * For organizer dashboard
   *
   * @param eventId - The event ID
   * @returns List of checked-in participants with user names
   */
  async getCheckedInParticipants(
    eventId: string,
    organizerId: string,
    userRole?: string,
  ): Promise<
    Array<{
      userId: string;
      userName: string;
      checkInTime: Date;
      status: string;
      checkinLatitude?: number;
      checkinLongitude?: number;
    }>
  > {
    await this.ensureOrganizerOwnsEvent(eventId, organizerId, userRole);

    const checkedInRegistrations =
      (await this.prisma.eventRegistration.findMany({
        where: {
          eventId,
          status: {
            in: [RegistrationStatus.CHECKED_IN, RegistrationStatus.COMPLETED],
          },
        },
        include: {
          user: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: {
          checkInTime: 'asc',
        },
      })) as EventRegistrationWithLocation[];

    return checkedInRegistrations.map((reg) => ({
      userId: reg.userId,
      userName: reg.user.fullName || 'Unknown User',
      checkInTime: reg.checkInTime!,
      status: reg.status,
      checkinLatitude: reg.checkinLatitude,
      checkinLongitude: reg.checkinLongitude,
    }));
  }

  /**
   * Get check-in statistics for an event
   * For organizer dashboard
   *
   * @param eventId - The event ID
   * @returns Check-in statistics
   */
  async getCheckInStats(
    eventId: string,
    organizerId: string,
    userRole?: string,
  ): Promise<{
    totalRegistered: number;
    checkedIn: number;
    completed: number;
    checkInRate: number;
  }> {
    await this.ensureOrganizerOwnsEvent(eventId, organizerId, userRole);

    const [totalRegistered, checkedIn, completed] = await Promise.all([
      this.prisma.eventRegistration.count({
        where: { eventId },
      }),
      this.prisma.eventRegistration.count({
        where: { eventId, status: RegistrationStatus.CHECKED_IN },
      }),
      this.prisma.eventRegistration.count({
        where: { eventId, status: RegistrationStatus.COMPLETED },
      }),
    ]);

    const checkInRate =
      totalRegistered > 0
        ? ((checkedIn + completed) / totalRegistered) * 100
        : 0;

    return {
      totalRegistered,
      checkedIn,
      completed,
      checkInRate: Math.round(checkInRate * 100) / 100,
    };
  }

  private async ensureOrganizerOwnsEvent(
    eventId: string,
    organizerId?: string,
    userRole?: string,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        organizerId: true,
      },
    });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }
    // Admin can access any event, organizer can only access their own events
    if (
      organizerId &&
      userRole !== 'ADMIN' &&
      event.organizerId !== organizerId
    ) {
      throw new BadRequestException(
        'You are not allowed to access this event check-in data',
      );
    }
    return event;
  }
}
