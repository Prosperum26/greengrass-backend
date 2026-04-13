import { Body, Controller, Post, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from "@nestjs/swagger";
import { Public } from 'src/common/decorators/public.decorater';
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { JwtAuthGuard } from "src/common/guards/jwt.guard";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  // REGISTER
  @ApiOperation({ summary: 'Register new user', description: 'Create a new STUDENT account' })
  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.fullName, dto.password);
  }

  // LOGIN
  @ApiOperation({ summary: 'Login', description: 'Authenticate user and return tokens' })
  @Public()
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // LOGOUT
  @ApiOperation({ summary: 'Logout', description: 'Invalidate refresh token' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("logout")
  logout(@Req() req) {
    return this.authService.logout(req.user.sub);
  }

  // REFRESH TOKEN
  @ApiOperation({ summary: 'Refresh tokens', description: 'Get new access and refresh tokens' })
  @Public()
  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.userId, dto.refreshToken);
  }

  // REQUEST TO BECOME ORGANIZER
  @ApiOperation({ summary: 'Request organizer role', description: 'Submit request to become an organizer' })
  @Public()
  @Post("organizer/request")
  requestOrg(@Body() dto: any) {
    return this.authService.requestOrganizer(dto);
  }
}