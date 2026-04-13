import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto, EventStatus, GetEventsQueryDto, GetAllEventsQueryDto } from './dto/create-event.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Prisma select shapes
// qrSecret is intentionally absent from every select — never exposed in responses.
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_SELECT = {
  id:          true,
  title:       true,
  description: true,
  location:    true,
  latitude:    true,
  longitude:   true,
  startTime:   true,
  endTime:     true,
  points:      true,
  status:      true,
  organizerId: true,
  createdAt:   true,
  updatedAt:   true,
  _count: { select: { eventRegistrations: true } },
} as const;

const USER_SELECT = {
  id:    true,
  name:  true,
  email: true,
  role:  true,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

function deriveStatus(startTime: Date, endTime: Date): EventStatus {
  const now = new Date();
  if (now < startTime) return EventStatus.UPCOMING;
  if (now > endTime)   return EventStatus.COMPLETED;
  return EventStatus.ONGOING;
}

interface RawEvent {
  startTime: Date | string;
  endTime:   Date | string;
  [key: string]: unknown;
}

function withDynamicStatus<T extends RawEvent>(event: T): T {
  return {
    ...event,
    status: deriveStatus(new Date(event.startTime), new Date(event.endTime)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEvents(query: GetEventsQueryDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 10;
    const skip  = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.keyword) {
      where.OR = [
        { title:       { contains: query.keyword, mode: 'insensitive' } },
        { description: { contains: query.keyword, mode: 'insensitive' } },
        { location:    { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      const range: Record<string, Date> = {};
      if (query.dateFrom) range.gte = new Date(query.dateFrom);
      if (query.dateTo)   range.lte = new Date(query.dateTo);
      where.startTime = range;
    }

    const [total, rawItems] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        select:  EVENT_SELECT,
        orderBy: { startTime: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items:      rawItems.map(withDynamicStatus),
      pagination: { total, page, limit },
    };
  }

  async createEvent(dto: CreateEventDto, organizerId: string) {
    const startTime = new Date(dto.startTime);
    const endTime   = new Date(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be strictly before endTime.');
    }

    const event = await this.prisma.event.create({
      data: {
        title:       dto.title,
        description: dto.description,
        location:    dto.location,
        latitude:    dto.latitude,
        longitude:   dto.longitude,
        startTime,
        endTime,
        points:      dto.points,
        qrSecret:    dto.qrSecret,
        status:      deriveStatus(startTime, endTime),
        organizerId,
      },
      select: EVENT_SELECT,
    });

    return withDynamicStatus(event);
  }

  async getEventById(id: string) {
    const event = await this.prisma.event.findUnique({
      where:  { id },
      select: EVENT_SELECT,
    });

    if (!event) {
      throw new NotFoundException(`Event with id '${id}' not found.`);
    }

    return withDynamicStatus(event);
  }

  async registerToEvent(eventId: string, userId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const event = await tx.event.findUnique({
          where:  { id: eventId },
          select: { id: true, title: true, startTime: true, endTime: true },
        });

        if (!event) {
          throw new NotFoundException(`Event with id '${eventId}' not found.`);
        }

        const currentStatus = deriveStatus(
          new Date(event.startTime),
          new Date(event.endTime),
        );

        if (currentStatus === EventStatus.COMPLETED) {
          throw new BadRequestException('Cannot register for a completed event.');
        }

        const existing = await tx.eventRegistration.findUnique({
          where:  { userId_eventId: { userId, eventId } },
          select: { id: true },
        });

        if (existing) {
          throw new ConflictException('You have already registered for this event.');
        }

        return tx.eventRegistration.create({
          data: { userId, eventId },
          select: {
            id:        true,
            createdAt: true,
            eventId:   true,
            userId:    true,
            event: {
              select: {
                id:        true,
                title:     true,
                startTime: true,
                endTime:   true,
                status:    true,
              },
            },
            user: { select: USER_SELECT },
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async cancelRegistration(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where:  { id: eventId },
      // FIX 3: fetch startTime/endTime to check status
      select: { id: true, startTime: true, endTime: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with id '${eventId}' not found.`);
    }

    // FIX 3: prevent cancellation after event has completed
    const currentStatus = deriveStatus(
      new Date(event.startTime),
      new Date(event.endTime),
    );

    if (currentStatus === EventStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel registration for a completed event.');
    }

    const registration = await this.prisma.eventRegistration.findUnique({
      where:  { userId_eventId: { userId, eventId } },
      select: { id: true },
    });

    if (!registration) {
      throw new NotFoundException('You are not registered for this event.');
    }

    await this.prisma.eventRegistration.delete({
      where: { userId_eventId: { userId, eventId } },
    });

    return { message: 'Registration cancelled successfully.' };
  }

  async getParticipants(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id:        true,
        title:     true,
        status:    true,
        startTime: true,
        endTime:   true,
        _count: { select: { eventRegistrations: true } },
        eventRegistrations: {
          orderBy: { createdAt: 'asc' },
          select: {
            id:        true,
            createdAt: true,
            user: { select: USER_SELECT },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with id '${eventId}' not found.`);
    }

    return {
      event: {
        id:                event.id,
        title:             event.title,
        status:            deriveStatus(new Date(event.startTime), new Date(event.endTime)),
        startTime:         event.startTime,
        endTime:           event.endTime,
        totalParticipants: event._count.eventRegistrations,
      },
      participants: event.eventRegistrations.map((reg) => ({
        registrationId: reg.id,
        registeredAt:   reg.createdAt,
        user:           reg.user,
      })),
    };
  }

  // ───────────────── ADDITION (ONLY ADD BELOW) ─────────────────

  async getAllEvents(query: GetAllEventsQueryDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 10;
    const skip  = (page - 1) * limit;

    const [total, rawItems] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.event.findMany({
        select:  EVENT_SELECT,
        orderBy: { startTime: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items:      rawItems.map(withDynamicStatus),
      pagination: { total, page, limit },
    };
  }

  async updateEvent(id: string, dto: Partial<CreateEventDto>, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      // FIX 4: also fetch startTime/endTime to recompute status after update
      select: { organizerId: true, startTime: true, endTime: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with id '${id}' not found.`);
    }

    if (event.organizerId !== userId) {
      throw new BadRequestException('You are not allowed to update this event.');
    }

    // FIX 2: validate startTime < endTime, handling partial patch
    const newStartTime = dto.startTime ? new Date(dto.startTime) : new Date(event.startTime);
    const newEndTime   = dto.endTime   ? new Date(dto.endTime)   : new Date(event.endTime);

    if (newStartTime >= newEndTime) {
      throw new BadRequestException('startTime must be strictly before endTime.');
    }

    // FIX 4: recompute and persist status so DB stays in sync
    const newStatus = deriveStatus(newStartTime, newEndTime);

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startTime && { startTime: newStartTime }),
        ...(dto.endTime   && { endTime:   newEndTime }),
        status: newStatus,
      },
      select: EVENT_SELECT,
    });

    return withDynamicStatus(updated);
  }

  async deleteEvent(id: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: { organizerId: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with id '${id}' not found.`);
    }

    if (event.organizerId !== userId) {
      throw new BadRequestException('You are not allowed to delete this event.');
    }

    await this.prisma.event.delete({
      where: { id },
    });

    return { message: 'Event deleted successfully.' };
  }
}