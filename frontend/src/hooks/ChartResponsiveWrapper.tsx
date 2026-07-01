import type { ReactNode } from 'react';
import { Spinner } from 'react-bootstrap';
import { useContainerWidth } from './useContainerWidth';

/**
 * Wrapper that only renders children (typically <ResponsiveContainer>)
 * AFTER its container has a positive measured width.
 * Shows a centered spinner placeholder while waiting for layout.
 * Prevents Recharts "width/height = -1" warnings on hidden/early-render tabs.
 */
export function ChartResponsiveWrapper({ children, height = 190, minWidth = 1 }: { children: ReactNode; height?: number; minWidth?: number }) {
  const { ref, width } = useContainerWidth();

  return (
    <div ref={ref} style={{ width: '100%', height }}>
      {width < minWidth ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: height }}>
          <Spinner animation="border" size="sm" role="status" aria-label="Memuat grafik…" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}
