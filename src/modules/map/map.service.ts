import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EventMarker {
  id: string;
  title: string;
  location: string;
  lat: number;
  lng: number;
  startTime: Date;
  endTime: Date;
  status: string;
  participants: number;
  image: string | null;
  points: number;
}

@Injectable()
export class MapService {
  constructor(private readonly prisma: PrismaService) {}

  async getEventMarkers(): Promise<EventMarker[]> {
    const events = await this.prisma.event.findMany({
      where: {
        status: {
          in: ['UPCOMING', 'ONGOING'],
        },
      },
      select: {
        id: true,
        title: true,
        location: true,
        latitude: true,
        longitude: true,
        startTime: true,
        endTime: true,
        status: true,
        coverImageUrl: true,
        points: true,
        _count: {
          select: { eventRegistrations: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return events.map((event) => ({
      id: event.id,
      title: event.title,
      location: event.location,
      lat: event.latitude,
      lng: event.longitude,
      startTime: event.startTime,
      endTime: event.endTime,
      status: event.status,
      participants: event._count.eventRegistrations,
      image: event.coverImageUrl,
      points: event.points,
    }));
  }

  async getEventMarkerById(eventId: string): Promise<EventMarker | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        location: true,
        latitude: true,
        longitude: true,
        startTime: true,
        endTime: true,
        status: true,
        coverImageUrl: true,
        points: true,
        _count: {
          select: { eventRegistrations: true },
        },
      },
    });

    if (!event) return null;

    return {
      id: event.id,
      title: event.title,
      location: event.location,
      lat: event.latitude,
      lng: event.longitude,
      startTime: event.startTime,
      endTime: event.endTime,
      status: event.status,
      participants: event._count.eventRegistrations,
      image: event.coverImageUrl,
      points: event.points,
    };
  }

  async getNearbyEvents(lat: number, lng: number, radiusKm: number = 10): Promise<EventMarker[]> {
    const allEvents = await this.getEventMarkers();

    return allEvents.filter((event) => {
      const distance = this.calculateDistance(lat, lng, event.lat, event.lng);
      return distance <= radiusKm;
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
