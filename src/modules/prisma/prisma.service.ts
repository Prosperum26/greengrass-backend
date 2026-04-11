import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService
 * Wraps PrismaClient for NestJS dependency injection
 * Handles connection lifecycle
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Connect to database when module initializes
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /**
   * Disconnect from database when module destroys
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
