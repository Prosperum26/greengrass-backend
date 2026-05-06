import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import {
  CreateEventDto,
  EventStatus,
  GetEventsQueryDto,
  GetAllEventsQueryDto,
} from './dto/create-event.dto';
import type { Express } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Prisma select shapes
// qrSecret is intentionally absent from every select — never exposed in responses.
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_SELECT = {
  id: true,
  title: true,
  description: true,
  location: true,
  latitude: true,
  longitude: true,
  checkinRadius: true,
  startTime: true,
  endTime: true,
  points: true,
  status: true,
  coverImageUrl: true,
  galleryImages: true,
  organizerId: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { eventRegistrations: true } },
} as const;

const USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

function deriveStatus(startTime: Date, endTime: Date): EventStatus {
  const now = new Date();
  if (now < startTime) return EventStatus.UPCOMING;
  if (now > endTime) return EventStatus.COMPLETED;
  return EventStatus.ONGOING;
}

interface RawEvent {
  startTime: Date | string;
  endTime: Date | string;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async getEvents(query: GetEventsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Filter by dynamic status (derived from actual time, not stored status)
    if (query.status) {
      const now = new Date();
      if (query.status === EventStatus.COMPLETED) {
        where.endTime = { lt: now };
      } else if (query.status === EventStatus.UPCOMING) {
        where.startTime = { gt: now };
      } else if (query.status === EventStatus.ONGOING) {
        where.startTime = { lte: now };
        where.endTime = { gte: now };
      }
    }

    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { description: { contains: query.keyword, mode: 'insensitive' } },
        { location: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    if (query.dateFrom || query.dateTo) {
      const range: Record<string, Date> = {};
      if (query.dateFrom) range.gte = new Date(query.dateFrom);
      if (query.dateTo) range.lte = new Date(query.dateTo);
      where.startTime = range;
    }

    const sortBy = query.sortBy ?? 'startTime';
    const sortOrder = query.sortOrder ?? 'asc';

    const [total, rawItems] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        select: EVENT_SELECT,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: rawItems.map(withDynamicStatus),
      pagination: { total, page, limit },
    };
  }

