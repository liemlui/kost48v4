import { ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { existsSync } from 'fs';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { PrismaService } from './prisma/prisma.service';
import express, { NextFunction, Request, Response } from 'express';
import { createRateLimiter } from './common/middleware/rate-limit.middleware';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: isProduction ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Room images are public marketing content — safe to serve statically.
  // Payment proofs remain protected via the dedicated authenticated endpoint.
  const roomImagesPath = join(process.cwd(), 'uploads', 'room-images');
  app.useStaticAssets(roomImagesPath, {
    prefix: '/uploads/room-images',
  });
  // Some deployments/proxies only forward /api/* to the backend. Keep a
  // public alias under /api so browser images work consistently in local/UAT.
  app.use('/api/uploads/room-images', express.static(roomImagesPath));
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  app.setGlobalPrefix('api');
  app.use(compression());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true, disableErrorMessages: isProduction }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RequestIdInterceptor(), new ResponseEnvelopeInterceptor());

  // ── CORS ──────────────────────────────────────────────────────────────────
  if (isProduction) {
    const corsOrigin = process.env.CORS_ORIGIN;
    if (!corsOrigin) {
      throw new Error('CORS_ORIGIN must be set in production');
    }
    app.enableCors({ origin: corsOrigin.split(','), credentials: true });
  } else {
    // Dev: SELALU izinkan localhost/127.0.0.1 di port mana pun (Vite bisa bergeser 5173→5174→5175
    // saat port dipakai) — meski CORS_ORIGIN di .env hanya menyebut satu port. Origin eksplisit
    // non-localhost dari CORS_ORIGIN tetap diizinkan. Produksi tetap wajib CORS_ORIGIN eksplisit (atas).
    const allowList = (process.env.CORS_ORIGIN?.split(',') ?? []).map((s) => s.trim()).filter(Boolean);
    app.enableCors({
      origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
        const ok = !origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || allowList.includes(origin);
        cb(null, ok);
      },
      credentials: true,
    });
  }

  // ── Security headers (avoid Helmet dependency) ──────────────────────────────
  app.set('trust proxy', 1);

  // ── Rate limiting (audit Pass E; in-memory, tanpa dependensi) ───────────────
  // Global longgar: lindungi dari flood kasar tanpa mengganggu pemakaian normal.
  app.use('/api', createRateLimiter({
    name: 'global',
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_GLOBAL_PER_MINUTE ?? 300),
  }));
  // Endpoint kredensial ketat: tahan brute-force login & enumerasi reset password.
  const authLimiter = createRateLimiter({
    name: 'auth',
    windowMs: 15 * 60_000,
    max: Number(process.env.RATE_LIMIT_AUTH_PER_15MIN ?? 10),
    message: 'Terlalu banyak percobaan. Tunggu 15 menit sebelum mencoba lagi.',
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'");
    next();
  });

  // ⚠️ Static /uploads removed for security — payment proof access is
  //    handled exclusively through the protected endpoint
  //    GET /api/payment-submissions/proofs/:filename.

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Kost48 Surabaya V3 API')
      .setDescription('Generated baseline backend')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ── Combined single-server: sajikan frontend build (SPA) bila tersedia ──────
  // 1 proses/port/origin (tanpa CORS). Default: <backend>/client (hasil copy frontend/dist).
  // Override path via FRONTEND_DIST_PATH. Build frontend dgn VITE_API_BASE_URL=/api (relatif).
  const frontendDir = process.env.FRONTEND_DIST_PATH || join(__dirname, '..', 'client');
  if (existsSync(join(frontendDir, 'index.html'))) {
    app.useStaticAssets(frontendDir);
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (req.path.startsWith('/api')) return next();
      if (req.path.includes('.')) return next(); // aset hilang -> biarkan 404, jangan kirim index.html
      res.sendFile(join(frontendDir, 'index.html'));
    });
    // eslint-disable-next-line no-console
    console.log('[combined] Frontend SPA disajikan dari ' + frontendDir);
  }

  await app.listen(Number(process.env.PORT || 3000));
}

bootstrap();