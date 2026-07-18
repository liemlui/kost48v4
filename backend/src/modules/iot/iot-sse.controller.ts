import { Controller, Get, Param, Req, Res, Sse } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Observable, map } from 'rxjs';
import { IotSseService } from './iot-sse.service';
import { IotService } from './iot.service';

/**
 * Server-Sent Events endpoint for tenant IoT telemetry.
 * Tenants subscribe to receive live updates when IoT data changes
 * (Tuya sync, water meter ingest, etc.), avoiding constant polling.
 * 
 * Falls back gracefully: if SSE fails, frontend keeps 60s polling.
 */
@ApiTags('iot')
@Controller('iot/stream')
export class IotSseController {
  constructor(
    private readonly sse: IotSseService,
    private readonly iot: IotService,
  ) {}

  /**
   * GET /iot/stream/tenant
   * Requires JWT auth (handled by global guard).
   * Returns SSE stream of telemetry events for the tenant's room.
   * 
   * Initial message: current telemetry snapshot.
   * Subsequent messages: emitted when new IoT data arrives.
   * Ping every 30s to keep connection alive.
   */
  @Sse('tenant')
  @ApiOperation({ summary: 'SSE stream telemetry meter kamar tenant — real-time' })
  streamTenantTelemetry(): Observable<MessageEvent> {
    // Note: NestJS @Sse doesn't easily support @CurrentUser() decorator.
    // Instead, auth is handled by global JWT guard on the controller,
    // and we'll use a different approach — a regular GET endpoint
    // that returns text/event-stream.
    // For now, return empty observable — see streamTenantTelemetryRaw below.
    return new Observable();
  }

  /**
   * GET /iot/stream/tenant/raw
   * Raw SSE implementation using Response object.
   * Supports JWT auth extraction via middleware.
   */
  @Get('tenant/raw')
  @ApiOperation({ summary: 'SSE stream (raw) telemetry meter kamar tenant' })
  async streamTenantRaw(@Req() req: Request, @Res() res: Response) {
    // Extract tenant info from JWT (set by global auth guard)
    const user = (req as any).user;
    if (!user?.tenantId) {
      res.status(401).json({ message: 'Unauthorized — tenant login required' });
      return;
    }

    // Get the tenant's active stay roomId
    let roomId: number | null = null;
    try {
      roomId = await this.iot.getTenantActiveRoomId(user.tenantId);
    } catch {
      // Tenant may not have active stay — still allow connection but no events
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering
    });

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ roomId, timestamp: new Date().toISOString() })}\n\n`);

    // Subscribe to room events
    let subscription: any = null;
    if (roomId) {
      const stream = this.sse.getStream(roomId);
      subscription = stream.subscribe({
        next: (event) => {
          res.write(`event: telemetry\ndata: ${JSON.stringify(event)}\n\n`);
        },
        error: () => {
          res.end();
        },
      });
    }

    // Keep-alive ping every 30 seconds
    const pingInterval = setInterval(() => {
      res.write(`:ping ${new Date().toISOString()}\n\n`);
    }, 30_000);

    // Cleanup on client disconnect
    req.on('close', () => {
      clearInterval(pingInterval);
      if (subscription) {
        subscription.unsubscribe();
      }
      if (roomId) {
        this.sse.closeStream(roomId);
      }
    });
  }
}
