import { useEffect, useRef, useState } from 'react';

/**
 * Hook that observes the width of a container element via ResizeObserver.
 * Returns a ref to attach and the current width (0 until first measurement).
 * Useful for conditional rendering of charts when container has layout.
 */
export function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Measure immediately in case ResizeObserver fires async
    setWidth(el.clientWidth);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
        setWidth(Math.round(w));
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
