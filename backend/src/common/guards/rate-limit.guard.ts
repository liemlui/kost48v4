import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

/**
 * Tiny in-memory rate limit guard — suitable for dev/MVP single-process.
 * Not suitable for multi-replica production without shared store (Redis/etc).
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  // Static store so all guard instances share the same bucket (DI creates new instances per request for guards)
  private static readonly store = new Map<string, BucketEntry>();

  private readonly configs: Record<string, RateLimitConfig> = {
    login: { maxRequests: 10, windowMs: 5 * 60 * 1000 },
    forgotPassword: { maxRequests: 3, windowMs: 10 * 60 * 1000 },
    resetPassword: { maxRequests: 5, windowMs: 10 * 60 * 1000 },
  };

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip ?? request.connection?.remoteAddress ?? 'unknown';
    const route = context.getHandler().name;

    const config = this.configs[route];
    if (!config) {
      return true; // no limit for unlisted routes
    }

    const key = `${route}:${ip}`;
    const now = Date.now();
    const existing = RateLimitGuard.store.get(key);

    if (!existing || now > existing.resetAt) {
      RateLimitGuard.store.set(key, { count: 1, resetAt: now + config.windowMs });
      return true;
    }

    existing.count += 1;

    if (existing.count > config.maxRequests) {
      throw new HttpException(
        'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}