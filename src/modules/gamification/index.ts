export { GamificationModule } from './gamification.module';
export { GamificationService } from './gamification.service';
export { GamificationController } from './gamification.controller';
export { PointReason } from './enums/point-reason.enum';
export { AddPointsDto } from './dto/add-points.dto';
export { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
export { PaginationDto } from './dto/pagination.dto';
export type {
  UserStats,
  LeaderboardEntry,
  LeaderboardFilters,
  PointTransaction,
} from './interfaces/user-stats.interface';
