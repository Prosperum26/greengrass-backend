import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

  private model: ReturnType<
    InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']
  >;
// simple cache
  private cache = new Map<string, string>();

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

    const genAI = new GoogleGenerativeAI(apiKey);

    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });

    this.logger.log('Chatbot ready');
  }

  // ─── Router (improved order) ───────────────────────────
  private route(message: string): Intent {
    const msg = message.toLowerCase();

    if (msg.includes('gần')) return 'get_nearby_events';
    if (msg.includes('chi tiết')) return 'get_event_detail';
    if (msg.includes('sự kiện')) return 'get_events';
    if (msg.includes('cách dùng')) return 'app_guide';
    if (msg.includes('app') || msg.includes('greengrass')) return 'app_info';
    if (msg.includes('rác') || msg.includes('môi trường')) return 'eco_knowledge';

    return 'general';
  }

  // ─── Distance ─────────────────────────────────────────
  private distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

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

    return events.find(e =>
      e.title.toLowerCase().includes(clean) ||
      clean.includes(e.title.toLowerCase())
    );
  }

  private async fetchNearbyEvents(lat: number, lng: number) {
    const events = await this.prisma.event.findMany({
      where: { status: 'UPCOMING' },
    });

    return events
      .map((e: any) => ({
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

  // Retry Gemini
  private async callGemini(prompt: string, retry = 2): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err: any) {
      if (err?.status === 429 && retry > 0) {
        this.logger.warn('Rate limit → wait 45s...');
        await new Promise(res => setTimeout(res, 45000));
        return this.callGemini(prompt, retry - 1);
      }
      throw err;
    }
  }

  // Format context (NO stringify) 
  private formatEvents(events: any[]): string {
    if (!events?.length) return 'Không có dữ liệu.';

    return events
      .map(
        (e, i) =>
          `${i + 1}. ${e.title}\n📍 ${e.location}`
      )
      .join('\n\n');
  }

  //  Prompt builder 
  private buildPrompt(message: string, tool: Intent, context: any): string {
    if (tool === 'app_info' || tool === 'app_guide' || tool === 'eco_knowledge') {
      return `${LEAFIA_SYSTEM}\n\n${APP_KNOWLEDGE[tool]}\n\nCâu hỏi: ${message}`;
    }

    if (!context && tool !== 'general') {
      return `${LEAFIA_SYSTEM}\n\nKhông có dữ liệu.\n\nCâu hỏi: ${message}`;
    }

    if (tool === 'get_events') {
      return `${LEAFIA_SYSTEM}\n\nDanh sách:\n${this.formatEvents(context)}\n\nCâu hỏi: ${message}`;
    }

    if (tool === 'get_nearby_events') {
      const list = context
        .map((e: any, i: number) =>
          `${i + 1}. ${e.title} - ${e.location} (${e.distanceKm}km)`
        )
        .join('\n');

      return `${LEAFIA_SYSTEM}\n\nGần bạn:\n${list}\n\nCâu hỏi: ${message}`;
    }

    if (tool === 'get_event_detail') {
      return `${LEAFIA_SYSTEM}\n\nChi tiết:\n${context?.title} - ${context?.location}\n\nCâu hỏi: ${message}`;
    }

    return `${LEAFIA_SYSTEM}\n\n${message}`;
  }

  //  MAIN CHAT 
  async chat(dto: ChatDto): Promise<ChatResponse> {
  const message = dto.message?.trim();
  if (!message) throw new BadRequestException('Message required');

  const tool = this.route(message);
  let context: any = null;

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
  } catch (err: any) {
    this.logger.warn(`DB error: ${err?.message}`);
  }

  // 1. Không gọi AI cho knowledge có sẵn
  if (tool === 'app_info' || tool === 'app_guide' || tool === 'eco_knowledge') {
    return {
      response: APP_KNOWLEDGE[tool],
      tool,
      timestamp: new Date(),
    };
  }

  // 2. Không gọi AI nếu đã có data rõ ràng
  if (tool === 'get_events' && context?.length) {
    return {
      response: this.formatEvents(context),
      tool,
      timestamp: new Date(),
    };
  }

  if (tool === 'get_nearby_events' && context?.length) {
    const list = context
      .map((e: any, i: number) =>
        `${i + 1}. ${e.title} - ${e.location} (${e.distanceKm}km)`
      )
      .join('\n');

    return {
      response: list,
      tool,
      timestamp: new Date(),
    };
  }

  if (tool === 'get_event_detail' && context) {
    return {
      response: `${context.title} - ${context.location}`,
      tool,
      timestamp: new Date(),
    };
  }

  const prompt = this.buildPrompt(message, tool, context);

  // CACHE
  if (this.cache.has(prompt)) {
    return {
      response: this.cache.get(prompt)!,
      tool,
      timestamp: new Date(),
    };
  }

  try {
    const text = await this.callGemini(prompt);

    this.cache.set(prompt, text);

    return {
      response: text,
      tool,
      timestamp: new Date(),
    };
  } catch (err: any) {
    this.logger.error('Gemini error', err);

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
    if (tool === 'app_guide') return 'Đăng nhập → tham gia → check-in → tích điểm.';
    if (tool === 'eco_knowledge') return 'Hãy giảm rác và trồng cây.';

    return 'Hiện hệ thống đang bận, bạn thử lại sau nhé.';
  }

  // ─── Recommendations ──────────────────────────────────
  async getRecommendations(): Promise<string[]> {
    return [
      'Tham gia sự kiện trồng cây xanh tại công viên gần bạn',
      'Tham gia chiến dịch dọn rác bãi biển cuối tuần này',
      'Học cách phân loại rác tại nguồn để bảo vệ môi trường',
    ];
  }
}