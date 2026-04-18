import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GamificationModule } from '../gamification/gamification.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, GamificationModule, UploadModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
