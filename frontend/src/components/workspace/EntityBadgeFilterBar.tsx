export type EntityBadgeFilter = {
  id: string;
  label: string;
  count: number;
  tone?: 'success' | 'info' | 'warning' | 'danger' | 'neutral';
};

export default function EntityBadgeFilterBar({
  filters,
  activeId,
  onChange,
  ariaLabel = 'Filter data',
}: {
  filters: EntityBadgeFilter[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  const title = ariaLabel.toLowerCase().includes('filter') ? 'Filter tampilan' : ariaLabel;
  return (
    <section className="entity-filter-shell" aria-label={ariaLabel}>
      <div className="entity-filter-head">
        <span>{title}</span>
        <small>Hanya menyaring daftar, bukan aksi utama</small>
      </div>
      <div className="entity-badge-filter-bar">
      {filters.map((filter) => (
        <button
          type="button"
          key={filter.id}
          className={`entity-badge-filter ${filter.tone ?? 'neutral'}${activeId === filter.id ? ' active' : ''}`}
          aria-pressed={activeId === filter.id}
          title={`Filter: ${filter.label}`}
          onClick={() => onChange(filter.id)}
        >
          <span>{filter.label}</span>
          <strong>{filter.count}</strong>
        </button>
      ))}
      </div>
    </section>
  );
}
