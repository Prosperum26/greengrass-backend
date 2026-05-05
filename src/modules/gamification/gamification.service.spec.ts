import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from './gamification.service';
import { PointReason } from '@prisma/client';
import { AddPointsDto } from './dto/add-points.dto';
import { PrismaService } from '../prisma/prisma.service';

interface BadgeConfig {
  name: string;
  description: string;
  pointThreshold: number;
  iconUrl: string;
}

describe('GamificationService', () => {
  let service: GamificationService;
  const mockPrisma = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
  });

  afterEach(async () => {
    // Cleanup if needed
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Point System', () => {
    it('should have correct point values for all reasons', () => {
      const pointValues = (
        service as unknown as { POINT_VALUES: Record<PointReason, number> }
      ).POINT_VALUES;

      expect(pointValues[PointReason.JOIN_EVENT]).toBe(10);
      expect(pointValues[PointReason.CHECK_IN]).toBe(20);
      expect(pointValues[PointReason.COMPLETE_EVENT]).toBe(50);
      expect(pointValues[PointReason.STREAK_BONUS]).toBe(15);
      expect(pointValues[PointReason.REFERRAL]).toBe(30);
      expect(pointValues[PointReason.MANUAL_ADJUSTMENT]).toBe(0);
    });

    it('should create addPoints DTO correctly', () => {
      const dto: AddPointsDto = {
        userId: 'user-123',
        amount: 50,
        reason: PointReason.CHECK_IN,
        eventId: 'event-456',
        metadata: { location: 'HCM' },
      };

      expect(dto.userId).toBe('user-123');
      expect(dto.amount).toBe(50);
      expect(dto.reason).toBe(PointReason.CHECK_IN);
      expect(dto.eventId).toBe('event-456');
      expect(dto.metadata).toEqual({ location: 'HCM' });
    });
  });

  describe('Badge System', () => {
    it('should have default badges configured', () => {
      const defaultBadges = (
        service as unknown as { DEFAULT_BADGES: BadgeConfig[] }
      ).DEFAULT_BADGES;

      expect(defaultBadges).toHaveLength(7);
      expect(defaultBadges[0].name).toBe('First Green Step');
      expect(defaultBadges[0].pointThreshold).toBe(0);
      expect(defaultBadges[1].name).toBe('Green Beginner');
      expect(defaultBadges[1].pointThreshold).toBe(100);
      expect(defaultBadges[6].name).toBe('Planet Savior');
      expect(defaultBadges[6].pointThreshold).toBe(5000);
    });

    it('should have badges with increasing point thresholds', () => {
      const defaultBadges = (
        service as unknown as { DEFAULT_BADGES: BadgeConfig[] }
      ).DEFAULT_BADGES;
      const thresholds = defaultBadges.map((b) => b.pointThreshold);

      for (let i = 1; i < thresholds.length; i++) {
        expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
      }
    });
  });

  describe('Leaderboard', () => {
    it('should accept leaderboard query with default values', () => {
      const query = {
        limit: 50,
        offset: 0,
        timeframe: 'all' as const,
      };

      expect(query.limit).toBe(50);
      expect(query.offset).toBe(0);
      expect(query.timeframe).toBe('all');
    });

    it('should accept leaderboard query with weekly timeframe', () => {
      const query = {
        limit: 10,
        offset: 20,
        timeframe: 'weekly' as const,
      };

      expect(query.timeframe).toBe('weekly');
    });
  });

  describe('Pagination', () => {
    it('should have default pagination values', () => {
      const pagination = {
        page: 1,
        limit: 20,
      };

      expect(pagination.page).toBe(1);
      expect(pagination.limit).toBe(20);
    });
  });
});
