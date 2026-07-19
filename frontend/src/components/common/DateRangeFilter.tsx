import { useMemo, useState } from 'react';
import { Button, ButtonGroup, Form, OverlayTrigger, Popover } from 'react-bootstrap';

export type DateRangePreset = 'today' | '7d' | '30d' | '90d' | '1y' | 'custom';

export type DateRangeValue = {
  preset: DateRangePreset;
  startDate: Date | null;
  endDate: Date | null;
  label: string;
};

export type DateRangeFilterProps = {
  /** Nilai saat ini */
  value: DateRangeValue;
  /** Callback saat berubah */
  onChange: (value: DateRangeValue) => void;
  /** Preset yang tersedia (default semua) */
  availablePresets?: DateRangePreset[];
  /** Label */
  label?: string;
  /** Ukuran */
  size?: 'sm' | 'lg';
  /** Kelas CSS tambahan */
  className?: string;
};

const PRESET_CONFIG: Record<DateRangePreset, { label: string; days: number | null }> = {
  today: { label: 'Hari Ini', days: 0 },
  '7d': { label: '7 Hari', days: 7 },
  '30d': { label: '30 Hari', days: 30 },
  '90d': { label: '90 Hari', days: 90 },
  '1y': { label: '1 Tahun', days: 365 },
  custom: { label: 'Kustom', days: null },
};

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function computeRange(preset: DateRangePreset, startDate: Date | null, endDate: Date | null): { start: Date; end: Date; label: string } {
  const now = new Date();
  const end = endDate ?? now;
  let start: Date;

  if (preset === 'custom' && startDate) {
    start = startDate;
  } else {
    const days = PRESET_CONFIG[preset].days;
    if (days === 0) {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (days !== null) {
      start = new Date(now);
      start.setDate(start.getDate() - days);
    } else {
      start = new Date(now);
      start.setMonth(start.getMonth() - 1);
    }
  }

  const label = preset === 'custom'
    ? `${formatDate(start)} – ${formatDate(end)}`
    : PRESET_CONFIG[preset].label;

  return { start, end, label };
}

export default function DateRangeFilter({
  value,
  onChange,
  availablePresets = ['today', '7d', '30d', '90d', '1y', 'custom'],
  label,
  size = 'sm',
  className = '',
}: DateRangeFilterProps) {
  const [customStart, setCustomStart] = useState<string>(
    value.startDate ? formatDate(value.startDate) : ''
  );
  const [customEnd, setCustomEnd] = useState<string>(
    value.endDate ? formatDate(value.endDate) : ''
  );

  const handlePreset = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      // Open custom popover — handled by state
      return;
    }
    const { start, end, label: rangeLabel } = computeRange(preset, null, null);
    onChange({ preset, startDate: start, endDate: end, label: rangeLabel });
  };

  const handleCustomApply = () => {
    const start = customStart ? new Date(customStart) : new Date();
    const end = customEnd ? new Date(customEnd) : new Date();
    const label = `${formatDate(start)} – ${formatDate(end)}`;
    onChange({ preset: 'custom', startDate: start, endDate: end, label });
  };

  const customPopover = (
    <Popover id="date-range-custom-popover" style={{ maxWidth: 280 }}>
      <Popover.Body>
        <Form.Group className="mb-2">
          <Form.Label style={{ fontSize: 11 }}>Dari</Form.Label>
          <Form.Control type="date" size="sm" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label style={{ fontSize: 11 }}>Sampai</Form.Label>
          <Form.Control type="date" size="sm" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
        </Form.Group>
        <Button size="sm" variant="primary" onClick={handleCustomApply} disabled={!customStart}>
          Terapkan
        </Button>
      </Popover.Body>
    </Popover>
  );

  const activeLabel = value.label || PRESET_CONFIG[value.preset]?.label || 'Pilih rentang';

  return (
    <div className={`date-range-filter ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {label ? <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{label}</span> : null}
      <ButtonGroup size={size as any}>
        {availablePresets.filter((p) => p !== 'custom').map((preset) => (
          <Button
            key={preset}
            variant={value.preset === preset ? 'primary' : 'outline-secondary'}
            onClick={() => handlePreset(preset)}
            style={{ fontSize: 12 }}
          >
            {PRESET_CONFIG[preset].label}
          </Button>
        ))}
        {availablePresets.includes('custom') ? (
          <OverlayTrigger trigger="click" placement="bottom" overlay={customPopover} rootClose>
            <Button
              variant={value.preset === 'custom' ? 'primary' : 'outline-secondary'}
              style={{ fontSize: 12 }}
            >
              {value.preset === 'custom' ? activeLabel : 'Kustom'}
            </Button>
          </OverlayTrigger>
        ) : null}
      </ButtonGroup>
    </div>
  );
}

export { PRESET_CONFIG, computeRange, formatDate };