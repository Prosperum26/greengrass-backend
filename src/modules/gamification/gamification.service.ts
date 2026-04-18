import { Injectable, Logger } from '@nestjs/common';
import { PointReason, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddPointsDto } from './dto/add-points.dto';
import {
  UserStats,
  LeaderboardEntry,
  LeaderboardFilters,
  PointTransaction,
} from './interfaces/user-stats.interface';
import { PaginationDto } from './dto/pagination.dto';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  // Point values for different actions
  private readonly POINT_VALUES: Record<PointReason, number> = {
    [PointReason.JOIN_EVENT]: 10,
    [PointReason.CHECK_IN]: 20,
    [PointReason.COMPLETE_EVENT]: 50,
    [PointReason.STREAK_BONUS]: 15,
    [PointReason.REFERRAL]: 30,
    [PointReason.MANUAL_ADJUSTMENT]: 0, // Manual adjustment, amount provided in DTO
  };

  // Default badges configuration
  private readonly DEFAULT_BADGES = [
    {
      name: 'Green Beginner',
      description: 'Earned 100 points',
      pointThreshold: 100,
      iconUrl: '/badges/beginner.png',
    },
    {
      name: 'Eco Enthusiast',
      description: 'Earned 250 points',
      pointThreshold: 250,
      iconUrl: '/badges/enthusiast.png',
    },
    {
      name: 'Eco Warrior',
      description: 'Earned 500 points',
      pointThreshold: 500,
      iconUrl: '/badges/warrior.png',
    },
    {
      name: 'Green Champion',
      description: 'Earned 1000 points',
      pointThreshold: 1000,
      iconUrl: '/badges/champion.png',
    },
    {
      name: 'Earth Guardian',
      description: 'Earned 2500 points',
      pointThreshold: 2500,
      iconUrl: '/badges/guardian.png',
    },
    {
      name: 'Planet Savior',
      description: 'Earned 5000 points',
      pointThreshold: 5000,
      iconUrl: '/badges/savior.png',
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add points to a user and create a transaction record
   * This method is idempotent - duplicate transactions for the same event/reason are prevented
   */
  async addPoints(dto: AddPointsDto): Promise<PointTransaction> {
    const { userId, amount, reason, eventId, metadata } = dto;
    const pointValue = amount || this.POINT_VALUES[reason];

    // Check for duplicate point awarding (idempotency)
    if (eventId && reason !== PointReason.MANUAL_ADJUSTMENT) {
      const existingTransaction = await this.prisma.pointHistory.findFirst({
        where: {
          userId,
          reason,
          eventId,
        },
      });

      if (existingTransaction) {
        this.logger.warn(
          `Duplicate point transaction prevented: userId=${userId}, reason=${reason}, eventId=${eventId}`,
        );
        return this.mapToPointTransaction(existingTransaction);
      }
    }

    // Execute transaction: add points and create history record
    const result = await this.prisma.$transaction(async (tx) => {
      // Create point history record
      const pointHistory = await tx.pointHistory.create({
        data: {
          userId,
          amount: pointValue,
          reason,
          eventId,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });

      // Update user's total points
      await tx.user.update({
        where: { id: userId },
        data: {
          totalPoints: {
            increment: pointValue,
          },
          lastActivityAt: new Date(),
        },
      });

      return pointHistory;
    });

    this.logger.log(
      `Added ${pointValue} points to user ${userId} for ${reason}${eventId ? ` (event: ${eventId})` : ''}`,
    );

    // Check and assign badges asynchronously
    this.checkAndAssignBadges(userId).catch((err) => {
      this.logger.error(`Failed to check badges for user ${userId}:`, err);
    });

    return this.mapToPointTransaction(result);
  }

  /**
   * Get user's total points
   */
  async getUserPoints(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true },
    });

    return user?.totalPoints ?? 0;
  }

  /**
   * Get user's point transaction history with pagination
   */
  async getPointHistory(
    userId: string,
    pagination: PaginationDto,
  ): Promise<{ transactions: PointTransaction[]; total: number }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.pointHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.pointHistory.count({
        where: { userId },
      }),
    ]);

    return {
      transactions: transactions.map((t) => this.mapToPointTransaction(t)),
      total,
    };
  }

  /**
   * Get comprehensive user stats including points, streak, events, and badges
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        totalPoints: true,
        currentStreak: true,
      },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const [totalEventsJoined, totalEventsCompleted, badges, rank] =
      await Promise.all([
        this.prisma.eventRegistration.count({
          where: { userId },
        }),
        this.prisma.eventRegistration.count({
          where: {
            userId,
            status: 'COMPLETED',
          },
        }),
        this.prisma.userBadge.findMany({
          where: { userId },
          include: { badge: true },
        }),
        this.getUserRank(userId),
      ]);

    return {
      userId: user.id,
      totalPoints: user.totalPoints,
      currentStreak: user.currentStreak,
      totalEventsJoined,
      totalEventsCompleted,
      rank,
      badges,
    };
  }

  /**
   * Get leaderboard with optional filtering
   */
  async getLeaderboard(
    filters: LeaderboardFilters,
  ): Promise<LeaderboardEntry[]> {
    const { limit = 50, offset = 0, timeframe = 'all' } = filters;

    let whereClause: Prisma.UserWhereInput = {};

    // Filter by timeframe (based on lastActivityAt)
    if (timeframe === 'weekly') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      whereClause = {
        lastActivityAt: {
          gte: oneWeekAgo,
        },
      };
    } else if (timeframe === 'monthly') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      whereClause = {
        lastActivityAt: {
          gte: oneMonthAgo,
        },
      };
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      orderBy: {
        totalPoints: 'desc',
      },
      skip: offset,
      take: limit,
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        totalPoints: true,
        currentStreak: true,
      },
    });

    return users.map((user, index) => ({
      rank: offset + index + 1,
      userId: user.id,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl ?? undefined,
      totalPoints: user.totalPoints,
      currentStreak: user.currentStreak,
    }));
  }

  /**
   * Get user's rank based on total points
   */
  async getUserRank(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const higherRankCount = await this.prisma.user.count({
      where: {
        totalPoints: {
          gt: user.totalPoints,
        },
      },
    });

    return higherRankCount + 1;
  }

  /**
   * Check and assign badges to user based on their points
   */
  async checkAndAssignBadges(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        totalPoints: true,
      },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Ensure default badges exist
    await this.ensureDefaultBadges();

    // Get badges user has already earned
    const userBadgeIds = await this.prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    const earnedBadgeIds = new Set(userBadgeIds.map((ub) => ub.badgeId));

    // Find badges user qualifies for but hasn't earned yet
    const qualifyingBadges = await this.prisma.badge.findMany({
      where: {
        pointThreshold: {
          lte: user.totalPoints,
        },
        id: {
          notIn: Array.from(earnedBadgeIds),
        },
      },
    });

    // Award new badges
    if (qualifyingBadges.length > 0) {
      await this.prisma.userBadge.createMany({
        data: qualifyingBadges.map((badge) => ({
          userId,
          badgeId: badge.id,
        })),
        skipDuplicates: true,
      });

      this.logger.log(
        `Awarded ${qualifyingBadges.length} new badge(s) to user ${userId}: ${qualifyingBadges.map((b) => b.name).join(', ')}`,
      );
    }
  }

  /**
   * Update user's streak based on activity
   */
  async updateStreak(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        currentStreak: true,
        lastActivityAt: true,
      },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const now = new Date();
    let newStreak = user.currentStreak;

    if (user.lastActivityAt) {
      const lastActivity = new Date(user.lastActivityAt);
      const daysSinceLastActivity = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceLastActivity === 1) {
        // Consecutive day - increment streak
        newStreak = user.currentStreak + 1;
      } else if (daysSinceLastActivity > 1) {
        // Streak broken - reset to 1
        newStreak = 1;
      }
      // Same day - don't change streak
    } else {
      // First activity
      newStreak = 1;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        lastActivityAt: now,
      },
    });

    // Award streak bonus if streak milestone reached
    if (
      newStreak > 0 &&
      newStreak % 7 === 0 &&
      newStreak !== user.currentStreak
    ) {
      await this.addPoints({
        userId,
        amount: this.POINT_VALUES[PointReason.STREAK_BONUS],
        reason: PointReason.STREAK_BONUS,
        metadata: { streakDays: newStreak },
      });
    }

    return newStreak;
  }

  /**
   * Initialize default badges in the database
   */
  async ensureDefaultBadges(): Promise<void> {
    const existingBadges = await this.prisma.badge.findMany({
      select: { name: true },
    });
    const existingNames = new Set(existingBadges.map((b) => b.name));

    const badgesToCreate = this.DEFAULT_BADGES.filter(
      (badge) => !existingNames.has(badge.name),
    );

    if (badgesToCreate.length > 0) {
      await this.prisma.badge.createMany({
        data: badgesToCreate,
        skipDuplicates: true,
      });
      this.logger.log(`Created ${badgesToCreate.length} default badges`);
    }
  }

  /**
   * Get all available badges
   */
  async getAllBadges() {
    await this.ensureDefaultBadges();
    return this.prisma.badge.findMany({
      orderBy: { pointThreshold: 'asc' },
    });
  }

  /**
   * Get user's earned badges
   */
  async getUserBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { awardedAt: 'desc' },
    });
  }

  /**
   * Map Prisma PointHistory to PointTransaction interface
   */
  private mapToPointTransaction(
    history: Record<string, unknown> & {
      createdAt: Date;
      id: string;
      userId: string;
      amount: number;
      reason: string;
    },
  ): PointTransaction {
    return {
      id: history.id,
      userId: history.userId,
      amount: history.amount,
      reason: history.reason,
      eventId: (history.eventId as string | null | undefined) ?? undefined,
      metadata:
        (history.metadata as Record<string, unknown> | undefined) ?? undefined,
      createdAt: history.createdAt,
    };
  }
}
