import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MemoryTelemetryService } from './memory-telemetry.service';

@Injectable()
export class MemoryTelemetryInterceptor implements NestInterceptor {
  constructor(private readonly telemetry: MemoryTelemetryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startedAt = process.hrtime.bigint();
    const operation = `HTTP ${request.method} ${request.route?.path ?? request.path}`;

    return next.handle().pipe(
      tap({
        next: () => this.record(operation, startedAt, response.statusCode),
        error: (error: { status?: number }) => this.record(operation, startedAt, error.status ?? 500),
      }),
    );
  }

  private record(operation: string, startedAt: bigint, statusCode: number): void {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    this.telemetry.record({ operation, durationMs: Math.round(durationMs * 100) / 100, statusCode });
  }
}
