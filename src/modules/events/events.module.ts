import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * EventsModule
 *
 * Encapsulates all providers for the /events resource:
 *  - EventsController  — HTTP routing & request/response shaping
 *  - EventsService     — business logic, Prisma queries, transactions
 *  - PrismaModule      — shared DB client (imported, not re-declared here)
 *
 * RolesGuard is applied per-controller via @UseGuards(RolesGuard) and
 * requires Reflector, which NestJS provides automatically — no manual
 * provider registration needed.
 */
@Module({
  imports:     [PrismaModule],
  controllers: [EventsController],
  providers:   [EventsService],
})
export class EventsModule {}