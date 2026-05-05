import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { Public } from '../../common/decorators/public.decorator';
import {
  imageFileFilter,
  MAX_FILE_SIZE,
} from '../../common/interceptors/file-upload.interceptor';
import type { Express } from 'express';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Req() req: RequestWithUser) {
    return this.usersService.getMe(req.user.sub);
  }

  @Patch('me')
  async updateMe(@Req() req: RequestWithUser, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(req.user.sub, dto);
  }

  @Public()
  @Get('organizers')
  async getOrganizers() {
    return this.usersService.getOrganizers();
  }

  @Public()
  @Get(':id/profile')
  async getProfile(@Param('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Get('me/events')
  async getMyEvents(@Req() req: RequestWithUser) {
    return this.usersService.getMyEvents(req.user.sub);
  }

  @Get('me/organized-events')
  async getMyOrganizedEvents(@Req() req: RequestWithUser) {
    return this.usersService.getMyOrganizedEvents(req.user.sub);
  }

  @Get('me/points')
  async getMyPoints(@Req() req: RequestWithUser) {
    return this.usersService.getMyPoints(req.user.sub);
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadAvatar(
    @Req() req: RequestWithUser,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(req.user.sub, avatar);
  }
}
