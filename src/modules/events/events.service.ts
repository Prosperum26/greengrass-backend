import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto, EventStatus, GetEventsQueryDto } from './dto/create-event.dto';

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

/** Derives real-time status from start/end times — authoritative over DB column. */
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

/** Overrides the stored `status` field with a dynamically recalculated value. */
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

  // ── Events ──────────────────────────────────────────────────────────────────

  /**
   * GET /events
   * Paginated list with optional status / keyword / date-range filters.
   * count + data queries run in parallel for efficiency.
   */
  async getEvents(query: GetEventsQueryDto) {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 10;
    const skip  = (page - 1) * limit;

    // Build WHERE clause dynamically
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

    // Parallel count + fetch
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

  /**
   * POST /events
   * Validates time range, derives initial status, persists event.
   */
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
        status:      deriveStatus(startTime, endTime), // best-effort snapshot
        organizerId,
      },
      select: EVENT_SELECT,
    });

    return withDynamicStatus(event);
  }

  /**
   * GET /events/:id
   * Returns event detail with dynamic status, or 404.
   */
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

  // ── Registrations ───────────────────────────────────────────────────────────

  /**
   * POST /events/:id/register
   *
   * Atomic registration using a SERIALIZABLE transaction:
   *   1. Read event (consistent snapshot inside tx)
   *   2. Guard: dynamic status must not be COMPLETED
   *   3. Guard: no existing registration  ← atomic with step 4
   *   4. Create registration
   *
   * Serializable isolation prevents two concurrent requests from both
   * passing the duplicate check for the same (userId, eventId) pair.
   */
  async registerToEvent(eventId: string, userId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        // 1. Fetch event inside tx
        const event = await tx.event.findUnique({
          where:  { id: eventId },
          select: { id: true, title: true, startTime: true, endTime: true },
        });

        if (!event) {
          throw new NotFoundException(`Event with id '${eventId}' not found.`);
        }

        // 2. Dynamic status check (stored value may be stale)
        const currentStatus = deriveStatus(
          new Date(event.startTime),
          new Date(event.endTime),
        );

        if (currentStatus === EventStatus.COMPLETED) {
          throw new BadRequestException('Cannot register for a completed event.');
        }

        // 3. Duplicate check
        const existing = await tx.eventRegistration.findUnique({
          where:  { userId_eventId: { userId, eventId } },
          select: { id: true },
        });

        if (existing) {
          throw new ConflictException('You have already registered for this event.');
        }

        // 4. Create
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

  /**
   * DELETE /events/:id/register
   * Verifies event exists, then verifies registration exists, then deletes.
   */
  async cancelRegistration(eventId: string, userId: string) {
    const eventExists = await this.prisma.event.findUnique({
      where:  { id: eventId },
      select: { id: true },
    });

    if (!eventExists) {
      throw new NotFoundException(`Event with id '${eventId}' not found.`);
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

  /**
   * GET /events/:id/participants
   * Single query fetches event + all registrations + user info — no N+1.
   */
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
}