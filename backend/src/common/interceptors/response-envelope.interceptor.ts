import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    return next.handle().pipe(
      map((value: any) => ({
        success: true,
        message: value?.message ?? 'Berhasil',
        data: value?.data ?? value,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
