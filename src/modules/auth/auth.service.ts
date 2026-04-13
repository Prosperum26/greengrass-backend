import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import { OAuth2Client } from "google-auth-library";

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  // ========================
  // REGISTER
  // ========================
  async register(email: string, fullName: string, password: string) {
    // kiểm tra user tồm tại
    const userExist = await this.prisma.user.findUnique({
      where: { email },
    });

    if (userExist) throw new BadRequestException("Email already exists");

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

    return this.generateToken(user.id);
  }

  // ========================
  // LOGIN
  // ========================
  async login(email: string, password: string) {
    // tìm user theo email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) throw new UnauthorizedException("Invalid credentials");

    // so sánh password
    const isMatch = await bcrypt.compare(password, user.password || "");

    if (!isMatch) throw new UnauthorizedException("Invalid credentials");

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

    return { message: "Logged out successfully" };
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
      throw new UnauthorizedException("Invalid Google account");
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
          fullName: payload.name || "Google User",
          password: null,
          role: "STUDENT",
        },
      });
    }

    return this.generateToken(user);
  }


  // ========================
  // JWT GENERATOR
  // ========================
  private async generateToken(user: any) {
    // Tạo token
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // access token
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: "15m",
    });

    // refresh token
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: "7d",
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
    // cấp lại token
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // check token hợp lệ
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    return this.generateToken(user);
  }


// ========================
// ORGANIZER REQUEST
// ========================
  async requestOrganizer(dto: any) {
    // request làm organizer
    const { email, fullName, password, organizationName, description } = dto;

    const exist = await this.prisma.user.findUnique({ where: { email } });

    if (exist) throw new Error("Email already exists");

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
        status: "PENDING",
      },
    });

    return {
      message: "Request submitted, waiting for admin approval",
      requestId: request.id,
    };
  }
}
