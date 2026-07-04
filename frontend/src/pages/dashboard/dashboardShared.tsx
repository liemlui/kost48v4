import { Spinner } from 'react-bootstrap';
import { listResource } from '../../api/resources';
import { addHoursToDate, formatClockWib, formatDateTimeWib, getDeadlineMeta, parseDateTimeSafe } from '../../utils/dateTime';
import { getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import type { ActionQueueItem } from '../../components/command-center';
import type { AutoOpsStatus } from '../../api/autoOps';
import type { Invoice, PaymentSubmission, Room, Stay } from '../../types';

export type AutoOpsStatusLike = AutoOpsStatus;

export type DashboardListSummary<T> = {
  items: T[];
  totalItems: number;
  isTruncated: boolean;
};

export const ACTION_QUERY_OPTIONS = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
};

export const MEDIUM_FRESH_QUERY_OPTIONS = {
  staleTime: 60_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
};

export const ADMIN_SLA_HOURS = {
  bookingReview: 3,
  tenantPayment: 3,
  paymentReviewUrgent: 1,
  paymentReviewEscalate: 3,
  paymentReviewMax: 6,
  renewReview: 3,
  renewEscalate: 6,
  checkoutReview: 3,
  checkoutEscalate: 6,
  checkoutFinal: 6,
};

export type AdminWorkLane = {
  id: string;
  step: string;
  title: string;
  value: number;
  helper: string;
  sla: string;
  nextDeadline?: string;
  action: string;
  to: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
};

export async function fetchAllPagesForDashboard<T>(
  path: string,
  params?: Record<string, unknown>,
  pageSize = 100,
  maxPages = 20,
): Promise<DashboardListSummary<T>> {
  const items: T[] = [];
  let totalPages = 1;
  let totalItems = 0;
  let page = 1;
  do {
    const response = await listResource<T>(path, { ...(params ?? {}), page, limit: pageSize });
    items.push(...(response.items ?? []));
    totalPages = response.meta?.totalPages ?? 1;
    totalItems = response.meta?.totalItems ?? items.length;
    if (!(response.items ?? []).length) break;
    page += 1;
  } while (page <= totalPages && page <= maxPages);
  return { items, totalItems, isTruncated: totalItems > items.length || totalPages > maxPages };
}

export function formatDateSafe(dateValue: string | Date | null | undefined): string {
  return formatDateTimeWib(dateValue);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(Math.round(value));
}

export function formatCurrencyCompact(value: number) {
  return new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.round(value));
}

export function formatCurrencyFull(value: number) {
  return `Rp ${formatNumber(value)}`;
}

export function getCurrentMonthWindow() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end, label: formatDateTimeWib(now).split(' ')[0] };
}

export function isDateInsideWindow(value: string | Date | null | undefined, start: Date, end: Date) {
  if (!value) return false;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return false;
  return date >= start && date < end;
}

export function getRecordDate(record: unknown, keys: string[]): string | Date | null {
  if (!record || typeof record !== 'object') return null;
  const obj = record as Record<string, unknown>;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' || value instanceof Date) return value;
  }
  return null;
}

export function getInvoiceOutstandingAmount(invoice: Invoice) {
  const total = Number(getInvoiceTotalAmount(invoice) ?? invoice.totalAmountRupiah ?? 0);
  const paid = Number(invoice.paidAmountRupiah ?? 0);
  return Math.max(0, total - paid);
}

export function getInvoicePaidThisMonthAmount(invoice: Invoice, start: Date, end: Date) {
  const paymentTotal = (invoice.payments ?? [])
    .filter((payment) => isDateInsideWindow(payment.paymentDate, start, end))
    .reduce((sum, payment) => sum + Number(payment.amountRupiah ?? 0), 0);
  if (paymentTotal > 0) return paymentTotal;
  if (invoice.status === 'PAID' && isDateInsideWindow(invoice.paidAt ?? invoice.issuedAt, start, end)) {
    return Number(invoice.paidAmountRupiah ?? getInvoiceTotalAmount(invoice) ?? invoice.totalAmountRupiah ?? 0);
  }
  return 0;
}

