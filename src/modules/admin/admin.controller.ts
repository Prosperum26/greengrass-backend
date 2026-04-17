import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OrgRequestStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../events/guards/roles.guard';
import { Roles } from '../events/decorators/roles.decorator';
import { OrganizerRequestListResponseDto } from './dto/organizer-request-response.dto';
import {
  RejectRequestDto,
  ApproveRejectResponseDto,
} from './dto/approve-reject-request.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('organizer-requests')
  @ApiOperation({
    summary: 'Get all organizer requests',
    description:
      'Retrieve list of all organizer requests with pagination and optional status filter (Admin only)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: OrgRequestStatus,
    description: 'Filter by status: PENDING, APPROVED, REJECTED',
  })
  async getOrganizerRequests(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: OrgRequestStatus,
  ): Promise<OrganizerRequestListResponseDto> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.getOrganizerRequests(pageNum, limitNum, status);
  }

  @Get('organizer-requests/:id')
  @ApiOperation({
    summary: 'Get organizer request detail',
    description:
      'Retrieve full details of a specific organizer request by ID (Admin only)',
  })
  async getOrganizerRequestById(
    @Param('id') requestId: string,
  ): Promise<OrganizerRequestListResponseDto['items'][0]> {
    return this.adminService.getOrganizerRequestById(requestId);
  }

  @Post('organizer-requests/:id/approve')
  @ApiOperation({
    summary: 'Approve organizer request',
    description:
      'Approve a pending organizer request and upgrade user role to ORGANIZER (Admin only)',
  })
  async approveOrganizerRequest(
    @Param('id') requestId: string,
  ): Promise<ApproveRejectResponseDto> {
    return this.adminService.approveOrganizerRequest(requestId);
  }

  @Post('organizer-requests/:id/reject')
  @ApiOperation({
    summary: 'Reject organizer request',
    description:
      'Reject a pending organizer request with optional reason (Admin only)',
  })
  async rejectOrganizerRequest(
    @Param('id') requestId: string,
    @Body() dto: RejectRequestDto,
  ): Promise<ApproveRejectResponseDto> {
    return this.adminService.rejectOrganizerRequest(requestId, dto.reason);
  }
}
