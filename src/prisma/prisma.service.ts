import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // Khi module khởi động → connect DB
  async onModuleInit() {
    await this.$connect();
    console.log('Prisma connected to database');
  }

  // Khi app shutdown → disconnect DB
  async onModuleDestroy() {
    await this.$disconnect();
    console.log('Prisma disconnected');
  }
}
