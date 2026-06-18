import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

const VALID_MODES = ['owner', 'admin'] as const;
type OwnerViewMode = (typeof VALID_MODES)[number];
const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/**
 * OWN-BACKEND-MODE: baca header `X-Owner-View-Mode` (owner/admin) yang dikirim frontend,
 * lampirkan ke request (`request.ownerViewMode`) agar bisa dipakai guard/audit, dan
 * catat audit log saat OWNER melakukan aksi tulis dalam mode admin (owner bertindak
 * sebagai admin). Tidak mengubah perilaku endpoint — murni observasi.
 */
@Injectable()
export class OwnerViewModeInterceptor implements NestInterceptor {
  private readonly logger = new Logger('OwnerViewMode');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const raw = String(request.headers?.['x-owner-view-mode'] ?? '').toLowerCase();
    const mode: OwnerViewMode | undefined = (VALID_MODES as readonly string[]).includes(raw)
      ? (raw as OwnerViewMode)
      : undefined;
    request.ownerViewMode = mode;

    const method = String(request.method ?? 'GET').toUpperCase();
    const user = request.user;
    if (mode === 'admin' && WRITE_METHODS.has(method) && user?.role === 'OWNER') {
      const path = request.originalUrl ?? request.url ?? '';
      this.logger.log(
        `OWNER#${user.id} aksi ${method} ${path} dalam mode ADMIN (reqId=${request.requestId ?? '-'})`,
      );
    }
    return next.handle();
  }
}
