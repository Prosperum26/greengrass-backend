import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  ChatbotService,
  ChatMessageDto,
  ChatResponse,
} from './chatbot.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('AI Assistant')
@Controller('assistant')
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Public()
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chat với AI Assistant',
    description:
      'Gửi tin nhắn và nhận phản hồi từ AI chatbot hỗ trợ về môi trường và nền tảng Greengrass',
  })
  async chat(
    @Body() dto: ChatMessageDto,
  ): Promise<{ success: true; data: ChatResponse }> {
    const data = await this.chatbotService.chat(dto);
    return { success: true, data };
  }

  @Public()
  @Get('recommendations')
  @ApiOperation({
    summary: 'Gợi ý sự kiện và hoạt động',
    description:
      'Nhận các gợi ý cá nhân hóa về sự kiện và hoạt động môi trường',
  })
  getRecommendations(): { success: true; data: string[] } {
    const data = this.chatbotService.getRecommendations();
    return { success: true, data };
  }
}
