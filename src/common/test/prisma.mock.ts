/**
 * Prisma Mock Utilities
 *
 * WHY: Mocking Prisma allows fast, isolated unit tests without:
 * - Database setup/teardown overhead
 * - Transaction cleanup
 * - Database state management
 *
 * This provides a type-safe mock that matches Prisma's API exactly.
 */

import { PrismaService } from '../../modules/prisma/prisma.service';

type AsyncFn = (...args: any[]) => Promise<any>;
type AsyncMethodKeys<T> = {
  [K in keyof T]: T[K] extends AsyncFn ? K : never;
}[keyof T];
type AsyncMethodReturn<T> = T extends (...args: any[]) => Promise<infer R>
  ? R
  : never;

/**
 * Deep mock of Prisma client for unit testing
 * All methods return jest.fn() so you can configure returns per test
 */
export function createMockPrismaService(): jest.Mocked<PrismaService> {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    event: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    eventRegistration: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    pointHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    badge: {
      findMany: jest.fn(),
    },
    userBadge: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((args) => {
      // Support both array and callback styles
      if (Array.isArray(args)) {
        return Promise.all(args);
      }
      return args(this);
    }),
  } as unknown as jest.Mocked<PrismaService>;
}

/**
 * Helper to mock Prisma method with typed response
 */
export function mockPrismaReturn<
  T extends keyof PrismaService,
  M extends AsyncMethodKeys<PrismaService[T]>,
>(
  prisma: jest.Mocked<PrismaService>,
  model: T,
  method: M,
  data: AsyncMethodReturn<PrismaService[T][M]>,
): void {
  (prisma[model][method] as jest.Mock).mockResolvedValue(data);
}

/**
 * Helper to mock Prisma method returning array
 */
export function mockPrismaReturnMany<
  T extends keyof PrismaService,
  M extends AsyncMethodKeys<PrismaService[T]>,
>(
  prisma: jest.Mocked<PrismaService>,
  model: T,
  method: M,
  data: AsyncMethodReturn<PrismaService[T][M]> extends Array<infer I>
    ? I[]
    : never,
): void {
  (prisma[model][method] as jest.Mock).mockResolvedValue(data);
}
