/**
 * Correlation ID Middleware
 *
 * WHY: Every incoming HTTP request gets a correlation ID that:
 * 1. Can be provided by the client (X-Correlation-Id header)
 * 2. Or auto-generated if not provided
 * 3. Is included in the response header for client tracking
 * 4. Follows the request through all async operations
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CorrelationService } from './correlation.service';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  constructor(private readonly correlationService: CorrelationService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Get correlation ID from header or generate new one
    const correlationId =
      req.headers[CORRELATION_ID_HEADER] ??
      this.correlationService.generateId();

    // Store as string (header value might be string | string[])
    const id = Array.isArray(correlationId)
      ? correlationId[0]
      : correlationId.toString();

    // Run the request handler within correlation context
    this.correlationService.runWithId(() => {
      // Add correlation ID to response headers
      res.setHeader(CORRELATION_ID_HEADER, id);

      // Log the incoming request with correlation ID

      const logger = req.app.get('NestWinston') as
        | { log: (data: Record<string, unknown>) => void }
        | undefined;
      if (logger) {
        logger.log({
          message: 'Incoming request',
          method: req.method,
          path: req.path,
          correlationId: id,
          userAgent: req.get('user-agent'),
          ip: req.ip,
        });
      }

      next();
    }, id);
  }
}
