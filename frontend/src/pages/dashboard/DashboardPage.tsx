import { useState, type ReactNode } from 'react';
import { Alert, Button, Card, Col, Collapse, Modal, Row, Spinner, Tab, Table, Tabs } from 'react-bootstrap';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { AssistantPanel, ActionQueueTable, CompactMetrics, type ActionQueueItem, type AssistantItem, type MetricChip } from '../../components/command-center';
import { AssistantInsightLine, EntityBadgeFilterBar } from '../../components/workspace';
import StaffMotivationDashboard from '../../components/staff/StaffMotivationDashboard';
import SmartChartPanel, { type SmartChartPoint } from '../../components/charts/SmartChartPanel';
import { listResource, postAction } from '../../api/resources';
import { listAdminRenewRequests } from '../../api/renewRequests';
import { listAdminCheckoutRequests } from '../../api/checkoutRequests';
import { listPaymentReviewQueue } from '../../api/paymentSubmissions';
import { fetchBusinessHealth } from '../../api/finance';
import { fetchAutoOpsStatus } from '../../api/autoOps';
import { fetchMyStaffRoutineKpi, fetchStaffRoutineToday } from '../../api/staffRoutines';
import { fetchAdminStaffPerformance } from '../../api/staffPerformance';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRoute } from '../../config/navigation';
import { useBusinessHealthScore } from '../../hooks/useBusinessHealthScore';
import { useCashflowForecast } from '../../hooks/useCashflowForecast';
import { useOperationalStressIndex } from '../../hooks/useOperationalStressIndex';
import { dedupeCommandItems } from '../../utils/commandCenterDedup';
import { getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import { addHoursToDate, formatClockWib, formatDateTimeWib, getDeadlineMeta, parseDateTimeSafe } from '../../utils/dateTime';
import type { CheckoutRequest, Invoice, PaymentSubmission, RenewRequest, Room, Stay, Ticket } from '../../types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type AutoOpsStatusLike = { expiredCandidates?: number; heldForPaymentReview?: number; orphanReservedRooms?: number; intervalMinutes?: number; policy?: string; deadlines?: Record<string, number> };

type DashboardListSummary<T> = {
  items: T[];
  totalItems: number;
  isTruncated: boolean;
};

const ACTION_QUERY_OPTIONS = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
};

const MEDIUM_FRESH_QUERY_OPTIONS = {
  staleTime: 60_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
};

async function fetchAllPagesForDashboard<T>(path: string, params?: Record<string, unknown>, pageSize = 100, maxPages = 20): Promise<DashboardListSummary<T>> {
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

function formatDateSafe(dateValue: string | Date | null | undefined): string {
  return formatDateTimeWib(dateValue);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(Math.round(value));
}

function formatCurrencyCompact(value: number) {
  return new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.round(value));
}

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

function isOpenInvoice(invoice: Invoice) {
  return !['PAID', 'CANCELLED'].includes(invoice.status);
}

function isReservedBookingPendingApproval(stay: Stay): boolean {
  return (
    stay.status === 'ACTIVE' &&
    stay.room?.status === 'RESERVED' &&
    stay.bookingSource === 'WEBSITE' &&
    !stay.latestInvoiceId &&
    Number(stay.invoiceCount ?? 0) === 0
  );
}

function isReservedBookingWaitingPayment(stay: Stay): boolean {
  return (
    stay.status === 'ACTIVE' &&
    stay.room?.status === 'RESERVED' &&
    stay.bookingSource === 'WEBSITE' &&
    (Boolean(stay.latestInvoiceId) || Number(stay.invoiceCount ?? 0) > 0)
  );
}

function isExpiredAdminBooking(stay: Stay): boolean {
  const expiry = parseDateTimeSafe(stay.expiresAt);
  return Boolean(expiry && expiry.getTime() < Date.now());
}

