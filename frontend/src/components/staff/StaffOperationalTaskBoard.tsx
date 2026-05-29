import { Alert, Button, Card, Col, ProgressBar, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import type { InventoryItem, Room, Ticket } from '../../types';
import type { StaffRoutineKpiResponse, StaffRoutineTodayResponse } from '../../api/staffRoutines';
import { getInventoryHealth, getInventoryPhysicalIssueLabel, isInventoryPhysicalIssue } from '../../utils/inventoryHealth';

const activeTicketStatuses = new Set(['OPEN', 'IN_PROGRESS', 'DONE']);
const doneTicketStatuses = new Set(['DONE', 'CLOSED']);
const doneRoutineStatuses = new Set(['DONE', 'SKIPPED']);
const urgentRoutineStatuses = new Set(['NEED_HELP', 'MISSED']);

type LaneTone = 'danger' | 'warning' | 'info' | 'success' | 'neutral';

type StaffLane = {
  id: string;
  label: string;
  value: number;
  helper: string;
  tone: LaneTone;
  actionLabel: string;
  to: string;
};

type FocusItem = {
  id: string;
  title: string;
  meta: string;
  helper: string;
  tone: LaneTone;
  actionLabel: string;
  to: string;
};

type Props = {
  tickets: Ticket[];
  rooms: Room[];
  inventoryItems: InventoryItem[];
  routineToday?: StaffRoutineTodayResponse | null;
  routineKpi?: StaffRoutineKpiResponse | null;
  isLoading?: boolean;
  onRefresh?: () => void | Promise<void>;
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ticketLocation(ticket: Ticket) {
  if (ticket.room?.code) return `Kamar ${ticket.room.code}`;
  if (ticket.roomId) return `Kamar #${ticket.roomId}`;
  return 'Area umum';
}

function routineLocation(item: StaffRoutineTodayResponse['items'][number]) {
  if (item.room?.code) return `Kamar ${item.room.code}`;
  if (item.roomId) return `Kamar #${item.roomId}`;
  return 'Area umum';
}

function roomLabel(room: Room) {
  return room.code || room.name || `Kamar #${room.id}`;
}

function makeInventoryFocus(items: InventoryItem[]): FocusItem[] {
  return items
    .filter((item) => item.isActive !== false)
    .map((item) => ({ item, health: getInventoryHealth(item), physicalIssue: getInventoryPhysicalIssueLabel(item.status) }))
    .filter(({ health, physicalIssue }) => health.status !== 'GOOD' || Boolean(physicalIssue))
    .sort((a, b) => {
      const score = (entry: typeof a) => {
        if (entry.health.status === 'OUT_OF_STOCK') return 0;
        if (entry.physicalIssue) return 1;
        if (entry.health.status === 'LOW_STOCK') return 2;
        return 3;
      };
      return score(a) - score(b) || String(a.item.category ?? '').localeCompare(String(b.item.category ?? ''));
    })
    .slice(0, 4)
    .map(({ item, health, physicalIssue }) => ({
      id: `inventory-${item.id}`,
      title: item.name,
      meta: item.category || 'Gudang / umum',
      helper: physicalIssue || health.actionCopy,
      tone: health.status === 'OUT_OF_STOCK' ? 'danger' : 'warning',
      actionLabel: 'Cek Stok',
      to: '/staff-warehouse',
    }));
}

export default function StaffOperationalTaskBoard({ tickets, rooms, inventoryItems, routineToday, routineKpi, isLoading, onRefresh }: Props) {
  const navigate = useNavigate();
  const routines = routineToday?.items ?? [];
  const activeTickets = tickets.filter((ticket) => activeTicketStatuses.has(String(ticket.status ?? '').toUpperCase()));
  const todoRoutines = routines.filter((item) => !doneRoutineStatuses.has(String(item.status ?? '').toUpperCase()) && String(item.status ?? '').toUpperCase() !== 'IN_PROGRESS');
  const urgentRoutines = routines.filter((item) => urgentRoutineStatuses.has(String(item.status ?? '').toUpperCase()));
  const inProgressRoutines = routines.filter((item) => String(item.status ?? '').toUpperCase() === 'IN_PROGRESS');
  const inProgressTickets = activeTickets.filter((ticket) => String(ticket.status ?? '').toUpperCase() === 'IN_PROGRESS');
  const waitingAdminTickets = activeTickets.filter((ticket) => String(ticket.status ?? '').toUpperCase() === 'DONE');
  const openTickets = activeTickets.filter((ticket) => String(ticket.status ?? '').toUpperCase() === 'OPEN');
  const maintenanceRooms = rooms.filter((room) => ['MAINTENANCE', 'INACTIVE'].includes(String(room.status ?? '').toUpperCase()));
  const availableRooms = rooms.filter((room) => String(room.status ?? '').toUpperCase() === 'AVAILABLE');
  const lowStockItems = inventoryItems.filter((item) => {
    const health = getInventoryHealth(item);
    return item.isActive !== false && (health.status !== 'GOOD' || isInventoryPhysicalIssue(item.status));
  });
  const completedToday = numberValue(routineToday?.summary.completed) + tickets.filter((ticket) => doneTicketStatuses.has(String(ticket.status ?? '').toUpperCase())).length;
  const totalWork = Math.max(1, completedToday + todoRoutines.length + activeTickets.length);
  const progress = Math.min(100, Math.round((completedToday / totalWork) * 100));

  const lanes: StaffLane[] = [
    {
      id: 'urgent',
      label: 'Mendesak',
      value: urgentRoutines.length + lowStockItems.filter((item) => getInventoryHealth(item).status === 'OUT_OF_STOCK').length + maintenanceRooms.length,
      helper: 'Kendala checklist, stok habis, atau kamar perlu cek.',
      tone: urgentRoutines.length || maintenanceRooms.length ? 'danger' : lowStockItems.length ? 'warning' : 'success',
      actionLabel: urgentRoutines.length ? 'Lihat Checklist' : maintenanceRooms.length ? 'Cek Kamar' : 'Cek Stok',
      to: urgentRoutines.length ? '/dashboard' : maintenanceRooms.length ? '/rooms' : '/staff-warehouse',
    },
    {
      id: 'today',
      label: 'Hari Ini',
      value: todoRoutines.length + openTickets.length,
      helper: 'Checklist dan tiket yang belum mulai.',
      tone: todoRoutines.length || openTickets.length ? 'warning' : 'success',
      actionLabel: 'Mulai Tugas',
      to: '/dashboard',
    },
    {
      id: 'progress',
      label: 'Dalam Proses',
      value: inProgressRoutines.length + inProgressTickets.length,
      helper: 'Pekerjaan aktif yang perlu diselesaikan dulu.',
      tone: inProgressRoutines.length || inProgressTickets.length ? 'info' : 'neutral',
      actionLabel: 'Lanjutkan',
      to: '/dashboard',
    },
    {
      id: 'admin',
      label: 'Menunggu Admin',
      value: waitingAdminTickets.length,
      helper: 'Tiket sudah dikerjakan dan menunggu konfirmasi final.',
      tone: waitingAdminTickets.length ? 'info' : 'success',
      actionLabel: 'Lihat Tiket',
      to: '/tickets',
    },
    {
      id: 'done',
      label: 'Selesai',
      value: completedToday,
      helper: 'Bukti kerja yang sudah tercatat hari/bulan ini.',
      tone: 'success',
      actionLabel: 'Laporan Saya',
      to: '/staff-report',
    },
  ];

  const focusItems: FocusItem[] = [
    ...urgentRoutines.slice(0, 3).map((item) => ({
      id: `routine-urgent-${item.occurrenceKey}`,
      title: item.title,
      meta: routineLocation(item),
      helper: item.status === 'NEED_HELP' ? 'Kendala sudah dicatat. Lanjutkan tugas lain yang aman sambil menunggu admin.' : 'Checklist terlewat, kerjakan susulan jika masih relevan.',
      tone: item.status === 'NEED_HELP' ? 'danger' as const : 'warning' as const,
      actionLabel: item.status === 'NEED_HELP' ? 'Lihat Kendala' : 'Kerjakan Susulan',
      to: '/dashboard',
    })),
    ...inProgressRoutines.slice(0, 2).map((item) => ({
      id: `routine-progress-${item.occurrenceKey}`,
      title: item.title,
      meta: routineLocation(item),
      helper: 'Selesaikan pekerjaan aktif dulu sebelum membuka pekerjaan lain.',
      tone: 'info' as const,
      actionLabel: 'Tandai Selesai',
      to: '/dashboard',
    })),
    ...inProgressTickets.slice(0, 2).map((ticket) => ({
      id: `ticket-progress-${ticket.id}`,
      title: ticket.title || ticket.ticketNumber || `Tiket #${ticket.id}`,
      meta: ticketLocation(ticket),
      helper: 'Update progress atau selesaikan tiket jika pekerjaan fisik sudah rapi.',
      tone: 'info' as const,
      actionLabel: 'Update Tiket',
      to: '/tickets',
    })),
    ...openTickets.slice(0, 2).map((ticket) => ({
      id: `ticket-open-${ticket.id}`,
      title: ticket.title || ticket.ticketNumber || `Tiket #${ticket.id}`,
      meta: ticketLocation(ticket),
      helper: ticket.description || 'Tiket baru. Mulai dari inspeksi lokasi dan catat kondisi lapangan.',
      tone: 'warning' as const,
      actionLabel: 'Mulai Tiket',
      to: '/tickets',
    })),
    ...makeInventoryFocus(inventoryItems),
    ...maintenanceRooms.slice(0, 2).map((room) => ({
      id: `room-maintenance-${room.id}`,
      title: roomLabel(room),
      meta: 'Kamar perlu cek',
      helper: 'Cek kondisi kamar dan laporkan kendala fisik jika ada.',
      tone: 'danger' as const,
      actionLabel: 'Cek Kamar',
      to: `/rooms/${room.id}`,
    })),
  ].slice(0, 8);

  const assistantTitle = focusItems.length ? 'Fokus kerja hari ini' : 'Tidak ada tugas mendesak';
  const assistantBody = focusItems.length
    ? `Mulai dari ${focusItems[0].title}. Jangan menyentuh approval pembayaran, renew, checkout final, atau deposit; itu tetap tugas admin/owner.`
    : 'Operasional lapangan sedang aman. Tetap cek kebersihan area umum, stok harian, dan laporan tenant yang baru masuk.';

  return (
    <Card className="staff-operational-board border-0">
      <Card.Body>
        <div className="staff-operational-head">
          <div>
            <span className="staff-hero-pill">Papan Kerja Operasional</span>
            <h2>Prioritas tugas staff</h2>
            <p>{assistantBody}</p>
          </div>
          <div className="staff-operational-progress" aria-label="Progress pekerjaan staff">
            <strong>{progress}%</strong>
            <span>tercatat selesai</span>
            <ProgressBar now={progress} />
          </div>
        </div>

        <div className="staff-board-lanes" aria-label="Lane tugas staff">
          {lanes.map((lane) => (
            <button type="button" key={lane.id} className={`staff-board-lane tone-${lane.tone}`} onClick={() => navigate(lane.to)}>
              <span>{lane.label}</span>
              <strong>{lane.value}</strong>
              <small>{lane.helper}</small>
              <em>{lane.actionLabel}</em>
            </button>
          ))}
        </div>

        <Row className="g-3 mt-1">
          <Col lg={8}>
            <div className="staff-focus-panel">
              <div className="staff-focus-title-row">
                <div>
                  <strong>{assistantTitle}</strong>
                  <span>Urutan dibuat dari checklist, tiket aktif, stok, dan kamar yang perlu dicek.</span>
                </div>
                <Button variant="outline-primary" size="sm" onClick={() => onRefresh?.()} disabled={isLoading}>{isLoading ? 'Memuat...' : 'Refresh'}</Button>
              </div>
              {!focusItems.length ? (
                <div className="staff-focus-empty">
                  <strong>Operasional lapangan aman.</strong>
                  <span>Tidak ada checklist/tiket/stok yang mendesak dari data yang dimuat.</span>
                </div>
              ) : (
                <div className="staff-focus-list">
                  {focusItems.map((item, index) => (
                    <button type="button" key={item.id} className={`staff-focus-row tone-${item.tone}`} onClick={() => navigate(item.to)}>
                      <span className="staff-focus-rank">{index + 1}</span>
                      <span className="staff-focus-main">
                        <strong>{item.title}</strong>
                        <small>{item.meta} · {item.helper}</small>
                      </span>
                      <em>{item.actionLabel}</em>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Col>
          <Col lg={4}>
            <div className="staff-guardrail-card">
              <strong>Batas aman staff</strong>
              <span>Staff fokus pada pekerjaan lapangan dan laporan kondisi. Keputusan finance/lifecycle tetap di admin/owner.</span>
              <ul>
                <li>Tidak approve pembayaran.</li>
                <li>Tidak final checkout.</li>
                <li>Tidak proses deposit.</li>
                <li>Status stok habis/menipis dihitung sistem.</li>
              </ul>
              <Button variant="outline-secondary" size="sm" onClick={() => navigate('/staff-warehouse')}>Cek Gudang</Button>
            </div>
          </Col>
        </Row>

        {routineKpi?.message ? <Alert variant="info" className="mt-3 mb-0 small">{routineKpi.message}</Alert> : null}
        {availableRooms.length ? <div className="staff-room-hint mt-3">{availableRooms.length} kamar tersedia. Staff hanya cek kesiapan fisik bila diminta admin; booking/payment tetap di admin.</div> : null}
      </Card.Body>
    </Card>
  );
}
