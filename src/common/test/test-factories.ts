/**
 * Test Data Factories
 *
 * WHY: Factory functions provide:
 * 1. Consistent test data structure
 * 2. Default values that can be overridden
 * 3. Type-safe test data creation
 * 4. Less boilerplate in tests
 */

import { RegistrationStatus, EventStatus, ProofStatus } from '@prisma/client';

// User factory with sensible defaults
export function createUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    fullName: 'Test User',
    password: 'hashedpassword',
    role: 'USER',
    avatarUrl: null,
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Event factory
export function createEvent(overrides: Partial<any> = {}) {
  return {
    id: 'event-123',
    title: 'Test Event',
    description: 'Test description',
    startTime: new Date('2026-05-01'),
    endTime: new Date('2026-05-02'),
    location: 'Test Location',
    latitude: 10.762622,
    longitude: 106.660172,
    maxParticipants: 100,
    imageUrl: null,
    status: EventStatus.UPCOMING,
    organizerId: 'user-456',
    qrCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// EventRegistration factory
export function createRegistration(overrides: Partial<any> = {}) {
  return {
    id: 'reg-123',
    userId: 'user-123',
    eventId: 'event-123',
    status: RegistrationStatus.REGISTERED,
    checkInTime: null,
    proofUrl: null,
    proofImageUrl: null,
    proofStatus: ProofStatus.PENDING,
    createdAt: new Date(),
    ...overrides,
  };
}

// Notification factory
export function createNotification(overrides: Partial<any> = {}) {
  return {
    id: 'notif-123',
    userId: 'user-123',
    eventId: null,
    title: 'Test Notification',
    message: 'Test message',
    isRead: false,
    createdAt: new Date(),
    ...overrides,
  };
}
