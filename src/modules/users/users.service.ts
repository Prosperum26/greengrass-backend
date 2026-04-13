import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
}
