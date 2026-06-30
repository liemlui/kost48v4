import { KeyboardEvent, useRef, type ReactNode } from 'react';

// Komponen Tab segmen SEMANTIK reusable (keputusan owner: "menu yang tombolnya pilihan itu
// kan tab, kasih component yang sesuai"). Memakai kelas visual yang sudah ada
// (.staff-filter-row + .staff-filter-chip) supaya TANPA regresi tampilan, sekaligus menambah
// peran ARIA (tablist/tab + aria-selected), navigasi keyboard (←/→/Home/End), ikon, dan badge angka.

export type SegmentedTabItem<K extends string = string> = {
  key: K;
  label: string;
  icon?: ReactNode; // emoji/teks pendek atau komponen ikon (mis. lucide)
  count?: number; // badge angka opsional
  disabled?: boolean; // mis. filter kosong
};

type Props<K extends string> = {
  items: SegmentedTabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  ariaLabel?: string;
  /** 'sm' = padat (kelas .compact, dipakai filter). */
  size?: 'sm' | 'md';
  /** Kelas container dasar (default 'staff-filter-row'). Mis. 'staff-inventory-filter-row' untuk gudang. */
  rowClassName?: string;
  className?: string;
};

export default function SegmentedTabs<K extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  size = 'sm',
  rowClassName = 'staff-filter-row',
  className = '',
}: Props<K>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabledIdx = items.map((it, i) => (it.disabled && it.key !== value ? -1 : i)).filter((i) => i >= 0);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    if (enabledIdx.length === 0) return;
    e.preventDefault();
    const cur = items.findIndex((it) => it.key === value);
    const pos = Math.max(0, enabledIdx.indexOf(cur));
    let nextPos = pos;
    if (e.key === 'ArrowRight') nextPos = (pos + 1) % enabledIdx.length;
    else if (e.key === 'ArrowLeft') nextPos = (pos - 1 + enabledIdx.length) % enabledIdx.length;
    else if (e.key === 'Home') nextPos = 0;
    else if (e.key === 'End') nextPos = enabledIdx.length - 1;
    const idx = enabledIdx[nextPos];
    if (idx != null && items[idx]) {
      onChange(items[idx].key);
      refs.current[idx]?.focus();
    }
  }

  return (
    <div
      className={`segmented-tabs ${rowClassName}${size === 'sm' ? ' compact' : ''}${className ? ` ${className}` : ''}`}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {items.map((it, i) => {
        const active = it.key === value;
        const blocked = Boolean(it.disabled) && !active;
        return (
          <button
            key={it.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={`staff-filter-chip${active ? ' active' : ''}${it.disabled ? ' is-empty' : ''}`}
            onClick={() => {
              if (!blocked) onChange(it.key);
            }}
            disabled={blocked}
            aria-disabled={blocked}
          >
            {it.icon ? (
              <span aria-hidden className="segmented-tabs-icon" style={{ marginRight: 4 }}>
                {it.icon}
              </span>
            ) : null}
            <span>{it.label}</span>
            {it.count != null ? <strong>{it.count}</strong> : null}
          </button>
        );
      })}
    </div>
  );
}
