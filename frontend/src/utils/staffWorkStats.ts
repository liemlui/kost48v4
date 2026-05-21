import type { ActionQueueItem } from '../components/command-center';
import type { Ticket } from '../types';

export type StaffWorkDayPoint = {
  key: string;
  label: string;
  done: number;
};

export type StaffWorkStats = {
  totalToday: number;
  openCount: number;
  inProgressCount: number;
  waitingCheckCount: number;
  doneTodayCount: number;
  reportTodayCount: number;
  activeCount: number;
  completionPercent: number;
  weekDoneTotal: number;
  weekPoints: StaffWorkDayPoint[];
  firstActivityDate: Date | null;
  firstActivityLabel: string | null;
  daysRecorded: number | null;
};

function asDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function isSameDay(a: Date | null, b: Date) {
  if (!a) return false;
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function diffDays(from: Date, to = new Date()) {
  const start = startOfDay(from).getTime();
  const end = startOfDay(to).getTime();
  return Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
}

export function formatStaffDate(date: Date | null) {
  if (!date) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function makeStaffWorkStats(tickets: Ticket[], queueItems: ActionQueueItem[], userCreatedAt?: string | null): StaffWorkStats {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const activeTickets = tickets.filter((ticket) => ticket.status !== 'CLOSED');
  const openCount = tickets.filter((ticket) => ticket.status === 'OPEN').length;
  const inProgressCount = tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length;
  const waitingCheckCount = tickets.filter((ticket) => ticket.status === 'DONE').length;
  const doneTodayCount = tickets.filter((ticket) => ['DONE', 'CLOSED'].includes(ticket.status) && isSameDay(asDate(ticket.updatedAt ?? ticket.createdAt), today)).length;
  const reportTodayCount = tickets.filter((ticket) => {
    const createdAt = asDate(ticket.createdAt);
    const category = String(ticket.category ?? '').toUpperCase();
    return Boolean(createdAt && createdAt >= todayStart && createdAt <= todayEnd && ['BARANG_RUSAK', 'CEK_KAMAR', 'STOK_HABIS', 'CATATAN_METER', 'KEBERSIHAN'].includes(category));
  }).length;
  const activeCount = Math.max(activeTickets.length, queueItems.length);
  const denominator = Math.max(1, openCount + inProgressCount + waitingCheckCount + doneTodayCount);
  const completionPercent = Math.min(100, Math.round((doneTodayCount / denominator) * 100));

  const weekPoints: StaffWorkDayPoint[] = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = startOfDay(date).toISOString().slice(0, 10);
    const label = date.toLocaleDateString('id-ID', { weekday: 'short' });
    const done = tickets.filter((ticket) => ['DONE', 'CLOSED'].includes(ticket.status) && isSameDay(asDate(ticket.updatedAt ?? ticket.createdAt), date)).length;
    return { key, label, done };
  });
  const weekDoneTotal = weekPoints.reduce((sum, point) => sum + point.done, 0);

  const userDate = asDate(userCreatedAt ?? null);
  const ticketDates = tickets.map((ticket) => asDate(ticket.createdAt)).filter((date): date is Date => Boolean(date));
  const firstTicketDate = ticketDates.length ? new Date(Math.min(...ticketDates.map((date) => date.getTime()))) : null;
  const firstActivityDate = userDate ?? firstTicketDate;
  const firstActivityLabel = userDate ? 'Mulai tercatat di sistem' : firstTicketDate ? 'Aktivitas pertama tercatat' : null;
  const daysRecorded = firstActivityDate ? diffDays(firstActivityDate, today) : null;

  return {
    totalToday: activeCount,
    openCount,
    inProgressCount,
    waitingCheckCount,
    doneTodayCount,
    reportTodayCount,
    activeCount,
    completionPercent,
    weekDoneTotal,
    weekPoints,
    firstActivityDate,
    firstActivityLabel,
    daysRecorded,
  };
}

export function getStaffMotivation(stats: StaffWorkStats) {
  if (!stats.activeCount && stats.doneTodayCount) {
    return 'Tugas hari ini sudah selesai. Terima kasih, kerja rapi membuat kamar lebih nyaman.';
  }
  if (!stats.activeCount) {
    return 'Tidak ada tugas baru sekarang. Tetap siap kalau ada laporan masuk.';
  }
  if (stats.completionPercent >= 70) {
    return 'Bagus. Sebagian besar tugas sudah beres. Selesaikan sisa tugas satu per satu.';
  }
  if (stats.inProgressCount > 0) {
    return 'Lanjutkan tugas yang sedang dikerjakan dulu. Kalau ada kendala, laporkan ke admin.';
  }
  return 'Mulai dari tugas paling atas. Kerja rapi membantu penghuni merasa nyaman.';
}
