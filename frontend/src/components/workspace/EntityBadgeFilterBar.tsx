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
  const title = ariaLabel.toLowerCase().includes('filter') ? 'Filter' : ariaLabel;
  return (
    <section className="entity-filter-shell" aria-label={ariaLabel}>
      <div className="entity-filter-head">
        <span>{title}</span>
        <small>{filters.length} pilihan</small>
      </div>
      <div className="entity-badge-filter-bar">
      {filters.map((filter) => (
        <button
          type="button"
          key={filter.id}
          className={`entity-badge-filter ${filter.tone ?? 'neutral'}${activeId === filter.id ? ' active' : ''}`}
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
