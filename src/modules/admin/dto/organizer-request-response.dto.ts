import { ApiProperty } from '@nestjs/swagger';
import { OrgRequestStatus } from '@prisma/client';

export class OrganizerRequestResponseDto {
  @ApiProperty({ description: 'Request ID' })
  id: string;

  @ApiProperty({ description: 'User ID who submitted the request' })
  userId: string;

  @ApiProperty({ description: 'Full name of the user' })
  fullName: string;

  @ApiProperty({ description: 'Email of the user' })
  email: string;

  @ApiProperty({ description: 'Organization name' })
  organizationName: string;

  @ApiProperty({
    description: 'Description of the organization',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ description: 'Request status', enum: OrgRequestStatus })
  status: OrgRequestStatus;

  @ApiProperty({ description: 'Request creation date' })
  createdAt: Date;
}

export class OrganizerRequestListResponseDto {
  @ApiProperty({
    description: 'List of organizer requests',
    type: [OrganizerRequestResponseDto],
  })
  items: OrganizerRequestResponseDto[];

  @ApiProperty({ description: 'Pagination info' })
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
