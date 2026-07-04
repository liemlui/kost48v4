import { useMemo } from 'react';
import type { Invoice, PaymentSubmission, RenewRequest, Room } from '../types';
import type { AssistantItem, ActionQueueItem, MetricChip } from '../components/command-center';
import { gradeFromScore, safePercent, scoreStatus, type ScoreGrade } from '../utils/scoring';
import { businessHealthHeadline } from '../utils/smartCopy';
import { dedupeCommandItems } from '../utils/commandCenterDedup';

type BusinessHealthInput = {
  invoices: Invoice[];
  rooms: Room[];
  paymentSubmissions?: PaymentSubmission[];
  pendingPaymentReviewCount?: number;
  pendingRenewCount?: number;
  pendingCheckoutRequestCount?: number;
  approvedCheckoutRequestCount?: number;
  totalExpenseRupiah?: number;
};

export type BusinessHealthScore = {
  score: number;
  grade: ScoreGrade;
  headline: string;
  drivers: string[];
  assistantItems: AssistantItem[];
  queueItems: ActionQueueItem[];
  metrics: MetricChip[];
  collectionRatio: number;
  occupancyRate: number;
  outstandingRupiah: number;
  overdueCount: number;
  collectedRupiah: number;
  billedRupiah: number;
};

function isOpenInvoice(invoice: Invoice) {
  return !['PAID', 'CANCELLED'].includes(invoice.status);
}

