import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from './decorators/roles.decorator';
import { CreateEventDto, GetEventsQueryDto, GetAllEventsQueryDto } from './dto/create-event.dto';
import { RolesGuard } from './guards/roles.guard';
import { EventsService } from './events.service';


interface AuthRequest extends Request {
  user: { id: string; role: 'STUDENT' | 'ORGANIZER' | 'ADMIN' };
}



const ok = <T>(data: T) => ({ success: true as const, data });



@Controller('events')
@UseGuards(RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}


  @Get()
  async getEvents(@Query() query: GetEventsQueryDto) {
    const data = await this.eventsService.getEvents(query);
    return ok(data);
  }

  // FIX 1: giới hạn ADMIN + thêm phân trang
  @Get('full')
  @Roles('ADMIN')
  async getAllEvents(@Query() query: GetAllEventsQueryDto) {
    const data = await this.eventsService.getAllEvents(query);
    return ok(data);
  }

  @Post()
  @Roles('ORGANIZER')
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body() dto: CreateEventDto, @Req() req: AuthRequest) {
    const data = await this.eventsService.createEvent(dto, req.user.id);
    return ok(data);
  }

  @Get(':id')
  async getEventById(@Param('id') id: string) {
    const data = await this.eventsService.getEventById(id);
    return ok(data);
  }


  @Patch(':id')
  @Roles('ORGANIZER')
  async updateEvent(
    @Param('id') id: string,
    @Body() dto: Partial<CreateEventDto>,
    @Req() req: AuthRequest,
  ) {
    const data = await this.eventsService.updateEvent(
      id,
      dto,
      req.user.id,
    );
    return ok(data);
  }


  @Delete(':id')
  @Roles('ORGANIZER')
  async deleteEvent(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    const data = await this.eventsService.deleteEvent(
      id,
      req.user.id,
    );
    return ok(data);
  }


  @Post(':id/register')
  @Roles('STUDENT')
  @HttpCode(HttpStatus.CREATED)
  async register(@Param('id') eventId: string, @Req() req: AuthRequest) {
    const data = await this.eventsService.registerToEvent(eventId, req.user.id);
    return ok(data);
  }

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

  @Get(':id/participants')
  async getParticipants(@Param('id') eventId: string) {
    const data = await this.eventsService.getParticipants(eventId);
    return ok(data);
  }
}