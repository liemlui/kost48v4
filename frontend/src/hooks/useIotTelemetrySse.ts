import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type SseEventType = 'TUYA_SYNC' | 'WATER_INGEST' | 'MANUAL_REFRESH';

type SseEvent = {
  type: SseEventType;
  roomId: number;
  timestamp: string;
  message?: string;
};

/**
 * Hook: subscribe to IoT telemetry SSE stream with automatic fallback to polling.
 * - Opens EventSource to GET /iot/stream/tenant/raw
 * - On receiving telemetry events, invalidates React Query cache for IoT data
 * - Falls back to polling if SSE fails (connection error, timeout, etc.)
 * - Auto-reconnects with exponential backoff
 */
export function useIotTelemetrySse(enabled = true) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const invalidateIotQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['portal-utility-telemetry'] });
  }, [queryClient]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const url = `${baseUrl}/iot/stream/tenant/raw`;

      try {
        const es = new EventSource(url, { withCredentials: true });
        eventSourceRef.current = es;

        es.addEventListener('connected', () => {
          retryCountRef.current = 0;
        });

        es.addEventListener('telemetry', (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data) as SseEvent;
            if (data.type === 'TUYA_SYNC' || data.type === 'WATER_INGEST') {
              invalidateIotQueries();
            }
          } catch {
            // Ignore parse errors
          }
        });

        es.onerror = () => {
          es.close();
          if (cancelled) return;

          // Exponential backoff: 2s, 4s, 8s, max 30s
          const delay = Math.min(2000 * Math.pow(2, retryCountRef.current), 30_000);
          retryCountRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        };
      } catch {
        // EventSource constructor may throw in some environments
        if (!cancelled) {
          const delay = Math.min(2000 * Math.pow(2, retryCountRef.current), 30_000);
          retryCountRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [enabled, invalidateIotQueries]);
}
