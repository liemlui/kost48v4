import { useEffect, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { ActionQueueItem } from './ActionQueueTable';

type ColId = 'baru' | 'dikerjakan' | 'menunggu-cek' | 'selesai';

const COLUMNS: { id: ColId; label: string; priorities: ActionQueueItem['priority'][]; headCls: string }[] = [
  { id: 'baru',         label: 'Baru',         priorities: ['BLOCKER', 'HIGH'], headCls: 'text-danger' },
  { id: 'dikerjakan',   label: 'Dikerjakan',   priorities: ['MEDIUM'],          headCls: 'text-warning' },
  { id: 'menunggu-cek', label: 'Menunggu Cek', priorities: ['INFO'],            headCls: 'text-info' },
  { id: 'selesai',      label: 'Selesai',       priorities: [],                  headCls: 'text-success' },
];

const PRIORITY_BADGE: Record<string, string> = {
  BLOCKER: 'bg-danger',
  HIGH:    'bg-danger',
  MEDIUM:  'bg-warning text-dark',
  INFO:    'bg-info text-dark',
  SUCCESS: 'bg-success',
};

type Props = {
  items: ActionQueueItem[];
  onColumnChange?: (itemId: string | number, newColId: ColId) => void;
};

function itemDefaultCol(item: ActionQueueItem): ColId {
  const p = item.priority;
  if (p === 'BLOCKER' || p === 'HIGH') return 'baru';
  if (p === 'MEDIUM') return 'dikerjakan';
  if (p === 'INFO') return 'menunggu-cek';
  return 'baru';
}

// ── Draggable card ──────────────────────────────────────────────────────────
function KanbanCard({ item }: { item: ActionQueueItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: String(item.id), data: { item } });

  const style: React.CSSProperties = {
    background: '#fff',
    border: '1px solid var(--border-default, #e2e8f0)',
    borderRadius: 10,
    padding: '0.5rem 0.65rem',
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.6 : 1,
    transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
    zIndex: isDragging ? 100 : undefined,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} aria-label={`Kartu: ${item.subject}`}>
      <div className="d-flex align-items-center gap-1 mb-1">
        <span className={`badge ${PRIORITY_BADGE[item.priority] ?? 'bg-secondary'} e3-fs-small`}>
          {item.priority}
        </span>
        <span className="text-muted e3-fs-xs">{item.type}</span>
      </div>
      <div className="fw-semibold e3-fs-sm" style={{ lineHeight: 1.3 }}>{item.subject}</div>
      {item.timeStatusLabel ? (
        <div className="text-muted mt-1 e3-fs-xs">{item.timeStatusLabel}</div>
      ) : null}
    </div>
  );
}

// ── Droppable column ────────────────────────────────────────────────────────
function KanbanColumn({ col, items }: { col: typeof COLUMNS[0]; items: ActionQueueItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver ? 'var(--blue-50, #eff6ff)' : 'var(--bg-surface, #f8fafc)',
        borderRadius: 14,
        border: `1px solid ${isOver ? 'var(--blue-200, #bfdbfe)' : 'var(--border-default, #e2e8f0)'}`,
        padding: '0.65rem',
        minHeight: 120,
        transition: 'background 0.15s, border-color 0.15s',
      }}
      aria-label={`Kolom ${col.label}, ${items.length} item`}
    >
      <div className={`fw-bold mb-2 small ${col.headCls}`} style={{ letterSpacing: '0.03em' }}>
        {col.label}
        {items.length > 0 ? (
          <span className="badge bg-secondary ms-2" style={{ fontSize: '0.75em', fontWeight: 700 }}>{items.length}</span>
        ) : null}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.length === 0 ? (
          <p className="text-muted small mb-0 fst-italic">Kosong</p>
        ) : (
          items.map((item) => <KanbanCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

// ── Board ───────────────────────────────────────────────────────────────────
export default function ActionKanbanBoard({ items, onColumnChange }: Props) {
  const [colMap, setColMap] = useState<Map<string, ColId>>(() => {
    const m = new Map<string, ColId>();
    for (const item of items) m.set(String(item.id), itemDefaultCol(item));
    return m;
  });

  useEffect(() => {
    setColMap((prev) => {
      const next = new Map(prev);
      let changed = false;
      for (const item of items) {
        const key = String(item.id);
        if (!next.has(key)) {
          next.set(key, itemDefaultCol(item));
          changed = true;
        }
      }
      const currentIds = new Set(items.map((i) => String(i.id)));
      for (const key of next.keys()) {
        if (!currentIds.has(key)) {
          next.delete(key);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const newCol = over.id as ColId;
    const itemId = String(active.id);
    setColMap((prev) => new Map(prev).set(itemId, newCol));
    onColumnChange?.(itemId, newCol);
  }

  const colItems = new Map<ColId, ActionQueueItem[]>(COLUMNS.map((c) => [c.id, []]));
  for (const item of items) {
    const col = colMap.get(String(item.id)) ?? itemDefaultCol(item);
    colItems.get(col)?.push(item);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div
        className="action-kanban-board e3-kanban-grid"
        aria-label="Papan antrean aksi — drag kartu untuk pindah kolom, atau pakai keyboard (Space untuk ambil, panah untuk geser, Space untuk letakkan)"
      >
        {COLUMNS.map((col) => (
          <KanbanColumn key={col.id} col={col} items={colItems.get(col.id) ?? []} />
        ))}
      </div>
    </DndContext>
  );
}
