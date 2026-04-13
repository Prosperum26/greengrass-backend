import { Body, Controller, Post, UseGuards, Req } from "@nestjs/common";
import { Public } from 'src/common/decorators/public.decorater';
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "src/common/guards/jwt.guard";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  // REGISTER
  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.fullName, dto.password);
  }

  // LOGIN
  @Public()
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // LOGOUT
  @UseGuards(JwtAuthGuard)
  @Post("logout")
  logout(@Req() req) {
    return this.authService.logout(req.user.sub);
  }

  // REFRESH TOKEN
  @Public()
  @Post("refresh")
  refresh(@Body() dto: { userId: string; refreshToken: string }) {
    return this.authService.refresh(dto.userId, dto.refreshToken);
  }

  // REQUEST TO BECOME ORGANIZER
  @Public()
  @Post("organizer/request")
  requestOrg(@Body() dto: any) {
    return this.authService.requestOrganizer(dto);
  }
}