import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { getHeapStatistics } from 'node:v8';
import { AppConfigService } from '../config/app-config.service';

type MemoryOperation = {
  operation: string;
  durationMs?: number;
  statusCode?: number;
};

@Injectable()
export class MemoryTelemetryService implements OnModuleInit, OnModuleDestroy {
  private interval?: NodeJS.Timeout;

  constructor(private readonly config: AppConfigService) {}

  onModuleInit(): void {
    if (!this.config.memoryTelemetryEnabled) return;

    this.emit({ operation: 'process.snapshot' });
    this.interval = setInterval(() => {
      this.emit({ operation: 'process.interval' });
    }, this.config.memoryTelemetryIntervalSeconds * 1000);
    this.interval.unref();
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
  }

  record(operation: MemoryOperation): void {
    if (!this.config.memoryTelemetryEnabled) return;
    this.emit(operation);
  }

  private emit(operation: MemoryOperation): void {
    const memory = process.memoryUsage();
    const heap = getHeapStatistics();

    console.log(JSON.stringify({
      type: 'memory-telemetry',
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime()),
      operation: operation.operation,
      ...(operation.durationMs === undefined ? {} : { durationMs: operation.durationMs }),
      ...(operation.statusCode === undefined ? {} : { statusCode: operation.statusCode }),
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      externalBytes: memory.external,
      arrayBuffersBytes: memory.arrayBuffers,
      heapSizeLimitBytes: heap.heap_size_limit,
    }));
  }
}
