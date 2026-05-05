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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import type { Express } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  CreateEventDto,
  GetEventsQueryDto,
  GetAllEventsQueryDto,
} from './dto/create-event.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import {
  imageFileFilter,
  MAX_FILE_SIZE,
} from '../../common/interceptors/file-upload.interceptor';

interface AuthRequest extends Request {
  user: { sub: string; role: 'STUDENT' | 'ORGANIZER' | 'ADMIN' };
}

const ok = <T>(data: T) => ({ success: true as const, data });

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @Public()
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
  @UseInterceptors(
    FileInterceptor('coverImage', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: imageFileFilter,
    }),
  )
  async createEvent(
    @Body() dto: CreateEventDto,
    @Req() req: AuthRequest,
    @UploadedFile() coverImage?: Express.Multer.File,
  ) {
    const data = await this.eventsService.createEvent(
      dto,
      req.user.sub,
      coverImage,
    );
    return ok(data);
  }

  @Post(':id/gallery')
  @Roles('ORGANIZER')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: imageFileFilter,
    }),
  )
  async addGalleryImage(
    @Param('id') eventId: string,
    @Req() req: AuthRequest,
    @UploadedFile() image: Express.Multer.File,
  ) {
    const data = await this.eventsService.addGalleryImage(
      eventId,
      req.user.sub,
      image,
    );
    return ok(data);
  }

  @Patch(':id/cover')
  @Roles('ORGANIZER')
  @UseInterceptors(
    FileInterceptor('coverImage', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: imageFileFilter,
    }),
  )
  async updateCoverImage(
    @Param('id') eventId: string,
    @Req() req: AuthRequest,
    @UploadedFile() coverImage: Express.Multer.File,
  ) {
    const data = await this.eventsService.updateCoverImage(
      eventId,
      req.user.sub,
      coverImage,
    );
    return ok(data);
  }

  @Get(':id')
  @Public()
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
    const data = await this.eventsService.updateEvent(id, dto, req.user.sub);
    return ok(data);
  }

  @Delete(':id')
  @Roles('ORGANIZER', 'ADMIN')
  async deleteEvent(@Param('id') id: string, @Req() req: AuthRequest) {
    const data = await this.eventsService.deleteEvent(
      id,
      req.user.sub,
      req.user.role,
    );
    return ok(data);
  }

  @Post(':id/register')
  @Roles('STUDENT')
  @HttpCode(HttpStatus.CREATED)
  async register(@Param('id') eventId: string, @Req() req: AuthRequest) {
    const data = await this.eventsService.registerToEvent(
      eventId,
      req.user.sub,
    );
    return ok(data);
  }

  @Delete(':id/register')
  @Roles('STUDENT')
  @HttpCode(HttpStatus.OK)
  async cancelRegistration(
    @Param('id') eventId: string,
    @Req() req: AuthRequest,
  ) {
    const data = await this.eventsService.cancelRegistration(
      eventId,
      req.user.sub,
    );
    return ok(data);
  }

  @Get(':id/registration')
  @Roles('STUDENT', 'ORGANIZER', 'ADMIN')
  async checkRegistration(
    @Param('id') eventId: string,
    @Req() req: AuthRequest,
  ) {
    const data = await this.eventsService.checkRegistration(
      eventId,
      req.user.sub,
    );
    return ok(data);
  }

  @Get(':id/participants')
  @Roles('ORGANIZER', 'ADMIN')
  async getParticipants(@Param('id') eventId: string, @Req() req: AuthRequest) {
    const data = await this.eventsService.getParticipants(
      eventId,
      req.user.sub,
      req.user.role,
    );
    return ok(data);
  }
}
