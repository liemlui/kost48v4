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
  return (
    <div className="entity-badge-filter-bar" aria-label={ariaLabel}>
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
  );
}
