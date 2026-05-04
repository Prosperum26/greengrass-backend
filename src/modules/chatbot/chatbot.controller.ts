import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('assistant')
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Public()
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: { message: string; lat?: number; lng?: number }) {
    const data = await this.chatbotService.chat(dto);
    return { success: true, data };
  }

  @Public()
  @Get('recommendations')
  async getRecommendations() {
    const data = await this.chatbotService.getRecommendations();
    return { success: true, data };
  }
}