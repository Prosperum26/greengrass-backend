/**
 * Centralized HTTP Exception Filter
 *
 * WHY: Having all error responses formatted consistently means:
 * 1. Clients can rely on a predictable error structure
 * 2. We don't duplicate error formatting logic in every controller
 * 3. All errors (expected and unexpected) get logged consistently
 * 4. Sensitive error details stay on the server (not leaked to clients)
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../types';

interface HttpExceptionResponse {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: ApiErrorResponse;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as
        | string
        | HttpExceptionResponse;

      const errorMessage =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : Array.isArray(exceptionResponse.message)
            ? exceptionResponse.message.join(', ')
            : exceptionResponse.message || 'An error occurred';

      const errorCode = this.getErrorCode(status);

      errorResponse = {
        success: false,
        error: {
          code: errorCode,
          message: this.sanitizeErrorMessage(errorMessage, status),
        },
      };

      // Log client errors as warnings
      const statusCode = status as number;
      if (statusCode >= 400 && statusCode < 500) {
        this.logger.warn(
          `[${request.method}] ${request.url} - ${statusCode}: ${errorMessage}`,
        );
      } else {
        // Log server errors with full stack
        this.logger.error(
          `[${request.method}] ${request.url} - ${statusCode}: ${errorMessage}`,
          exception instanceof Error ? exception.stack : undefined,
        );
      }
    } else {
      // Unexpected errors (non-HttpException)
      const errorMsg =
        exception instanceof Error ? exception.message : 'Unknown error';

      // Log for debugging
      this.logger.error('Unexpected error:', errorMsg);

      errorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      };

      // Always log unexpected errors with full details
      this.logger.error(
        `[${request.method}] ${request.url} - Unexpected Error:`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Map HTTP status codes to error codes
   */
  private getErrorCode(status: number): string {
    const codeMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_ERROR',
      [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
    };

    return codeMap[status] || 'UNKNOWN_ERROR';
  }

  /**
   * Sanitize error messages to avoid leaking sensitive info
   */
  private sanitizeErrorMessage(message: string, status: number): string {
    const statusCode = status;
    // For 500 errors, never expose internal details to client
    if (statusCode >= 500) {
      return 'An unexpected error occurred. Please try again later.';
    }

    // For 401/403, be generic about auth failures
    if (statusCode === (HttpStatus.UNAUTHORIZED as number)) {
      return 'Authentication required';
    }

    if (statusCode === (HttpStatus.FORBIDDEN as number)) {
      return 'Access denied';
    }

    return message;
  }
}
