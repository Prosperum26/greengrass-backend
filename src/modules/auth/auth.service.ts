import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
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

    if (userExist) throw new Error("Email already exists");

    // Băm passworld
    const hash = await bcrypt.hash(password, 10);

    // Tạo user
    const user = await this.prisma.user.create({
      data: {
        email,
        fullName,
        password: hash,
      },
    });

    return this.generateToken(user.id, user.email, user.role);
  }

  // ========================
  // LOGIN
  // ========================
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) throw new UnauthorizedException("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password || "");

    if (!isMatch) throw new UnauthorizedException("Invalid credentials");

    return this.generateToken(user.id, user.email, user.role);
  }

  // ========================
  // JWT GENERATOR
  // ========================
  async generateToken(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: "15m",
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: "7d",
    });

    // Lưu refresh token
    await this.prisma.user.update({
      where: { id: userId },
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
  async refresh(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.refreshToken !== token) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    return this.generateToken(user.id, user.email, user.role);
  }
}