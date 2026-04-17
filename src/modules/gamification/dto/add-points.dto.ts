import { PointReason } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddPointsDto {
  @ApiProperty({
    description: 'User ID to add points to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId!: string;

  @ApiPropertyOptional({
    description: 'Points amount (if not provided, uses default for reason)',
    example: 50,
  })
  amount?: number;

  @ApiProperty({
    description: 'Reason for adding points',
    enum: PointReason,
    enumName: 'PointReason',
    example: 'CHECK_IN',
  })
  reason!: PointReason;

  @ApiPropertyOptional({
    description: 'Related event ID',
    example: 'event-uuid-123',
  })
  eventId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { source: 'manual', adminId: 'admin-123' },
  })
  metadata?: Record<string, unknown>;
}
