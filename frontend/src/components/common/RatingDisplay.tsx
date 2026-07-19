import { useMemo } from 'react';

export type RatingDisplayProps = {
  /** Nilai rating (0–maxRating) */
  value: number;
  /** Rating maksimum (default 5) */
  maxRating?: number;
  /** Ukuran icon dalam px (default 18) */
  size?: number;
  /** Tampilkan nilai numerik di samping */
  showValue?: boolean;
  /** Label tambahan (misal "dari 100 ulasan") */
  label?: string;
  /** Warna aktif (default #f59e0b amber) */
  activeColor?: string;
  /** Warna tidak aktif (default #e2e8f0) */
  inactiveColor?: string;
  /** Mode: star, heart, circle (default star) */
  icon?: 'star' | 'heart' | 'circle';
  /** Allow half rating visual */
  allowHalf?: boolean;
  /** Kelas CSS tambahan */
  className?: string;
};

function StarIcon({ fill, size, activeColor }: { fill: 'full' | 'half' | 'empty'; size: number; activeColor: string }) {
  const id = useMemo(() => `star-grad-${Math.random().toString(36).slice(2, 8)}`, []);
  if (fill === 'full') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={activeColor} stroke={activeColor} strokeWidth={1}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  if (fill === 'half') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor={activeColor} />
            <stop offset="50%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={`url(#${id})`} stroke="#cbd5e1" strokeWidth={1} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={1}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function HeartIcon({ fill, size, activeColor }: { fill: 'full' | 'half' | 'empty'; size: number; activeColor: string }) {
  if (fill === 'full') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={activeColor} stroke={activeColor} strokeWidth={1}>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    );
  }
  if (fill === 'half') {
    const id = useMemo(() => `heart-grad-${Math.random().toString(36).slice(2, 8)}`, []);
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor={activeColor} />
            <stop offset="50%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={`url(#${id})`} stroke="#cbd5e1" strokeWidth={1} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={1}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function CircleIcon({ fill, size, activeColor }: { fill: 'full' | 'half' | 'empty'; size: number; activeColor: string }) {
  if (fill === 'full') {
    return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill={activeColor} /></svg>;
  }
  if (fill === 'half') {
    const id = useMemo(() => `circle-grad-${Math.random().toString(36).slice(2, 8)}`, []);
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor={activeColor} />
            <stop offset="50%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill={`url(#${id})`} stroke="#cbd5e1" strokeWidth={1} />
      </svg>
    );
  }
  return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={1} /></svg>;
}

export default function RatingDisplay({
  value,
  maxRating = 5,
  size = 18,
  showValue = true,
  label,
  activeColor = '#f59e0b',
  inactiveColor = '#e2e8f0',
  icon = 'star',
  allowHalf = true,
  className = '',
}: RatingDisplayProps) {
  const safeValue = Math.max(0, Math.min(value, maxRating));
  const items = useMemo(() => {
    const result: Array<'full' | 'half' | 'empty'> = [];
    for (let i = 1; i <= maxRating; i++) {
      if (safeValue >= i) {
        result.push('full');
      } else if (allowHalf && safeValue >= i - 0.5) {
        result.push('half');
      } else {
        result.push('empty');
      }
    }
    return result;
  }, [safeValue, maxRating, allowHalf]);

  const IconComponent = icon === 'heart' ? HeartIcon : icon === 'circle' ? CircleIcon : StarIcon;

  return (
    <div className={`rating-display ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }} role="img" aria-label={`Rating ${safeValue} dari ${maxRating}`}>
      {items.map((fill, i) => (
        <IconComponent key={`${fill}-${i}`} fill={fill} size={size} activeColor={activeColor} />
      ))}
      {showValue ? (
        <span style={{ marginLeft: 4, fontWeight: 600, fontSize: size * 0.8, color: '#1e293b' }}>
          {safeValue.toFixed(1)}
        </span>
      ) : null}
      {label ? (
        <span style={{ marginLeft: 2, fontSize: size * 0.65, color: '#64748b' }}>{label}</span>
      ) : null}
    </div>
  );
}