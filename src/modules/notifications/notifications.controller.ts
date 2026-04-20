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
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService, NotificationData } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { AuthenticatedRequest, ApiSuccessResponse } from '../../common/types';
import { success, deleted } from '../../common/utils';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách thông báo của user',
    description:
      'Trả về tất cả thông báo của người dùng hiện tại, sắp xếp theo thời gian mới nhất',
  })
  async getNotifications(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiSuccessResponse<NotificationData[]>> {
    const data =
      await this.notificationsService.getUserNotifications(req.user.sub);
    return success(data);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Đếm số thông báo chưa đọc',
    description: 'Trả về số lượng thông báo chưa đọc của người dùng',
  })
  async getUnreadCount(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiSuccessResponse<{ count: number }>> {
    try {
      const count = await this.notificationsService.getUnreadCount(req.user.sub);
      return success({ count });
    } catch (error) {
      this.logger.error(`Error getting unread count for user ${req.user.sub}:`, error);
      throw new InternalServerErrorException('Không thể lấy số thông báo chưa đọc');
    }
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
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiSuccessResponse<null>> {
    await this.notificationsService.markAsRead(id, req.user.sub);
    return deleted('Notification marked as read');
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đánh dấu tất cả thông báo đã đọc',
    description: 'Đánh dấu tất cả thông báo của người dùng là đã đọc',
  })
  async markAllAsRead(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiSuccessResponse<null>> {
    await this.notificationsService.markAllAsRead(req.user.sub);
    return deleted('All notifications marked as read');
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
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiSuccessResponse<null>> {
    await this.notificationsService.deleteNotification(id, req.user.sub);
    return deleted('Notification deleted');
  }
}