  async createEvent(
    dto: CreateEventDto,
    organizerId: string,
    coverImage?: Express.Multer.File,
  ) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException(
        'startTime must be strictly before endTime.',
      );
    }

    // Upload cover image if provided
    let coverImageUrl: string | undefined;
    let coverImagePublicId: string | undefined;

    if (coverImage) {
      const uploadResult = await this.uploadService.uploadEventCover(
        coverImage,
        'temp', // temporary ID, will update after event creation
      );
      coverImageUrl = uploadResult.url;
      coverImagePublicId = uploadResult.publicId;
    }

    // Handle checkinRadius: 0 means unlimited (half earth circumference ~20076000m)
    const finalCheckinRadius =
      dto.checkinRadius === 0 ? 20076000 : (dto.checkinRadius ?? 50);

    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        location: dto.location,
        latitude: dto.latitude,
        longitude: dto.longitude,
        checkinRadius: finalCheckinRadius,
        startTime,
        endTime,
        points: dto.points,
        qrSecret: dto.qrSecret,
        status: deriveStatus(startTime, endTime),
        organizerId,
        coverImageUrl,
        coverImagePublicId,
        galleryImages: [],
      },
      select: EVENT_SELECT,
    });

    // Update cover image with actual event ID if uploaded
    if (coverImage && coverImagePublicId) {
      const newUpload = await this.uploadService.uploadEventCover(
        coverImage,
        event.id,
      );
      await this.prisma.event.update({
        where: { id: event.id },
        data: {
          coverImageUrl: newUpload.url,
          coverImagePublicId: newUpload.publicId,
        },
      });
      // Delete temp image
      await this.uploadService.deleteImage(coverImagePublicId).catch(() => {
        // Ignore deletion error
      });
    }

    // Convert back to 0 for API response if it's the unlimited value
    const response = {
      ...event,
      checkinRadius: event.checkinRadius === 20076000 ? 0 : event.checkinRadius,
    };

    return withDynamicStatus(response);
  }

  async addGalleryImage(
    eventId: string,
    userId: string,
    image: Express.Multer.File,
  ) {
    // Verify event exists and user is organizer
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        organizerId: true,
        galleryImages: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with id '${eventId}' not found.`);
    }

    if (event.organizerId !== userId) {
      throw new BadRequestException(
        'You are not allowed to modify this event.',
      );
    }

    // Upload image
    const uploadResult = await this.uploadService.uploadEventGallery(
      image,
      eventId,
    );

    // Update event with new gallery image
    const currentImages = event.galleryImages || [];
    const updatedImages = [...currentImages, uploadResult.url];

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        galleryImages: updatedImages,
      },
      select: EVENT_SELECT,
    });

    return withDynamicStatus(updated);
  }

  async updateCoverImage(
    eventId: string,
    userId: string,
    coverImage: Express.Multer.File,
  ) {
    // Verify event exists and user is organizer
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        organizerId: true,
        coverImagePublicId: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with id '${eventId}' not found.`);
    }

    if (event.organizerId !== userId) {
      throw new BadRequestException(
        'You are not allowed to modify this event.',
      );
    }

    // Delete old cover image if exists
    if (event.coverImagePublicId) {
      try {
        await this.uploadService.deleteImage(event.coverImagePublicId);
      } catch {
        // Ignore error if old image doesn't exist
      }
    }

    // Upload new cover image
    const uploadResult = await this.uploadService.uploadEventCover(
      coverImage,
      eventId,
    );

    // Update event with new cover image
    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        coverImageUrl: uploadResult.url,
        coverImagePublicId: uploadResult.publicId,
      },
      select: EVENT_SELECT,
    });

    return withDynamicStatus(updated);
  }

  async getEventById(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: EVENT_SELECT,
    });

    if (!event) {
      throw new NotFoundException(`Event with id '${id}' not found.`);
    }

    return withDynamicStatus(event);
  }

  async registerToEvent(eventId: string, userId: string) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const event = await tx.event.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            points: true,
          },
        });

        if (!event) {
          throw new NotFoundException(`Event with id '${eventId}' not found.`);
        }

        const currentStatus = deriveStatus(
          new Date(event.startTime),
          new Date(event.endTime),
        );

        if (currentStatus === EventStatus.COMPLETED) {
          throw new BadRequestException(
            'Cannot register for a completed event.',
          );
        }

        const existing = await tx.eventRegistration.findUnique({
          where: { userId_eventId: { userId, eventId } },
          select: { id: true },
        });

        if (existing) {
          throw new ConflictException(
            'You have already registered for this event.',
          );
        }

        const registration = await tx.eventRegistration.create({
          data: { userId, eventId },
          select: {
            id: true,
            createdAt: true,
            eventId: true,
            userId: true,
            event: {
              select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true,
                status: true,
                points: true,
              },
            },
            user: { select: USER_SELECT },
          },
        });

        return { registration };
      },
      { isolationLevel: 'Serializable' },
    );

    return result.registration;
  }

  async checkRegistration(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with id '${eventId}' not found.`);
    }

    const registration = await this.prisma.eventRegistration.findUnique({
      where: { userId_eventId: { userId, eventId } },
      select: { id: true, createdAt: true, status: true, checkInTime: true },
    });

    return {
      registered: !!registration,
      registeredAt: registration?.createdAt || null,
      status: registration?.status || null,
      checkInTime: registration?.checkInTime || null,
    };
  }

  async cancelRegistration(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
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
      throw new BadRequestException(
        'Cannot cancel registration for a completed event.',
      );
    }

    const registration = await this.prisma.eventRegistration.findUnique({
      where: { userId_eventId: { userId, eventId } },
      select: { id: true, status: true },
    });

    if (!registration) {
      throw new NotFoundException('You are not registered for this event.');
    }

    // Prevent cancellation if already checked in
    if (registration.status === 'CHECKED_IN') {
      throw new BadRequestException(
        'Cannot cancel registration after check-in.',
      );
    }

    await this.prisma.eventRegistration.delete({
      where: { userId_eventId: { userId, eventId } },
    });

    return { message: 'Registration cancelled successfully.' };
  }

  async getParticipants(
    eventId: string,
    requesterId: string,
    requesterRole: 'STUDENT' | 'ORGANIZER' | 'ADMIN',
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        organizerId: true,
        status: true,
        startTime: true,
        endTime: true,
        _count: { select: { eventRegistrations: true } },
        eventRegistrations: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            createdAt: true,
            user: { select: USER_SELECT },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with id '${eventId}' not found.`);
    }
    if (requesterRole !== 'ADMIN' && event.organizerId !== requesterId) {
      throw new BadRequestException(
        'You are not allowed to view participants of this event.',
      );
    }

    return {
      event: {
        id: event.id,
        title: event.title,
        status: deriveStatus(
          new Date(event.startTime),
          new Date(event.endTime),
        ),
        startTime: event.startTime,
        endTime: event.endTime,
        totalParticipants: event._count.eventRegistrations,
      },
      participants: event.eventRegistrations.map((reg) => ({
        registrationId: reg.id,
        registeredAt: reg.createdAt,
        user: reg.user,
      })),
    };
  }

  // ───────────────── ADDITION (ONLY ADD BELOW) ─────────────────

  async getAllEvents(query: GetAllEventsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [total, rawItems] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.event.findMany({
        select: EVENT_SELECT,
        orderBy: { startTime: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: rawItems.map(withDynamicStatus),
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
      throw new BadRequestException(
        'You are not allowed to update this event.',
      );
    }

    // FIX 2: validate startTime < endTime, handling partial patch
    const newStartTime = dto.startTime
      ? new Date(dto.startTime)
      : new Date(event.startTime);
    const newEndTime = dto.endTime
      ? new Date(dto.endTime)
      : new Date(event.endTime);

    if (newStartTime >= newEndTime) {
      throw new BadRequestException(
        'startTime must be strictly before endTime.',
      );
    }

    // FIX 4: recompute and persist status so DB stays in sync
    const newStatus = deriveStatus(newStartTime, newEndTime);

    // Convert checkinRadius: 0 means unlimited (half earth circumference ~20076000m)
    let finalCheckinRadius = dto.checkinRadius;
    if (dto.checkinRadius !== undefined) {
      finalCheckinRadius =
        dto.checkinRadius === 0 ? 20076000 : dto.checkinRadius;
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startTime && { startTime: newStartTime }),
        ...(dto.endTime && { endTime: newEndTime }),
        ...(finalCheckinRadius !== undefined && {
          checkinRadius: finalCheckinRadius,
        }),
        status: newStatus,
      },
      select: EVENT_SELECT,
    });

    // Convert back to 0 for API response if it's the unlimited value
    const response = {
      ...updated,
      checkinRadius: updated.checkinRadius === 20076000 ? 0 : updated.checkinRadius,
    };

    return withDynamicStatus(response);
  }

  async deleteEvent(id: string, userId: string, userRole?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: { organizerId: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with id '${id}' not found.`);
    }

    // Admin can delete any event, organizer can only delete their own events
    if (userRole !== 'ADMIN' && event.organizerId !== userId) {
      throw new BadRequestException(
        'You are not allowed to delete this event.',
      );
    }

    await this.prisma.event.delete({
      where: { id },
    });

    return { message: 'Event deleted successfully.' };
  }
}
