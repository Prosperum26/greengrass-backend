import { Badge, UserBadge, PointHistory } from '@prisma/client';

export interface UserStats {
  userId: string;
  totalPoints: number;
  currentStreak: number;
  totalEventsJoined: number;
  totalEventsCompleted: number;
  rank?: number;
  badges: (UserBadge & { badge: Badge })[];
}

export interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  eventId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  totalPoints: number;
  currentStreak: number;
}

export interface LeaderboardFilters {
  limit?: number;
  offset?: number;
  timeframe?: 'all' | 'weekly' | 'monthly';
}
