import { useMemo } from 'react';
import type { Ticket, Room } from '../types';
import type { AssistantItem, ActionQueueItem, MetricChip } from '../components/command-center';
import { gradeFromScore, scoreStatus } from '../utils/scoring';

type Input = {
  tickets?: Ticket[];
  rooms?: Room[];
  pendingCheckoutRequestCount?: number;
  approvedCheckoutRequestCount?: number;
  pendingRenewCount?: number;
  pendingApprovalCount?: number;
};

function daysFromToday(targetDate: string | Date | null | undefined): number | null {
  if (!targetDate) return null;
  const date = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return Math.floor((copy.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function useOperationalStressIndex(input: Input) {
  return useMemo(() => {
    const tickets = input.tickets ?? [];
    const rooms = input.rooms ?? [];
    const openTickets = tickets.filter((item) => item.status === 'OPEN');
    const inProgressTickets = tickets.filter((item) => item.status === 'IN_PROGRESS');
    const activeTickets = [...openTickets, ...inProgressTickets];
    const oldTickets = activeTickets.filter((ticket) => {
      const days = daysFromToday(ticket.createdAt);
      return days !== null && days < -2;
    });
    const maintenanceRooms = rooms.filter((room) => room.status === 'MAINTENANCE');
    const score = Math.max(0, 100
      - oldTickets.length * 8
      - openTickets.length * 4
      - maintenanceRooms.length * 5
      - (input.approvedCheckoutRequestCount ?? 0) * 7
      - (input.pendingCheckoutRequestCount ?? 0) * 3
      - (input.pendingRenewCount ?? 0) * 2
      - (input.pendingApprovalCount ?? 0) * 3);
    const grade = gradeFromScore(score);

    const assistantItems: AssistantItem[] = [
      ...(oldTickets.length ? [{ id: 'ops-old-ticket', ruleId: 'ticket-old', entityType: 'ticket', entityId: 'summary', severity: 'HIGH' as const, title: 'Tiket lama belum selesai', message: `${oldTickets.length} tiket sudah lebih dari 2 hari. Segera kerjakan atau laporkan kalau ada kendala.`, count: oldTickets.length, source: 'Tiket', actionLabel: 'Buka tiket', actionTo: '/tickets' }] : []),
      ...((input.approvedCheckoutRequestCount ?? 0) ? [{ id: 'ops-checkout-final', ruleId: 'checkout-final', entityType: 'checkout', entityId: 'summary', severity: 'HIGH' as const, title: 'Proses keluar belum selesai', message: 'Pastikan urusan tagihan dan deposit sudah selesai sebelum kamar dilepas.', count: input.approvedCheckoutRequestCount, source: 'Proses keluar', actionLabel: 'Pantau', actionTo: '/stays?status=BOOKINGS' }] : []),
      ...(openTickets.length ? [{ id: 'ops-open-ticket', ruleId: 'ticket-open', entityType: 'ticket', entityId: 'summary', severity: 'MEDIUM' as const, title: 'Tiket baru perlu dikerjakan', message: `${openTickets.length} tiket baru perlu mulai dikerjakan.`, count: openTickets.length, source: 'Tiket', actionLabel: 'Kerjakan', actionTo: '/tickets' }] : []),
      ...(maintenanceRooms.length ? [{ id: 'ops-maintenance-room', ruleId: 'room-maintenance', entityType: 'room', entityId: 'summary', severity: 'WARNING' as const, title: 'Kamar diperbaiki perlu dicek', message: 'Pastikan kamar yang sedang diperbaiki tidak dianggap siap dihuni.', count: maintenanceRooms.length, source: 'Kamar', actionLabel: 'Cek kamar', actionTo: '/rooms' }] : []),
      ...(!activeTickets.length && !maintenanceRooms.length ? [{ id: 'ops-stable', ruleId: 'ops-stable', entityType: 'summary', entityId: 'ops', severity: 'SUCCESS' as const, title: 'Pekerjaan terlihat aman', message: 'Tidak ada tiket aktif atau kamar perbaikan dari data yang dimuat.', source: 'Sistem' }] : []),
    ];

    const queueItems: ActionQueueItem[] = [
      ...oldTickets.slice(0, 4).map((ticket) => ({ id: `old-${ticket.id}`, ruleId: 'ticket-old', entityType: 'ticket', entityId: ticket.id, priority: 'HIGH' as const, type: 'Tiket lama', subject: ticket.title || ticket.ticketNumber || `Tiket #${ticket.id}`, issue: ticket.room?.code ? `Kamar ${ticket.room.code}` : 'Perlu dicek di lapangan', recommendedAction: 'Kerjakan', actionTo: '/tickets' })),
      ...openTickets.slice(0, 4).map((ticket) => ({ id: `open-${ticket.id}`, ruleId: 'ticket-open', entityType: 'ticket', entityId: ticket.id, priority: 'MEDIUM' as const, type: 'Tiket baru', subject: ticket.title || ticket.ticketNumber || `Tiket #${ticket.id}`, issue: ticket.room?.code ? `Kamar ${ticket.room.code}` : 'Belum dikerjakan', recommendedAction: 'Kerjakan', actionTo: '/tickets' })),
      ...maintenanceRooms.slice(0, 3).map((room) => ({ id: `maintenance-${room.id}`, ruleId: 'room-maintenance', entityType: 'room', entityId: room.id, priority: 'WARNING' as const, type: 'Kamar', subject: room.code || `Kamar #${room.id}`, issue: 'Cek kondisi dan catat hasil pekerjaan.', recommendedAction: 'Cek kamar', actionTo: `/rooms/${room.id}` })),
    ];

    const metrics: MetricChip[] = [
      { id: 'ops-score', label: 'Beban kerja', value: `${Math.round(score)}/100`, helper: `Nilai ${grade}`, status: scoreStatus(score), icon: '🧠', to: '/tickets' },
      { id: 'open-ticket', label: 'Tiket baru', value: openTickets.length, helper: 'Belum dikerjakan', status: openTickets.length ? 'WARNING' : 'SUCCESS', icon: '🎫', to: '/tickets' },
      { id: 'old-ticket', label: 'Tiket lama', value: oldTickets.length, helper: '>2 hari aktif', status: oldTickets.length ? 'DANGER' : 'SUCCESS', icon: '⏱️', to: '/tickets' },
      { id: 'maintenance-room', label: 'Perbaikan', value: maintenanceRooms.length, helper: 'Kamar perlu dicek', status: maintenanceRooms.length ? 'WARNING' : 'SUCCESS', icon: '🚪', to: '/rooms' },
    ];

    return { score, grade, assistantItems, queueItems, metrics, openTickets, inProgressTickets, activeTickets, oldTickets, maintenanceRooms };
  }, [input]);
}