export function getExpenseAmount(expense: unknown) {
  if (!expense || typeof expense !== 'object') return 0;
  const obj = expense as Record<string, unknown>;
  return Number(obj.amountRupiah ?? obj.amount ?? obj.totalAmountRupiah ?? 0);
}

export function getExpenseDate(expense: unknown) {
  return getRecordDate(expense, ['expenseDate', 'spentAt', 'paymentDate', 'createdAt', 'date']);
}

export function getPaymentReviewSubject(submission: PaymentSubmission) {
  return submission.tenant?.fullName || submission.submittedBy?.fullName || `Tenant #${submission.tenantId}`;
}

export function daysFromToday(targetDate: string | Date | null | undefined): number | null {
  if (!targetDate) return null;
  const date = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return Math.floor((copy.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isOpenInvoice(invoice: Invoice) {
  return !['PAID', 'CANCELLED'].includes(invoice.status);
}

export function isReservedBookingPendingApproval(stay: Stay): boolean {
  return (
    stay.status === 'ACTIVE' &&
    stay.room?.status === 'RESERVED' &&
    stay.bookingSource === 'WEBSITE' &&
    !stay.latestInvoiceId &&
    Number(stay.invoiceCount ?? 0) === 0
  );
}

export function isReservedBookingWaitingPayment(stay: Stay): boolean {
  return (
    stay.status === 'ACTIVE' &&
    stay.room?.status === 'RESERVED' &&
    stay.bookingSource === 'WEBSITE' &&
    (Boolean(stay.latestInvoiceId) || Number(stay.invoiceCount ?? 0) > 0)
  );
}

export function isExpiredAdminBooking(stay: Stay): boolean {
  const expiry = parseDateTimeSafe(stay.expiresAt);
  return Boolean(expiry && expiry.getTime() < Date.now());
}

// V-04: Label reserved berdasarkan status invoice: DP (PARTIAL) vs Lunas (PAID)
export type ReservedLabel = {
  label: string;
  variant: 'success' | 'warning' | 'info' | 'danger' | 'secondary';
};

export function getReservedPaymentLabel(stay: Stay): ReservedLabel {
  const roomStatus = stay.room?.status;
  if (roomStatus === 'OCCUPIED') {
    return { label: 'Terisi', variant: 'info' };
  }
  if (roomStatus === 'RESERVED') {
    const invStatus = stay.latestInvoiceStatus;
    if (invStatus === 'PAID') {
      return { label: 'Reserved - Lunas', variant: 'success' };
    }
    if (invStatus === 'PARTIAL') {
      return { label: 'Reserved - DP', variant: 'warning' };
    }
    // ISSUED/DRAFT atau tanpa invoice
    const hasInvoice = Boolean(stay.latestInvoiceId) || Number(stay.invoiceCount ?? 0) > 0;
    if (hasInvoice) {
      return { label: 'Menunggu Pembayaran', variant: 'warning' };
    }
    return { label: 'Menunggu Persetujuan', variant: 'warning' };
  }
  if (roomStatus === 'AVAILABLE') {
    return { label: 'Tersedia', variant: 'success' };
  }
  if (roomStatus === 'MAINTENANCE') {
    return { label: 'Perlu Dicek', variant: 'secondary' };
  }
  return { label: roomStatus ?? '-', variant: 'secondary' };
}

export function getTimestampValue(item: unknown, keys: string[]): string | Date | null {
  if (!item || typeof item !== 'object') return null;
  const record = item as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' || value instanceof Date) return value;
  }
  return null;
}

export function getStayCreatedAt(stay: Stay): string | Date | null {
  return getTimestampValue(stay, ['createdAt', 'bookingCreatedAt', 'requestedAt']) ?? null;
}

export function getStayDeadline(stay: Stay, hours: number): Date | null {
  const direct = parseDateTimeSafe(stay.expiresAt);
  if (direct) return direct;
  return addHoursToDate(getStayCreatedAt(stay), hours);
}

export function getInvoiceTime(invoice: Invoice, hours: number): Date | null {
  return addHoursToDate(invoice.issuedAt ?? invoice.dueDate ?? null, hours) ?? parseDateTimeSafe(invoice.dueDate);
}

export function makeClock(value?: string | Date | null): string {
  return formatClockWib(value);
}

export function makeLastUpdatedLabel() {
  return formatDateTimeWib(new Date());
}

export function makeQueueTime(deadline?: string | Date | null) {
  const meta = getDeadlineMeta(deadline, 'Deadline');
  const raw = parseDateTimeSafe(deadline);
  return {
    deadlineLabel: meta.hasDate ? meta.absoluteLabel : undefined,
    deadlineIso: raw ? raw.toISOString() : undefined,
    timeStatusLabel: meta.hasDate ? meta.relativeLabel : undefined,
    timeStatusTone: meta.hasDate ? (meta.isExpired ? 'danger' as const : 'info' as const) : undefined,
  } satisfies Pick<ActionQueueItem, 'deadlineLabel' | 'deadlineIso' | 'timeStatusLabel' | 'timeStatusTone'>;
}

export function earliestDeadlineLabel(dates: Array<string | Date | null | undefined>): string | undefined {
  const valid = dates
    .map((value) => parseDateTimeSafe(value))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());
  if (!valid.length) return undefined;
  const meta = getDeadlineMeta(valid[0], 'Deadline terdekat');
  return `${meta.clockLabel} · ${meta.relativeLabel}`;
}

export function priorityActionFromQueue(items: ActionQueueItem[]) {
  const first = [...items].sort((a, b) => {
    const rank: Record<string, number> = { BLOCKER: 0, HIGH: 1, MEDIUM: 2, WARNING: 3, OPPORTUNITY: 4, INFO: 5, SUCCESS: 6 };
    return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
  })[0];
  return first;
}

export function isTerlambat(invoice: Invoice) {
  if (!invoice.dueDate || ['PAID', 'CANCELLED'].includes(invoice.status)) return false;
  const dueDate = new Date(invoice.dueDate);
  if (Number.isNaN(dueDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

export function isDueSoon(invoice: Invoice) {
  const days = daysFromToday(invoice.dueDate);
  return days !== null && days >= 0 && days <= 3 && isOpenInvoice(invoice);
}

export function LoadingDashboard() {
  return <div className="py-5 text-center"><Spinner animation="border" /></div>;
}

export function makePaymentCount(items: PaymentSubmission[], total?: number) {
  if (typeof total === 'number') return total;
  return items.filter((ps) => ps.status === 'PENDING_REVIEW').length;
}

export function makeRoomPoints(rooms: Room[]) {
  const occupied = rooms.filter((room) => room.status === 'OCCUPIED').length;
  const available = rooms.filter((room) => room.status === 'AVAILABLE').length;
  const maintenance = rooms.filter((room) => ['MAINTENANCE', 'INACTIVE'].includes(room.status)).length;
  const reserved = rooms.filter((room) => room.status === 'RESERVED').length;
  return [
    { label: 'Terisi', value: occupied, detail: 'Revenue berjalan', to: '/reports?tab=operations' },
    { label: 'Kosong', value: available, detail: 'Peluang pemasaran', to: '/rooms' },
    { label: 'Dipesan', value: reserved, detail: 'Belum jadi penghuni aktif', to: '/stays?status=BOOKINGS' },
    { label: 'Diperbaiki', value: maintenance, detail: 'Perlu dicek petugas', to: '/rooms' },
  ];
}

export function isLowStockItem(item: any) {
  const qty = Number(item?.qtyOnHand ?? 0);
  const min = Number(item?.minQty ?? 0);
  return min > 0 && qty <= min;
}

export function makePercent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

export function countExpiredDates(dates: Array<string | Date | null | undefined>) {
  return dates
    .map((value) => parseDateTimeSafe(value))
    .filter((date): date is Date => Boolean(date))
    .filter((date) => date.getTime() < Date.now()).length;
}
