/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  GamificationController,
  RequestWithUser,
} from './gamification.controller';
import { GamificationService } from './gamification.service';
import { PointReason } from '@prisma/client';

describe('GamificationController', () => {
  let controller: GamificationController;
  let service: GamificationService;

  const mockGamificationService = {
    getUserStats: jest.fn(),
    getPointHistory: jest.fn(),
    getLeaderboard: jest.fn(),
    getAllBadges: jest.fn(),
    getUserBadges: jest.fn(),
    getUserRank: jest.fn(),
    addPoints: jest.fn(),
    checkAndAssignBadges: jest.fn(),
    updateStreak: jest.fn(),
  };

  const mockReq = {
    user: { sub: 'user-123', email: 'test@test.com', role: 'STUDENT' },
  } as unknown as RequestWithUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GamificationController],
      providers: [
        {
          provide: GamificationService,
          useValue: mockGamificationService,
        },
      ],
    }).compile();

    controller = module.get<GamificationController>(GamificationController);
    service = module.get<GamificationService>(GamificationService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /points/me', () => {
    it('should return user stats', async () => {
      const mockStats = {
        userId: 'user-123',
        totalPoints: 100,
        currentStreak: 5,
        totalEventsJoined: 10,
        totalEventsCompleted: 8,
        rank: 1,
        badges: [],
      };
      mockGamificationService.getUserStats.mockResolvedValue(mockStats);

      const result = await controller.getMyPoints(mockReq);

      expect(result).toEqual(mockStats);
      expect(service.getUserStats).toHaveBeenCalledWith('user-123');
    });
  });

  describe('GET /points/history', () => {
    it('should return point history with pagination', async () => {
      const mockHistory = {
        transactions: [
          {
            id: 'tx-1',
            userId: 'user-123',
            amount: 10,
            reason: PointReason.JOIN_EVENT,
            createdAt: new Date(),
          },
        ],
        total: 1,
      };
      mockGamificationService.getPointHistory.mockResolvedValue(mockHistory);

      const pagination = { page: 1, limit: 20 };
      const result = await controller.getPointHistory(mockReq, pagination);

      expect(result).toEqual(mockHistory);
      expect(service.getPointHistory).toHaveBeenCalledWith(
        'user-123',
        pagination,
      );
    });
  });

  describe('GET /points/leaderboard', () => {
    it('should return leaderboard', async () => {
      const mockLeaderboard = [
        {
          rank: 1,
          userId: 'user-1',
          fullName: 'User One',
          avatarUrl: 'http://example.com/avatar.png',
          totalPoints: 1000,
          currentStreak: 10,
        },
      ];
      mockGamificationService.getLeaderboard.mockResolvedValue(mockLeaderboard);

      const filters = { limit: 50, offset: 0, timeframe: 'all' as const };
      const result = await controller.getLeaderboard(filters);

      expect(result).toEqual(mockLeaderboard);
      expect(service.getLeaderboard).toHaveBeenCalledWith(filters);
    });
  });

  describe('GET /points/badges', () => {
    it('should return all badges', async () => {
      const mockBadges = [
        {
          id: 'badge-1',
          name: 'Green Beginner',
          description: 'Earned 100 points',
          iconUrl: '/badges/beginner.png',
          pointThreshold: 100,
        },
      ];
      mockGamificationService.getAllBadges.mockResolvedValue(mockBadges);

      const result = await controller.getAllBadges();

      expect(result).toEqual(mockBadges);
      expect(service.getAllBadges).toHaveBeenCalled();
    });
  });

  describe('GET /points/badges/me', () => {
    it('should return user badges', async () => {
      const mockUserBadges = [
        {
          id: 'ub-1',
          userId: 'user-123',
          badgeId: 'badge-1',
          awardedAt: new Date(),
          badge: {
            id: 'badge-1',
            name: 'Green Beginner',
            description: 'Earned 100 points',
            iconUrl: '/badges/beginner.png',
            pointThreshold: 100,
          },
        },
      ];
      mockGamificationService.getUserBadges.mockResolvedValue(mockUserBadges);

      const result = await controller.getMyBadges(mockReq);

      expect(result).toEqual(mockUserBadges);
      expect(service.getUserBadges).toHaveBeenCalledWith('user-123');
    });
  });

  describe('GET /points/rank', () => {
    it('should return user rank', async () => {
      mockGamificationService.getUserRank.mockResolvedValue(5);

      const result = await controller.getUserRank(mockReq);

      expect(result).toEqual({ userId: 'user-123', rank: 5 });
      expect(service.getUserRank).toHaveBeenCalledWith('user-123');
    });
  });

  describe('POST /points/add', () => {
    it('should add points to user', async () => {
      const mockTransaction = {
        id: 'tx-1',
        userId: 'user-123',
        amount: 50,
        reason: PointReason.CHECK_IN,
        eventId: 'event-456',
        createdAt: new Date(),
      };
      mockGamificationService.addPoints.mockResolvedValue(mockTransaction);

      const dto = {
        userId: 'user-123',
        amount: 50,
        reason: PointReason.CHECK_IN,
        eventId: 'event-456',
      };
      const result = await controller.addPoints(dto);

      expect(result).toEqual(mockTransaction);
      expect(service.addPoints).toHaveBeenCalledWith(dto);
    });
  });

  describe('POST /points/check-badges', () => {
    it('should trigger badge check', async () => {
      mockGamificationService.checkAndAssignBadges.mockResolvedValue(undefined);

      const result = await controller.checkBadges(mockReq);

      expect(result).toEqual({
        success: true,
        message: 'Badge check completed',
      });
      expect(service.checkAndAssignBadges).toHaveBeenCalledWith('user-123');
    });
  });

  describe('POST /points/update-streak', () => {
    it('should update user streak', async () => {
      mockGamificationService.updateStreak.mockResolvedValue(7);

      const result = await controller.updateStreak(mockReq);

      expect(result).toEqual({ userId: 'user-123', currentStreak: 7 });
      expect(service.updateStreak).toHaveBeenCalledWith('user-123');
    });
  });

  describe('GET /points/users/:userId', () => {
    it('should return user stats by id', async () => {
      const mockStats = {
        userId: 'user-456',
        totalPoints: 200,
        currentStreak: 3,
        totalEventsJoined: 5,
        totalEventsCompleted: 4,
        rank: 2,
        badges: [],
      };
      mockGamificationService.getUserStats.mockResolvedValue(mockStats);

      const result = await controller.getUserStats('user-456');

      expect(result).toEqual(mockStats);
      expect(service.getUserStats).toHaveBeenCalledWith('user-456');
    });
  });
});
