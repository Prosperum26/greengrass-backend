import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from './dto/user-response.dto';
import { UploadService } from '../upload/upload.service';
import type { Express } from 'express';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: false,
    });
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        avatarUrl: dto.avatarUrl,
        bio: dto.bio,
        lastActivityAt: new Date(),
      },
    });

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: false,
    });
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: false,
    });
  }

  async getMyEvents(userId: string) {
    // Lấy events user đã đăng ký tham gia
    const registrations = await this.prisma.eventRegistration.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            startTime: true,
            endTime: true,
            status: true,
            points: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return registrations.map((reg) => ({
      registrationId: reg.id,
      status: reg.status,
      checkInTime: reg.checkInTime,
      registeredAt: reg.createdAt,
      event: reg.event,
    }));
  }

  async getMyOrganizedEvents(userId: string) {
    // Lấy events do organizer tạo (dựa trên organizerId)
    const events = await this.prisma.event.findMany({
      where: { organizerId: userId },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        startTime: true,
        endTime: true,
        status: true,
        points: true,
        coverImageUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return events;
  }

  async getMyPoints(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        totalPoints: true,
        currentStreak: true,
        lastActivityAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const badges = await this.prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: {
          select: {
            name: true,
            description: true,
            iconUrl: true,
          },
        },
      },
    });

    return {
      ...user,
      badges: badges.map((ub) => ({
        name: ub.badge.name,
        description: ub.badge.description,
        iconUrl: ub.badge.iconUrl,
        awardedAt: ub.awardedAt,
      })),
    };
  }

  async getOrganizers() {
    const organizers = await this.prisma.user.findMany({
      where: { role: 'ORGANIZER', status: 'ACTIVE' },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
      },
      orderBy: { fullName: 'asc' },
    });
    return organizers;
  }

  async uploadAvatar(
    userId: string,
    avatar: Express.Multer.File,
  ): Promise<{ avatarUrl: string }> {
    // Validate file
    this.uploadService.validateFile(avatar);

    // Get current user to check for old avatar
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Upload new avatar (auto-cropped to 300x300)
    const uploadResult = await this.uploadService.uploadAvatar(avatar, userId);

    // Update user with new avatar URL
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: uploadResult.url },
    });

    return { avatarUrl: uploadResult.url };
  }
}
