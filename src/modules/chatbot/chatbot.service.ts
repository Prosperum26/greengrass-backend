import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Event } from '@prisma/client';
import axios, { AxiosRequestConfig } from 'axios';

// ─── Types ───────────────────────────────────────────────
type Intent =
  | 'get_events'
  | 'get_event_detail'
  | 'get_nearby_events'
  | 'app_info'
  | 'eco_knowledge'
  | 'app_guide'
  | 'general';

interface ChatDto {
  message: string;
  lat?: number;
  lng?: number;
  userId?: string;
}

interface NearbyEvent {
  title: string;
  location: string;
  distanceKm: string;
}

interface OpenRouterError {
  message: string;
  code?: number;
}

interface OpenRouterMessage {
  role: string;
  content: string;
}

interface OpenRouterChoice {
  message?: {
    content?: string;
  };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  error?: OpenRouterError;
}

type ChatContext = Event[] | NearbyEvent[] | Event | null | undefined;

export interface ChatResponse {
  response: string;
  tool: Intent;
  timestamp: Date;
}

// ─── System prompt ───────────────────────────────────────
const LEAFIA_SYSTEM = `
Bạn là Leafia 🌱 - trợ lý của GreenGrass.

QUY TẮC TUYỆT ĐỐI:
- Trả lời hoàn toàn bằng tiếng Việt
- Chỉ dùng plain text + emoji, KHÔNG dùng markdown (không #, không **, không backtick)
- Câu trả lời ngắn gọn, tối đa 8 dòng
- Với danh sách: mỗi mục 1 dòng, dùng số thứ tự hoặc emoji
- KHÔNG giải thích dài dòng
- Nếu câu hỏi hoàn toàn ngoài chủ đề (thể thao, thời tiết, v.v.): trả lời ngắn 1-2 câu rồi gợi ý 1 chủ đề liên quan GreenGrass
`.trim();

// ─── Static knowledge ────────────────────────────────────
const APP_KNOWLEDGE = {
  app_info: `GreenGrass là app cộng đồng xanh, tham gia sự kiện để tích điểm và đổi quà.`,

  app_guide: `
Cách dùng GreenGrass:
1. Đăng ký / đăng nhập tài khoản
2. Xem danh sách sự kiện sắp tới
3. Đăng ký tham gia sự kiện yêu thích
4. Check-in khi đến nơi để nhận điểm
5. Xem điểm tích lũy trong hồ sơ cá nhân

Tính năng khác:
- Tìm sự kiện gần vị trí hiện tại
- Xem lịch sử tham gia
`.trim(),

  eco_knowledge: `
Kiến thức môi trường cơ bản (dùng khi user hỏi):
- Tái chế: giấy, nhựa, kim loại, thủy tinh đều có thể tái chế nếu phân loại đúng
- Phân loại rác: rác hữu cơ (thức ăn thừa), rác vô cơ (nhựa, thủy tinh), rác nguy hại (pin, thuốc)
- Trồng cây: giảm CO2, cải thiện không khí, chống xói mòn
- Tiết kiệm nước: khóa vòi khi không dùng, dùng vòi tiết kiệm
- Giảm rác nhựa: mang túi vải, dùng bình nước cá nhân, tránh đồ nhựa dùng 1 lần
`.trim(),
};

