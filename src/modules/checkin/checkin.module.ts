import { Module } from '@nestjs/common';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Check-in module
 * Handles dynamic QR generation and check-in processing
 */
@Module({
  imports: [PrismaModule],
  controllers: [CheckinController],
  providers: [CheckinService],
  exports: [CheckinService],
})
export class CheckinModule {}
