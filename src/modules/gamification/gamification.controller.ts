import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { AddPointsDto } from './dto/add-points.dto';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('points')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  /**
   * Get current user's points and stats
   * GET /points/me
   */
  @Get('me')
  async getMyPoints(@Query('userId') userId: string) {
    return this.gamificationService.getUserStats(userId);
  }

  /**
   * Get current user's point history with pagination
   * GET /points/history
   */
  @Get('history')
  async getPointHistory(
    @Query('userId') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.gamificationService.getPointHistory(userId, pagination);
  }

  /**
   * Get leaderboard
   * GET /points/leaderboard
   */
  @Get('leaderboard')
  async getLeaderboard(@Query() filters: LeaderboardQueryDto) {
    return this.gamificationService.getLeaderboard(filters);
  }

  /**
   * Get all available badges
   * GET /points/badges
   */
  @Get('badges')
  async getAllBadges() {
    return this.gamificationService.getAllBadges();
  }

  /**
   * Get user's earned badges
   * GET /points/badges/me
   */
  @Get('badges/me')
  async getMyBadges(@Query('userId') userId: string) {
    return this.gamificationService.getUserBadges(userId);
  }

  /**
   * Get user's rank
   * GET /points/rank
   */
  @Get('rank')
  async getUserRank(@Query('userId') userId: string) {
    const rank = await this.gamificationService.getUserRank(userId);
    return { userId, rank };
  }

  /**
   * Admin endpoint to manually add points
   * POST /points/add
   */
  @Post('add')
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
  async checkBadges(@Body('userId') userId: string) {
    await this.gamificationService.checkAndAssignBadges(userId);
    return { success: true, message: 'Badge check completed' };
  }

  /**
   * Update user streak (triggered by activity)
   * POST /points/update-streak
   */
  @Post('update-streak')
  @HttpCode(HttpStatus.OK)
  async updateStreak(@Body('userId') userId: string) {
    const streak = await this.gamificationService.updateStreak(userId);
    return { userId, currentStreak: streak };
  }

  /**
   * Get user stats by ID (for public profiles)
   * GET /points/users/:userId
   */
  @Get('users/:userId')
  async getUserStats(@Param('userId') userId: string) {
    return this.gamificationService.getUserStats(userId);
  }
}
