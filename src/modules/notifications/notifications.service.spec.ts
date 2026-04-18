/**
 * NotificationsService Unit Tests
 *
 * WHY: Unit tests verify business logic without:
 * - Database setup/teardown
 * - Network calls
 * - External dependencies
 *
 * Focus on: Logic branches, error handling, data transformation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createNotification } from '../../common/test';

// Mock Prisma
const mockPrisma = {
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
  },
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get(PrismaService);

    // Clear mocks between tests
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserNotifications', () => {
    it('should return user notifications sorted by date', async () => {
      // Arrange
      const userId = 'user-123';
      const mockNotifications = [
        createNotification({ id: '1', createdAt: new Date('2026-01-02') }),
        createNotification({ id: '2', createdAt: new Date('2026-01-01') }),
      ];
      prisma.notification.findMany.mockResolvedValue(mockNotifications);

      // Act
      const result = await service.getUserNotifications(userId);

      // Assert
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
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
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1'); // Most recent first
    });

    it('should return empty array when no notifications', async () => {
      // Arrange
      prisma.notification.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getUserNotifications('user-123');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      // Arrange
      prisma.notification.count.mockResolvedValue(5);

      // Act
      const result = await service.getUnreadCount('user-123');

      // Assert
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
      });
      expect(result).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsRead('notif-123', 'user-123');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-123', userId: 'user-123' },
        data: { isRead: true },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      // Arrange
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      // Act
      await service.markAllAsRead('user-123');

      // Assert
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
        data: { isRead: true },
      });
    });
  });
});
