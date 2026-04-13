import { Exclude } from 'class-transformer';

enum UserRole {
  STUDENT = 'STUDENT',
  ORGANIZER = 'ORGANIZER',
  ADMIN = 'ADMIN',
}

enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  BANNED = 'BANNED',
}

export class UserResponseDto {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl: string | null;
  bio: string | null;
  totalPoints: number;
  currentStreak: number;
  createdAt: Date;
  lastActivityAt: Date;

  @Exclude()
  password?: string | null;

  @Exclude()
  refreshToken?: string | null;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