// ─── Service ──────────────────────────────────────────────
@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly OPENROUTER_URL =
    'https://openrouter.ai/api/v1/chat/completions';
  // Use openrouter/auto to automatically select an available free model
  private readonly OPENROUTER_MODEL = 'openrouter/auto';

  // simple cache
  private cache = new Map<string, string>();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.logger.log('Chatbot ready (OpenRouter API)');
  }

  // ─── Router (improved order) ───────────────────────────
  private route(message: string): Intent {
    const msg = message.toLowerCase();

    if (msg.includes('gần')) return 'get_nearby_events';
    if (msg.includes('chi tiết')) return 'get_event_detail';
    if (msg.includes('sự kiện')) return 'get_events';
    if (msg.includes('cách dùng')) return 'app_guide';
    if (msg.includes('app') || msg.includes('greengrass')) return 'app_info';
    if (msg.includes('rác') || msg.includes('môi trường'))
      return 'eco_knowledge';

    return 'general';
  }

  // ─── Distance ─────────────────────────────────────────
  private distance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ─── Fetchers ─────────────────────────────────────────
  private async fetchEventList() {
    return this.prisma.event.findMany({
      where: { status: 'UPCOMING' },
      take: 5,
      orderBy: { startTime: 'asc' },
    });
  }

  private async fetchEventDetail(message: string) {
    const events = await this.prisma.event.findMany({
      where: { status: 'UPCOMING' },
    });

    const clean = message
      .toLowerCase()
      .replace(/chi tiết|thông tin|về|sự kiện/g, '')
      .trim();

    return events.find(
      (e) =>
        e.title.toLowerCase().includes(clean) ||
        clean.includes(e.title.toLowerCase()),
    );
  }

  private async fetchNearbyEvents(
    lat: number,
    lng: number,
  ): Promise<NearbyEvent[]> {
    const events = await this.prisma.event.findMany({
      where: { status: 'UPCOMING' },
    });

    return events
      .map((e: Event) => ({
        title: e.title,
        location: e.location,
        distanceKm: this.distance(
          lat,
          lng,
          e.latitude ?? 0,
          e.longitude ?? 0,
        ).toFixed(1),
      }))
      .sort((a, b) => Number(a.distanceKm) - Number(b.distanceKm))
      .slice(0, 5);
  }

  // Call OpenRouter AI API with retry logic
  private async callAI(
    prompt: string,
    systemMessage?: string,
    retry = 2,
  ): Promise<string> {
    const apiKey = this.config.get<string>('OPENROUTER_API_KEY');
    if (!apiKey) {
      throw new Error('Missing OPENROUTER_API_KEY environment variable');
    }

    const config: AxiosRequestConfig = {
      timeout: 10000, // 10 seconds timeout
      validateStatus: () => true, // Don't throw on any status code
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-OpenRouter-Title': 'GreenGrass',
      },
    };

    // Build messages array with proper system/user separation
    const messages: OpenRouterMessage[] = [];
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    messages.push({ role: 'user', content: prompt });

    const body = {
      model: this.OPENROUTER_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 500,
      top_p: 1,
    };

    try {
      this.logger.debug(
        `Calling OpenRouter with model: ${this.OPENROUTER_MODEL}`,
      );
      this.logger.debug(`Request body: ${JSON.stringify(body)}`);

      const response = await axios.post<OpenRouterResponse>(
        this.OPENROUTER_URL,
        body,
        config,
      );

      // Check for non-2xx status codes
      if (response.status >= 400) {
        const errorData = response.data;
        this.logger.error(`OpenRouter returned ${response.status}:`, errorData);
        throw new Error(
          `OpenRouter API error (${response.status}): ${JSON.stringify(errorData)}`,
        );
      }

      // Handle error response from OpenRouter
      if (response.data?.error) {
        throw new Error(
          `OpenRouter API error: ${response.data.error.message || JSON.stringify(response.data.error)}`,
        );
      }

      // Extract AI response from OpenAI-compatible format
      const content = response.data?.choices?.[0]?.message?.content;

      if (!content || typeof content !== 'string') {
        throw new Error('Invalid response structure from OpenRouter API');
      }

      return content.trim();
    } catch (err: unknown) {
      let errorMsg = 'Unknown error';

      if (err instanceof Error) {
        errorMsg = err.message;
      }

      this.logger.warn(`OpenRouter API error: ${errorMsg}`);

      // Retry up to 2 times (except for 401/403 auth errors)
      if (retry > 0 && !errorMsg.includes('401') && !errorMsg.includes('403')) {
        this.logger.log(
          `Retrying OpenRouter API call... (${retry} attempts left)`,
        );
        return this.callAI(prompt, systemMessage, retry - 1);
      }

      // Log final error but don't crash
      this.logger.error('OpenRouter API failed after retries', errorMsg);
      throw new Error('AI service unavailable');
    }
  }

  // Format context (NO stringify)
  private formatEvents(events: Event[]): string {
    if (!events?.length) return 'Không có dữ liệu.';

    return events
      .map((e, i) => `${i + 1}. ${e.title}\n📍 ${e.location}`)
      .join('\n\n');
  }

  //  Prompt builder - returns [systemMessage, userPrompt]
  private buildPrompt(
    message: string,
    tool: Intent,
    context: ChatContext,
  ): [string, string] {
    const systemMsg = LEAFIA_SYSTEM;
    let userPrompt = '';

    if (
      tool === 'app_info' ||
      tool === 'app_guide' ||
      tool === 'eco_knowledge'
    ) {
      userPrompt = `${APP_KNOWLEDGE[tool]}\n\nCâu hỏi: ${message}`;
    } else if (!context && tool !== 'general') {
      userPrompt = `Không có dữ liệu.\n\nCâu hỏi: ${message}`;
    } else if (tool === 'get_events') {
      const events = context as Event[];
      userPrompt = `Danh sách:\n${this.formatEvents(events)}\n\nCâu hỏi: ${message}`;
    } else if (tool === 'get_nearby_events') {
      const nearbyEvents = context as NearbyEvent[];
      const list = nearbyEvents
        .map(
          (e: NearbyEvent, i: number) =>
            `${i + 1}. ${e.title} - ${e.location} (${e.distanceKm}km)`,
        )
        .join('\n');
      userPrompt = `Gần bạn:\n${list}\n\nCâu hỏi: ${message}`;
    } else if (tool === 'get_event_detail') {
      const event = context as Event;
      userPrompt = `Chi tiết:\n${event?.title} - ${event?.location}\n\nCâu hỏi: ${message}`;
    } else {
      userPrompt = message;
    }

    return [systemMsg, userPrompt];
  }

  //  MAIN CHAT
  async chat(dto: ChatDto): Promise<ChatResponse> {
    const message = dto.message?.trim();
    if (!message) throw new BadRequestException('Message required');

    const tool = this.route(message);
    let context: ChatContext = null;

    try {
      if (tool === 'get_events') {
        context = await this.fetchEventList();
      }

      if (tool === 'get_event_detail') {
        context = await this.fetchEventDetail(message);
      }

      if (tool === 'get_nearby_events') {
        if (!dto.lat || !dto.lng) {
          return {
            response: 'Bạn cần bật vị trí để tìm sự kiện gần bạn.',
            tool,
            timestamp: new Date(),
          };
        }
        context = await this.fetchNearbyEvents(dto.lat, dto.lng);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`DB error: ${errorMsg}`);
    }

    // 1. Không gọi AI cho knowledge có sẵn
    if (
      tool === 'app_info' ||
      tool === 'app_guide' ||
      tool === 'eco_knowledge'
    ) {
      return {
        response: APP_KNOWLEDGE[tool],
        tool,
        timestamp: new Date(),
      };
    }

    // 2. Không gọi AI nếu đã có data rõ ràng
    if (tool === 'get_events' && Array.isArray(context) && context.length > 0) {
      return {
        response: this.formatEvents(context as Event[]),
        tool,
        timestamp: new Date(),
      };
    }

    if (
      tool === 'get_nearby_events' &&
      Array.isArray(context) &&
      context.length > 0
    ) {
      const nearbyEvents = context as NearbyEvent[];
      const list = nearbyEvents
        .map(
          (e: NearbyEvent, i: number) =>
            `${i + 1}. ${e.title} - ${e.location} (${e.distanceKm}km)`,
        )
        .join('\n');

      return {
        response: list,
        tool,
        timestamp: new Date(),
      };
    }

    if (tool === 'get_event_detail' && context && !Array.isArray(context)) {
      const event = context;
      return {
        response: `${event.title} - ${event.location}`,
        tool,
        timestamp: new Date(),
      };
    }

    const [systemMsg, userPrompt] = this.buildPrompt(message, tool, context);

    // CACHE
    if (this.cache.has(userPrompt)) {
      return {
        response: this.cache.get(userPrompt)!,
        tool,
        timestamp: new Date(),
      };
    }

    try {
      const text = await this.callAI(userPrompt, systemMsg);

      this.cache.set(userPrompt, text);

      return {
        response: text,
        tool,
        timestamp: new Date(),
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error('AI API error', errorMsg);

      return {
        response: this.buildFallback(tool),
        tool,
        timestamp: new Date(),
      };
    }
  }

  //  Fallback
  private buildFallback(tool: Intent): string {
    if (tool === 'app_info') return 'GreenGrass là app sống xanh.';
    if (tool === 'app_guide')
      return 'Đăng nhập → tham gia → check-in → tích điểm.';
    if (tool === 'eco_knowledge') return 'Hãy giảm rác và trồng cây.';

    return 'Hiện hệ thống đang bận, bạn thử lại sau nhé.';
  }

  // ─── Recommendations ──────────────────────────────────
  getRecommendations(): string[] {
    return [
      'Tham gia sự kiện trồng cây xanh tại công viên gần bạn',
      'Tham gia chiến dịch dọn rác bãi biển cuối tuần này',
      'Học cách phân loại rác tại nguồn để bảo vệ môi trường',
    ];
  }
}
