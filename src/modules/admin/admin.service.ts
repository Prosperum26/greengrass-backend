import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgRequestStatus, UserRole } from '@prisma/client';
import {
  OrganizerRequestListResponseDto,
  OrganizerRequestResponseDto,
} from './dto/organizer-request-response.dto';
import { ApproveRejectResponseDto } from './dto/approve-reject-request.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lấy danh sách tất cả organizer requests với phân trang và filter
   */
  async getOrganizerRequests(
    page: number = 1,
    limit: number = 10,
    status?: OrgRequestStatus,
  ): Promise<OrganizerRequestListResponseDto> {
    const skip = (page - 1) * limit;

    // Build where clause
    const where = status ? { status } : {};

    // Get total count
    const total = await this.prisma.organizerRequest.count({ where });

    // Get requests with user info
    const requests = await this.prisma.organizerRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    // Map to response DTO
    const items: OrganizerRequestResponseDto[] = requests.map((req) => ({
      id: req.id,
      userId: req.userId,
      fullName: req.user.fullName,
      email: req.user.email,
      organizationName: req.organizationName,
      description: req.description,
      status: req.status,
      createdAt: req.createdAt,
    }));

    return {
      items,
      pagination: {
        total,
        page,
        limit,
      },
    };
  }

  /**
   * Lấy chi tiết một organizer request theo ID
   */
  async getOrganizerRequestById(
    requestId: string,
  ): Promise<OrganizerRequestResponseDto> {
    const request = await this.prisma.organizerRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            bio: true,
            createdAt: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(
        `Organizer request with ID ${requestId} not found`,
      );
    }

    return {
      id: request.id,
      userId: request.userId,
      fullName: request.user.fullName,
      email: request.user.email,
      organizationName: request.organizationName,
      description: request.description,
      status: request.status,
      createdAt: request.createdAt,
    };
  }

  /**
   * Duyệt (approve) một organizer request
   */
  async approveOrganizerRequest(
    requestId: string,
  ): Promise<ApproveRejectResponseDto> {
    // Find request
    const request = await this.prisma.organizerRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(
        `Organizer request with ID ${requestId} not found`,
      );
    }

    if (request.status !== OrgRequestStatus.PENDING) {
      throw new BadRequestException(
        `Request is already ${request.status.toLowerCase()}`,
      );
    }

    // Use transaction to update both request and user role
    await this.prisma.$transaction([
      // Update request status
      this.prisma.organizerRequest.update({
        where: { id: requestId },
        data: { status: OrgRequestStatus.APPROVED },
      }),
      // Update user role to ORGANIZER
      this.prisma.user.update({
        where: { id: request.userId },
        data: { role: UserRole.ORGANIZER },
      }),
    ]);

    return {
      message: 'Organizer request approved successfully',
      requestId,
      status: OrgRequestStatus.APPROVED,
    };
  }

  /**
   * Từ chối (reject) một organizer request
   */
  async rejectOrganizerRequest(
    requestId: string,
    reason?: string,
  ): Promise<ApproveRejectResponseDto> {
    // Find request
    const request = await this.prisma.organizerRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(
        `Organizer request with ID ${requestId} not found`,
      );
    }

    if (request.status !== OrgRequestStatus.PENDING) {
      throw new BadRequestException(
        `Request is already ${request.status.toLowerCase()}`,
      );
    }

    // Update request status to REJECTED
    await this.prisma.organizerRequest.update({
      where: { id: requestId },
      data: {
        status: OrgRequestStatus.REJECTED,
        description: reason
          ? `${request.description || ''}\n\n[REJECTION REASON]: ${reason}`
          : request.description,
      },
    });

    return {
      message: reason
        ? `Organizer request rejected. Reason: ${reason}`
        : 'Organizer request rejected',
      requestId,
      status: OrgRequestStatus.REJECTED,
    };
  }

  /**
   * Xóa organizer request và user account liên quan
   */
  async deleteOrganizer(requestId: string): Promise<ApproveRejectResponseDto> {
    // Find request with user info
    const request = await this.prisma.organizerRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException(
        `Organizer request with ID ${requestId} not found`,
      );
    }

    // Use transaction to delete both user and request
    await this.prisma.$transaction([
      // Delete the user (this will cascade delete related records if set up)
      this.prisma.user.delete({
        where: { id: request.userId },
      }),
      // Delete the organizer request
      this.prisma.organizerRequest.delete({
        where: { id: requestId },
      }),
    ]);

    return {
      message: 'Organizer and associated user account deleted successfully',
      requestId,
      status: OrgRequestStatus.REJECTED,
    };
  }
}
