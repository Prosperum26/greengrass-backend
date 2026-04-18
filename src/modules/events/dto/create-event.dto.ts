import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EventStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
}

export class CreateEventDto {
  @ApiProperty({ description: 'Event title', example: 'Tree Planting Day' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: 'Event description',
    example: 'Join us to plant 100 trees!',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    description: 'Event location',
    example: 'Central Park, District 1',
  })
  @IsString()
  @IsNotEmpty()
  location!: string;

  @ApiProperty({
    description: 'Latitude (-90 to 90)',
    example: 10.762622,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude!: number;

  @ApiProperty({
    description: 'Longitude (-180 to 180)',
    example: 106.660172,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude!: number;

  @ApiProperty({
    description: 'Start time (ISO 8601)',
    example: '2025-06-01T08:00:00.000Z',
  })
  @IsDateString()
  startTime!: string;

  @ApiProperty({
    description: 'End time (ISO 8601)',
    example: '2025-06-01T12:00:00.000Z',
  })
  @IsDateString()
  endTime!: string;

  @ApiProperty({
    description: 'Points awarded for participation',
    example: 50,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  points!: number;

  @ApiProperty({
    description: 'QR secret for check-in',
    example: 'event-secret-123',
  })
  @IsString()
  @IsNotEmpty()
  qrSecret!: string;

  // Cover image is handled by FileInterceptor, but needs to be allowed through validation
  @IsOptional()
  coverImage?: any;
}

export class GetEventsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: EventStatus,
    enumName: 'EventStatus',
  })
  @IsOptional()
  @IsEnum(EventStatus, {
    message: `status must be one of: ${Object.values(EventStatus).join(', ')}`,
  })
  status?: EventStatus;

  @ApiPropertyOptional({
    description: 'Search keyword',
    example: 'tree planting',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: 'Filter events from this date (ISO 8601)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter events to this date (ISO 8601)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}

/** Dùng riêng cho GET /events/full (chỉ ADMIN) — phân trang đơn giản, không filter */
export class GetAllEventsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
