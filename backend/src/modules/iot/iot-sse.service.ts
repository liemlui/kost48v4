import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface IotTelemetryEvent {
  type: 'TUYA_SYNC' | 'WATER_INGEST' | 'MANUAL_REFRESH';
  roomId: number;
  roomCode?: string;
  timestamp: string;
  message?: string;
}

/**
 * Lightweight SSE push service for IoT telemetry.
 * Each tenant room subscribes to a Subject; the polling/ingest services
 * emit events when new data arrives.
 * 
 * No Redis/Bull needed — in-memory Subjects are fine for single-instance.
 * For multi-replica production, replace with Redis pub/sub.
 */
@Injectable()
export class IotSseService {
  private readonly streams = new Map<number, Subject<IotTelemetryEvent>>();

  /** Get or create a Subject for a room */
  getStream(roomId: number): Subject<IotTelemetryEvent> {
    let stream = this.streams.get(roomId);
    if (!stream) {
      stream = new Subject<IotTelemetryEvent>();
      this.streams.set(roomId, stream);
    }
    return stream;
  }

  /** Emit a telemetry update event to a room's subscribers */
  emit(roomId: number, event: IotTelemetryEvent): void {
    const stream = this.streams.get(roomId);
    if (stream && !stream.closed) {
      stream.next(event);
    }
  }

  /** Clean up a room's stream (called when tenant disconnects) */
  closeStream(roomId: number): void {
    const stream = this.streams.get(roomId);
    if (stream) {
      stream.complete();
      this.streams.delete(roomId);
    }
  }

  /** Emit to all connected rooms (for global refresh) */
  emitAll(event: IotTelemetryEvent): void {
    this.streams.forEach((stream) => {
      if (!stream.closed) stream.next(event);
    });
  }
}
