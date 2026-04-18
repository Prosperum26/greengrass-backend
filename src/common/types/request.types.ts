/**
 * Standardized Request Types
 *
 * WHY: Centralizing request interfaces avoids duplication across controllers.
 * When the user structure changes, we update it in one place instead of
 * hunting through every controller file.
 */

import { Request } from 'express';
import { Role } from '../decorators/roles.decorator';

/**
 * Authenticated user payload from JWT token
 */
export interface AuthenticatedUser {
  sub: string; // User ID
  email: string;
  role: Role;
}

/**
 * Extended Express Request with authenticated user
 * Use this instead of defining inline interfaces in each controller
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Optional authenticated request (for public endpoints that may have auth)
 */
export interface OptionalAuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
