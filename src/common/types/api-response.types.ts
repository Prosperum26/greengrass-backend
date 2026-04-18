/**
 * Standardized API Response Types
 *
 * WHY: Using consistent response formats across all endpoints makes the API
 * predictable for consumers and easier to document. It also allows for consistent
 * error handling on the client side.
 */

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Helper type for controller return types
 * Reduces boilerplate in controller method signatures
 */
export type SuccessResponse<T> = Promise<ApiSuccessResponse<T>>;
