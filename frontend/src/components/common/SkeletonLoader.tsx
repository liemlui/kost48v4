import type { CSSProperties } from 'react';

export function SkeletonBlock({
  width = '100%',
  height = 16,
  className = '',
}: {
  width?: number | string;
  height?: number | string;
  className?: string;
}) {
  return <div className={`skeleton-block ${className}`.trim()} style={{ width, height } as CSSProperties} />;
}

export function StatCardSkeleton() {
  return (
    <div className="card stat-card border-0">
      <div className="card-body">
        <div className="stat-card-header">
          <SkeletonBlock width="100%" height={14} />
          <SkeletonBlock width={44} height={44} />
        </div>
        <SkeletonBlock width="100%" height={36} className="mb-2" />
        <SkeletonBlock width="100%" height={14} />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-skeleton">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div className="table-skeleton-row" key={`row-${rowIndex}`}>
          {Array.from({ length: cols }).map((__, colIndex) => (
            <SkeletonBlock key={`cell-${rowIndex}-${colIndex}`} width="100%" height={14} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="detail-hero mb-4">
      <SkeletonBlock width={180} height={24} className="mb-3" />
      <div className="metric-grid mb-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="metric-tile" key={`hero-metric-${index}`}>
            <SkeletonBlock width={90} height={12} className="mb-2" />
            <SkeletonBlock width={110} height={20} />
          </div>
        ))}
      </div>
      <SkeletonBlock width="100%" height={68} />
    </div>
  );
}

// AUDIT-OWNER (A3): kerangka halaman netral untuk ganti full-page spinner
// (Suspense fallback, auth-loading, dll). Menjaga tinggi/layout agar tak ada
// lonjakan layout shift saat konten masuk. role=status untuk pembaca layar.
//
// T-06 (audit 12 Sep 2026): versi sebelumnya (HeroSkeleton + TableSkeleton 6x4 = 47 blok)
// menghasilkan 42-84 elemen skeleton pada satu layar portal tenant, sehingga satu fase load
// nyaris seluruh layar berisi placeholder. Versi ringkas ini memakai 20 blok dengan tinggi
// minimum yang sama agar layout tetap stabil.
export function PageLoadingSkeleton({ label = 'Memuat halaman…' }: { label?: string }) {
  return (
    <div className="page-loading-skeleton p-3" role="status" aria-label={label} aria-busy="true">
      <SkeletonBlock width={200} height={24} className="mb-3" />
      <div className="page-skeleton-tiles mb-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBlock key={`tile-${index}`} width="100%" height={72} />
        ))}
      </div>
      <TableSkeleton rows={4} cols={3} />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
