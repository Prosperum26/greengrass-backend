import { PointReason } from '@prisma/client';

export class AddPointsDto {
  userId: string;
  amount?: number;
  reason: PointReason;
  eventId?: string;
  metadata?: Record<string, unknown>;
}
