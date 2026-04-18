import { createHash } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { CheckinService } from '../checkin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QrUtil } from '../utils/qr.util';
import { GamificationService } from '../../gamification/gamification.service';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventStatus, RegistrationStatus } from '@prisma/client';

/**
 * Unit tests for CheckinService
 */
describe('CheckinService', () => {
  let service: CheckinService;

  // Mock data
  const mockUserId = 'user-123';
  const mockOrganizerId = 'organizer-123';
  const mockEventId = 'event-456';
  const mockQrSecret = 'test-secret';

  const mockEvent = {
    id: mockEventId,
    title: 'Test Event',
    description: 'Test Description',
    location: 'Test Location',
    latitude: 10.762622,
    longitude: 106.660172,
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000),
    points: 100,
    qrSecret: mockQrSecret,
    status: EventStatus.ONGOING,
    organizerId: mockOrganizerId,
  };

  const mockRegistration = {
    id: 'reg-789',
    userId: mockUserId,
    eventId: mockEventId,
    status: RegistrationStatus.REGISTERED,
    checkInTime: null,
    proofUrl: null,
    proofStatus: 'PENDING' as const,
  };

  const mockCheckedInRegistration = {
    ...mockRegistration,
    status: RegistrationStatus.CHECKED_IN,
    checkInTime: new Date(),
  };

  // Mock PrismaService
  const mockPrismaService = {
    event: {
      findUnique: jest.fn(),
    },
    eventRegistration: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
  const mockGamificationService = {
    addPoints: jest.fn(),
    updateStreak: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Set environment variable for tests
    process.env.QR_SECRET = mockQrSecret;
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'QR_SECRET') return mockQrSecret;
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckinService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: GamificationService,
          useValue: mockGamificationService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CheckinService>(CheckinService);

    // Reset mocks
    jest.clearAllMocks();
    mockGamificationService.addPoints.mockResolvedValue(undefined);
    mockGamificationService.updateStreak.mockResolvedValue(1);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('generateQrToken', () => {
    it('should generate QR token successfully', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);

      const result = await service.generateQrToken(mockEventId, mockOrganizerId);

      expect(result).toHaveProperty('eventId', mockEventId);
      expect(result).toHaveProperty('qrToken');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('expiresAt');
      expect(result.qrToken).toHaveLength(64); // SHA256 hex length
      expect(mockPrismaService.event.findUnique).toHaveBeenCalledWith({
        where: { id: mockEventId },
        select: {
          id: true,
          organizerId: true,
        },
      });
    });

    it('should throw NotFoundException when event not found', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(null);

      await expect(
        service.generateQrToken(mockEventId, mockOrganizerId),
      ).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('checkIn', () => {
    it('should successfully check in user', async () => {
      const validQrToken = QrUtil.generateQrToken(mockEventId, mockQrSecret);

      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);
      mockPrismaService.eventRegistration.findUnique.mockResolvedValue(
        mockRegistration,
      );
      mockPrismaService.eventRegistration.update.mockResolvedValue(
        mockCheckedInRegistration,
      );

      const result = await service.checkIn(
        mockUserId,
        mockEventId,
        validQrToken,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Check-in successful');
      expect(result.pointsAwarded).toBe(100);
      expect(result.checkInTime).toBeDefined();
      expect(mockPrismaService.eventRegistration.update).toHaveBeenCalledWith({
        where: {
          userId_eventId: {
            userId: mockUserId,
            eventId: mockEventId,
          },
        },
        data: {
          status: RegistrationStatus.CHECKED_IN,
          checkInTime: expect.any(Date) as Date,
        },
      });
    });

    it('should throw NotFoundException when event not found', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(null);

      await expect(
        service.checkIn(mockUserId, mockEventId, 'any-token'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when event is completed', async () => {
      const completedEvent = {
        ...mockEvent,
        status: EventStatus.COMPLETED,
      };
      mockPrismaService.event.findUnique.mockResolvedValue(completedEvent);

      await expect(
        service.checkIn(mockUserId, mockEventId, 'any-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user not registered', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);
      mockPrismaService.eventRegistration.findUnique.mockResolvedValue(null);

      await expect(
        service.checkIn(mockUserId, mockEventId, 'any-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when user already checked in', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);
      mockPrismaService.eventRegistration.findUnique.mockResolvedValue({
        ...mockRegistration,
        status: RegistrationStatus.CHECKED_IN,
      });

      await expect(
        service.checkIn(mockUserId, mockEventId, 'any-token'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when user registration is completed', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);
      mockPrismaService.eventRegistration.findUnique.mockResolvedValue({
        ...mockRegistration,
        status: RegistrationStatus.COMPLETED,
      });

      await expect(
        service.checkIn(mockUserId, mockEventId, 'any-token'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when QR token is invalid', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);
      mockPrismaService.eventRegistration.findUnique.mockResolvedValue(
        mockRegistration,
      );

      await expect(
        service.checkIn(mockUserId, mockEventId, 'invalid-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept QR token from previous time window (tolerance)', async () => {
      // Generate a token from previous window
      const previousWindow = Math.floor(Date.now() / 30000) - 1;
      const previousToken = createHash('sha256')
        .update(`${mockEventId}:${mockQrSecret}:${previousWindow}`)
        .digest('hex');

      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);
      mockPrismaService.eventRegistration.findUnique.mockResolvedValue(
        mockRegistration,
      );
      mockPrismaService.eventRegistration.update.mockResolvedValue(
        mockCheckedInRegistration,
      );

      const result = await service.checkIn(
        mockUserId,
        mockEventId,
        previousToken,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('QR token verification', () => {
    it('should verify current window token', () => {
      const currentToken = QrUtil.generateQrToken(mockEventId, mockQrSecret);
      const isValid = QrUtil.verifyQrToken(
        mockEventId,
        currentToken,
        mockQrSecret,
      );
      expect(isValid).toBe(true);
    });

    it('should reject invalid token', () => {
      const isValid = QrUtil.verifyQrToken(
        mockEventId,
        'invalid-token',
        mockQrSecret,
      );
      expect(isValid).toBe(false);
    });

    it('should reject token from two windows ago (outside tolerance)', () => {
      const oldWindow = Math.floor(Date.now() / 30000) - 2;
      const oldToken = createHash('sha256')
        .update(`${mockEventId}:${mockQrSecret}:${oldWindow}`)
        .digest('hex');

      const isValid = QrUtil.verifyQrToken(mockEventId, oldToken, mockQrSecret);
      expect(isValid).toBe(false);
    });
  });
});