function isOverdue(invoice: Invoice) {
  if (!invoice.dueDate || ['PAID', 'CANCELLED'].includes(invoice.status)) return false;
  const dueDate = new Date(invoice.dueDate);
  if (Number.isNaN(dueDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.round(value));
}

function formatDate(dateValue?: string | Date | null) {
  if (!dateValue) return '-';
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function useBusinessHealthScore(input: BusinessHealthInput): BusinessHealthScore {
  return useMemo(() => {
    const invoices = input.invoices ?? [];
    const rooms = input.rooms ?? [];
    const billedRupiah = invoices.filter((invoice) => ['ISSUED', 'PARTIAL', 'PAID'].includes(invoice.status)).reduce((sum, invoice) => sum + Number(invoice.totalAmountRupiah ?? 0), 0);
    const collectedRupiah = invoices.filter((invoice) => invoice.status === 'PAID').reduce((sum, invoice) => sum + Number(invoice.totalAmountRupiah ?? 0), 0);
    const openInvoices = invoices.filter(isOpenInvoice);
    const outstandingRupiah = openInvoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.totalAmountRupiah ?? 0) - Number(invoice.paidAmountRupiah ?? 0)), 0);
    const overdue = invoices.filter(isOverdue);
    const occupiedRooms = rooms.filter((room) => room.status === 'OCCUPIED').length;
    const availableRooms = rooms.filter((room) => room.status === 'AVAILABLE').length;
    const collectionRatio = safePercent(collectedRupiah, billedRupiah);
    const occupancyRate = safePercent(occupiedRooms, rooms.length);
    const pendingPaymentReviewCount = input.pendingPaymentReviewCount ?? input.paymentSubmissions?.filter((item) => item.status === 'PENDING_REVIEW').length ?? 0;
    const pendingRenewCount = input.pendingRenewCount ?? 0;
    const pendingCheckoutRequestCount = input.pendingCheckoutRequestCount ?? 0;
    const approvedCheckoutRequestCount = input.approvedCheckoutRequestCount ?? 0;
    const totalExpenseRupiah = input.totalExpenseRupiah ?? 0;

    const score = Math.max(0, Math.min(100,
      100
      - overdue.length * 6
      - pendingPaymentReviewCount * 5
      - approvedCheckoutRequestCount * 7
      - pendingCheckoutRequestCount * 3
      - pendingRenewCount * 2
      - (collectionRatio < 80 ? 12 : 0)
      - (occupancyRate < 70 ? 10 : 0)
    ));
    const grade = gradeFromScore(score);

    const assistantItems: AssistantItem[] = dedupeCommandItems([
      ...(pendingPaymentReviewCount ? [{ id: 'owner-payment-health', ruleId: 'payment-review', entityType: 'payment-submission', entityId: 'summary', dedupKey: 'payment-review|summary|/payment-submissions/review', severity: 'HIGH' as const, title: 'Cashflow tertahan di review pembayaran', message: `${pendingPaymentReviewCount} bukti pembayaran menunggu keputusan. Antrean menampilkan detail yang perlu diverifikasi.`, count: pendingPaymentReviewCount, source: 'Payment review', actionLabel: 'Buka antrean', actionTo: '/payment-submissions/review' }] : []),
      ...(overdue.length ? [{ id: 'owner-overdue-health', ruleId: 'invoice-overdue', entityType: 'invoice', entityId: 'summary', dedupKey: 'invoice-overdue|summary|/invoices', severity: 'HIGH' as const, title: 'Collection risk naik', message: `${overdue.length} tagihan melewati jatuh tempo. Fokuskan follow-up pada nominal dan umur tunggakan terbesar.`, count: overdue.length, source: 'Invoices', actionLabel: 'Lihat tagihan', actionTo: '/invoices' }] : []),
      ...(approvedCheckoutRequestCount ? [{ id: 'owner-checkout-health', ruleId: 'checkout-final', entityType: 'checkout', entityId: 'summary', dedupKey: 'checkout-final|summary|/stays?status=BOOKINGS', severity: 'HIGH' as const, title: 'Keluar disetujui belum final', message: 'Pastikan tagihan dan deposit clear sebelum kamar dilepas kembali.', count: approvedCheckoutRequestCount, source: 'Keluar', actionLabel: 'Pantau', actionTo: '/stays?status=BOOKINGS' }] : []),
      ...(pendingRenewCount ? [{ id: 'owner-renew-health', ruleId: 'renew-pending', entityType: 'renew', entityId: 'summary', dedupKey: 'renew-pending|summary|/renew-requests', severity: 'MEDIUM' as const, title: 'Perpanjangan perlu keputusan', message: 'Keputusan perpanjangan menjaga okupansi dan memicu tagihan perpanjangan.', count: pendingRenewCount, source: 'Perpanjangan', actionLabel: 'Review perpanjangan', actionTo: '/renew-requests' }] : []),
      ...(availableRooms ? [{ id: 'owner-available-health', ruleId: 'room-available', entityType: 'room', entityId: 'summary', dedupKey: 'room-available|summary|/rooms', severity: 'OPPORTUNITY' as const, title: 'Kamar kosong bisa jadi revenue', message: `${availableRooms} kamar tersedia. Cek harga, foto, dan status publik.`, count: availableRooms, source: 'Rooms', actionLabel: 'Cek kamar', actionTo: '/rooms' }] : []),
      ...(!pendingPaymentReviewCount && !overdue.length && !approvedCheckoutRequestCount ? [{ id: 'owner-stable-health', ruleId: 'business-stable', entityType: 'summary', entityId: 'business-health', severity: 'SUCCESS' as const, title: 'Tidak ada blocker besar', message: businessHealthHeadline(grade), source: 'Rule engine' }] : []),
    ]);

    const queueItems: ActionQueueItem[] = dedupeCommandItems([
      ...overdue.slice(0, 4).map((invoice) => ({ id: `overdue-${invoice.id}`, ruleId: 'invoice-overdue', entityType: 'invoice', entityId: invoice.id, dedupKey: `invoice-overdue|invoice|${invoice.id}|/invoices/${invoice.id}`, priority: 'HIGH' as const, type: 'Tagihan overdue', subject: invoice.stay?.tenant?.fullName || invoice.invoiceNumber || `Invoice #${invoice.id}`, issue: `Jatuh tempo ${formatDate(invoice.dueDate)}. Sisa tagihan perlu dibereskan sebelum flow berikutnya macet.`, recommendedAction: 'Lihat Tagihan', actionTo: `/invoices/${invoice.id}` })),
      ...(pendingPaymentReviewCount ? [{ id: 'payment-review', ruleId: 'payment-review', entityType: 'payment-submission', entityId: 'summary', dedupKey: 'payment-review|summary|/payment-submissions/review', priority: 'HIGH' as const, type: 'Pembayaran', subject: `${pendingPaymentReviewCount} bukti pembayaran`, issue: 'Uang masuk belum boleh dianggap clear sebelum diverifikasi.', recommendedAction: 'Verifikasi', actionTo: '/payment-submissions/review' }] : []),
      ...(approvedCheckoutRequestCount ? [{ id: 'approved-checkout', ruleId: 'checkout-final', entityType: 'checkout', entityId: 'summary', dedupKey: 'checkout-final|summary|/stays?status=BOOKINGS', priority: 'HIGH' as const, type: 'Checkout', subject: `${approvedCheckoutRequestCount} pengajuan disetujui`, issue: 'Belum final; pastikan tidak ada tagihan open dan deposit ditangani.', recommendedAction: 'Pantau', actionTo: '/stays?status=BOOKINGS' }] : []),
      ...(pendingCheckoutRequestCount ? [{ id: 'pending-checkout', ruleId: 'checkout-review', entityType: 'checkout', entityId: 'summary', priority: 'MEDIUM' as const, type: 'Ajukan keluar', subject: `${pendingCheckoutRequestCount} menunggu review`, issue: 'Tenant menunggu jawaban jadwal keluar.', recommendedAction: 'Review', actionTo: '/stays?status=BOOKINGS' }] : []),
      ...(pendingRenewCount ? [{ id: 'renew-pending', ruleId: 'renew-pending', entityType: 'renew', entityId: 'summary', dedupKey: 'renew-pending|summary|/renew-requests', priority: 'MEDIUM' as const, type: 'Perpanjangan', subject: `${pendingRenewCount} permintaan`, issue: 'Approval membuat masa sewa dan invoice renewal.', recommendedAction: 'Review', actionTo: '/renew-requests' }] : []),
    ]);

    const metrics: MetricChip[] = [
      { id: 'health-score', label: 'Business health', value: `${Math.round(score)}/100`, helper: businessHealthHeadline(grade), status: scoreStatus(score), statusLabel: grade, icon: '🧠', to: '/reports?tab=command' },
      { id: 'collection', label: 'Collection', value: `${collectionRatio}%`, helper: `Rp ${formatCompact(collectedRupiah)} / Rp ${formatCompact(billedRupiah)}`, status: collectionRatio >= 85 ? 'SUCCESS' : 'WARNING', icon: '💰', to: '/reports?tab=finance' },
      { id: 'outstanding', label: 'Outstanding', value: `Rp ${formatCompact(outstandingRupiah)}`, helper: `${openInvoices.length} tagihan open`, status: outstandingRupiah ? 'WARNING' : 'SUCCESS', icon: '🧾', to: '/invoices' },
      { id: 'overdue', label: 'Overdue', value: overdue.length, helper: 'Perlu follow-up', status: overdue.length ? 'DANGER' : 'SUCCESS', icon: '⚠️', to: '/reports?tab=aging' },
      { id: 'occupancy', label: 'Okupansi semua kamar', value: `${occupancyRate}%`, helper: `${occupiedRooms}/${rooms.length} kamar fisik terisi (termasuk maintenance)`, status: occupancyRate >= 80 ? 'SUCCESS' : 'INFO', icon: '🏠', to: '/reports?tab=operations' },
      { id: 'net', label: 'Net snapshot', value: `Rp ${formatCompact(collectedRupiah - totalExpenseRupiah)}`, helper: 'Collected - expense tercatat', status: collectedRupiah >= totalExpenseRupiah ? 'SUCCESS' : 'WARNING', icon: '📊', to: '/reports?tab=finance' },
    ];

    const drivers = [
      `Collection ${collectionRatio}%`,
      `Okupansi ${occupancyRate}%`,
      `${overdue.length} overdue`,
      `${pendingPaymentReviewCount} payment review`,
    ];

    return { score, grade, headline: businessHealthHeadline(grade), drivers, assistantItems, queueItems, metrics, collectionRatio, occupancyRate, outstandingRupiah, overdueCount: overdue.length, collectedRupiah, billedRupiah };
  }, [input]);
}
