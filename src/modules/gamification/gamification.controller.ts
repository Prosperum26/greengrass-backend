import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { AddPointsDto } from './dto/add-points.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { PaginationDto } from './dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller('points')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  /**
   * Get current user's points and stats
   * GET /points/me
   */
  @Get('me')
  async getMyPoints(@Req() req: RequestWithUser) {
    return this.gamificationService.getUserStats(req.user.sub);
  }

  /**
   * Get current user's point history with pagination
   * GET /points/history
   */
  @Get('history')
  async getPointHistory(
    @Req() req: RequestWithUser,
    @Query() pagination: PaginationDto,
  ) {
    return this.gamificationService.getPointHistory(req.user.sub, pagination);
  }

  /**
   * Get leaderboard
   * GET /points/leaderboard
   */
  @Public()
  @Get('leaderboard')
  async getLeaderboard(@Query() filters: LeaderboardQueryDto) {
    return this.gamificationService.getLeaderboard(filters);
  }

  /**
   * Get all available badges
   * GET /points/badges
   */
  @Public()
  @Get('badges')
  async getAllBadges() {
    return this.gamificationService.getAllBadges();
  }

  /**
   * Get user's earned badges
   * GET /points/badges/me
   */
  @Get('badges/me')
  async getMyBadges(@Req() req: RequestWithUser) {
    return this.gamificationService.getUserBadges(req.user.sub);
  }

  /**
   * Get user's rank
   * GET /points/rank
   */
  @Get('rank')
  async getUserRank(@Req() req: RequestWithUser) {
    const rank = await this.gamificationService.getUserRank(req.user.sub);
    return { userId: req.user.sub, rank };
  }

  /**
   * Admin endpoint to manually add points
   * POST /points/add
   */
  @Post('add')
  @Roles('ADMIN')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  async addPoints(@Body() dto: AddPointsDto) {
    return this.gamificationService.addPoints(dto);
  }

  /**
   * Trigger badge check for a user
   * POST /points/check-badges
   */
  @Post('check-badges')
  @HttpCode(HttpStatus.OK)
  async checkBadges(@Req() req: RequestWithUser) {
    await this.gamificationService.checkAndAssignBadges(req.user.sub);
    return { success: true, message: 'Badge check completed' };
  }

  /**
   * Update user streak (triggered by activity)
   * POST /points/update-streak
   */
  @Post('update-streak')
  @HttpCode(HttpStatus.OK)
  async updateStreak(@Req() req: RequestWithUser) {
    const streak = await this.gamificationService.updateStreak(req.user.sub);
    return { userId: req.user.sub, currentStreak: streak };
  }

  /**
   * Get user stats by ID (for public profiles)
   * GET /points/users/:userId
   */
  @Public()
  @Get('users/:userId')
  async getUserStats(@Param('userId') userId: string) {
    return this.gamificationService.getUserStats(userId);
  }
}
