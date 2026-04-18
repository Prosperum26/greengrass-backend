import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService, NotificationData } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách thông báo của user',
    description: 'Trả về tất cả thông báo của người dùng hiện tại, sắp xếp theo thời gian mới nhất',
  })
  async getNotifications(
    @Req() req: RequestWithUser,
  ): Promise<{ success: true; data: NotificationData[] }> {
    const data = await this.notificationsService.getUserNotifications(req.user.sub);
    return { success: true, data };
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Đếm số thông báo chưa đọc',
    description: 'Trả về số lượng thông báo chưa đọc của người dùng',
  })
  async getUnreadCount(
    @Req() req: RequestWithUser,
  ): Promise<{ success: true; data: { count: number } }> {
    const count = await this.notificationsService.getUnreadCount(req.user.sub);
    return { success: true, data: { count } };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đánh dấu thông báo đã đọc',
    description: 'Đánh dấu một thông báo cụ thể là đã đọc',
  })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async markAsRead(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<{ success: true; message: string }> {
    await this.notificationsService.markAsRead(id, req.user.sub);
    return { success: true, message: 'Notification marked as read' };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đánh dấu tất cả thông báo đã đọc',
    description: 'Đánh dấu tất cả thông báo của người dùng là đã đọc',
  })
  async markAllAsRead(
    @Req() req: RequestWithUser,
  ): Promise<{ success: true; message: string }> {
    await this.notificationsService.markAllAsRead(req.user.sub);
    return { success: true, message: 'All notifications marked as read' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xóa thông báo',
    description: 'Xóa một thông báo cụ thể của người dùng',
  })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  async deleteNotification(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<{ success: true; message: string }> {
    await this.notificationsService.deleteNotification(id, req.user.sub);
    return { success: true, message: 'Notification deleted' };
  }
}