const ADMIN_SLA_HOURS = {
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

type AdminWorkLane = {
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

function getTimestampValue(item: unknown, keys: string[]): string | Date | null {
  if (!item || typeof item !== 'object') return null;
  const record = item as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' || value instanceof Date) return value;
  }
  return null;
}

function getStayCreatedAt(stay: Stay): string | Date | null {
  return getTimestampValue(stay, ['createdAt', 'bookingCreatedAt', 'requestedAt']) ?? null;
}

function getStayDeadline(stay: Stay, hours: number): Date | null {
  const direct = parseDateTimeSafe(stay.expiresAt);
  if (direct) return direct;
  return addHoursToDate(getStayCreatedAt(stay), hours);
}

function getInvoiceTime(invoice: Invoice, hours: number): Date | null {
  return addHoursToDate(invoice.issuedAt ?? invoice.dueDate ?? null, hours) ?? parseDateTimeSafe(invoice.dueDate);
}

function makeClock(value?: string | Date | null): string {
  return formatClockWib(value);
}

function makeLastUpdatedLabel() {
  return formatDateTimeWib(new Date());
}

function makeQueueTime(deadline?: string | Date | null) {
  const meta = getDeadlineMeta(deadline, 'Deadline');
  return {
    deadlineLabel: meta.hasDate ? meta.absoluteLabel : undefined,
    timeStatusLabel: meta.hasDate ? meta.relativeLabel : undefined,
    timeStatusTone: meta.hasDate ? (meta.isExpired ? 'danger' as const : 'info' as const) : undefined,
  } satisfies Pick<ActionQueueItem, 'deadlineLabel' | 'timeStatusLabel' | 'timeStatusTone'>;
}

function earliestDeadlineLabel(dates: Array<string | Date | null | undefined>): string | undefined {
  const valid = dates.map((value) => parseDateTimeSafe(value)).filter((date): date is Date => Boolean(date)).sort((a, b) => a.getTime() - b.getTime());
  if (!valid.length) return undefined;
  const meta = getDeadlineMeta(valid[0], 'Deadline terdekat');
  return `${meta.clockLabel} · ${meta.relativeLabel}`;
}

function priorityActionFromQueue(items: ActionQueueItem[]) {
  const first = [...items].sort((a, b) => {
    const rank: Record<string, number> = { BLOCKER: 0, HIGH: 1, MEDIUM: 2, WARNING: 3, OPPORTUNITY: 4, INFO: 5, SUCCESS: 6 };
    return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
  })[0];
  return first;
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

function isDueSoon(invoice: Invoice) {
  const days = daysFromToday(invoice.dueDate);
  return days !== null && days >= 0 && days <= 3 && isOpenInvoice(invoice);
}

function LoadingDashboard() {
  return <div className="py-5 text-center"><Spinner animation="border" /></div>;
}

function makePaymentCount(items: PaymentSubmission[], total?: number) {
  if (typeof total === 'number') return total;
  return items.filter((ps) => ps.status === 'PENDING_REVIEW').length;
}

function makeRoomPoints(rooms: Room[]): SmartChartPoint[] {
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

function CompactDisclosure({ title, subtitle, children, defaultOpen = false }: { title: string; subtitle?: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="content-card compact-disclosure border-0">
      <Card.Body>
        <div className="table-meta">
          <div>
            <div className="panel-title">{title}</div>
            {subtitle ? <div className="panel-subtitle">{subtitle}</div> : null}
          </div>
          <Button variant="outline-secondary" size="sm" onClick={() => setOpen((value) => !value)}>{open ? 'Sembunyikan' : 'Tampilkan'}</Button>
        </div>
        <Collapse in={open}><div className="pt-3">{children}</div></Collapse>
      </Card.Body>
    </Card>
  );
}

function RecentOverdueTable({ overdue }: { overdue: Invoice[] }) {
  const navigate = useNavigate();
  return (
    <Card className="content-card border-0 h-100">
      <Card.Body>
        <div className="table-meta">
          <div>
            <div className="panel-title">Tagihan Bermasalah</div>
            <div className="panel-subtitle">Detail disembunyikan dari dashboard utama; buka saat butuh follow-up.</div>
          </div>
          <Button variant="outline-primary" size="sm" onClick={() => navigate('/invoices')}>Lihat semua</Button>
        </div>
        {!overdue.length ? (
          <EmptyState icon="✅" title="Tidak ada overdue" description="Belum ada tagihan overdue dari data yang dimuat." />
        ) : (
          <Table responsive hover className="mt-3">
            <thead><tr><th>Tagihan</th><th>Tenant</th><th>Jatuh Tempo</th><th>Status</th></tr></thead>
            <tbody>
              {overdue.slice(0, 6).map((invoice) => (
                <tr key={invoice.id} className="clickable-row" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                  <td><div className="fw-semibold">{invoice.invoiceNumber || `INV-${invoice.id}`}</div><div className="small text-muted">Rp {formatNumber(getInvoiceTotalAmount(invoice))}</div></td>
                  <td>{invoice.stay?.tenant?.fullName || `Stay #${invoice.stayId}`}</td>
                  <td>{formatDateSafe(invoice.dueDate)}</td>
                  <td><StatusBadge status={invoice.status} domain="invoice" /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}



function AutoOpsUrgencyCard({ status, role }: { status?: AutoOpsStatusLike | null; role: 'OWNER' | 'ADMIN' }) {
  const expired = Number(status?.expiredCandidates ?? 0);
  const held = Number(status?.heldForPaymentReview ?? 0);
  const orphan = Number(status?.orphanReservedRooms ?? 0);
  const hasUrgent = expired + held + orphan > 0;
  const reviewHours = Number(status?.deadlines?.BOOKING_REVIEW_DEADLINE_HOURS ?? ADMIN_SLA_HOURS.bookingReview);
  const tenantPaymentHours = Number(status?.deadlines?.APPROVED_BOOKING_PAYMENT_DEADLINE_HOURS ?? ADMIN_SLA_HOURS.tenantPayment);
  const paymentUrgentHours = Number(status?.deadlines?.PAYMENT_REVIEW_URGENT_HOURS ?? ADMIN_SLA_HOURS.paymentReviewUrgent);
  const paymentEscalateHours = Number(status?.deadlines?.PAYMENT_REVIEW_ESCALATE_HOURS ?? ADMIN_SLA_HOURS.paymentReviewEscalate);
  const paymentMaxHours = Number(status?.deadlines?.PAYMENT_REVIEW_MAX_HOURS ?? ADMIN_SLA_HOURS.paymentReviewMax);

  if (role === 'ADMIN') {
    return (
      <Card className={`content-card border-0 autoops-policy-strip ${hasUrgent ? 'danger' : 'calm'}`.trim()}>
        <Card.Body>
          <div className="autoops-policy-main">
            <div>
              <div className="admin-section-label">AutoOps SLA</div>
              <strong>AutoOps aktif. Booking lewat batas akan direset otomatis.</strong>
              <small>Booking baru harus direview maksimal {reviewHours} jam. Tenant bayar maksimal {tenantPaymentHours} jam setelah tagihan dibuka. Bukti pembayaran urgent setelah {paymentUrgentHours} jam.</small>
            </div>
            <div className="autoops-policy-pills">
              <span>Escalate bukti setelah {paymentEscalateHours} jam</span>
              <span>Batas review bukti {paymentMaxHours} jam</span>
              {hasUrgent ? <span className="danger">{expired + held + orphan} perlu dicek</span> : <span>Aman</span>}
            </div>
          </div>
          {hasUrgent ? (
            <div className="autoops-policy-counts mt-2">
              <span>{expired} siap reset/cancel</span>
              <span>{held} bukti urgent</span>
              <span>{orphan} reserved orphan</span>
            </div>
          ) : null}
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className={`content-card border-0 autoops-urgency-card autoops-sla-compact ${hasUrgent ? 'danger' : 'calm'}`.trim()}>
      <Card.Body>
        <div className="autoops-sla-row">
          <div>
            <div className="page-eyebrow mb-1">AutoOps SLA aktif</div>
            <h3 className="mb-1">Booking review {reviewHours} jam · bayar tenant {tenantPaymentHours} jam · review bukti urgent {paymentUrgentHours} jam</h3>
            <p className="mb-0">
              Admin review booking dulu, baru tagihan awal dibuka. Jika review booking lewat deadline, pemesanan direset dan tenant harus ajukan ulang.
            </p>
          </div>
          <div className="autoops-sla-stack" aria-label="SLA AutoOps">
            <span>Booking review <strong>{reviewHours} jam</strong></span>
            <span>Tenant bayar <strong>{tenantPaymentHours} jam</strong></span>
            <span>Review bukti <strong>{paymentUrgentHours}/{paymentEscalateHours} jam</strong></span>
          </div>
        </div>
        <div className="autoops-mini-grid mt-3">
          <div><strong>{expired}</strong><span>siap reset/cancel</span></div>
          <div><strong>{held}</strong><span>bukti bayar urgent</span></div>
          <div><strong>{orphan}</strong><span>reserved orphan</span></div>
        </div>
        <Alert variant={hasUrgent ? 'danger' : 'info'} className="mt-3 mb-0 small">
          {hasUrgent
            ? 'Ada flow melewati SLA. Booking yang tidak direview/dibayar tepat waktu dapat direset agar kamar tidak tertahan.'
            : 'Rule first paid tetap aktif: kamar aman setelah pembayaran valid disetujui, bukan hanya karena booking.'}
        </Alert>
      </Card.Body>
    </Card>
  );
}

function FinanceReadinessCard() {
  return (
    <Card className="content-card finance-readiness-card border-0 h-100">
      <Card.Body>
        <div className="panel-title mb-1">Balance Sheet Readiness</div>
        <div className="panel-subtitle mb-3">Formal ratio dikunci sampai data akuntansi dasar reliable.</div>
        <div className="readiness-mini-list">
          <div><span>✅</span><strong>Accounts receivable</strong><small>Open invoice bisa menjadi kandidat AR.</small></div>
          <div><span>✅</span><strong>Deposit liability</strong><small>Deposit held harus dibaca sebagai kewajiban.</small></div>
          <div><span>🔒</span><strong>Kas / bank aktual</strong><small>Belum ada account model formal.</small></div>
          <div><span>🔒</span><strong>Equity & capital employed</strong><small>Belum ada balance sheet-grade source.</small></div>
        </div>
        <Button variant="outline-primary" size="sm" className="mt-3" onClick={() => window.location.assign('/reports?tab=formal')}>Buka readiness</Button>
      </Card.Body>
    </Card>
  );
}

function OwnerContinuityStrip({ pendingPaymentReviewCount, pendingRenewCount, approvedCheckoutRequestCount, overdueCount, openInvoiceCount, onNavigate }: { pendingPaymentReviewCount: number; pendingRenewCount: number; approvedCheckoutRequestCount: number; overdueCount: number; openInvoiceCount: number; onNavigate: (to: string) => void }) {
  const cards = [
    { title: 'Cashflow tertahan', value: pendingPaymentReviewCount, helper: 'Bukti bayar yang perlu keputusan owner/admin.', action: 'Review pembayaran', to: '/payment-submissions/review', tone: pendingPaymentReviewCount ? 'warning' : 'success' },
    { title: 'Renew meter checkpoint', value: pendingRenewCount, helper: 'Perpanjangan wajib catat meter sebelum invoice renew.', action: 'Review renew', to: '/renew-requests', tone: pendingRenewCount ? 'warning' : 'success' },
    { title: 'Checkout siap final', value: approvedCheckoutRequestCount, helper: 'Approved request yang butuh final checkout jika invoice clear.', action: 'Cek checkout', to: '/stays?status=BOOKINGS', tone: approvedCheckoutRequestCount ? 'info' : 'success' },
    { title: 'Open invoice', value: openInvoiceCount, helper: overdueCount ? `${overdueCount} overdue perlu follow-up.` : 'Tagihan open bisa menahan checkout/renew.', action: 'Lihat tagihan', to: '/invoices', tone: overdueCount ? 'danger' : openInvoiceCount ? 'warning' : 'success' },
  ];
  return (
    <Row className="g-3 mb-4 command-continuity-grid">
      {cards.map((card) => (
        <Col md={6} xl={3} key={card.title}>
          <button type="button" className={`continuity-card ${card.tone}`} onClick={() => onNavigate(card.to)}>
            <span>{card.title}</span>
            <strong>{card.value}</strong>
            <small>{card.helper}</small>
            <em>{card.action}</em>
          </button>
        </Col>
      ))}
    </Row>
  );
}


function AdminContinuityStrip({ lanes, onNavigate }: { lanes: AdminWorkLane[]; onNavigate: (to: string) => void }) {
  return (
    <div className="admin-lane-strip" aria-label="Ringkasan jalur kerja admin">
      {lanes.map((lane) => {
        const hasWork = lane.value > 0;
        return (
          <button type="button" key={lane.id} className={`admin-lane-chip ${lane.tone} ${hasWork ? 'has-work' : 'is-calm'}`.trim()} onClick={() => onNavigate(lane.to)}>
            <span className="admin-lane-step">{lane.step}</span>
            <strong>{lane.title}</strong>
            <span className="admin-lane-value">{hasWork ? `${lane.value} perlu aksi` : 'Aman'}</span>
            {lane.nextDeadline ? <span className="admin-lane-deadline">{lane.nextDeadline}</span> : <span className="admin-lane-sla">{lane.sla}</span>}
          </button>
        );
      })}
    </div>
  );
}

function AdminCommandHeader({ totalQueue, urgentCount, activeAreaLabel }: {
  totalQueue: number;
  urgentCount: number;
  activeAreaLabel: string;
  topQueueItem?: ActionQueueItem;
}) {
  const isToday = activeAreaLabel === 'Hari Ini';
  const headline = totalQueue
    ? `${totalQueue} pekerjaan ${isToday ? 'hari ini' : `di area ${activeAreaLabel}`}`
    : `${activeAreaLabel} aman`;
  const status = urgentCount ? `${urgentCount} urgent/terlambat` : 'Tidak ada deadline merah';
  return (
    <div className="admin-command-head admin-command-head-slim admin-tab-heading">
      <div>
        <div className="page-eyebrow mb-2"><span className="page-eyebrow-dot" /> Admin Command Center</div>
        <h1>{activeAreaLabel}</h1>
        <p>{headline}. Data utama area ini tampil di depan; sub-menu area tetap tersedia sebagai chip kecil di atas table.</p>
        <div className="admin-command-status-line">
          <span>{status}</span>
          <span>Terakhir update: {makeLastUpdatedLabel()}</span>
        </div>
      </div>
    </div>
  );
}

type AdminAreaMenuItem = {
  id: string;
  label: string;
  helper: string;
  to: string;
  icon: string;
  count?: number;
  tone?: 'success' | 'info' | 'warning' | 'danger';
  active?: boolean;
};

function AdminAreaInternalMenu({ title, items, onNavigate }: { title: string; items: AdminAreaMenuItem[]; onNavigate: (to: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="admin-area-internal-menu" aria-label={`Sub-menu ${title}`}>
      <div className="admin-area-internal-menu-head">
        <span>{title}</span>
        <small>Pilih data area ini tanpa keluar dari command center.</small>
      </div>
      <div className="admin-area-internal-menu-scroll">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`admin-area-internal-chip ${item.tone ?? 'info'} ${item.active ? 'is-active' : ''}`.trim()}
            onClick={() => onNavigate(item.to)}
            title={item.helper}
          >
            <span className="admin-area-internal-chip-main">
              <span className="admin-area-internal-icon" aria-hidden="true">{item.icon}</span>
              <span className="admin-area-internal-label">{item.label}</span>
              {typeof item.count === 'number' ? <strong className="admin-area-internal-count">{item.count}</strong> : null}
            </span>
            <small>{item.helper}</small>
          </button>
        ))}
      </div>
    </div>
  );
}


function AdminStaffFrontlineList({ items, isLoading }: { items: any[]; isLoading?: boolean }) {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'GOOD' | 'HELP' | 'EVALUATE'>('ALL');
  const staffRows = [...items]
    .sort((a, b) => Number(b?.score?.final ?? 0) - Number(a?.score?.final ?? 0))
    .slice(0, 20);

  const isNeedHelp = (item: any) => Number(item?.monthlyKpi?.needHelpCount ?? item?.monthlyKpi?.needHelp ?? 0) > 0;
  const getScore = (item: any) => Number(item?.score?.final ?? 0);
  const filteredRows = staffRows.filter((item) => {
    const score = getScore(item);
    if (filter === 'ACTIVE') return Number(item?.monthlyKpi?.ticketsDone ?? 0) > 0 || Number(item?.monthlyKpi?.routineDone ?? 0) > 0 || isNeedHelp(item);
    if (filter === 'GOOD') return score >= 80;
    if (filter === 'HELP') return isNeedHelp(item);
    if (filter === 'EVALUATE') return score > 0 && score < 60;
    return true;
  });

  const countBy = (id: typeof filter) => {
    if (id === 'ALL') return staffRows.length;
    if (id === 'ACTIVE') return staffRows.filter((item) => Number(item?.monthlyKpi?.ticketsDone ?? 0) > 0 || Number(item?.monthlyKpi?.routineDone ?? 0) > 0 || isNeedHelp(item)).length;
    if (id === 'GOOD') return staffRows.filter((item) => getScore(item) >= 80).length;
    if (id === 'HELP') return staffRows.filter(isNeedHelp).length;
    if (id === 'EVALUATE') return staffRows.filter((item) => getScore(item) > 0 && getScore(item) < 60).length;
    return 0;
  };

  return (
    <Card className="content-card border-0 mb-3 admin-staff-frontline-card true-workspace-card">
      <Card.Body>
        <div className="table-meta align-items-start">
          <div>
            <div className="panel-title">Staff & skor bulan ini</div>
            <div className="panel-subtitle">Klik row staff untuk membuka detail kinerja. Sub-menu staff tetap tersedia di atas table.</div>
          </div>
          <span className="unified-table-hint">Maks. 20 staff</span>
        </div>
        <EntityBadgeFilterBar
          activeId={filter}
          onChange={(id) => setFilter(id as typeof filter)}
          filters={[
            { id: 'ALL', label: 'Semua Staff', count: countBy('ALL'), tone: 'info' },
            { id: 'ACTIVE', label: 'Aktif', count: countBy('ACTIVE'), tone: 'success' },
            { id: 'HELP', label: 'Perlu Bantuan', count: countBy('HELP'), tone: 'warning' },
            { id: 'GOOD', label: 'Performa Baik', count: countBy('GOOD'), tone: 'success' },
            { id: 'EVALUATE', label: 'Perlu Evaluasi', count: countBy('EVALUATE'), tone: 'danger' },
          ]}
        />
        {isLoading ? <div className="small text-muted mt-3">Memuat skor staff...</div> : null}
        {!isLoading && !filteredRows.length ? <EmptyState icon="👷" title="Belum ada staff pada filter ini" description="Skor muncul setelah checklist, tiket, atau audit staff tercatat." /> : null}
        {filteredRows.length ? (
          <Table responsive hover className="compact-data-table admin-staff-score-table mb-0">
            <thead><tr><th>Staff</th><th>Skor</th><th>Kategori</th><th>Tiket selesai</th><th>Checklist</th><th>Sinyal</th></tr></thead>
            <tbody>
              {filteredRows.map((item) => {
                const score = getScore(item);
                const category = item?.category?.label ?? 'Belum dinilai';
                const tone = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger';
                const name = item?.staff?.fullName ?? 'Staff';
                return (
                  <tr key={item?.staff?.id ?? name} className="clickable-row" onClick={() => window.location.assign('/staff-performance')}>
                    <td><strong>{name}</strong><div className="small text-muted">{item?.staff?.email ?? 'Klik untuk detail kinerja'}</div></td>
                    <td><StatusBadge status={tone.toUpperCase()} customLabel={String(score)} /></td>
                    <td>{category}</td>
                    <td>{item?.monthlyKpi?.ticketsDone ?? 0}</td>
                    <td>{item?.monthlyKpi?.routineDone ?? 0}</td>
                    <td>{isNeedHelp(item) ? <StatusBadge status="WARNING" customLabel="Perlu bantuan" /> : <span className="text-muted small">Aman</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : null}
      </Card.Body>
    </Card>
  );
}


type AdminStayFlowFilter = 'ALL' | 'BOOKING' | 'ACTIVE' | 'RENEW' | 'CHECKOUT' | 'FOLLOWUP';

type AdminStayFlowRow = {
  id: string;
  group: Exclude<AdminStayFlowFilter, 'ALL' | 'FOLLOWUP'>;
  tenant: string;
  room: string;
  statusLabel: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
  deadline?: string;
  helper: string;
  to: string;
  actionLabel: string;
};

function AdminStaysUnifiedList({
  activeStays,
  bookingReview,
  waitingPayment,
  renewRequests,
  checkoutPending,
  checkoutApproved,
  onNavigate,
}: {
  activeStays: Stay[];
  bookingReview: Stay[];
  waitingPayment: Stay[];
  renewRequests: RenewRequest[];
  checkoutPending: CheckoutRequest[];
  checkoutApproved: CheckoutRequest[];
  onNavigate: (to: string) => void;
}) {
  const [filter, setFilter] = useState<AdminStayFlowFilter>('ALL');

  const bookingRows: AdminStayFlowRow[] = [...bookingReview, ...waitingPayment]
    .filter((stay) => stay.status === 'ACTIVE' && !isExpiredAdminBooking(stay))
    .map((stay) => {
      const needsReview = isReservedBookingPendingApproval(stay);
      const deadline = getStayDeadline(stay, needsReview ? ADMIN_SLA_HOURS.bookingReview : ADMIN_SLA_HOURS.tenantPayment);
      const meta = getDeadlineMeta(deadline, needsReview ? 'Batas review booking' : 'Batas bayar tenant');
      return {
        id: `booking-${stay.id}`,
        group: 'BOOKING',
        tenant: stay.tenant?.fullName || `Tenant #${stay.tenantId}`,
        room: stay.room?.code || `Kamar #${stay.roomId}`,
        statusLabel: needsReview ? 'Booking baru' : 'Menunggu bayar',
        tone: meta.isExpired ? 'danger' : needsReview ? 'warning' : 'info',
        deadline: meta.hasDate ? `${meta.clockLabel} · ${meta.relativeLabel}` : undefined,
        helper: needsReview ? 'Perlu review admin sebelum invoice awal.' : 'Tenant wajib bayar dan kirim bukti dalam satu langkah.',
        to: `/stays/${stay.id}`,
        actionLabel: needsReview ? 'Review' : 'Detail',
      };
    });

  const activeRows: AdminStayFlowRow[] = activeStays
    .filter((stay) => stay.status === 'ACTIVE' && stay.room?.status === 'OCCUPIED')
    .map((stay) => {
      const days = daysFromToday(stay.plannedCheckOutDate);
      const followUp = days !== null && days <= 14;
      return {
        id: `active-${stay.id}`,
        group: 'ACTIVE',
        tenant: stay.tenant?.fullName || `Tenant #${stay.tenantId}`,
        room: stay.room?.code || `Kamar #${stay.roomId}`,
        statusLabel: followUp ? 'Akhir masa dekat' : 'Aktif',
        tone: followUp ? 'warning' : 'success',
        deadline: stay.plannedCheckOutDate ? formatDateTimeWib(stay.plannedCheckOutDate) : undefined,
        helper: followUp ? 'Follow-up renew/keluar sebelum akhir masa sewa.' : 'Tenant sedang menempati kamar.',
        to: `/stays/${stay.id}`,
        actionLabel: 'Detail',
      };
    });

  const renewRows: AdminStayFlowRow[] = renewRequests.map((request) => {
    const deadline = addHoursToDate(request.createdAt, ADMIN_SLA_HOURS.renewReview);
    const meta = getDeadlineMeta(deadline, 'Batas review renew');
    return {
      id: `renew-${request.id}`,
      group: 'RENEW',
      tenant: request.tenant?.fullName || request.stay?.tenant?.fullName || `Renew #${request.id}`,
      room: request.stay?.room?.code || '-',
      statusLabel: 'Perpanjangan',
      tone: meta.isExpired ? 'danger' : 'warning',
      deadline: meta.hasDate ? `${meta.clockLabel} · ${meta.relativeLabel}` : undefined,
      helper: 'Catat meter sebelum approve renew dan invoice utility.',
      to: '/renew-requests',
      actionLabel: 'Review',
    };
  });

  const checkoutRows: AdminStayFlowRow[] = [...checkoutPending, ...checkoutApproved].map((request) => {
    const approved = request.status === 'APPROVED';
    const baseTime = approved ? request.reviewedAt ?? request.updatedAt ?? request.createdAt : request.createdAt;
    const deadline = addHoursToDate(baseTime, approved ? ADMIN_SLA_HOURS.checkoutFinal : ADMIN_SLA_HOURS.checkoutReview);
    const meta = getDeadlineMeta(deadline, approved ? 'Batas final checkout' : 'Batas review checkout');
    return {
      id: `checkout-${request.id}`,
      group: 'CHECKOUT',
      tenant: request.stay?.tenant?.fullName || `Stay #${request.stayId}`,
      room: request.stay?.room?.code || '-',
      statusLabel: approved ? 'Checkout approved' : 'Review keluar',
      tone: meta.isExpired ? 'danger' : approved ? 'info' : 'warning',
      deadline: meta.hasDate ? `${meta.clockLabel} · ${meta.relativeLabel}` : undefined,
      helper: approved ? 'Final checkout tetap lewat detail masa sewa.' : 'Setujui/tolak rencana keluar tenant.',
      to: `/stays/${request.stayId}`,
      actionLabel: approved ? 'Finalkan' : 'Review',
    };
  });

  const rows = [...bookingRows, ...activeRows, ...renewRows, ...checkoutRows];
  const visibleRows = rows.filter((row) => {
    if (filter === 'ALL') return true;
    if (filter === 'FOLLOWUP') return row.tone === 'danger' || row.tone === 'warning';
    return row.group === filter;
  }).slice(0, 20);

  const countBy = (value: AdminStayFlowFilter) => value === 'ALL'
    ? rows.length
    : value === 'FOLLOWUP'
      ? rows.filter((row) => row.tone === 'danger' || row.tone === 'warning').length
      : rows.filter((row) => row.group === value).length;

  return (
    <Card className="content-card border-0 mb-3">
      <Card.Body>
        <div className="table-meta align-items-start">
          <div>
            <div className="panel-title">Semua Proses Sewa</div>
            <div className="panel-subtitle">View ini hanya menampilkan stay aktif atau sedang diproses. Expired, batal, dan arsip tidak masuk command center.</div>
          </div>
          <span className="unified-table-hint">Klik row untuk detail</span>
        </div>
        <EntityBadgeFilterBar
          activeId={filter}
          onChange={(id) => setFilter(id as AdminStayFlowFilter)}
          filters={[
            { id: 'ALL', label: 'Semua Proses', count: countBy('ALL'), tone: 'info' },
            { id: 'BOOKING', label: 'Booking Baru', count: countBy('BOOKING'), tone: 'warning' },
            { id: 'ACTIVE', label: 'Aktif', count: countBy('ACTIVE'), tone: 'success' },
            { id: 'RENEW', label: 'Perpanjangan', count: countBy('RENEW'), tone: 'warning' },
            { id: 'CHECKOUT', label: 'Checkout', count: countBy('CHECKOUT'), tone: 'info' },
            { id: 'FOLLOWUP', label: 'Perlu Follow-up', count: countBy('FOLLOWUP'), tone: 'danger' },
          ]}
        />
        {!visibleRows.length ? (
          <EmptyState icon="✅" title="Tidak ada proses di filter ini" description="Data cancelled, expired, dan arsip memang tidak ditampilkan di command center." />
        ) : (
          <Table responsive hover className="compact-data-table admin-stays-unified-table mb-0">
            <thead><tr><th>Tenant</th><th>Kamar</th><th>Status</th><th>Deadline</th><th>Catatan</th><th>Detail</th></tr></thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id} className="clickable-row" onClick={() => onNavigate(row.to)}>
                  <td><strong>{row.tenant}</strong></td>
                  <td>{row.room}</td>
                  <td><StatusBadge status={row.tone.toUpperCase()} customLabel={row.statusLabel} /></td>
                  <td>{row.deadline ?? <span className="text-muted">-</span>}</td>
                  <td className="small text-muted">{row.helper}</td>
                  <td><span className="row-arrow-cell" aria-label={`Buka ${row.actionLabel}`}>›</span></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}


type AdminFinanceDashboardFilter = 'ALL' | 'PAYMENT_REVIEW' | 'OPEN' | 'OVERDUE' | 'DRAFT' | 'PAID';

type AdminFinanceRow = {
  id: string;
  group: Exclude<AdminFinanceDashboardFilter, 'ALL'>;
  subject: string;
  flow: string;
  statusLabel: string;
  tone: 'success' | 'info' | 'warning' | 'danger';
  amount: number;
  deadline?: string;
  helper: string;
  to: string;
};

function AdminFinanceWorkspace({
  invoices,
  paymentReviewItems,
  onNavigate,
}: {
  invoices: Invoice[];
  paymentReviewItems: PaymentSubmission[];
  onNavigate: (to: string) => void;
}) {
  const [filter, setFilter] = useState<AdminFinanceDashboardFilter>('ALL');

  const paymentRows: AdminFinanceRow[] = paymentReviewItems
    .filter((submission) => submission.status === 'PENDING_REVIEW')
    .map((submission) => {
      const receivedAt = submission.createdAt ?? submission.paidAt;
      const deadline = addHoursToDate(receivedAt, ADMIN_SLA_HOURS.paymentReviewMax);
      const meta = getDeadlineMeta(deadline, 'Batas review bukti');
      const tenantName = submission.tenant?.fullName || submission.submittedBy?.fullName || `Tenant #${submission.tenantId}`;
      return {
        id: `payment-${submission.id}`,
        group: 'PAYMENT_REVIEW',
        subject: tenantName,
        flow: 'Bukti bayar',
        statusLabel: meta.isExpired ? 'Lewat SLA' : 'Perlu verifikasi',
        tone: meta.isExpired ? 'danger' : 'warning',
        amount: Number(submission.amountRupiah ?? 0),
        deadline: meta.hasDate ? `${meta.clockLabel} · ${meta.relativeLabel}` : undefined,
        helper: submission.invoice?.invoiceNumber ? `Tagihan ${submission.invoice.invoiceNumber}` : 'Bukti pembayaran menunggu admin.',
        to: '/payment-submissions/review',
      };
    });

  const invoiceRows: AdminFinanceRow[] = invoices
    .filter((invoice) => invoice.status !== 'CANCELLED')
    .map((invoice) => {
      const overdue = isOverdue(invoice);
      const open = isOpenInvoice(invoice);
      const dueMeta = getDeadlineMeta(invoice.dueDate ?? getInvoiceTime(invoice, ADMIN_SLA_HOURS.tenantPayment), 'Jatuh tempo');
      const tenantName = invoice.stay?.tenant?.fullName || `Stay #${invoice.stayId}`;
      const roomCode = invoice.stay?.room?.code ? ` · ${invoice.stay.room.code}` : '';
      const group: AdminFinanceRow['group'] = overdue
        ? 'OVERDUE'
        : invoice.status === 'DRAFT'
          ? 'DRAFT'
          : invoice.status === 'PAID'
            ? 'PAID'
            : 'OPEN';
      return {
        id: `invoice-${invoice.id}`,
        group,
        subject: `${tenantName}${roomCode}`,
        flow: invoice.invoiceNumber || `Tagihan #${invoice.id}`,
        statusLabel: overdue ? 'Overdue' : invoice.status === 'DRAFT' ? 'Draft' : invoice.status === 'PAID' ? 'Lunas' : 'Tagihan aktif',
        tone: overdue ? 'danger' : invoice.status === 'DRAFT' ? 'warning' : invoice.status === 'PAID' ? 'success' : open ? 'info' : 'success',
        amount: Number(getInvoiceTotalAmount(invoice) ?? invoice.totalAmountRupiah ?? 0),
        deadline: dueMeta.hasDate ? `${dueMeta.clockLabel} · ${dueMeta.relativeLabel}` : undefined,
        helper: overdue ? 'Perlu follow-up cepat.' : invoice.status === 'DRAFT' ? 'Belum tenant-facing.' : invoice.status === 'PAID' ? 'Sudah selesai.' : 'Pantau pembayaran dan bukti bayar.',
        to: `/invoices/${invoice.id}`,
      };
    });

  const rows = [...paymentRows, ...invoiceRows]
    .filter((row) => filter === 'ALL' ? true : row.group === filter)
    .sort((a, b) => {
      const rank: Record<string, number> = { PAYMENT_REVIEW: 0, OVERDUE: 1, DRAFT: 2, OPEN: 3, PAID: 4 };
      return (rank[a.group] ?? 9) - (rank[b.group] ?? 9) || b.amount - a.amount;
    })
    .slice(0, 20);

  const allRows = [...paymentRows, ...invoiceRows];
  const countBy = (value: AdminFinanceDashboardFilter) => value === 'ALL' ? allRows.length : allRows.filter((row) => row.group === value).length;

  return (
    <Card className="content-card border-0 mb-3 true-workspace-card">
      <Card.Body>
        <div className="table-meta align-items-start">
          <div>
            <div className="panel-title">Semua proses finance</div>
            <div className="panel-subtitle">Tagihan dan bukti pembayaran tampil langsung di tab Finance. Klik row untuk detail; tidak ada shortcut silang.</div>
          </div>
          <span className="unified-table-hint">Maks. 20 item</span>
        </div>
        <EntityBadgeFilterBar
          activeId={filter}
          onChange={(id) => setFilter(id as AdminFinanceDashboardFilter)}
          filters={[
            { id: 'ALL', label: 'Semua Finance', count: countBy('ALL'), tone: 'info' },
            { id: 'PAYMENT_REVIEW', label: 'Bukti Bayar', count: countBy('PAYMENT_REVIEW'), tone: 'warning' },
            { id: 'OPEN', label: 'Tagihan Aktif', count: countBy('OPEN'), tone: 'info' },
            { id: 'OVERDUE', label: 'Overdue', count: countBy('OVERDUE'), tone: 'danger' },
            { id: 'DRAFT', label: 'Draft', count: countBy('DRAFT'), tone: 'warning' },
            { id: 'PAID', label: 'Lunas', count: countBy('PAID'), tone: 'success' },
          ]}
        />
        {!rows.length ? (
          <EmptyState icon="✅" title="Finance aman pada filter ini" description="Tidak ada tagihan atau bukti pembayaran yang perlu ditampilkan di badge ini." />
        ) : (
          <Table responsive hover className="compact-data-table mb-0">
            <thead><tr><th>Tenant / Stay</th><th>Flow</th><th>Status</th><th>Nominal</th><th>Deadline</th><th>Catatan</th><th>Detail</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="clickable-row" onClick={() => onNavigate(row.to)}>
                  <td><strong>{row.subject}</strong></td>
                  <td>{row.flow}</td>
                  <td><StatusBadge status={row.tone.toUpperCase()} customLabel={row.statusLabel} /></td>
                  <td>Rp {formatNumber(row.amount)}</td>
                  <td>{row.deadline ?? <span className="text-muted">-</span>}</td>
                  <td className="small text-muted">{row.helper}</td>
                  <td><span className="row-arrow-cell">›</span></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}

type AdminTicketDashboardFilter = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CLOSED';

function getTicketAssigneeLabel(ticket: Ticket) {
  return ticket.assignedTo?.fullName || (ticket.assignedToId ? `Staff #${ticket.assignedToId}` : 'Belum ditugaskan');
}

function AdminTicketsWorkspace({ tickets, onNavigate }: { tickets: Ticket[]; onNavigate: (to: string) => void }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<AdminTicketDashboardFilter>('ALL');
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);
  const [closeTarget, setCloseTarget] = useState<Ticket | null>(null);
  const closeTicketMutation = useMutation({
    mutationFn: (ticket: Ticket) => postAction(`/tickets/${ticket.id}/close`, { action: 'CLOSE' }),
    onSuccess: async () => {
      setCloseTarget(null);
      setDetailTicket(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard-admin', 'tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['staff-field-report-review-queue'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-staff-performance'] }),
      ]);
    },
  });
  const activeTickets = tickets.filter((ticket) => ticket.status !== 'CANCELLED');
  const countBy = (value: AdminTicketDashboardFilter) => value === 'ALL' ? activeTickets.length : activeTickets.filter((ticket) => ticket.status === value).length;
  const rows = activeTickets
    .filter((ticket) => filter === 'ALL' ? true : ticket.status === filter)
    .sort((a, b) => {
      const rank: Record<string, number> = { OPEN: 0, IN_PROGRESS: 1, DONE: 2, CLOSED: 3 };
      return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    })
    .slice(0, 20);

  return (
    <Card className="content-card border-0 mb-3 true-workspace-card">
      <Card.Body>
        <div className="table-meta align-items-start">
          <div>
            <div className="panel-title">Semua tiket aktif</div>
            <div className="panel-subtitle">Tiket langsung tampil di tab ini. Tiket DONE bisa ditutup setelah admin mengecek hasil staff.</div>
          </div>
          <span className="unified-table-hint">Maks. 20 tiket</span>
        </div>
        <EntityBadgeFilterBar
          activeId={filter}
          onChange={(id) => setFilter(id as AdminTicketDashboardFilter)}
          filters={[
            { id: 'ALL', label: 'Semua', count: countBy('ALL'), tone: 'info' },
            { id: 'OPEN', label: 'Baru', count: countBy('OPEN'), tone: 'danger' },
            { id: 'IN_PROGRESS', label: 'Dikerjakan', count: countBy('IN_PROGRESS'), tone: 'warning' },
            { id: 'DONE', label: 'Perlu Cek', count: countBy('DONE'), tone: 'info' },
            { id: 'CLOSED', label: 'Selesai', count: countBy('CLOSED'), tone: 'success' },
          ]}
        />
        {!rows.length ? <EmptyState icon="🎫" title="Tidak ada tiket pada filter ini" description="Tiket batal/arsip tidak diprioritaskan di workspace utama." /> : (
          <Table responsive hover className="compact-data-table mb-0">
            <thead><tr><th>Tiket</th><th>Status</th><th>Lokasi / orang</th><th>Petugas</th><th>Diperbarui</th><th>Aksi</th></tr></thead>
            <tbody>
              {rows.map((ticket) => (
                <tr key={ticket.id} className="clickable-row" onClick={() => setDetailTicket(ticket)}>
                  <td><strong>{ticket.ticketNumber ?? `TIK-${ticket.id}`}</strong><div className="small text-muted">{ticket.title ?? 'Tiket operasional'}</div></td>
                  <td><StatusBadge status={ticket.status} /></td>
                  <td>{ticket.tenant?.fullName || ticket.room?.code || ticket.room?.name || (ticket.roomId ? `Kamar #${ticket.roomId}` : 'Belum ada lokasi')}</td>
                  <td>{ticket.assignedToId ? getTicketAssigneeLabel(ticket) : <span className="text-muted">Belum ditugaskan</span>}</td>
                  <td>{formatDateSafe(ticket.updatedAt ?? ticket.createdAt)}</td>
                  <td onClick={(event) => event.stopPropagation()}>
                    {ticket.status === 'DONE' ? <Button size="sm" variant="success" onClick={() => setCloseTarget(ticket)} disabled={closeTicketMutation.isPending}>Tutup</Button> : <span className="row-arrow-cell">›</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
      <Modal show={Boolean(detailTicket)} onHide={() => setDetailTicket(null)} centered size="lg">
        <Modal.Header closeButton><Modal.Title>{detailTicket?.ticketNumber ?? `Tiket #${detailTicket?.id ?? ''}`}</Modal.Title></Modal.Header>
        <Modal.Body>
          {detailTicket ? (
            <>
              <div className="entity-detail-grid mb-3">
                <div className="entity-detail-item"><span>Status</span><strong><StatusBadge status={detailTicket.status} /></strong></div>
                <div className="entity-detail-item"><span>Lokasi / orang</span><strong>{detailTicket.tenant?.fullName || detailTicket.room?.code || detailTicket.room?.name || '-'}</strong></div>
                <div className="entity-detail-item"><span>Petugas</span><strong>{getTicketAssigneeLabel(detailTicket)}</strong></div>
                <div className="entity-detail-item"><span>Diperbarui</span><strong>{formatDateSafe(detailTicket.updatedAt ?? detailTicket.createdAt)}</strong></div>
              </div>
              <h6 className="fw-semibold">{detailTicket.title || `Tiket #${detailTicket.id}`}</h6>
              <p className="text-muted mb-0">{detailTicket.description || 'Tidak ada deskripsi tambahan.'}</p>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setDetailTicket(null)}>Tutup</Button>
          {detailTicket?.status === 'DONE' ? <Button variant="success" onClick={() => setCloseTarget(detailTicket)} disabled={closeTicketMutation.isPending}>Tutup Tiket</Button> : null}
        </Modal.Footer>
      </Modal>
      <Modal show={Boolean(closeTarget)} onHide={() => setCloseTarget(null)} centered>
        <Modal.Header closeButton><Modal.Title>Tutup tiket selesai</Modal.Title></Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="py-2 small">
            Pastikan pekerjaan staff sudah dicek. Aksi ini mengubah tiket dari DONE menjadi CLOSED dan mengurangi antrean “Perlu Cek”.
          </Alert>
          {closeTicketMutation.isError ? (
            <Alert variant="danger" className="py-2 small">
              Gagal menutup tiket. Buka halaman Tiket jika tiket membutuhkan status final barang kamar/gudang yang lebih detail.
            </Alert>
          ) : null}
          <div className="small text-muted">
            {closeTarget?.ticketNumber ?? `Tiket #${closeTarget?.id ?? ''}`} · {closeTarget?.title ?? 'Tiket operasional'}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setCloseTarget(null)}>Batal</Button>
          <Button variant="success" onClick={() => closeTarget ? closeTicketMutation.mutate(closeTarget) : undefined} disabled={!closeTarget || closeTicketMutation.isPending}>
            {closeTicketMutation.isPending ? 'Menutup...' : 'Tutup Tiket'}
          </Button>
          <Button variant="outline-primary" onClick={() => onNavigate('/tickets')}>Buka Halaman Tiket</Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}

type AdminRoomsDashboardFilter = 'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE' | 'STOCK_LOW';

function isLowStockItem(item: any) {
  const qty = Number(item?.qtyOnHand ?? 0);
  const min = Number(item?.minQty ?? 0);
  return min > 0 && qty <= min;
}

function AdminRoomsStockWorkspace({ rooms, inventoryItems, onNavigate }: { rooms: Room[]; inventoryItems: any[]; onNavigate: (to: string) => void }) {
  const [filter, setFilter] = useState<AdminRoomsDashboardFilter>('ALL');
  const lowStockItems = inventoryItems.filter(isLowStockItem);
  const activeRooms = rooms.filter((room) => room.status !== 'INACTIVE');
  const countBy = (value: AdminRoomsDashboardFilter) => {
    if (value === 'ALL') return activeRooms.length;
    if (value === 'STOCK_LOW') return lowStockItems.length;
    if (value === 'MAINTENANCE') return activeRooms.filter((room) => ['MAINTENANCE', 'INACTIVE'].includes(String(room.status))).length;
    return activeRooms.filter((room) => room.status === value).length;
  };
  const roomRows = activeRooms
    .filter((room) => {
      if (filter === 'ALL') return true;
      if (filter === 'MAINTENANCE') return ['MAINTENANCE', 'INACTIVE'].includes(String(room.status));
      if (filter === 'STOCK_LOW') return false;
      return room.status === filter;
    })
    .slice(0, 20);
  const stockRows = lowStockItems.slice(0, 20);

  return (
    <Card className="content-card border-0 mb-3 true-workspace-card">
      <Card.Body>
        <div className="table-meta align-items-start">
          <div>
            <div className="panel-title">Kamar & stok</div>
            <div className="panel-subtitle">Tab ini langsung menampilkan kamar. Sub-menu Kamar & Stok tetap tersedia di atas table.</div>
          </div>
          <span className="unified-table-hint">Klik row untuk detail</span>
        </div>
        <EntityBadgeFilterBar
          activeId={filter}
          onChange={(id) => setFilter(id as AdminRoomsDashboardFilter)}
          filters={[
            { id: 'ALL', label: 'Semua Kamar', count: countBy('ALL'), tone: 'info' },
            { id: 'AVAILABLE', label: 'Tersedia', count: countBy('AVAILABLE'), tone: 'success' },
            { id: 'OCCUPIED', label: 'Terisi', count: countBy('OCCUPIED'), tone: 'info' },
            { id: 'RESERVED', label: 'Dipesan', count: countBy('RESERVED'), tone: 'warning' },
            { id: 'MAINTENANCE', label: 'Perlu Cek', count: countBy('MAINTENANCE'), tone: 'danger' },
            { id: 'STOCK_LOW', label: 'Stok Menipis', count: countBy('STOCK_LOW'), tone: 'warning' },
          ]}
        />
        {filter === 'STOCK_LOW' ? (
          !stockRows.length ? <EmptyState icon="📦" title="Tidak ada stok menipis" description="Stok gudang aman berdasarkan qty dan batas minimum." /> : (
            <Table responsive hover className="compact-data-table mb-0">
              <thead><tr><th>Barang</th><th>Kategori</th><th>Stok</th><th>Min</th><th>Status</th></tr></thead>
              <tbody>
                {stockRows.map((item) => (
                  <tr key={item.id} className="clickable-row" onClick={() => onNavigate('/inventory-items')}>
                    <td><strong>{item.name ?? `Barang #${item.id}`}</strong><div className="small text-muted">{item.sku ?? '-'}</div></td>
                    <td>{item.category ?? '-'}</td>
                    <td>{String(item.qtyOnHand ?? 0)}</td>
                    <td>{String(item.minQty ?? 0)}</td>
                    <td><StatusBadge status="WARNING" customLabel="Stok menipis" /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )
        ) : (
          !roomRows.length ? <EmptyState icon="🚪" title="Tidak ada kamar pada filter ini" description="Pilih badge lain untuk melihat status kamar berbeda." /> : (
            <Table responsive hover className="compact-data-table mb-0">
              <thead><tr><th>Kamar</th><th>Status</th><th>Penghuni / pemesan</th><th>Tarif bulanan</th><th>Detail</th></tr></thead>
              <tbody>
                {roomRows.map((room) => {
                  const tenantName = room.currentStay?.tenant?.fullName;
                  return (
                    <tr key={room.id} className="clickable-row" onClick={() => onNavigate(`/rooms/${room.id}`)}>
                      <td><strong>{room.code}</strong><div className="small text-muted">{room.name ?? room.floor ?? '-'}</div></td>
                      <td><StatusBadge status={room.status} /></td>
                      <td>{tenantName ?? (room.status === 'AVAILABLE' ? 'Kosong' : 'Belum ada nama')}</td>
                      <td>Rp {formatNumber(Number(room.monthlyRateRupiah ?? 0))}</td>
                      <td><span className="row-arrow-cell">›</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )
        )}
      </Card.Body>
    </Card>
  );
}

function AdminProcessLine() {
  return (
    <div className="admin-process-line" aria-label="Flow kerja admin">
      <span><strong>1</strong> Pemesanan</span>
      <span><strong>2</strong> Review admin</span>
      <span><strong>3</strong> Bayar & kirim bukti</span>
      <span><strong>4</strong> Bukti diperiksa</span>
    </div>
  );
}

function AdminDiagnosisStrip({ items, topQueueItem }: { items: AssistantItem[]; topQueueItem?: ActionQueueItem }) {
  const first = items[0];
  const title = topQueueItem ? 'Diagnosis antrean utama' : (first?.title ?? 'Operasional aman');
  const message = topQueueItem
    ? `Prioritas sekarang: ${topQueueItem.type} — ${topQueueItem.subject}. ${topQueueItem.timeStatusLabel ?? 'Cek detail waktu di Action Queue.'}`
    : (first?.message ?? 'Tidak ada flow utama yang macet dari data yang dimuat.');
  return (
    <Card className="content-card border-0 admin-diagnosis-strip">
      <Card.Body>
        <div className="admin-section-label">Asisten Operasional</div>
        <div className="admin-diagnosis-main">
          <div>
            <strong>{title}</strong>
            <span>{message} Aksi utama tetap hanya di Action Queue agar tidak dobel.</span>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

function AdminHealthChips({ metrics }: { metrics: MetricChip[] }) {
  return (
    <div className="admin-health-chip-row" aria-label="Ringkasan kesehatan admin">
      {metrics.map((metric) => (
        <button
          type="button"
          key={metric.id}
          className={`admin-health-chip ${metric.status?.toLowerCase() ?? 'info'}`}
          onClick={() => metric.to ? window.location.assign(metric.to) : metric.onClick?.()}
        >
          <span>{metric.icon ?? '•'} {metric.label}</span>
          <strong>{metric.value}</strong>
          <em>{metric.helper ?? metric.statusLabel ?? 'Aman'}</em>
        </button>
      ))}
    </div>
  );
}


type AdminQueueArea = 'today' | 'stays' | 'finance' | 'tickets' | 'staff' | 'rooms';

const ADMIN_QUEUE_AREAS: Array<{ id: AdminQueueArea; label: string; helper: string }> = [
  { id: 'today', label: 'Hari Ini', helper: 'Orientasi cepat: kondisi hari ini dan pekerjaan yang butuh keputusan.' },
  { id: 'stays', label: 'Stays', helper: 'Booking, tenant aktif, renew, checkout, dan lifecycle masa sewa.' },
  { id: 'finance', label: 'Finance', helper: 'Tagihan, bukti pembayaran, overdue, manual payment, dan pengeluaran.' },
  { id: 'tickets', label: 'Tiket', helper: 'Tiket tenant, kamar rusak, follow-up, dan target penanganan.' },
  { id: 'staff', label: 'Staff', helper: 'Checklist, ketersediaan staff, laporan lapangan, dan kinerja.' },
  { id: 'rooms', label: 'Kamar & Stok', helper: 'Status kamar, barang kamar, stok gudang, dan mutasi inventaris.' },
];

function normalizeAdminArea(value: string | null | undefined): AdminQueueArea {
  if (value === 'today' || value === 'announcements') return 'today';
  return ADMIN_QUEUE_AREAS.some((area) => area.id === value) ? value as AdminQueueArea : 'today';
}

function itemMatchesAdminArea(item: ActionQueueItem, area: AdminQueueArea): boolean {
  if (area === 'today') return true;
  const haystack = `${item.ruleId ?? ''} ${item.entityType ?? ''} ${item.type ?? ''} ${item.subject ?? ''}`.toLowerCase();
  if (area === 'stays') return /stay|booking|renew|checkout|tenant|sewa|pemesanan|perpanjangan/.test(haystack);
  if (area === 'finance') return /payment|invoice|tagihan|bayar|bukti|overdue|submission/.test(haystack);
  if (area === 'tickets') return /ticket|tiket|repair|perbaikan/.test(haystack);
  if (area === 'staff') return /staff|routine|checklist|laporan|kinerja/.test(haystack);
  if (area === 'rooms') return /room|kamar|inventory|inventaris|maintenance|stok|barang/.test(haystack);
  return true;
}

function AdminSlaMiniNote({ status }: { status?: AutoOpsStatusLike | null }) {
  const reviewHours = Number(status?.deadlines?.BOOKING_REVIEW_DEADLINE_HOURS ?? ADMIN_SLA_HOURS.bookingReview);
  const tenantPaymentHours = Number(status?.deadlines?.APPROVED_BOOKING_PAYMENT_DEADLINE_HOURS ?? ADMIN_SLA_HOURS.tenantPayment);
  const paymentUrgentHours = Number(status?.deadlines?.PAYMENT_REVIEW_URGENT_HOURS ?? ADMIN_SLA_HOURS.paymentReviewUrgent);
  return (
    <div className="admin-sla-mini-note">
      <span>AutoOps aktif.</span>
      <small>Booking lewat batas akan direset otomatis. Booking baru maksimal {reviewHours} jam, tenant bayar maksimal {tenantPaymentHours} jam, bukti bayar urgent setelah {paymentUrgentHours} jam.</small>
    </div>
  );
}

function makeAdminFinancePoints(invoices: Invoice[], pendingPaymentReviewCount: number): SmartChartPoint[] {
  const open = invoices.filter(isOpenInvoice).length;
  const overdue = invoices.filter(isOverdue).length;
  const draft = invoices.filter((invoice) => invoice.status === 'DRAFT').length;
  const paid = invoices.filter((invoice) => invoice.status === 'PAID').length;
  return [
    { label: 'Open', value: open, detail: 'Tagihan belum lunas/cancel', to: '/invoices' },
    { label: 'Bukti review', value: pendingPaymentReviewCount, detail: 'Perlu keputusan admin', to: '/payment-submissions/review' },
    { label: 'Overdue', value: overdue, detail: 'Tagihan terlambat', to: '/invoices' },
    { label: 'Draft', value: draft, detail: 'Belum diterbitkan', to: '/invoices' },
    { label: 'Paid', value: paid, detail: 'Sudah lunas', to: '/invoices' },
  ];
}

function makeAdminTicketPoints(tickets: Ticket[]): SmartChartPoint[] {
  const open = tickets.filter((ticket) => ticket.status === 'OPEN').length;
  const progress = tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length;
  const done = tickets.filter((ticket) => ticket.status === 'DONE').length;
  const final = tickets.filter((ticket) => ['CLOSED', 'CANCELLED'].includes(ticket.status)).length;
  return [
    { label: 'Baru', value: open, detail: 'Belum mulai / perlu assign', to: '/tickets' },
    { label: 'Dikerjakan', value: progress, detail: 'Sedang ditangani staff', to: '/tickets' },
    { label: 'Menunggu cek', value: done, detail: 'Staff selesai, admin konfirmasi', to: '/tickets' },
    { label: 'Final', value: final, detail: 'Selesai atau batal', to: '/tickets' },
  ];
}

function makeAdminStaffPoints(tickets: Ticket[]): SmartChartPoint[] {
  const unassigned = tickets.filter((ticket) => ['OPEN', 'IN_PROGRESS'].includes(ticket.status) && !ticket.assignedToId).length;
  const assigned = tickets.filter((ticket) => ['OPEN', 'IN_PROGRESS'].includes(ticket.status) && ticket.assignedToId).length;
  const waitingAdmin = tickets.filter((ticket) => ticket.status === 'DONE').length;
  return [
    { label: 'Belum assign', value: unassigned, detail: 'Perlu keputusan admin', to: '/tickets' },
    { label: 'Assigned', value: assigned, detail: 'Sudah punya staff', to: '/tickets' },
    { label: 'Menunggu admin', value: waitingAdmin, detail: 'Butuh konfirmasi final', to: '/tickets' },
  ];
}


function makePercent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

function AdminTodayStatusStrip({ rooms, inventoryItems, invoices, tickets, pendingPaymentReviewCount, pendingApprovalCount, pendingRenewCount, checkoutCount }: {
  rooms: Room[];
  inventoryItems: any[];
  invoices: Invoice[];
  tickets: Ticket[];
  pendingPaymentReviewCount: number;
  pendingApprovalCount: number;
  pendingRenewCount: number;
  checkoutCount: number;
}) {
  const occupied = rooms.filter((room) => room.status === 'OCCUPIED').length;
  const available = rooms.filter((room) => room.status === 'AVAILABLE').length;
  const activeTickets = tickets.filter((ticket) => ['OPEN', 'IN_PROGRESS', 'DONE'].includes(ticket.status)).length;
  const lowStock = inventoryItems.filter(isLowStockItem).length;
  const openInvoices = invoices.filter(isOpenInvoice).length;
  const overdueInvoices = invoices.filter(isOverdue).length;
  const occupancyPercent = makePercent(occupied, rooms.length);
  const financeRisk = overdueInvoices + pendingPaymentReviewCount;
  const stayWork = pendingApprovalCount + pendingRenewCount + checkoutCount;
  const strips = [
    { label: 'Hunian', value: `${occupied}/${rooms.length || 0}`, helper: `${available} kamar kosong`, percent: occupancyPercent, tone: occupancyPercent >= 80 ? 'success' : 'info' },
    { label: 'Stays', value: String(stayWork), helper: stayWork ? 'butuh keputusan' : 'lifecycle aman', percent: Math.min(100, stayWork * 24), tone: stayWork ? 'warning' : 'success' },
    { label: 'Finance', value: String(openInvoices), helper: financeRisk ? `${financeRisk} risiko bayar` : 'tidak ada risiko urgent', percent: Math.min(100, openInvoices * 12), tone: financeRisk ? 'danger' : 'success' },
    { label: 'Staff & Tiket', value: String(activeTickets), helper: activeTickets ? 'tiket aktif/perlu cek' : 'staff & tiket aman', percent: Math.min(100, activeTickets * 18), tone: activeTickets ? 'warning' : 'success' },
    { label: 'Kamar & Stok', value: String(lowStock), helper: lowStock ? 'stok menipis' : 'stok aman', percent: Math.min(100, lowStock * 25), tone: lowStock ? 'warning' : 'success' },
  ];
  return (
    <div className="admin-today-status-strip" aria-label="Kondisi operasional hari ini">
      {strips.map((strip) => (
        <div className={`admin-today-status-item ${strip.tone}`} key={strip.label}>
          <div className="status-strip-top"><span>{strip.label}</span><strong>{strip.value}</strong></div>
          <div className="status-strip-bar" aria-hidden="true"><i style={{ width: `${strip.percent}%` }} /></div>
          <small>{strip.helper}</small>
        </div>
      ))}
    </div>
  );
}

function AdminOverviewCharts({ activeArea, rooms, invoices, tickets, pendingPaymentReviewCount, pendingApprovalCount, waitingInitialPaymentCount, pendingRenewCount, checkoutCount }: {
  activeArea: AdminQueueArea;
  rooms: Room[];
  invoices: Invoice[];
  tickets: Ticket[];
  pendingPaymentReviewCount: number;
  pendingApprovalCount: number;
  waitingInitialPaymentCount: number;
  pendingRenewCount: number;
  checkoutCount: number;
}) {
  const stayPoints: SmartChartPoint[] = [
    { label: 'Booking review', value: pendingApprovalCount, detail: 'Menunggu keputusan admin', to: '/stays?status=BOOKINGS' },
    { label: 'Menunggu bayar', value: waitingInitialPaymentCount, detail: 'Tenant punya deadline bayar', to: '/stays?status=BOOKINGS' },
    { label: 'Renew meter', value: pendingRenewCount, detail: 'Butuh meter checkpoint', to: '/renew-requests' },
    { label: 'Checkout', value: checkoutCount, detail: 'Review/final checkout', to: '/stays?status=BOOKINGS' },
  ];
  if (activeArea === 'today') return null;
  const panels: Array<{ id: AdminQueueArea | 'stays-overview'; area: AdminQueueArea[]; node: ReactNode }> = [
    { id: 'stays-overview', area: ['stays'], node: <SmartChartPanel title="Stays & Tenant" subtitle="Booking, bayar awal, renew, dan checkout dalam satu lifecycle." points={stayPoints} defaultMode="bar" ctaLabel="Buka stay" ctaTo="/stays" totalLabel="Flow" /> },
    { id: 'finance', area: ['finance'], node: <SmartChartPanel title="Finance Ops" subtitle="Tagihan, bukti pembayaran, draft, dan overdue tetap bisa dibuka dari sini." points={makeAdminFinancePoints(invoices, pendingPaymentReviewCount)} defaultMode="bar" ctaLabel="Semua tagihan" ctaTo="/invoices" totalLabel="Finance" /> },
    { id: 'tickets', area: ['tickets'], node: <SmartChartPanel title="Tiket Operasional" subtitle="Tiket baru, pekerjaan aktif, dan konfirmasi final admin." points={makeAdminTicketPoints(tickets)} defaultMode="bar" ctaLabel="Buka tiket" ctaTo="/tickets" totalLabel="Tiket" /> },
    { id: 'rooms', area: ['rooms'], node: <SmartChartPanel title="Kamar & Inventaris" subtitle="Admin melihat kesiapan kamar dan barang; harga/tambah kamar tetap owner." points={makeRoomPoints(rooms)} defaultMode="bar" ctaLabel="Status kamar" ctaTo="/rooms" totalLabel="Kamar" /> },
    { id: 'staff', area: ['staff'], node: <SmartChartPanel title="Staff Ops" subtitle="Ketersediaan kerja dari tiket aktif; fitur libur penuh menyusul backend." points={makeAdminStaffPoints(tickets)} defaultMode="bar" ctaLabel="Kinerja staff" ctaTo="/staff-performance" totalLabel="Staff work" /> },
  ];
  const visible = panels.filter((panel) => panel.area.includes(activeArea));
  const hasUsefulData = (() => {
    if (activeArea === 'stays') return pendingApprovalCount + waitingInitialPaymentCount + pendingRenewCount + checkoutCount > 0;
    if (activeArea === 'finance') return invoices.some(isOpenInvoice) || pendingPaymentReviewCount > 0;
    if (activeArea === 'tickets') return tickets.some((ticket) => ['OPEN', 'IN_PROGRESS', 'DONE'].includes(ticket.status));
    if (activeArea === 'staff') return tickets.some((ticket) => ['OPEN', 'IN_PROGRESS', 'DONE'].includes(ticket.status));
    if (activeArea === 'rooms') return rooms.some((room) => ['OCCUPIED', 'RESERVED', 'MAINTENANCE', 'INACTIVE'].includes(room.status));
    return false;
  })();
  if (!visible.length || !hasUsefulData) return null;
  return (
    <Row className="g-3 admin-overview-charts">
      {visible.map((panel) => (
        <Col lg={12} xl={6} key={panel.id}>{panel.node}</Col>
      ))}
    </Row>
  );
}

function OwnerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('priorities');
  const roomsQuery = useQuery({ queryKey: ['dashboard-owner', 'rooms'], queryFn: () => listResource<Room>('/rooms', { limit: 500 }) });
  const activeStaysQuery = useQuery({ queryKey: ['dashboard-owner', 'stays-active'], queryFn: () => listResource<Stay>('/stays', { status: 'ACTIVE', limit: 300 }) });
  const invoicesQuery = useQuery({ queryKey: ['dashboard-owner', 'invoices-summary'], queryFn: () => fetchAllPagesForDashboard<Invoice>('/invoices') });
  const expensesQuery = useQuery({ queryKey: ['dashboard-owner', 'expenses-summary'], queryFn: () => fetchAllPagesForDashboard<any>('/expenses') });
  const renewRequestsQuery = useQuery({ queryKey: ['dashboard-owner', 'renew-requests'], queryFn: () => listAdminRenewRequests({ status: 'PENDING' }), ...MEDIUM_FRESH_QUERY_OPTIONS });
  const checkoutRequestsPendingQuery = useQuery({ queryKey: ['dashboard-owner', 'checkout-requests-pending'], queryFn: () => listAdminCheckoutRequests({ status: 'PENDING' }), ...ACTION_QUERY_OPTIONS });
  const checkoutRequestsApprovedQuery = useQuery({ queryKey: ['dashboard-owner', 'checkout-requests-approved'], queryFn: () => listAdminCheckoutRequests({ status: 'APPROVED' }), ...ACTION_QUERY_OPTIONS });
  const paymentReviewQuery = useQuery({ queryKey: ['dashboard-owner', 'payment-review'], queryFn: () => listPaymentReviewQueue({ limit: 25 }), ...ACTION_QUERY_OPTIONS });
  const backendBusinessHealthQuery = useQuery({ queryKey: ['dashboard-owner', 'finance-business-health'], queryFn: () => fetchBusinessHealth(), staleTime: 60_000, retry: 1 });
  const autoOpsQuery = useQuery({ queryKey: ['dashboard-owner', 'auto-ops-status'], queryFn: fetchAutoOpsStatus, ...ACTION_QUERY_OPTIONS });

  const rooms = roomsQuery.data?.items ?? [];
  const activeStays = activeStaysQuery.data?.items ?? [];
  const invoices = invoicesQuery.data?.items ?? [];
  const expenses = expensesQuery.data?.items ?? [];
  const totalExpense = expenses.reduce((sum, expense) => sum + Number(expense.amountRupiah ?? 0), 0);
  const pendingRenewCount = renewRequestsQuery.data?.items?.filter((rr: RenewRequest) => rr.status === 'PENDING').length ?? 0;
  const pendingCheckoutRequestCount = checkoutRequestsPendingQuery.data?.items?.length ?? 0;
  const approvedCheckoutRequestCount = checkoutRequestsApprovedQuery.data?.items?.length ?? 0;
  const pendingPaymentReviewCount = makePaymentCount(paymentReviewQuery.data?.items ?? [], paymentReviewQuery.data?.meta?.totalItems);
  const overdue = invoices.filter(isOverdue);
  const cashflowForecast = useCashflowForecast(invoices);
  const businessHealth = useBusinessHealthScore({ invoices, rooms, pendingPaymentReviewCount, pendingRenewCount, pendingCheckoutRequestCount, approvedCheckoutRequestCount, totalExpenseRupiah: totalExpense });
  const backendBusinessHealth = backendBusinessHealthQuery.data;

  const refreshDashboard = () => {
    void Promise.all([
      roomsQuery.refetch(), activeStaysQuery.refetch(), invoicesQuery.refetch(), expensesQuery.refetch(),
      renewRequestsQuery.refetch(), checkoutRequestsPendingQuery.refetch(), checkoutRequestsApprovedQuery.refetch(), paymentReviewQuery.refetch(),
    ]);
  };

  if (roomsQuery.isLoading || activeStaysQuery.isLoading || invoicesQuery.isLoading || expensesQuery.isLoading || renewRequestsQuery.isLoading || checkoutRequestsPendingQuery.isLoading || checkoutRequestsApprovedQuery.isLoading || paymentReviewQuery.isLoading) return <LoadingDashboard />;
  if (roomsQuery.isError || activeStaysQuery.isError || invoicesQuery.isError || expensesQuery.isError || renewRequestsQuery.isError || checkoutRequestsPendingQuery.isError || checkoutRequestsApprovedQuery.isError || paymentReviewQuery.isError) return <Alert variant="danger">Gagal memuat command center owner.</Alert>;

  return (
    <div>
      <PageHeader
        eyebrow="Owner Command Center"
        title="Business Health Cockpit"
        description="Owner melihat kesehatan bisnis sebagai rangkaian flow: cashflow tertahan, renew meter checkpoint, checkout, open invoice, dan readiness finance."
        secondaryAction={<><Button variant="outline-secondary" onClick={refreshDashboard}>Refresh</Button><Button variant="outline-primary" onClick={() => navigate('/reports?tab=command')}>Buka Reports</Button></>}
      />
      <AutoOpsUrgencyCard status={autoOpsQuery.data} role="OWNER" />
      <OwnerContinuityStrip pendingPaymentReviewCount={pendingPaymentReviewCount} pendingRenewCount={pendingRenewCount} approvedCheckoutRequestCount={approvedCheckoutRequestCount} overdueCount={overdue.length} openInvoiceCount={cashflowForecast.openInvoiceCount} onNavigate={navigate} />
      {invoicesQuery.data?.isTruncated ? <Alert variant="warning" className="py-2 small">Ringkasan invoice dihitung dari {invoices.length} data dari total {invoicesQuery.data.totalItems}. Jika data membesar, nanti perlu endpoint summary backend.</Alert> : null}
      <AssistantPanel title="Asisten Kesehatan Bisnis" subtitle="Diagnosis ringkas dari rule engine; detail pekerjaan ada di queue." items={businessHealth.assistantItems} maxItems={3} emptyTitle="Bisnis terlihat stabil" emptyMessage="Tidak ada pembayaran tertahan atau tagihan overdue dari data yang dimuat." />
      <CompactMetrics metrics={businessHealth.metrics} />
      {backendBusinessHealth ? (
        <Alert variant="info" className="py-2 small">
          Backend Finance Core aktif: score {Math.round(backendBusinessHealth.score)} ({backendBusinessHealth.grade}) · {backendBusinessHealth.headline} · generated {formatDateSafe(backendBusinessHealth.generatedAt)}.
        </Alert>
      ) : backendBusinessHealthQuery.isError ? (
        <Alert variant="light" className="py-2 small text-muted">Backend finance summary belum tersedia; dashboard memakai Tier 0 frontend rule engine sebagai fallback.</Alert>
      ) : null}

      <Tabs activeKey={activeTab} onSelect={(key) => setActiveTab(key ?? 'priorities')} className="command-tabs mb-3">
        <Tab eventKey="priorities" title="Prioritas">
          <Row className="g-4">
            <Col xl={8}><ActionQueueTable title="Owner Priority Queue" subtitle="Hanya pekerjaan konkret; tidak mengulang semua isi assistant." items={businessHealth.queueItems} maxItems={8} /></Col>
            <Col xl={4}>
              <Card className="content-card border-0 h-100"><Card.Body><div className="panel-title mb-1">Business health score</div><div className="business-health-score"><strong>{Math.round(backendBusinessHealth?.score ?? businessHealth.score)}</strong><span>{backendBusinessHealth?.grade ?? businessHealth.grade}</span></div><div className="panel-subtitle mt-2">{backendBusinessHealth?.headline ?? businessHealth.headline}</div><div className="mt-3 d-flex gap-2 flex-wrap">{businessHealth.drivers.map((driver) => <span className="surface-pill" key={driver}>{driver}</span>)}</div></Card.Body></Card>
            </Col>
          </Row>
        </Tab>
        <Tab eventKey="rooms" title="Kamar">
          <SmartChartPanel title="Kondisi Kamar" subtitle="Chart bisa diganti mode dan menjadi pintu ke occupancy report." points={makeRoomPoints(rooms)} defaultMode="summary" ctaLabel="Occupancy report" ctaTo="/reports?tab=operations" totalLabel="Kamar" />
        </Tab>
        <Tab eventKey="finance" title="Keuangan">
          <Row className="g-4">
            <Col xl={6}>
              <Card className="content-card border-0 h-100"><Card.Body><div className="panel-title mb-1">Cashflow Forecast Ringan</div><div className="panel-subtitle mb-3">Deterministic rule engine dari tagihan open; bukan LLM.</div><div className="kpi-list"><div className="kpi-item"><span>Expected inflow</span><strong>Rp {formatCurrencyCompact(cashflowForecast.expectedInflowRupiah)}</strong></div><div className="kpi-item"><span>Overdue</span><strong>Rp {formatCurrencyCompact(cashflowForecast.overdueRupiah)}</strong></div><div className="kpi-item"><span>Due ≤7 hari</span><strong>Rp {formatCurrencyCompact(cashflowForecast.dueSoonRupiah)}</strong></div></div><p className="small text-muted mt-3 mb-0">{cashflowForecast.assumption}</p></Card.Body></Card>
            </Col>
            <Col xl={6}><FinanceReadinessCard /></Col>
          </Row>
          <div className="mt-4"><CompactDisclosure title="Detail tagihan bermasalah" subtitle="Dibuka hanya saat owner/admin perlu follow-up." defaultOpen={false}><RecentOverdueTable overdue={overdue} /></CompactDisclosure></div>
        </Tab>
        <Tab eventKey="activity" title="Aktivitas">
          <Row className="g-3">
            <Col md={4}><Card className="content-card border-0"><Card.Body><span className="surface-pill">Stay aktif</span><h3 className="mt-3 mb-0">{activeStays.length}</h3><p className="text-muted small mb-0">Tenant yang sedang berjalan.</p></Card.Body></Card></Col>
            <Col md={4}><Card className="content-card border-0"><Card.Body><span className="surface-pill">Open invoice</span><h3 className="mt-3 mb-0">{cashflowForecast.openInvoiceCount}</h3><p className="text-muted small mb-0">Tagihan belum PAID/CANCELLED.</p></Card.Body></Card></Col>
            <Col md={4}><Card className="content-card border-0"><Card.Body><span className="surface-pill">Reports</span><h3 className="mt-3 mb-0">Drill-down</h3><p className="text-muted small mb-0">Laporan tetap ada, tetapi tidak memenuhi sidebar.</p></Card.Body></Card></Col>
          </Row>
        </Tab>
      </Tabs>
    </div>
  );
}


function AdminDashboard() {
  const navigate = useNavigate();
  const roomsQuery = useQuery({ queryKey: ['dashboard-admin', 'rooms'], queryFn: () => listResource<Room>('/rooms', { limit: 500 }) });
  const inventoryItemsQuery = useQuery({ queryKey: ['dashboard-admin', 'inventory-items'], queryFn: () => listResource<any>('/inventory-items', { limit: 150 }), ...MEDIUM_FRESH_QUERY_OPTIONS });
  const staysQuery = useQuery({ queryKey: ['dashboard-admin', 'stays-active'], queryFn: () => listResource<Stay>('/stays', { status: 'ACTIVE', limit: 300 }) });
  const bookingsQuery = useQuery({ queryKey: ['dashboard-admin', 'bookings'], queryFn: () => listResource<Stay>('/stays', { limit: 300 }) });
  const invoicesQuery = useQuery({ queryKey: ['dashboard-admin', 'invoices'], queryFn: () => listResource<Invoice>('/invoices', { limit: 500 }) });
  const ticketsQuery = useQuery({ queryKey: ['dashboard-admin', 'tickets'], queryFn: () => listResource<Ticket>('/tickets', { limit: 150 }) });
  const depositCompleteStaysQuery = useQuery({ queryKey: ['dashboard-admin', 'stays-deposit-complete'], queryFn: () => listResource<Stay>('/stays', { status: 'COMPLETED', limit: 100 }) });
  const renewRequestsQuery = useQuery({ queryKey: ['dashboard-admin', 'renew-requests'], queryFn: () => listAdminRenewRequests({ status: 'PENDING' }), ...MEDIUM_FRESH_QUERY_OPTIONS });
  const checkoutRequestsPendingQuery = useQuery({ queryKey: ['dashboard-admin', 'checkout-requests-pending'], queryFn: () => listAdminCheckoutRequests({ status: 'PENDING' }), ...ACTION_QUERY_OPTIONS });
  const checkoutRequestsApprovedQuery = useQuery({ queryKey: ['dashboard-admin', 'checkout-requests-approved'], queryFn: () => listAdminCheckoutRequests({ status: 'APPROVED' }), ...ACTION_QUERY_OPTIONS });
  const paymentReviewQuery = useQuery({ queryKey: ['dashboard-admin', 'payment-review'], queryFn: () => listPaymentReviewQueue({ limit: 25 }), ...ACTION_QUERY_OPTIONS });
  const staffPerformanceQuery = useQuery({ queryKey: ['dashboard-admin', 'staff-performance'], queryFn: () => fetchAdminStaffPerformance(), ...MEDIUM_FRESH_QUERY_OPTIONS });
  const autoOpsQuery = useQuery({ queryKey: ['dashboard-admin', 'auto-ops-status'], queryFn: fetchAutoOpsStatus, ...ACTION_QUERY_OPTIONS });

  const rooms = roomsQuery.data?.items ?? [];
  const inventoryItems = inventoryItemsQuery.data?.items ?? [];
  const stays = staysQuery.data?.items ?? [];
  const bookings = bookingsQuery.data?.items ?? [];
  const invoices = invoicesQuery.data?.items ?? [];
  const tickets = ticketsQuery.data?.items ?? [];
  const depositCompleteStays = depositCompleteStaysQuery.data?.items ?? [];
  const renewRequests = renewRequestsQuery.data?.items?.filter((rr: RenewRequest) => rr.status === 'PENDING') ?? [];
  const checkoutPendingRequests = checkoutRequestsPendingQuery.data?.items ?? [];
  const checkoutApprovedRequests = checkoutRequestsApprovedQuery.data?.items ?? [];
  const paymentReviewItems = (paymentReviewQuery.data?.items ?? []).filter((submission: PaymentSubmission) => submission.status === 'PENDING_REVIEW');
  const staffPerformanceItems = staffPerformanceQuery.data?.items ?? [];
  const pendingRenewCount = renewRequests.length;
  const pendingCheckoutRequestCount = checkoutPendingRequests.length;
  const approvedCheckoutRequestCount = checkoutApprovedRequests.length;
  const pendingPaymentReviewCount = makePaymentCount(paymentReviewQuery.data?.items ?? [], paymentReviewQuery.data?.meta?.totalItems);
  const overdueInvoices = invoices.filter(isOverdue);
  const dueSoonInvoices = invoices.filter(isDueSoon);
  const periodEndingSoon = stays.filter((stay) => {
    const days = daysFromToday(stay.plannedCheckOutDate);
    return days !== null && days >= 0 && days <= 14;
  });
  const pendingApprovalBookings = bookings.filter((stay) => isReservedBookingPendingApproval(stay) && !isExpiredAdminBooking(stay));
  const waitingInitialPaymentBookings = bookings.filter((stay) => isReservedBookingWaitingPayment(stay) && !isExpiredAdminBooking(stay));
  const pendingApprovalCount = pendingApprovalBookings.length;
  const waitingInitialPaymentCount = waitingInitialPaymentBookings.length;
  const depositQueue = depositCompleteStays.filter((stay) => stay.depositStatus === 'HELD' || Number(stay.depositAmountRupiah ?? 0) > Number(stay.depositRefundedRupiah ?? 0));
  const opsStress = useOperationalStressIndex({ tickets, rooms, pendingCheckoutRequestCount, approvedCheckoutRequestCount, pendingRenewCount, pendingApprovalCount });

  const bookingReviewDeadlines = pendingApprovalBookings.map((stay) => getStayDeadline(stay, ADMIN_SLA_HOURS.bookingReview));
  const tenantPaymentDeadlines = waitingInitialPaymentBookings.map((stay) => getStayDeadline(stay, ADMIN_SLA_HOURS.tenantPayment));
  const paymentMaxDeadlines = paymentReviewItems.map((submission) => addHoursToDate(submission.createdAt ?? submission.paidAt, ADMIN_SLA_HOURS.paymentReviewMax));
  const renewReviewDeadlines = renewRequests.map((request) => addHoursToDate(request.createdAt, ADMIN_SLA_HOURS.renewReview));
  const checkoutReviewDeadlines = checkoutPendingRequests.map((request) => addHoursToDate(request.createdAt, ADMIN_SLA_HOURS.checkoutReview));
  const checkoutFinalDeadlines = checkoutApprovedRequests.map((request) => addHoursToDate(request.reviewedAt ?? request.updatedAt ?? request.createdAt, ADMIN_SLA_HOURS.checkoutFinal));

  const queueItems: ActionQueueItem[] = dedupeCommandItems([
    ...pendingApprovalBookings.slice(0, 4).map((stay) => {
      const createdAt = getStayCreatedAt(stay);
      const deadline = getStayDeadline(stay, ADMIN_SLA_HOURS.bookingReview);
      const meta = getDeadlineMeta(deadline, 'Batas review booking');
      return {
        id: `booking-approval-${stay.id}`,
        ruleId: 'booking-review-sla',
        entityType: 'stay',
        entityId: stay.id,
        priority: meta.isExpired ? 'HIGH' as const : 'MEDIUM' as const,
        type: '1. Review booking',
        subject: stay.tenant?.fullName || stay.room?.code || `Booking #${stay.id}`,
        issue: meta.isExpired
          ? 'Melewati batas review. AutoOps dapat reset pemesanan; tenant harus ajukan ulang jika kamar masih tersedia.'
          : 'Putuskan booking sebelum deadline. Booking belum mengunci kamar sampai pembayaran valid disetujui.',
        receivedAtLabel: createdAt ? makeClock(createdAt) : undefined,
        ...makeQueueTime(deadline),
        recommendedAction: 'Review Booking',
        actionTo: '/stays?status=BOOKINGS',
      };
    }),
    ...paymentReviewItems.slice(0, 4).map((submission) => {
      const receivedAt = submission.createdAt ?? submission.paidAt;
      const urgentAt = addHoursToDate(receivedAt, ADMIN_SLA_HOURS.paymentReviewUrgent);
      const escalateAt = addHoursToDate(receivedAt, ADMIN_SLA_HOURS.paymentReviewEscalate);
      const maxAt = addHoursToDate(receivedAt, ADMIN_SLA_HOURS.paymentReviewMax);
      const maxMeta = getDeadlineMeta(maxAt, 'Batas maksimal review bukti');
      const urgentMeta = getDeadlineMeta(urgentAt, 'Urgent sejak');
      return {
        id: `payment-review-${submission.id}`,
        ruleId: 'payment-review-sla',
        entityType: 'payment-submission',
        entityId: submission.id,
        priority: urgentMeta.isExpired ? 'HIGH' as const : 'MEDIUM' as const,
        type: '2. Review pembayaran',
        subject: submission.invoice?.invoiceNumber || submission.tenant?.fullName || `Bukti #${submission.id}`,
        issue: `Urgent sejak ${urgentAt ? formatClockWib(urgentAt) : '-'}; escalate ${escalateAt ? formatClockWib(escalateAt) : '-'}. Bukti pending tidak auto-cancel, admin harus putuskan.`,
        receivedAtLabel: receivedAt ? makeClock(receivedAt) : undefined,
        deadlineLabel: maxMeta.hasDate ? maxMeta.absoluteLabel : undefined,
        timeStatusLabel: urgentMeta.hasDate ? urgentMeta.relativeLabel : undefined,
        timeStatusTone: urgentMeta.isExpired ? 'warning' as const : 'info' as const,
        recommendedAction: 'Verifikasi',
        actionTo: '/payment-submissions/review',
      };
    }),
    ...renewRequests.slice(0, 3).map((request) => {
      const deadline = addHoursToDate(request.createdAt, ADMIN_SLA_HOURS.renewReview);
      const meta = getDeadlineMeta(deadline, 'Batas review renew');
      return {
        id: `renew-${request.id}`,
        ruleId: 'renew-meter-sla',
        entityType: 'renew',
        entityId: request.id,
        priority: meta.isExpired ? 'HIGH' as const : 'MEDIUM' as const,
        type: '3. Renew meter',
        subject: request.tenant?.fullName || request.stay?.room?.code || `Renew #${request.id}`,
        issue: 'Catat meter listrik/air sebelum approve. Invoice renew harus berisi sewa + utilitas.',
        receivedAtLabel: request.createdAt ? makeClock(request.createdAt) : undefined,
        ...makeQueueTime(deadline),
        recommendedAction: 'Review Renew',
        actionTo: '/renew-requests',
      };
    }),
    ...checkoutPendingRequests.slice(0, 3).map((request) => {
      const deadline = addHoursToDate(request.createdAt, ADMIN_SLA_HOURS.checkoutReview);
      const meta = getDeadlineMeta(deadline, 'Batas review checkout');
      return {
        id: `checkout-request-${request.id}`,
        ruleId: 'checkout-review-sla',
        entityType: 'checkout',
        entityId: request.id,
        priority: meta.isExpired ? 'HIGH' as const : 'MEDIUM' as const,
        type: '4. Review checkout',
        subject: request.stay?.tenant?.fullName || request.stay?.room?.code || `Checkout #${request.id}`,
        issue: 'Review request keluar. Final checkout tetap aksi terpisah setelah invoice clear.',
        receivedAtLabel: request.createdAt ? makeClock(request.createdAt) : undefined,
        ...makeQueueTime(deadline),
        recommendedAction: 'Cek Checkout',
        actionTo: '/stays?status=BOOKINGS',
      };
    }),
    ...checkoutApprovedRequests.slice(0, 3).map((request) => {
      const receivedAt = request.reviewedAt ?? request.updatedAt ?? request.createdAt;
      const deadline = addHoursToDate(receivedAt, ADMIN_SLA_HOURS.checkoutFinal);
      const meta = getDeadlineMeta(deadline, 'Batas final checkout');
      return {
        id: `checkout-final-${request.id}`,
        ruleId: 'checkout-final-sla',
        entityType: 'checkout',
        entityId: request.id,
        priority: meta.isExpired ? 'HIGH' as const : 'MEDIUM' as const,
        type: '4. Final checkout',
        subject: request.stay?.tenant?.fullName || request.stay?.room?.code || `Checkout #${request.id}`,
        issue: 'Request sudah approved. Finalkan checkout jika semua tagihan lunas dan deposit jelas.',
        receivedAtLabel: receivedAt ? makeClock(receivedAt) : undefined,
        ...makeQueueTime(deadline),
        recommendedAction: 'Finalkan',
        actionTo: '/stays?status=BOOKINGS',
      };
    }),
    ...overdueInvoices.slice(0, 3).map((invoice) => {
      const meta = getDeadlineMeta(invoice.dueDate, 'Jatuh tempo tagihan');
      return {
        id: `invoice-${invoice.id}`,
        ruleId: 'invoice-overdue',
        entityType: 'invoice',
        entityId: invoice.id,
        priority: 'HIGH' as const,
        type: 'Blocker tagihan',
        subject: invoice.stay?.tenant?.fullName || invoice.invoiceNumber || `Invoice #${invoice.id}`,
        issue: `Tagihan open memblokir renew/checkout. ${meta.actionLabel}`,
        receivedAtLabel: invoice.issuedAt ? makeClock(invoice.issuedAt) : undefined,
        deadlineLabel: meta.hasDate ? meta.absoluteLabel : undefined,
        timeStatusLabel: meta.hasDate ? meta.relativeLabel : undefined,
        timeStatusTone: 'danger' as const,
        recommendedAction: 'Lihat Tagihan',
        actionTo: `/invoices/${invoice.id}`,
      };
    }),
    ...waitingInitialPaymentBookings.slice(0, 3).map((stay) => {
      const deadline = getStayDeadline(stay, ADMIN_SLA_HOURS.tenantPayment);
      const meta = getDeadlineMeta(deadline, 'Batas bayar tenant');
      return {
        id: `booking-payment-waiting-${stay.id}`,
        ruleId: 'booking-payment-waiting',
        entityType: 'stay',
        entityId: stay.id,
        priority: meta.isExpired ? 'HIGH' as const : 'INFO' as const,
        type: 'Menunggu bayar tenant',
        subject: stay.tenant?.fullName || stay.room?.code || `Booking #${stay.id}`,
        issue: meta.isExpired
          ? 'Tenant melewati batas bayar. AutoOps dapat reset booking dan kamar dilepas.'
          : 'Bukan pekerjaan admin langsung; pantau agar kamar tidak tertahan terlalu lama.',
        receivedAtLabel: getStayCreatedAt(stay) ? makeClock(getStayCreatedAt(stay)) : undefined,
        ...makeQueueTime(deadline),
        recommendedAction: 'Pantau Booking',
        actionTo: '/stays?status=BOOKINGS',
      };
    }),
    ...opsStress.queueItems,
  ]);

  const location = useLocation();
  const activeArea: AdminQueueArea = normalizeAdminArea(new URLSearchParams(location.search).get('area'));
  const filteredQueueItems = queueItems.filter((item) => itemMatchesAdminArea(item, activeArea));
  const topQueueItem = priorityActionFromQueue(filteredQueueItems.length ? filteredQueueItems : queueItems);
  const urgentQueueCount = filteredQueueItems.filter((item) => item.priority === 'BLOCKER' || item.priority === 'HIGH' || item.timeStatusTone === 'danger').length;
  const activeAreaConfig = ADMIN_QUEUE_AREAS.find((area) => area.id === activeArea) ?? ADMIN_QUEUE_AREAS[0];
  const activeAreaMenuItems: AdminAreaMenuItem[] = activeArea === 'stays' ? [
    { id: 'stays-all', icon: '🏠', label: 'Semua Proses', helper: 'Table utama proses sewa aktif', to: '/dashboard?area=stays', count: pendingApprovalCount + waitingInitialPaymentCount + stays.length + pendingRenewCount + pendingCheckoutRequestCount + approvedCheckoutRequestCount, tone: 'info', active: true },
    { id: 'stays-bookings', icon: '📝', label: 'Booking Baru', helper: 'Review booking dan bayar awal', to: '/stays?status=BOOKINGS', count: pendingApprovalCount + waitingInitialPaymentCount, tone: pendingApprovalCount ? 'warning' : 'info' },
    { id: 'stays-active', icon: '🛏️', label: 'Stay Aktif', helper: 'Masa sewa sedang berjalan', to: '/stays', count: stays.length, tone: 'success' },
    { id: 'stays-renew', icon: '🔁', label: 'Perpanjangan', helper: 'Renew request dan meter checkpoint', to: '/renew-requests', count: pendingRenewCount, tone: pendingRenewCount ? 'warning' : 'info' },
    { id: 'stays-checkout', icon: '🚪', label: 'Checkout', helper: 'Review keluar dan final checkout', to: '/stays?status=BOOKINGS', count: pendingCheckoutRequestCount + approvedCheckoutRequestCount, tone: pendingCheckoutRequestCount || approvedCheckoutRequestCount ? 'warning' : 'info' },
    { id: 'stays-tenant', icon: '👤', label: 'Tenant', helper: 'Data tenant dan portal access', to: '/tenants', count: undefined, tone: 'info' },
  ] : activeArea === 'finance' ? [
    { id: 'finance-all', icon: '💳', label: 'Semua Finance', helper: 'Table utama finance di tab ini', to: '/dashboard?area=finance', count: invoices.length + pendingPaymentReviewCount, tone: 'info', active: true },
    { id: 'finance-invoices', icon: '🧾', label: 'Tagihan', helper: 'Semua tagihan tenant', to: '/invoices', count: invoices.length, tone: 'info' },
    { id: 'finance-review', icon: '✅', label: 'Review Pembayaran', helper: 'Bukti bayar pending review', to: '/payment-submissions/review', count: pendingPaymentReviewCount, tone: pendingPaymentReviewCount ? 'warning' : 'success' },
    { id: 'finance-overdue', icon: '⚠️', label: 'Overdue', helper: 'Tagihan lewat jatuh tempo', to: '/invoices', count: overdueInvoices.length, tone: overdueInvoices.length ? 'danger' : 'success' },
    { id: 'finance-draft', icon: '📝', label: 'Draft', helper: 'Tagihan belum diterbitkan', to: '/invoices', count: invoices.filter((invoice) => invoice.status === 'DRAFT').length, tone: 'info' },
    { id: 'finance-expenses', icon: '💸', label: 'Expenses', helper: 'Catatan pengeluaran operasional', to: '/expenses', count: undefined, tone: 'info' },
    { id: 'finance-history', icon: '📚', label: 'Riwayat Pembayaran', helper: 'Pembayaran invoice yang sudah tercatat', to: '/invoice-payments', count: undefined, tone: 'info' },
  ] : activeArea === 'tickets' ? [
    { id: 'tickets-all', icon: '🎫', label: 'Semua Tiket', helper: 'Table utama tiket di tab ini', to: '/dashboard?area=tickets', count: tickets.filter((ticket) => ticket.status !== 'CANCELLED').length, tone: 'info', active: true },
    { id: 'tickets-assign', icon: '👷', label: 'Perlu Assign', helper: 'Tiket baru belum punya petugas', to: '/tickets', count: tickets.filter((ticket) => ticket.status === 'OPEN' && !ticket.assignedToId).length, tone: 'warning' },
    { id: 'tickets-progress', icon: '🔧', label: 'Dikerjakan', helper: 'Sedang ditangani staff', to: '/tickets', count: tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length, tone: 'info' },
    { id: 'tickets-check', icon: '✅', label: 'Perlu Cek', helper: 'Staff selesai, admin konfirmasi', to: '/tickets', count: tickets.filter((ticket) => ticket.status === 'DONE').length, tone: 'warning' },
    { id: 'tickets-final', icon: '📦', label: 'Selesai', helper: 'Tiket final/closed', to: '/tickets', count: tickets.filter((ticket) => ticket.status === 'CLOSED').length, tone: 'success' },
  ] : activeArea === 'staff' ? [
    { id: 'staff-score', icon: '👥', label: 'Staff & Skor', helper: 'Table skor staff di tab ini', to: '/dashboard?area=staff', count: staffPerformanceItems.length, tone: 'info', active: true },
    { id: 'staff-checklist', icon: '📋', label: 'Checklist', helper: 'Checklist harian/mingguan/bulanan staff', to: '/staff-routines', count: undefined, tone: 'success' },
    { id: 'staff-reports', icon: '📝', label: 'Laporan Lapangan', helper: 'Review laporan kondisi dari staff', to: '/tickets', count: tickets.filter((ticket) => Boolean(ticket.linkedRoomItemId || ticket.linkedInventoryItemId)).length, tone: 'warning' },
    { id: 'staff-performance', icon: '📈', label: 'Kinerja', helper: 'Detail performa dan ulasan staff', to: '/staff-performance', count: undefined, tone: 'info' },
  ] : activeArea === 'rooms' ? [
    { id: 'rooms-list', icon: '🏘️', label: 'Kamar', helper: 'Status kamar dan occupancy', to: '/dashboard?area=rooms', count: rooms.length, tone: 'info', active: true },
    { id: 'rooms-room-items', icon: '🪑', label: 'Barang Kamar', helper: 'Inventaris per kamar', to: '/room-items', count: undefined, tone: 'info' },
    { id: 'rooms-stock', icon: '📦', label: 'Stok Gudang', helper: 'Barang gudang dan stok minimum', to: '/inventory-items', count: inventoryItems.length, tone: 'info' },
    { id: 'rooms-movements', icon: '🔄', label: 'Mutasi Stok', helper: 'Riwayat masuk/keluar/pasang barang', to: '/inventory-movements', count: undefined, tone: 'info' },
    { id: 'rooms-low-stock', icon: '⚠️', label: 'Stok Menipis', helper: 'Barang butuh restock', to: '/dashboard?area=rooms', count: inventoryItems.filter(isLowStockItem).length, tone: inventoryItems.filter(isLowStockItem).length ? 'warning' : 'success' },
  ] : [];

  const refreshDashboard = () => {
    void Promise.all([
      roomsQuery.refetch(), inventoryItemsQuery.refetch(), staysQuery.refetch(), bookingsQuery.refetch(), invoicesQuery.refetch(), ticketsQuery.refetch(), depositCompleteStaysQuery.refetch(),
      renewRequestsQuery.refetch(), checkoutRequestsPendingQuery.refetch(), checkoutRequestsApprovedQuery.refetch(), paymentReviewQuery.refetch(), staffPerformanceQuery.refetch(), autoOpsQuery.refetch(),
    ]);
  };

  if (roomsQuery.isLoading || inventoryItemsQuery.isLoading || staysQuery.isLoading || bookingsQuery.isLoading || invoicesQuery.isLoading || ticketsQuery.isLoading || depositCompleteStaysQuery.isLoading || renewRequestsQuery.isLoading || checkoutRequestsPendingQuery.isLoading || checkoutRequestsApprovedQuery.isLoading || paymentReviewQuery.isLoading) return <LoadingDashboard />;
  if (roomsQuery.isError || inventoryItemsQuery.isError || staysQuery.isError || bookingsQuery.isError || invoicesQuery.isError || ticketsQuery.isError || depositCompleteStaysQuery.isError || renewRequestsQuery.isError || checkoutRequestsPendingQuery.isError || checkoutRequestsApprovedQuery.isError || paymentReviewQuery.isError) return <Alert variant="danger">Gagal memuat command center admin.</Alert>;

  return (
    <div className="admin-dashboard-queue-first admin-dashboard-simplified">
      <AdminCommandHeader
        totalQueue={filteredQueueItems.length}
        urgentCount={urgentQueueCount}
        activeAreaLabel={activeAreaConfig.label}
        topQueueItem={topQueueItem}
      />

      <AssistantInsightLine
        title="Asisten Operasional"
        tone={urgentQueueCount ? 'warning' : topQueueItem ? 'info' : 'success'}
        message={topQueueItem ? `${topQueueItem.type}: ${topQueueItem.issue}` : activeArea === 'today' ? 'Tidak ada blocker besar. Gunakan sidebar untuk membuka detail per area.' : `${activeAreaConfig.label} sedang aman. Data utama ada di table, sub-menu area ada tepat di bawah ini.`}
      />

      {activeArea !== 'today' ? (
        <AdminAreaInternalMenu
          title={`Menu ${activeAreaConfig.label}`}
          items={activeAreaMenuItems}
          onNavigate={navigate}
        />
      ) : null}

      {activeArea === 'today' ? (
        <AdminTodayStatusStrip
          rooms={rooms}
          inventoryItems={inventoryItems}
          invoices={invoices}
          tickets={tickets}
          pendingPaymentReviewCount={pendingPaymentReviewCount}
          pendingApprovalCount={pendingApprovalCount}
          pendingRenewCount={pendingRenewCount}
          checkoutCount={pendingCheckoutRequestCount + approvedCheckoutRequestCount}
        />
      ) : null}

      {activeArea === 'stays' ? <AdminProcessLine /> : null}
      {activeArea === 'stays' ? (
        <AdminStaysUnifiedList
          activeStays={stays}
          bookingReview={pendingApprovalBookings}
          waitingPayment={waitingInitialPaymentBookings}
          renewRequests={renewRequests}
          checkoutPending={checkoutPendingRequests}
          checkoutApproved={checkoutApprovedRequests}
          onNavigate={navigate}
        />
      ) : null}
      {activeArea === 'staff' ? <AdminStaffFrontlineList items={staffPerformanceItems} isLoading={staffPerformanceQuery.isLoading} /> : null}
      {activeArea === 'tickets' ? <AdminTicketsWorkspace tickets={tickets} onNavigate={navigate} /> : null}
      {activeArea === 'rooms' ? <AdminRoomsStockWorkspace rooms={rooms} inventoryItems={inventoryItems} onNavigate={navigate} /> : null}
      {activeArea === 'finance' ? (
        <AdminFinanceWorkspace
          invoices={invoices}
          paymentReviewItems={paymentReviewItems}
          onNavigate={navigate}
        />
      ) : null}

      {activeArea === 'today' ? <ActionQueueTable
        title="Pekerjaan hari ini yang butuh keputusan"
        subtitle="Hanya antrean operasional utama. Menu Stays & Tenant, Finance, Staff & Tiket, dan Kamar & Stok punya table data masing-masing."
        items={filteredQueueItems}
        emptyTitle="Tidak ada item mendesak hari ini"
        emptyDescription="Semua area operasional sedang aman. Cek menu sidebar jika ingin membuka data lengkap."
        maxItems={12}
        collapsible={false}
        hideActions
      /> : null}

      {(activeArea === 'today' || activeArea === 'stays' || activeArea === 'finance') ? <AdminSlaMiniNote status={autoOpsQuery.data} /> : null}
    </div>
  );
}


function StaffDashboard() {
  const { user } = useAuth();
  const ticketsQuery = useQuery({ queryKey: ['dashboard-staff', 'tickets'], queryFn: () => listResource<Ticket>('/tickets', { limit: 150 }), ...ACTION_QUERY_OPTIONS });
  const roomsQuery = useQuery({ queryKey: ['dashboard-staff', 'rooms'], queryFn: () => listResource<Room>('/rooms', { limit: 150 }), ...MEDIUM_FRESH_QUERY_OPTIONS });
  const routineTodayQuery = useQuery({ queryKey: ['dashboard-staff', 'routines-today'], queryFn: fetchStaffRoutineToday, ...ACTION_QUERY_OPTIONS });
  const routineKpiQuery = useQuery({ queryKey: ['dashboard-staff', 'routine-kpi'], queryFn: fetchMyStaffRoutineKpi, ...MEDIUM_FRESH_QUERY_OPTIONS });

  const tickets = ticketsQuery.data?.items ?? [];
  const rooms = roomsQuery.data?.items ?? [];
  const opsStress = useOperationalStressIndex({ tickets, rooms });
  const queueItems: ActionQueueItem[] = dedupeCommandItems([
    ...opsStress.queueItems,
  ]);

  const refreshDashboard = () => {
    void Promise.all([ticketsQuery.refetch(), roomsQuery.refetch(), routineTodayQuery.refetch(), routineKpiQuery.refetch()]);
  };

  if (ticketsQuery.isLoading || roomsQuery.isLoading) return <LoadingDashboard />;
  if (ticketsQuery.isError || roomsQuery.isError) return <Alert variant="danger">Gagal memuat beranda kerja. Muat ulang halaman.</Alert>;

  return (
    <div className="staff-simple-mode">
      <StaffMotivationDashboard
        user={user}
        tickets={tickets}
        queueItems={queueItems}
        onRefresh={refreshDashboard}
        routineToday={routineTodayQuery.data}
        routineKpi={routineKpiQuery.data}
        routinesLoading={routineTodayQuery.isLoading || routineKpiQuery.isLoading}
        onRoutineUpdated={refreshDashboard}
      />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === 'OWNER') return <OwnerDashboard />;
  if (user?.role === 'ADMIN') return <AdminDashboard />;
  if (user?.role === 'STAFF') return <StaffDashboard />;
  return <Navigate to={getDefaultRoute(user?.role)} replace />;
}
