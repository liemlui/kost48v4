import { useEffect, useRef, useState } from 'react';

type AnimatedCounterProps = {
  /** Target value to animate to */
  value: number;
  /** Duration in ms (default 800) */
  duration?: number;
  /** Custom formatter. Default: comma-formatted integer. */
  formatter?: (value: number) => string;
  /** CSS class for the <span> wrapper */
  className?: string;
  /** Easing function: 'ease-out' | 'linear' (default 'ease-out') */
  easing?: 'ease-out' | 'linear';
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function linear(t: number): number {
  return t;
}

/**
 * Animates a number from 0 → value on mount and every time value changes.
 * Uses requestAnimationFrame for smooth 60fps animation.
 * Only re-animates when value changes by more than a threshold.
 */
export default function AnimatedCounter({
  value,
  duration = 800,
  formatter,
  easing = 'ease-out',
  className,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(displayValue);
  const prevTargetRef = useRef(value);

  const format = formatter ?? ((v: number) => new Intl.NumberFormat('id-ID').format(Math.round(v)));
  const easeFn = easing === 'linear' ? linear : easeOutCubic;

  useEffect(() => {
    // Skip animation if value is same as previous (within 0.01)
    if (Math.abs(value - prevTargetRef.current) < 0.01) return;
    prevTargetRef.current = value;

    // Cancel any running animation
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const startValue = displayValue;
    startValueRef.current = startValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeFn(progress);
      const current = startValue + (value - startValue) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, easing]);

  return <span className={className}>{format(displayValue)}</span>;
}
