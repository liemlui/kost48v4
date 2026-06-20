import { lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ActionQueueItem } from './ActionQueueTable';

// P-02: Lazy-load FullCalendar agar tidak membebani bundle utama.
const FullCalendarBundle = lazy(async () => {
  const [{ default: FC }, { default: dayGridPlugin }, { default: interactionPlugin }] = await Promise.all([
    import('@fullcalendar/react'),
    import('@fullcalendar/daygrid'),
    import('@fullcalendar/interaction'),
  ]);

  type InnerProps = {
    events: object[];
    onEventClick: (info: { event: { id: string; extendedProps: Record<string, unknown> } }) => void;
  };

  function Inner({ events, onEventClick }: InnerProps) {
    return (
      <FC
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale="id"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
        events={events}
        eventClick={onEventClick}
        height="auto"
        dayMaxEvents={3}
        buttonText={{ today: 'Hari ini' }}
      />
    );
  }

  return { default: Inner };
});

const PRIORITY_COLOR: Record<string, string> = {
  BLOCKER: '#b91c1c',
  HIGH:    '#b45309',
  MEDIUM:  '#1d4ed8',
  INFO:    '#15803d',
  WARNING: '#b45309',
  SUCCESS: '#15803d',
  OPPORTUNITY: '#7c3aed',
};

type Props = {
  items: ActionQueueItem[];
};

export default function ActionCalendar({ items }: Props) {
  const navigate = useNavigate();

  const events = useMemo(() =>
    items
      .filter((item) => Boolean(item.deadlineIso))
      .map((item) => ({
        id: String(item.id),
        title: item.subject,
        date: item.deadlineIso,
        color: PRIORITY_COLOR[item.priority] ?? '#64748b',
        extendedProps: { actionTo: item.actionTo, item },
      })),
    [items]
  );

  function handleEventClick(info: { event: { id: string; extendedProps: Record<string, unknown> } }) {
    const to = info.event.extendedProps.actionTo as string | undefined;
    if (to) navigate(to);
  }

  return (
    <div
      className="action-calendar-fullcalendar"
      style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border-default, #e2e8f0)', padding: '0.85rem', marginBottom: '1rem' }}
    >
      <Suspense fallback={
        <div className="text-center text-muted py-4" style={{ fontSize: '0.9rem' }}>
          Memuat kalender…
        </div>
      }>
        <FullCalendarBundle events={events} onEventClick={handleEventClick} />
      </Suspense>
      {items.filter((i) => !i.deadlineIso).length > 0 && (
        <p className="text-muted small mb-0 mt-2">
          {items.filter((i) => !i.deadlineIso).length} item tanpa tanggal deadline tidak tampil di kalender.
        </p>
      )}
    </div>
  );
}
