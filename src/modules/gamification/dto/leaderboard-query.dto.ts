import { IsOptional, IsNumber, IsEnum } from 'class-validator';
import { LeaderboardFilters } from '../interfaces/user-stats.interface';

export enum Timeframe {
  ALL = 'all',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class LeaderboardQueryDto implements LeaderboardFilters {
  @IsOptional()
  @IsNumber()
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  offset?: number = 0;

  @IsOptional()
  @IsEnum(Timeframe)
  timeframe?: 'all' | 'weekly' | 'monthly' = 'all';
}
