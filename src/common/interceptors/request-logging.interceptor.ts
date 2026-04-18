/**
 * Request Logging Interceptor
 *
 * WHY: Automatically logs all HTTP requests with:
 * 1. Request method, path, query params
 * 2. Response status code and duration
 * 3. User ID (if authenticated)
 * 4. Correlation ID for tracing
 * 5. Request/response body (in development)
 *
 * This provides complete visibility into API traffic without manual logging.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { CorrelationService } from '../correlation/correlation.service';

interface AuthenticatedRequest extends Request {
  user?: { sub: string; email: string };
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  constructor(private readonly correlationService: CorrelationService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse();

    const startTime = Date.now();
    const correlationId = this.correlationService.getId();

    // Build log context
    const logContext = {
      correlationId,
      method: request.method,
      path: request.path,
      query: Object.keys(request.query).length > 0 ? request.query : undefined,
      userId: request.user?.sub,
      userEmail: request.user?.email,
      userAgent: request.get('user-agent'),
      ip: this.getClientIp(request),
    };

    // Log request start
    this.logger.log({
      message: 'Request started',
      ...logContext,
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          // Determine log level based on status code
          const logMethod = statusCode >= 400 ? 'warn' : 'log';

          this.logger[logMethod]({
            message: 'Request completed',
            ...logContext,
            statusCode,
            duration: `${duration}ms`,
            responseSize: this.estimateSize(data),
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status ?? 500;

          this.logger.error({
            message: 'Request failed',
            ...logContext,
            statusCode,
            duration: `${duration}ms`,
            errorName: error.name,
            errorMessage: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
          });
        },
      }),
    );
  }

  /**
   * Get client IP address (handles proxies)
   */
  private getClientIp(request: Request): string {
    // X-Forwarded-For header from proxy/load balancer
    const forwardedFor = request.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    // X-Real-Ip from nginx
    const realIp = request.get('x-real-ip');
    if (realIp) {
      return realIp;
    }

    return request.ip ?? 'unknown';
  }

  /**
   * Estimate response size for logging
   */
  private estimateSize(data: unknown): string {
    if (!data) return '0B';

    const size = Buffer.byteLength(JSON.stringify(data), 'utf8');
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)}KB`;
    return `${(size / (1024 * 1024)).toFixed(2)}MB`;
  }
}
