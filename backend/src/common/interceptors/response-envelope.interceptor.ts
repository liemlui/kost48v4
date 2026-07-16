import { CallHandler, ExecutionContext, HttpStatus, Injectable, NestInterceptor, StreamableFile } from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();
    return next.handle().pipe(
      map((value: any) => {
        // File streams must reach Nest's HTTP adapter intact. Wrapping one in a
        // JSON envelope turns its internals into JSON instead of streaming it.
        if (value instanceof StreamableFile) return value;

        // A 204 response cannot contain a body. Keep the controller's empty
        // result intact so Nest finalizes the response exactly once.
        if (res.statusCode === HttpStatus.NO_CONTENT) return undefined;

        return {
          success: true,
          message: value?.message ?? 'Berhasil',
          data: value?.data ?? value,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
