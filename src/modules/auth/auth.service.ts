import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.googleClient = new OAuth2Client(googleClientId);
  }

  // ========================
  // REGISTER
  // ========================
  async register(email: string, fullName: string, password: string) {
    // kiểm tra user tồm tại
    const userExist = await this.prisma.user.findUnique({
      where: { email },
    });

    if (userExist) throw new BadRequestException('Email already exists');

    // Băm passworld
    const hash = await bcrypt.hash(password, 10);

    // Tạo user
    const user = await this.prisma.user.create({
      data: {
        email,
        fullName,
        password: hash,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });

    return this.generateToken(user);
  }

  // ========================
  // LOGIN
  // ========================
  async login(email: string, password: string) {
    // tìm user theo email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    // so sánh password
    const isMatch = await bcrypt.compare(password, user.password || '');

    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    return this.generateToken(user);
  }

  // ========================
  // LOGOUT
  // ========================
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: 'Logged out successfully' };
  }

  // ========================
  // GOOGLE LOGIN
  // ========================
  async googleLogin(idToken: string) {
    // Verify token Google
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // Lấy thông tin user từ Google
    const payload = ticket.getPayload();

    // Không có email → lỗi
    if (!payload?.email) {
      throw new UnauthorizedException('Invalid Google account');
    }

    // Tìm user theo email
    let user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    // nếu chưa có user → tạo
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: payload.email,
          fullName: payload.name || 'Google User',
          password: null,
          role: 'STUDENT',
        },
      });
    }

    return this.generateToken(user);
  }

  // ========================
  // JWT GENERATOR
  // ========================
  private async generateToken(user: { id: string; email: string; role: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    // Access token
    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      expiresIn: '15m',
    });

    // Refresh token
    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtRefreshSecret,
      expiresIn: '7d',
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  // ========================
  // REFRESH TOKEN
  // ========================
  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Validate the provided refresh token
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Security: Verify the refresh token hasn't expired
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    try {
      this.jwtService.verify(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      // Token expired - clear it from database
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Generate new tokens (token rotation)
    const tokens = await this.generateToken(user);

    return tokens;
  }

  // ========================
  // ORGANIZER REQUEST
  // ========================
  async requestOrganizer(dto: any) {
    // request làm organizer
    const { email, fullName, password, organizationName, description } = dto;

    const exist = await this.prisma.user.findUnique({ where: { email } });

    if (exist) throw new BadRequestException('Email already exists');

    const hash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        fullName,
        password: hash,
        role: 'STUDENT', // // chưa approve nên vẫn là student
      },
    });

    // tạo request
    const request = await this.prisma.organizerRequest.create({
      data: {
        userId: user.id,
        organizationName,
        description,
        status: 'PENDING',
      },
    });

    return {
      message: 'Request submitted, waiting for admin approval',
      requestId: request.id,
    };
  }
}
