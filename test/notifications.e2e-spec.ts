/**
 * Notifications API Integration Tests
 *
 * WHY: Integration tests verify:
 * - Full request/response cycle
 * - Controller + Service + Database integration
 * - Authentication/authorization
 * - API contract (status codes, response format)
 *
 * SCOPE: Use test database, test full HTTP stack
 */

/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('Notifications API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUserId: string;
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Test@123456';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Register user and use returned access token
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testEmail,
        fullName: 'Test User',
        password: testPassword,
      })
      .expect(201);
    authToken = registerResponse.body.accessToken;

    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    testUserId = user!.id;
  });

  beforeEach(async () => {
    // Clean notifications before each test
    await prisma.notification.deleteMany({ where: { userId: testUserId } });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.notification.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await app.close();
  });

  describe('GET /notifications', () => {
    it('should return user notifications', async () => {
      // Arrange
      await prisma.notification.create({
        data: {
          userId: testUserId,
          title: 'Test Notification',
          message: 'Test message',
          isRead: false,
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Test Notification');
    });

    it('should require authentication', async () => {
      // Act
      await request(app.getHttpServer()).get('/notifications').expect(401);
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('should return count of unread notifications', async () => {
      // Arrange
      await prisma.notification.createMany({
        data: [
          {
            userId: testUserId,
            title: 'Notif 1',
            message: 'Msg 1',
            isRead: false,
          },
          {
            userId: testUserId,
            title: 'Notif 2',
            message: 'Msg 2',
            isRead: false,
          },
          {
            userId: testUserId,
            title: 'Notif 3',
            message: 'Msg 3',
            isRead: true,
          },
        ],
      });

      // Act
      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.data.count).toBe(2);
    });
  });

  describe('POST /notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      // Arrange
      const notification = await prisma.notification.create({
        data: {
          userId: testUserId,
          title: 'Test',
          message: 'Test',
          isRead: false,
        },
      });

      // Act
      const response = await request(app.getHttpServer())
        .post(`/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);

      // Verify in database
      const updated = await prisma.notification.findUnique({
        where: { id: notification.id },
      });
      expect(updated?.isRead).toBe(true);
    });

    it('should not mark other user notification as read', async () => {
      // Arrange
      const otherUser = await prisma.user.create({
        data: {
          email: `other-${Date.now()}@example.com`,
          password: 'hashed',
          fullName: 'Other User',
          role: 'STUDENT',
        },
      });

      const notification = await prisma.notification.create({
        data: {
          userId: otherUser.id,
          title: 'Test',
          message: 'Test',
          isRead: false,
        },
      });

      // Act
      await request(app.getHttpServer())
        .post(`/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert notification is still unread because ownership check is in where clause
      const untouched = await prisma.notification.findUnique({
        where: { id: notification.id },
      });
      expect(untouched?.isRead).toBe(false);

      // Cleanup
      await prisma.notification.delete({ where: { id: notification.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });
});
