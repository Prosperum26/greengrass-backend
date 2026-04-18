import { SetMetadata } from '@nestjs/common';

export type Role = 'STUDENT' | 'ORGANIZER' | 'ADMIN';

export const ROLES_KEY = 'roles';

/**
 * Attaches allowed roles to a route handler or controller class.
 *
 * @example
 * @Roles('ORGANIZER')
 * @Post()
 * createEvent() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
