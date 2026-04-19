import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export interface ChatMessageDto {
  message: string;
  history?: { role: 'user' | 'model'; text: string }[];
}

export interface ChatResponse {
  response: string;
  timestamp: Date;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  private readonly primaryModelName = 'gemini-1.5-flash';
  private readonly fallbackModelName = 'gemini-1.5-flash-latest';
  private readonly alternativeModelName = 'gemini-pro';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey !== 'your-gemini-api-key') {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: this.primaryModelName });
        this.logger.log(`Chatbot initialized with model: ${this.primaryModelName}`);
      } catch (initError) {
        this.logger.error('Failed to initialize Gemini API:', initError);
        this.genAI = undefined as any;
        this.model = undefined as any;
      }
    } else {
      this.logger.warn('GEMINI_API_KEY not configured or using placeholder value, chatbot will return mock responses');
    }
  }

  async chat(dto: ChatMessageDto): Promise<ChatResponse> {
    if (!dto.message || dto.message.trim().length === 0) {
      throw new BadRequestException('Message is required');
    }

    // Security: Sanitize user input to prevent prompt injection
    const sanitizedMessage = this.sanitizeInput(dto.message);

    // Validate message length after sanitization
    if (sanitizedMessage.length > 500) {
      throw new BadRequestException('Message too long. Max 500 characters.');
    }

    if (!this.genAI || !this.model) {
      return this.getMockResponse(sanitizedMessage);
    }

    try {
      const systemPrompt = `Bạn là trợ lý AI của Greengrass - một nền tảng kết nối cộng đồng yêu môi trường tại Việt Nam. 
Nhiệm vụ của bạn là:
1. Trả lời các câu hỏi về sự kiện môi trường, bảo vệ thiên nhiên
2. Hướng dẫn người dùng sử dụng nền tảng Greengrass
3. Cung cấp thông tin về phân loại rác, tái chế, sống xanh
4. Khuyến khích người dùng tham gia các hoạt động vì môi trường
5. Trả lời bằng tiếng Việt thân thiện, ngắn gọn (tối đa 3-4 câu)

Context: Greengrass có các tính năng:
- Đăng ký tham gia sự kiện môi trường (trồng cây, dọn rác, ...)
- Check-in bằng QR code tại sự kiện
- Tích điểm và nhận huy hiệu (Green Beginner, Eco Warrior, ...)
- Bảng xếp hạng người tham gia tích cực
- Bản đồ hiển thị các sự kiện xung quanh`;

      let chat;
      if (dto.history && dto.history.length > 0) {
        // Gemini API requires history to start with 'user' role
        // Filter out any 'model' messages at the start of history
        let validHistory = [...dto.history];
        while (validHistory.length > 0 && validHistory[0].role === 'model') {
          validHistory.shift();
        }
        
        // Also ensure no consecutive same-role messages
        const dedupedHistory: typeof validHistory = [];
        for (const msg of validHistory) {
          if (dedupedHistory.length === 0 || dedupedHistory[dedupedHistory.length - 1].role !== msg.role) {
            dedupedHistory.push(msg);
          }
        }
        
        if (dedupedHistory.length > 0) {
          const formattedHistory = dedupedHistory.map((h) => ({
            role: h.role,
            parts: [{ text: h.text }],
          }));
          chat = this.model.startChat({
            history: formattedHistory,
          });
        } else {
          chat = this.model.startChat();
        }
      } else {
        chat = this.model.startChat();
      }

      const fullPrompt = `${systemPrompt}\n\nUser: ${dto.message}`;
      const result = await chat.sendMessage(fullPrompt);
      const response = result.response.text();

      this.logger.log(`Chat response generated for message: ${dto.message.substring(0, 50)}...`);

      return {
        response: response,
        timestamp: new Date(),
      };
    } catch (error: any) {
      // Detailed error logging for debugging
      this.logger.error('Error calling Gemini API:', {
        errorMessage: error?.message,
        errorCode: error?.code,
        errorStatus: error?.status,
        errorDetails: error?.details,
        responseData: error?.response?.data,
        stack: error?.stack,
      });
      
      // Check for specific error types
      if (error?.message?.includes('API key not valid')) {
        this.logger.error('GEMINI_API_KEY is invalid or expired');
      } else if (error?.message?.includes('quota')) {
        this.logger.error('Gemini API quota exceeded');
      } else if (error?.message?.includes('model') || error?.message?.includes('not found')) {
        this.logger.error('Model gemini-1.5-flash may not be available. Try using gemini-pro or check region availability.');
      }
      
      return this.getMockResponse(dto.message);
    }
  }

  async getRecommendations(): Promise<string[]> {
    const recommendations = [
      'Tham gia sự kiện trồng cây xanh tại công viên gần bạn',
      'Tham gia chiến dịch dọn rác bãi biển cuối tuần này',
      'Học cách phân loại rác tại nguồn để bảo vệ môi trường',
      'Tham gia thử thách "7 ngày sống xanh" để nhận huy hiệu đặc biệt',
      'Mời bạn bè tham gia Greengrass để nhận điểm thưởng referral',
      'Check-in tại sự kiện để tích lũy streak và nhận thêm điểm',
    ];

    return recommendations.sort(() => 0.5 - Math.random()).slice(0, 3);
  }

  /**
   * Sanitize user input to prevent prompt injection attacks
   * Removes control characters, limits length, and escapes special sequences
   */
  private sanitizeInput(input: string): string {
    if (!input) return '';

    return (
      input
        // Remove control characters (Unicode ranges)
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        // Remove potential prompt injection markers
        .replace(/system:|assistant:|user:|human:/gi, '')
        // Remove XML/HTML tags that could be used for injection
        .replace(/<[^>]*>/g, '')
        // Normalize whitespace
        .trim()
    );
  }

  private getMockResponse(_message: string): ChatResponse {
    const responses = [
      'Cảm ơn bạn đã quan tâm đến môi trường! Bạn có thể tham gia các sự kiện trồng cây hoặc dọn rác trên nền tảng Greengrass để đóng góp cho cộng đồng.',
      'Chào bạn! Greengrass là nền tảng kết nối những người yêu môi trường. Bạn có thể đăng ký sự kiện, check-in và tích điểm để nhận các huy hiệu xanh.',
      'Để sống xanh hơn, bạn có thể bắt đầu từ những việc nhỏ: phân loại rác, hạn chế sử dụng túi nilon, và tham gia các hoạt động bảo vệ môi trường tại địa phương.',
    ];

    const randomResponse =
      responses[Math.floor(Math.random() * responses.length)];

    return {
      response: randomResponse,
      timestamp: new Date(),
    };
  }
}
