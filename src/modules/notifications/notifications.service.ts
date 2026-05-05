import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  event?: {
    id: string;
    title: string;
    startTime: Date;
    location: string;
  } | null;
}

export interface CreateNotificationDto {
  userId: string;
  eventId?: string;
  title: string;
  message: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUserNotifications(userId: string): Promise<NotificationData[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            location: true,
          },
        },
      },
    });

    return notifications;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async createNotification(
    dto: CreateNotificationDto,
  ): Promise<NotificationData> {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        eventId: dto.eventId,
        title: dto.title,
        message: dto.message,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            location: true,
          },
        },
      },
    });
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendEventReminders(): Promise<void> {
    this.logger.log('Running daily event reminder check...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const registrations = await this.prisma.eventRegistration.findMany({
      where: {
        event: {
          startTime: {
            gte: tomorrow,
            lte: tomorrowEnd,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            startTime: true,
            location: true,
          },
        },
      },
    });

    let createdCount = 0;

    for (const reg of registrations) {
      const startTime = new Date(reg.event.startTime);
      const timeString = startTime.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const existingNotification = await this.prisma.notification.findFirst({
        where: {
          userId: reg.userId,
          eventId: reg.eventId,
          title: { contains: 'Nhắc nhở' },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (!existingNotification) {
        await this.createNotification({
          userId: reg.userId,
          eventId: reg.eventId,
          title: `Nhắc nhở: ${reg.event.title}`,
          message: `Sự kiện "${reg.event.title}" sẽ diễn ra vào ngày mai lúc ${timeString} tại ${reg.event.location}. Đừng quên tham gia nhé!`,
        });
        createdCount++;
      }
    }

    this.logger.log(
      `Created ${createdCount} reminder notifications for tomorrow's events`,
    );
  }
}
