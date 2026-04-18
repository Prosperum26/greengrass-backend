import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EventsModule } from './modules/events/events.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { CheckinModule } from './modules/checkin/checkin.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { MapModule } from './modules/map/map.module';
import { ForumModule } from './modules/forum/forum.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    PrismaModule,
    UploadModule,
    AuthModule,
    UsersModule,
    EventsModule,
    RegistrationsModule,
    CheckinModule,
    GamificationModule,
    LeaderboardModule,
    MapModule,
    ForumModule,
    NotificationsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
