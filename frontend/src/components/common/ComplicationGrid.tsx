import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export type ComplicationItem = {
  /** ID unik */
  id: string;
  /** Icon */
  icon?: ReactNode;
  /** Label */
  label: string;
  /** Nilai */
  value: string | number;
  /** Satuan */
  unit?: string;
  /** Warna aksen */
  color?: string;
  /** Navigasi */
  to?: string;
  /** Badge */
  badge?: string | number;
  /** Ukuran: 1x1 (default), 2x1 (lebar), 1x2 (tinggi), 2x2 (besar) */
  size?: '1x1' | '2x1' | '1x2' | '2x2';
};

export type ComplicationGridProps = {
  /** Item komplikasi */
  items: ComplicationItem[];
  /** Jumlah kolom (default 4) */
  columns?: number;
  /** Gap antar item dalam px (default 8) */
  gap?: number;
  /** Kelas CSS tambahan */
  className?: string;
};

function ComplicationCell({ item, columns }: { item: ComplicationItem; columns: number }) {
  const navigate = useNavigate();
  const isClickable = Boolean(item.to);

  const colSpan = item.size === '2x1' || item.size === '2x2' ? 2 : 1;
  const rowSpan = item.size === '1x2' || item.size === '2x2' ? 2 : 1;

  return (
    <div
      className={`complication-cell complication-cell-${item.size ?? '1x1'}`}
      style={{
        gridColumn: `span ${Math.min(colSpan, columns)}`,
        gridRow: `span ${rowSpan}`,
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        padding: item.size === '2x2' ? 16 : 12,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={() => isClickable ? navigate(item.to!) : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          navigate(item.to!);
        }
      }}
      onMouseEnter={(e) => {
        if (isClickable) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* Accent bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: item.color ?? '#3b82f6',
        opacity: 0.6,
      }} />
      {/* Badge */}
      {item.badge ? (
        <div style={{
          position: 'absolute',
          top: 6,
          right: 6,
          background: item.color ?? '#3b82f6',
          color: '#fff',
          fontSize: 9,
          fontWeight: 700,
          padding: '1px 6px',
          borderRadius: 8,
          lineHeight: 1.4,
        }}>
          {item.badge}
        </div>
      ) : null}
      {/* Content */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {item.icon ? (
          <div style={{
            width: item.size === '2x2' ? 40 : 28,
            height: item.size === '2x2' ? 40 : 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            background: `${item.color ?? '#3b82f6'}12`,
            color: item.color ?? '#3b82f6',
            fontSize: item.size === '2x2' ? 20 : 14,
            flexShrink: 0,
          }}>
            {item.icon}
          </div>
        ) : null}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.3 }}>{item.label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span style={{ fontSize: item.size === '2x2' ? 28 : 20, fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{item.value}</span>
            {item.unit ? <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{item.unit}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComplicationGrid({
  items,
  columns = 4,
  gap = 8,
  className = '',
}: ComplicationGridProps) {
  if (items.length === 0) {
    return (
      <div className={`complication-grid ${className}`} style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
        Tidak ada data
      </div>
    );
  }

  return (
    <div
      className={`complication-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
      }}
    >
      {items.map((item) => (
        <ComplicationCell key={item.id} item={item} columns={columns} />
      ))}
    </div>
  );
}