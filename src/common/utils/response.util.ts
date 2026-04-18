/**
 * Response Helper Utilities
 *
 * WHY: Using helper functions instead of inline object creation ensures:
 * 1. Consistent success response format across all controllers
 * 2. Type safety - TypeScript enforces the shape
 * 3. Easier to modify the format globally if needed
 * 4. Less boilerplate in controller methods
 */

import { ApiSuccessResponse, PaginatedData } from '../types';

export function success<T>(data: T, message?: string): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): ApiSuccessResponse<PaginatedData<T>> {
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    },
  };
}

export function created<T>(
  data: T,
  message = 'Resource created successfully',
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function updated<T>(
  data: T,
  message = 'Resource updated successfully',
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function deleted(
  message = 'Resource deleted successfully',
): ApiSuccessResponse<null> {
  return {
    success: true,
    data: null,
    message,
  };
}
