import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from './gamification.service';
import { PointReason, PrismaClient } from '@prisma/client';
import { AddPointsDto } from './dto/add-points.dto';
import { PaginationDto } from './dto/pagination.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';

describe('GamificationService Integration', () => {
  let service: GamificationService;
  let prisma: PrismaClient;
  let testUserId: string;
  let testEventId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        fullName: 'Test User',
        totalPoints: 0,
        currentStreak: 0,
      },
    });
    testUserId = testUser.id;

    // Create test event
    const testEvent = await prisma.event.create({
      data: {
        title: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
        latitude: 10.762622,
        longitude: 106.660172,
        startTime: new Date(),
        endTime: new Date(Date.now() + 86400000),
        points: 50,
        qrSecret: 'test-secret',
      },
    });
    testEventId = testEvent.id;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GamificationService],
    }).compile();

    service = module.get<GamificationService>(GamificationService);

    // Clean up point history for test user before each test
    await prisma.pointHistory.deleteMany({
      where: { userId: testUserId },
    });

    // Reset user points
    await prisma.user.update({
      where: { id: testUserId },
      data: { totalPoints: 0, currentStreak: 0 },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.pointHistory.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.userBadge.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.eventRegistration.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.event.delete({
      where: { id: testEventId },
    });
    await prisma.$disconnect();
  });

  describe('addPoints', () => {
    it('should add points and create transaction record', async () => {
      const dto: AddPointsDto = {
        userId: testUserId,
        amount: 10,
        reason: PointReason.JOIN_EVENT,
        eventId: testEventId,
      };

      const result = await service.addPoints(dto);

      expect(result).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.amount).toBe(10);
      expect(result.reason).toBe(PointReason.JOIN_EVENT);
      expect(result.eventId).toBe(testEventId);

      // Verify user points updated
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { totalPoints: true },
      });
      expect(user?.totalPoints).toBe(10);
    });

    it('should use predefined point values when amount not specified', async () => {
      const dto: AddPointsDto = {
        userId: testUserId,
        reason: PointReason.CHECK_IN,
        eventId: testEventId,
      };

      const result = await service.addPoints(dto);

      expect(result.amount).toBe(20); // CHECK_IN value
    });

    it('should prevent duplicate point transactions', async () => {
      const dto: AddPointsDto = {
        userId: testUserId,
        amount: 10,
        reason: PointReason.JOIN_EVENT,
        eventId: testEventId,
      };

      // First call
      const firstResult = await service.addPoints(dto);

      // Second call (should return existing transaction)
      const secondResult = await service.addPoints(dto);

      expect(secondResult.id).toBe(firstResult.id);

      // Verify only one transaction exists
      const count = await prisma.pointHistory.count({
        where: { userId: testUserId },
      });
      expect(count).toBe(1);
    });
  });

  describe('getUserPoints', () => {
    it('should return correct user points', async () => {
      // Add some points first
      await service.addPoints({
        userId: testUserId,
        amount: 50,
        reason: PointReason.COMPLETE_EVENT,
        eventId: testEventId,
      });

      const points = await service.getUserPoints(testUserId);

      expect(points).toBe(50);
    });
  });

  describe('getPointHistory', () => {
    it('should return paginated transaction history', async () => {
      // Add multiple transactions
      for (let i = 0; i < 5; i++) {
        await prisma.pointHistory.create({
          data: {
            userId: testUserId,
            amount: 10,
            reason: PointReason.JOIN_EVENT,
          },
        });
      }

      const pagination: PaginationDto = { page: 1, limit: 3 };
      const result = await service.getPointHistory(testUserId, pagination);

      expect(result.transactions).toHaveLength(3);
      expect(result.total).toBe(5);
    });
  });

  describe('getUserStats', () => {
    it('should return comprehensive user stats', async () => {
      // Add points
      await service.addPoints({
        userId: testUserId,
        amount: 100,
        reason: PointReason.COMPLETE_EVENT,
        eventId: testEventId,
      });

      const stats = await service.getUserStats(testUserId);

      expect(stats.userId).toBe(testUserId);
      expect(stats.totalPoints).toBe(100);
      expect(stats.totalEventsJoined).toBeDefined();
      expect(stats.totalEventsCompleted).toBeDefined();
      expect(stats.rank).toBeDefined();
      expect(Array.isArray(stats.badges)).toBe(true);
    });
  });

  describe('checkAndAssignBadges', () => {
    it('should award badge when user reaches point threshold', async () => {
      // Add enough points for first badge (100 points)
      await service.addPoints({
        userId: testUserId,
        amount: 100,
        reason: PointReason.MANUAL_ADJUSTMENT,
      });

      await service.checkAndAssignBadges(testUserId);

      // Check badges awarded
      const badges = await prisma.userBadge.findMany({
        where: { userId: testUserId },
        include: { badge: true },
      });

      expect(badges.length).toBeGreaterThan(0);
      expect(badges.some((b) => b.badge.name === 'Green Beginner')).toBe(true);
    });
  });

  describe('updateStreak', () => {
    it('should update user streak on first activity', async () => {
      const streak = await service.updateStreak(testUserId);

      expect(streak).toBe(1);

      const user = await prisma.user.findUnique({
        where: { id: testUserId },
        select: { currentStreak: true },
      });
      expect(user?.currentStreak).toBe(1);
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard entries', async () => {
      const filters: LeaderboardQueryDto = {
        limit: 10,
        offset: 0,
        timeframe: 'all',
      };

      const leaderboard = await service.getLeaderboard(filters);

      expect(Array.isArray(leaderboard)).toBe(true);
      if (leaderboard.length > 0) {
        expect(leaderboard[0].rank).toBeDefined();
        expect(leaderboard[0].userId).toBeDefined();
        expect(leaderboard[0].fullName).toBeDefined();
        expect(leaderboard[0].totalPoints).toBeDefined();
      }
    });
  });
});
