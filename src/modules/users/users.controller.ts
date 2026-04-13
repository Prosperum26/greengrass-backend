import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { Public } from '../../common/decorators/public.decorater';

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
  @Get(':id/profile')
  async getProfile(@Param('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Get('me/events')
  async getMyEvents(@Req() req: RequestWithUser) {
    return this.usersService.getMyEvents(req.user.sub);
  }

  @Get('me/points')
  async getMyPoints(@Req() req: RequestWithUser) {
    return this.usersService.getMyPoints(req.user.sub);
  }
}
