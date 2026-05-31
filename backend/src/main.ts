import { ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { PrismaService } from './prisma/prisma.service';
import express, { NextFunction, Request, Response } from 'express';

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
    app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'], credentials: true });
  }

  // ── Security headers (avoid Helmet dependency) ──────────────────────────────
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
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

  await app.listen(Number(process.env.PORT || 3000));
}

bootstrap();