import { useCallback } from 'react';

export type ChartGranularity = 'daily' | 'weekly' | 'monthly';

type ChartRangeSelectorProps = {
  /** Current selected granularity */
  value: ChartGranularity;
  /** Called when user selects a different granularity */
  onChange: (granularity: ChartGranularity) => void;
  /** Optional additional range options (e.g., quarterly, yearly) */
  extraOptions?: { key: string; label: string }[];
  /** Compact mode for tight spaces */
  compact?: boolean;
  /** Aria label for the toggle group */
  ariaLabel?: string;
};

const DEFAULT_OPTIONS: { key: ChartGranularity; label: string }[] = [
  { key: 'daily', label: 'Hari' },
  { key: 'weekly', label: 'Minggu' },
  { key: 'monthly', label: 'Bulan' },
];

/**
 * Toggle button group for switching chart time granularity.
 * Segmented control style — only one option active at a time.
 * 
 * Usage:
 *   <ChartRangeSelector value={granularity} onChange={setGranularity} />
 *   // Pass {granularity} to your chart's data aggregation logic
 */
export default function ChartRangeSelector({
  value,
  onChange,
  extraOptions,
  compact = false,
  ariaLabel = 'Rentang waktu grafik',
}: ChartRangeSelectorProps) {
  const options = extraOptions
    ? [...DEFAULT_OPTIONS, ...extraOptions.map((o) => ({ key: o.key as ChartGranularity, label: o.label }))]
    : DEFAULT_OPTIONS;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, key: ChartGranularity) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChange(key);
      }
    },
    [onChange],
  );

  return (
    <div
      className={`chart-range-selector${compact ? ' chart-range-selector--compact' : ''}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          role="radio"
          aria-checked={value === opt.key}
          className={`chart-range-selector__btn${value === opt.key ? ' is-active' : ''}`}
          onClick={() => onChange(opt.key)}
          onKeyDown={(e) => handleKeyDown(e, opt.key)}
          tabIndex={value === opt.key ? 0 : -1}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
