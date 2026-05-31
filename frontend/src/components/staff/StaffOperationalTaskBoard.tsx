import { Button, Card } from 'react-bootstrap';
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
  actionLabel?: string;
  to?: string;
  targetId?: string;
};

type FocusItem = {
  id: string;
  title: string;
  meta: string;
  helper: string;
  tone: LaneTone;
  actionLabel?: string;
  to?: string;
  targetId?: string;
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
      actionLabel: 'Cek Gudang',
      to: '/staff-warehouse',
    }));
}

export default function StaffOperationalTaskBoard({ tickets, rooms, inventoryItems, routineToday, isLoading, onRefresh }: Props) {
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
  const lowStockItems = inventoryItems.filter((item) => {
    const health = getInventoryHealth(item);
    return item.isActive !== false && (health.status !== 'GOOD' || isInventoryPhysicalIssue(item.status));
  });
  const completedToday = numberValue(routineToday?.summary.completed) + tickets.filter((ticket) => doneTicketStatuses.has(String(ticket.status ?? '').toUpperCase())).length;
  const totalWork = Math.max(1, completedToday + todoRoutines.length + activeTickets.length);
  const progress = Math.min(100, Math.round((completedToday / totalWork) * 100));
  const urgentCount = urgentRoutines.length + lowStockItems.filter((item) => getInventoryHealth(item).status === 'OUT_OF_STOCK').length + maintenanceRooms.length;
  const todayCount = todoRoutines.length + openTickets.length;
  const progressCount = inProgressRoutines.length + inProgressTickets.length;

  const scrollToStaffSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openStaffTarget = (target: Pick<StaffLane, 'to' | 'targetId'>) => {
    if (target.targetId) {
      scrollToStaffSection(target.targetId);
      return;
    }
    if (target.to) navigate(target.to);
  };

  const lanes: StaffLane[] = [
    {
      id: 'urgent',
      label: 'Mendesak',
      value: urgentCount,
      helper: 'Kendala checklist, stok habis, atau kamar perlu dicek.',
      tone: urgentRoutines.length || maintenanceRooms.length ? 'danger' : lowStockItems.length ? 'warning' : 'success',
      actionLabel: urgentCount ? (urgentRoutines.length ? 'Buka daftar kerja' : maintenanceRooms.length ? 'Cek Kamar' : 'Cek Gudang') : undefined,
      targetId: urgentRoutines.length ? 'staff-work-queue' : undefined,
      to: !urgentRoutines.length && urgentCount ? (maintenanceRooms.length ? '/rooms' : '/staff-warehouse') : undefined,
    },
    {
      id: 'today',
      label: 'Hari Ini',
      value: todayCount,
      helper: 'Checklist dan tiket yang belum mulai.',
      tone: todoRoutines.length || openTickets.length ? 'warning' : 'success',
      actionLabel: todayCount ? 'Buka daftar kerja' : undefined,
      targetId: todayCount ? 'staff-work-queue' : undefined,
    },
    {
      id: 'progress',
      label: 'Dalam Proses',
      value: progressCount,
      helper: 'Pekerjaan aktif yang perlu diselesaikan dulu.',
      tone: inProgressRoutines.length || inProgressTickets.length ? 'info' : 'neutral',
      actionLabel: progressCount ? 'Buka daftar kerja' : undefined,
      targetId: progressCount ? 'staff-work-queue' : undefined,
    },
    {
      id: 'admin',
      label: 'Menunggu Admin',
      value: waitingAdminTickets.length,
      helper: 'Pekerjaan selesai dan menunggu pengecekan.',
      tone: waitingAdminTickets.length ? 'info' : 'success',
      actionLabel: waitingAdminTickets.length ? 'Lihat Tiket' : undefined,
      to: waitingAdminTickets.length ? '/tickets' : undefined,
    },
    {
      id: 'done',
      label: 'Selesai',
      value: completedToday,
      helper: 'Pekerjaan yang sudah tercatat hari ini.',
      tone: 'success',
      actionLabel: completedToday ? 'Laporan Saya' : undefined,
      to: completedToday ? '/staff-report' : undefined,
    },
  ];

  const focusItems: FocusItem[] = [
    ...urgentRoutines.slice(0, 3).map((item) => ({
      id: `routine-urgent-${item.occurrenceKey}`,
      title: item.title,
      meta: routineLocation(item),
      helper: item.status === 'NEED_HELP' ? 'Kendala sudah dicatat. Lanjutkan tugas lain yang aman sambil menunggu admin.' : 'Checklist terlewat, kerjakan susulan jika masih relevan.',
      tone: item.status === 'NEED_HELP' ? 'danger' as const : 'warning' as const,
      actionLabel: 'Buka daftar kerja',
      targetId: 'staff-work-queue',
    })),
    ...inProgressRoutines.slice(0, 2).map((item) => ({
      id: `routine-progress-${item.occurrenceKey}`,
      title: item.title,
      meta: routineLocation(item),
      helper: 'Selesaikan pekerjaan aktif dulu sebelum membuka pekerjaan lain.',
      tone: 'info' as const,
      actionLabel: 'Buka daftar kerja',
      targetId: 'staff-work-queue',
    })),
    ...inProgressTickets.slice(0, 2).map((ticket) => ({
      id: `ticket-progress-${ticket.id}`,
      title: ticket.title || ticket.ticketNumber || `Tiket #${ticket.id}`,
      meta: ticketLocation(ticket),
      helper: 'Update progress atau selesaikan tiket jika pekerjaan fisik sudah rapi.',
      tone: 'info' as const,
      actionLabel: 'Buka daftar kerja',
      targetId: 'staff-work-queue',
    })),
    ...openTickets.slice(0, 2).map((ticket) => ({
      id: `ticket-open-${ticket.id}`,
      title: ticket.title || ticket.ticketNumber || `Tiket #${ticket.id}`,
      meta: ticketLocation(ticket),
      helper: ticket.description || 'Tiket baru. Mulai dari inspeksi lokasi dan catat kondisi lapangan.',
      tone: 'warning' as const,
      actionLabel: 'Buka daftar kerja',
      targetId: 'staff-work-queue',
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

  const assistantTitle = focusItems.length ? 'Prioritas terdekat' : 'Operasional aman';
  const assistantBody = focusItems.length
    ? `Mulai dari ${focusItems[0].title}. Catat hasil kerja dengan singkat agar tindak lanjut berikutnya jelas.`
    : 'Tidak ada pekerjaan mendesak dari data yang dimuat. Tetap cek area umum, stok harian, dan laporan penghuni yang baru masuk.';

  return (
    <Card className="staff-operational-board border-0">
      <Card.Body>
        <div className="staff-operational-head">
          <div>
            <span className="staff-hero-pill">Papan Kerja</span>
            <h2>Ringkasan hari ini</h2>
            <p>{assistantBody}</p>
          </div>
          <div className="staff-operational-progress simple" aria-label="Progress pekerjaan">
            <strong>{progress}%</strong>
            <span>selesai hari ini</span>
          </div>
        </div>

        <div className="staff-board-lanes" aria-label="Lane tugas staff">
          {lanes.map((lane) => {
            const className = `staff-board-lane tone-${lane.tone}${lane.actionLabel ? ' is-actionable' : ' is-static'}`;
            const content = (
              <>
                <span>{lane.label}</span>
                <strong>{lane.value}</strong>
                <small>{lane.helper}</small>
                <em>{lane.actionLabel ?? 'Aman'}</em>
              </>
            );
            return lane.actionLabel ? (
              <button type="button" key={lane.id} className={className} onClick={() => openStaffTarget(lane)}>
                {content}
              </button>
            ) : (
              <div key={lane.id} className={className} aria-label={`${lane.label}: aman`}>
                {content}
              </div>
            );
          })}
        </div>

        {focusItems.length ? (
          <div className="staff-nearest-inline" aria-label="Prioritas terdekat">
            <strong>Prioritas terdekat</strong>
            <span>{focusItems[0].title} · {focusItems[0].meta}</span>
            <Button variant="outline-primary" size="sm" onClick={() => scrollToStaffSection('staff-work-queue')}>Buka daftar kerja</Button>
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}
