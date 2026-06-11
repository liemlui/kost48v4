import { NextFunction, Request, Response } from 'express';

/**
 * Rate limiter in-memory tanpa dependensi (audit Pass E — sebelumnya tidak ada
 * throttling sama sekali). Fixed-window per IP; cukup untuk single-instance
 * NestJS seperti deployment KOST48. Catatan: state per-proses — kalau kelak
 * berjalan multi-instance, ganti dengan store bersama (Redis).
 */
type WindowEntry = { count: number; resetAt: number };

const MAX_TRACKED_KEYS = 10_000;

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  /** Nama unik untuk membedakan bucket antar limiter. */
  name: string;
}) {
  const { windowMs, max, name } = options;
  const message =
    options.message ?? 'Terlalu banyak permintaan. Coba lagi beberapa saat lagi.';
  const buckets = new Map<string, WindowEntry>();

  const sweep = (now: number) => {
    // Lazy cleanup agar Map tidak tumbuh tanpa batas.
    if (buckets.size < MAX_TRACKED_KEYS) return;
    for (const [key, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(key);
    }
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const key = `${name}:${ip}`;

    sweep(now);

    const entry = buckets.get(key);
    if (!entry || entry.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        statusCode: 429,
        message,
        error: 'Too Many Requests',
      });
      return;
    }

    next();
  };
}
