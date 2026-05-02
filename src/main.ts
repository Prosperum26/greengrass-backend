import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { GlobalExceptionFilter } from './common/filters';
import { createWinstonConfig } from './common/logger/logger.config';
import { CorrelationMiddleware } from './common/correlation/correlation.middleware';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { CorrelationService } from './common/correlation/correlation.service';

async function bootstrap() {
  // Create app with Winston logger for structured logging
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(createWinstonConfig()),
  });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const correlationService = app.get(CorrelationService);

  // Get environment configuration
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const port = configService.get<number>('PORT') ?? 3000;

  // Observability: Correlation ID tracking (must be before other middleware)
  app.use(
    new CorrelationMiddleware(correlationService).use.bind(
      new CorrelationMiddleware(correlationService),
    ),
  );

  // Security: Helmet middleware for HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false, // Disable for API-only server
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Security: Rate limiting
  const limiter: RateLimitRequestHandler = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Higher limit for local development traffic
    skip: (req: Request) => req.method === 'OPTIONS',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
      });
    },
  });
  app.use(limiter);

  // Security: Stricter rate limiting for auth endpoints
  const authLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    skipSuccessfulRequests: true, // Don't count successful logins
    skip: (req: Request) => req.method === 'OPTIONS',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: 'Too many authentication attempts, please try again later.',
      });
    },
  });
  app.use('/auth/login', authLimiter);
  app.use('/auth/register', authLimiter);

  // Security: CORS configuration
  const configuredOrigins = configService
    .get<string>('ALLOWED_ORIGINS')
    ?.split(',')
    .map((o) => o.trim()) ?? ['http://localhost:3000', 'http://localhost:5173'];

  const loopbackOriginPattern =
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (mobile apps, curl, etc)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (
        configuredOrigins.includes(origin) ||
        loopbackOriginPattern.test(origin)
      ) {
        callback(null, true);
      } else {
        logger.warn(`Blocked CORS request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Swagger configuration (only in development)
  if (nodeEnv === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Greengrass API')
      .setDescription('API documentation for Greengrass Backend')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Observability: Request/Response logging interceptor
  app.useGlobalInterceptors(new RequestLoggingInterceptor(correlationService));

  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);
  if (nodeEnv === 'development') {
    logger.log(`Swagger Docs is running on: ${await app.getUrl()}/api`);
  }
}
void bootstrap();
