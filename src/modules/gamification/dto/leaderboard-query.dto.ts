import { LeaderboardFilters } from '../interfaces/user-stats.interface';

export class LeaderboardQueryDto implements LeaderboardFilters {
  limit?: number = 50;
  offset?: number = 0;
  timeframe?: 'all' | 'weekly' | 'monthly' = 'all';
}
