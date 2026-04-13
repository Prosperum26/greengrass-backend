import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from './decorators/roles.decorator';
import { CreateEventDto, GetEventsQueryDto } from './dto/create-event.dto';
import { RolesGuard } from './guards/roles.guard';
import { EventsService } from './events.service';

// ─── Typed request (req.user populated by upstream auth middleware) ───────────

interface AuthRequest extends Request {
  user: { id: string; role: 'STUDENT' | 'ORGANIZER' | 'ADMIN' };
}

// ─── Unified success wrapper ──────────────────────────────────────────────────

const ok = <T>(data: T) => ({ success: true as const, data });

// ─────────────────────────────────────────────────────────────────────────────

@Controller('events')
@UseGuards(RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ── Event endpoints ─────────────────────────────────────────────────────────

  /**
   * GET /events
   * PUBLIC — ?status, ?keyword, ?dateFrom, ?dateTo, ?page, ?limit
   */
  @Get()
  async getEvents(@Query() query: GetEventsQueryDto) {
    const data = await this.eventsService.getEvents(query);
    return ok(data);
  }

  /**
   * POST /events
   * ORGANIZER only
   */
  @Post()
  @Roles('ORGANIZER')
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body() dto: CreateEventDto, @Req() req: AuthRequest) {
    const data = await this.eventsService.createEvent(dto, req.user.id);
    return ok(data);
  }

  /**
   * GET /events/:id
   * PUBLIC
   */
  @Get(':id')
  async getEventById(@Param('id') id: string) {
    const data = await this.eventsService.getEventById(id);
    return ok(data);
  }

  // ── Registration endpoints ──────────────────────────────────────────────────

  /**
   * POST /events/:id/register
   * STUDENT only
   */
  @Post(':id/register')
  @Roles('STUDENT')
  @HttpCode(HttpStatus.CREATED)
  async register(@Param('id') eventId: string, @Req() req: AuthRequest) {
    const data = await this.eventsService.registerToEvent(eventId, req.user.id);
    return ok(data);
  }

  /**
   * DELETE /events/:id/register
   * STUDENT only
   */
  @Delete(':id/register')
  @Roles('STUDENT')
  @HttpCode(HttpStatus.OK)
  async cancelRegistration(
    @Param('id') eventId: string,
    @Req() req: AuthRequest,
  ) {
    const data = await this.eventsService.cancelRegistration(eventId, req.user.id);
    return ok(data);
  }

  /**
   * GET /events/:id/participants
   * PUBLIC
   */
  @Get(':id/participants')
  async getParticipants(@Param('id') eventId: string) {
    const data = await this.eventsService.getParticipants(eventId);
    return ok(data);
  }
}