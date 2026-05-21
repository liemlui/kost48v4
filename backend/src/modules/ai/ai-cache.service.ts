import { Injectable } from '@nestjs/common';

type CacheHit = {
  value: unknown;
  expiresAt: number;
};

@Injectable()
export class AiCacheService {
  private readonly cache = new Map<string, CacheHit>();

  get<T = unknown>(key: string): T | null {
    const hit = this.cache.get(key);
    if (!hit) return null;
    if (hit.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return hit.value as T;
  }

  set(key: string, value: unknown, ttlMs = 24 * 60 * 60 * 1000) {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}
