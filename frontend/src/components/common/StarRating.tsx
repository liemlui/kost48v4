import { useState } from 'react';

type StarRatingProps = {
  /** Current rating value (1-5) */
  value: number;
  /** Called when user selects a rating. Omit for readonly mode. */
  onChange?: (value: number) => void;
  /** Maximum stars (default: 5) */
  max?: number;
  /** Star size in px */
  size?: 16 | 20 | 24 | 28;
  /** Aria label */
  ariaLabel?: string;
  /** Show descriptive label below stars */
  showLabel?: boolean;
  /** Custom labels per rating value */
  labels?: Record<number, string>;
  /** Color for active stars */
  activeColor?: string;
  /** Color for inactive stars */
  inactiveColor?: string;
};

const DEFAULT_LABELS: Record<number, string> = {
  1: 'Sangat Buruk',
  2: 'Buruk',
  3: 'Cukup',
  4: 'Baik',
  5: 'Sangat Baik',
};

/**
 * Reusable star rating component with 3 modes:
 * - interactive (onChange provided): click to select, hover to preview
 * - readonly (no onChange): display only
 * 
 * Used by SatisfactionSurveyCard, TenantStaffReviewPrompt, and any rating display.
 * Extracted to eliminate duplicate star rendering across the codebase.
 */
export default function StarRating({
  value,
  onChange,
  max = 5,
  size = 24,
  ariaLabel = 'Rating',
  showLabel = false,
  labels = DEFAULT_LABELS,
  activeColor = '#f59e0b',
  inactiveColor = '#cbd5e1',
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const interactive = !!onChange;
  const displayValue = hovered || value;

  return (
    <div className="star-rating" role={interactive ? 'group' : 'img'} aria-label={ariaLabel}>
      <div className="star-rating-row" style={{ gap: size >= 24 ? 4 : 2 }}>
        {Array.from({ length: max }, (_, i) => {
          const starValue = i + 1;
          const active = starValue <= displayValue;
          return (
            <button
              key={starValue}
              type="button"
              disabled={!interactive}
              onClick={() => onChange?.(starValue)}
              onMouseEnter={() => interactive && setHovered(starValue)}
              onMouseLeave={() => interactive && setHovered(0)}
              aria-label={`${starValue} dari ${max}`}
              className={`star-rating-btn${active ? ' is-active' : ''}`}
              style={{
                color: active ? activeColor : inactiveColor,
                fontSize: size,
                cursor: interactive ? 'pointer' : 'default',
                background: 'none',
                border: 'none',
                padding: 0,
                lineHeight: 1,
                transition: 'color 0.12s ease',
              }}
            >
              ★
            </button>
          );
        })}
      </div>
      {showLabel && labels[displayValue] ? (
        <div className="star-rating-label" style={{ color: activeColor, fontSize: '0.75rem', fontWeight: 600, marginTop: 4 }}>
          {labels[displayValue]}
        </div>
      ) : null}
    </div>
  );
}
