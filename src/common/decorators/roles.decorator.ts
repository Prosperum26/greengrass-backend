import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
// gắn role cho route
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
