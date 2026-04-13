import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  // Check quyền truy cập theo role
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Không set role → cho phép truy cập
    if (!roles) return true;

    // Lấy user từ request (đã được JwtAuthGuard gắn vào)
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    // Check role hợp lệ
    return roles.includes(user.role);
  }
}