import { useState, type ReactNode } from 'react';
import { Alert, Button, Card, Col, Modal, Row, Table } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import EmptyState from '../../components/common/EmptyState';
import PaginationControls from '../../components/common/PaginationControls';
import StatusBadge from '../../components/common/StatusBadge';
import { AssistantPanel, ActionQueueTable, type ActionQueueItem, type AssistantItem, type MetricChip } from '../../components/command-center';
import { AssistantInsightLine, EntityBadgeFilterBar } from '../../components/workspace';
import AutoOpsControlPanel from '../../components/auto-ops/AutoOpsControlPanel';
import SmartChartPanel, { type SmartChartPoint } from '../../components/charts/SmartChartPanel';
import { generateBrief, getOwnerAiStatus, type BriefResult } from '../../api/ai';
import AiAssistButton from '../../components/ai/AiAssistButton';
import AiResultPanel from '../../components/ai/AiResultPanel';
import { listResource, postAction } from '../../api/resources';
import { listAdminRenewRequests } from '../../api/renewRequests';
import { listAdminCheckoutRequests } from '../../api/checkoutRequests';
import { listPaymentReviewQueue } from '../../api/paymentSubmissions';
import { fetchAutoOpsStatus } from '../../api/autoOps';
import { fetchAdminStaffPerformance } from '../../api/staffPerformance';
import { useOperationalStressIndex } from '../../hooks/useOperationalStressIndex';
import { useClientPagination } from '../../hooks/useClientPagination';
import { dedupeCommandItems } from '../../utils/commandCenterDedup';
import { addHoursToDate, formatDateTimeWib, getDeadlineMeta } from '../../utils/dateTime';
import { getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import type { CheckoutRequest, InventoryItem, Invoice, PaymentSubmission, RenewRequest, Room, Stay, Ticket } from '../../types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type AutoOpsStatusLike, type AdminWorkLane,
  ACTION_QUERY_OPTIONS, MEDIUM_FRESH_QUERY_OPTIONS, ADMIN_SLA_HOURS,
  formatDateSafe, formatNumber,
  daysFromToday, isOpenInvoice, isTerlambat, isDueSoon,
  isReservedBookingPendingApproval, isReservedBookingWaitingPayment, isExpiredAdminBooking,
  getStayCreatedAt, getStayDeadline, getInvoiceTime,
  makeClock, makeLastUpdatedLabel, makeQueueTime, earliestDeadlineLabel, priorityActionFromQueue,
  makePaymentCount, makeRoomPoints, makePercent, countExpiredDates, isLowStockItem,
  LoadingDashboard,
} from './dashboardShared';
import { AdminStaffFrontlineList, AdminStaysUnifiedList, AdminFinanceWorkspace, AdminTicketsWorkspace, AdminRoomsStockWorkspace } from './AdminWorkspaces';

// FASE-H: area kerja admin dipadatkan dari 6 → 3 (Ringkasan · Penghuni & Uang · Operasional).
type AdminQueueArea = 'overview' | 'stays-finance' | 'ops';

const ADMIN_QUEUE_AREAS: Array<{ id: AdminQueueArea; label: string; helper: string }> = [
  { id: 'overview', label: 'Ringkasan', helper: 'Orientasi cepat: kondisi hari ini dan pekerjaan yang butuh keputusan.' },
  { id: 'stays-finance', label: 'Penghuni & Uang', helper: 'Booking, penghuni aktif, perpanjangan, keluar, tagihan, dan pembayaran.' },
  { id: 'ops', label: 'Operasional', helper: 'Tiket, staff, rutinitas, kamar, stok, dan inventaris.' },
];

function normalizeAdminArea(value: string | null | undefined): AdminQueueArea {
  if (value === 'stays-finance' || value === 'stays' || value === 'finance') return 'stays-finance';
  if (value === 'ops' || value === 'tickets' || value === 'staff' || value === 'rooms') return 'ops';
  return 'overview';
}

function itemMatchesAdminArea(item: ActionQueueItem, area: AdminQueueArea): boolean {
  if (area === 'overview') return true;
  const haystack = `${item.ruleId ?? ''} ${item.entityType ?? ''} ${item.type ?? ''} ${item.subject ?? ''}`.toLowerCase();
  if (area === 'stays-finance') return /stay|booking|renew|checkout|tenant|sewa|pemesanan|perpanjangan|payment|invoice|tagihan|bayar|bukti|overdue|submission/.test(haystack);
  if (area === 'ops') return /ticket|tiket|repair|perbaikan|staff|routine|checklist|laporan|kinerja|room|kamar|inventory|inventaris|maintenance|stok|barang/.test(haystack);
  return true;
}


function makeAdminFinancePoints(invoices: Invoice[], pendingPaymentReviewCount: number): SmartChartPoint[] {
  const open = invoices.filter(isOpenInvoice).length;
  const overdue = invoices.filter(isTerlambat).length;
  const draft = invoices.filter((invoice) => invoice.status === 'DRAFT').length;
  const paid = invoices.filter((invoice) => invoice.status === 'PAID').length;
  return [
    { label: 'Open', value: open, detail: 'Tagihan belum lunas/cancel', to: '/invoices' },
    { label: 'Bukti review', value: pendingPaymentReviewCount, detail: 'Perlu keputusan admin', to: '/payment-submissions/review' },
    { label: 'Terlambat', value: overdue, detail: 'Tagihan terlambat', to: '/invoices' },
    { label: 'Belum Terbit', value: draft, detail: 'Belum diterbitkan', to: '/invoices' },
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
    { label: 'Menunggu cek', value: done, detail: 'Staff selesai, admin cek akhir', to: '/tickets' },
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
  const isOverview = activeAreaLabel === 'Ringkasan';
  const headline = totalQueue
    ? `${totalQueue} pekerjaan ${isOverview ? 'hari ini' : `di area ${activeAreaLabel}`}`
    : `${activeAreaLabel} aman`;
  const status = urgentCount ? `${urgentCount} urgent/terlambat` : 'Tidak ada deadline merah';
  return (
    <div className="admin-command-head admin-command-head-slim admin-tab-heading">
      <div>
        <div className="page-eyebrow mb-2"><span className="page-eyebrow-dot" /> Admin Command Center</div>
        <h1>{activeAreaLabel}</h1>
        <p>{headline}. Dashboard memuat data sesuai area kerja. Gunakan sidebar kiri untuk membuka halaman detail.</p>
        <div className="admin-command-status-line">
          <span>{status}</span>
          <span>Terakhir update: {makeLastUpdatedLabel()}</span>
        </div>
      </div>
    </div>
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

function AdminHealthChips({ metrics }: { metrics: MetricChip[] }) {
  return (
    <div className="admin-health-chip-row" aria-label="Ringkasan kesehatan admin">
      {metrics.map((metric) => (
        <button type="button" key={metric.id} className={`admin-health-chip ${metric.status?.toLowerCase() ?? 'info'}`} onClick={() => metric.to ? window.location.assign(metric.to) : metric.onClick?.()}>
          <span>{metric.icon ?? '•'} {metric.label}</span>
          <strong>{metric.value}</strong>
          <em>{metric.helper ?? metric.statusLabel ?? 'Aman'}</em>
        </button>
      ))}
    </div>
  );
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

function AdminTodayStatusStrip({ rooms, inventoryItems, invoices, tickets, pendingPaymentReviewCount, pendingApprovalCount, pendingRenewCount, checkoutCount }: { rooms: Room[]; inventoryItems: any[]; invoices: Invoice[]; tickets: Ticket[]; pendingPaymentReviewCount: number; pendingApprovalCount: number; pendingRenewCount: number; checkoutCount: number }) {
  const occupied = rooms.filter((room) => room.status === 'OCCUPIED').length;
  const available = rooms.filter((room) => room.status === 'AVAILABLE').length;
  const activeTickets = tickets.filter((ticket) => ['OPEN', 'IN_PROGRESS', 'DONE'].includes(ticket.status)).length;
  const waitingAdminTickets = tickets.filter((ticket) => ticket.status === 'DONE').length;
  const lowStock = inventoryItems.filter(isLowStockItem).length;
  const openInvoices = invoices.filter(isOpenInvoice).length;
  const overdueInvoices = invoices.filter(isTerlambat).length;
  const occupancyPercent = makePercent(occupied, rooms.length);
  const financeRisk = overdueInvoices + pendingPaymentReviewCount;
  const stayWork = pendingApprovalCount + pendingRenewCount + checkoutCount;
  const strips = [
    { label: 'Hunian', value: `${occupied}/${rooms.length || 0}`, helper: `${available} kamar kosong`, detail: `${occupancyPercent}% terisi`, percent: occupancyPercent, tone: occupancyPercent >= 80 ? 'success' : 'info' },
    { label: 'Masa sewa', value: String(stayWork), helper: stayWork ? 'butuh keputusan' : 'alur aman', detail: `${pendingApprovalCount} booking · ${pendingRenewCount} perpanjangan · ${checkoutCount} keluar`, tone: stayWork ? 'warning' : 'success' },
    { label: 'Finance', value: String(openInvoices), helper: financeRisk ? `${financeRisk} risiko bayar` : 'tidak ada risiko urgent', detail: `${overdueInvoices} overdue · ${pendingPaymentReviewCount} bukti review`, tone: financeRisk ? 'danger' : 'success' },
    { label: 'Staff & Tiket', value: String(activeTickets), helper: activeTickets ? 'tiket aktif/perlu cek' : 'staff & tiket aman', detail: `${waitingAdminTickets} menunggu cek admin`, tone: waitingAdminTickets ? 'warning' : activeTickets ? 'info' : 'success' },
    { label: 'Kamar & Stok', value: String(lowStock), helper: lowStock ? 'stok menipis' : 'stok aman', detail: `${inventoryItems.length} item dipantau`, tone: lowStock ? 'warning' : 'success' },
  ];
  return (
    <div className="admin-today-status-strip" aria-label="Kondisi operasional hari ini">
      {strips.map((strip) => (
        <div className={`admin-today-status-item ${strip.tone}`} key={strip.label}>
          <div className="status-strip-top"><span>{strip.label}</span><strong>{strip.value}</strong></div>
          {strip.percent !== undefined ? <div className="status-strip-bar" aria-hidden="true"><i style={{ width: `${strip.percent}%` }} /></div> : null}
          <small>{strip.helper}</small>
          <em>{strip.detail}</em>
        </div>
      ))}
    </div>
  );
}

type AdminOperationsCommandQueueProps = { lanes: AdminWorkLane[]; assistantItems: AssistantItem[]; metrics: MetricChip[]; topQueueItem?: ActionQueueItem; queueItems: ActionQueueItem[]; onNavigate: (to: string) => void };

function AdminOperationsCommandQueue({ lanes, assistantItems, metrics, topQueueItem, queueItems, onNavigate }: AdminOperationsCommandQueueProps) {
  const blockerCount = queueItems.filter((item) => item.priority === 'BLOCKER' || item.timeStatusTone === 'danger').length;
  const decisionCount = lanes.reduce((sum, lane) => sum + lane.value, 0);
  const primaryAction = topQueueItem?.actionTo ?? lanes.find((lane) => lane.value > 0)?.to ?? '/dashboard';
  const primaryLabel = topQueueItem?.recommendedAction ?? lanes.find((lane) => lane.value > 0)?.action ?? 'Cek dashboard';
  return (
    <Card className="content-card border-0 admin-operations-command-card mb-3">
      <Card.Body>
        <div className="admin-ops-command-hero">
          <div>
            <div className="admin-section-label">Antrean Operasional Admin</div>
            <h2>Kerjakan yang mengunci flow dulu.</h2>
            <p>Dashboard ini menggabungkan pemesanan, pembayaran, perpanjangan, keluar, tagihan, tiket, dan stok menjadi antrean aksi harian.</p>
          </div>
          <div className="admin-ops-command-summary">
            <span>{decisionCount} pekerjaan aktif</span>
            <strong>{blockerCount ? `${blockerCount} blocker` : 'Tidak ada blocker merah'}</strong>
            <Button variant={blockerCount ? 'primary' : 'outline-primary'} size="sm" onClick={() => onNavigate(primaryAction)}>{primaryLabel}</Button>
          </div>
        </div>
        <AdminContinuityStrip lanes={lanes} onNavigate={onNavigate} />
        <div className="admin-ops-command-grid">
          <div>
            <AssistantPanel title="Daily Assistant Admin" subtitle="Ringkasan pekerjaan yang paling berdampak ke kamar, uang masuk, dan tenant." items={assistantItems} emptyTitle="Operasional hari ini aman" emptyMessage="Tidak ada bukti bayar pending, checkout macet, perpanjangan pending, tagihan overdue, atau tiket penting dari data yang dimuat." maxItems={4} collapsible={false} />
          </div>
          <div>
            <AdminHealthChips metrics={metrics} />
            <div className="admin-ops-guardrails mt-3">
              <div><strong>Payment</strong><span>Admin hanya verifikasi/reject bukti; AutoOps tidak approve pembayaran.</span></div>
              <div><strong>Perpanjangan</strong><span>Wajib melewati cek meter dan tagihan perpanjangan.</span></div>
              <div><strong>Keluar</strong><span>Final keluar tetap manual dan harus bebas tagihan aktif.</span></div>
              <div><strong>Deposit</strong><span>Refund/deduction/forfeit tetap keputusan admin/owner, bukan otomatis.</span></div>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

function AdminOverviewCharts({ activeArea, rooms, invoices, tickets, pendingPaymentReviewCount, pendingApprovalCount, waitingInitialPaymentCount, pendingRenewCount, checkoutCount }: { activeArea: AdminQueueArea; rooms: Room[]; invoices: Invoice[]; tickets: Ticket[]; pendingPaymentReviewCount: number; pendingApprovalCount: number; waitingInitialPaymentCount: number; pendingRenewCount: number; checkoutCount: number }) {
  const stayPoints: SmartChartPoint[] = [
    { label: 'Review booking', value: pendingApprovalCount, detail: 'Menunggu keputusan admin', to: '/stays?status=BOOKINGS' },
    { label: 'Menunggu bayar', value: waitingInitialPaymentCount, detail: 'Tenant punya deadline bayar', to: '/stays?status=BOOKINGS' },
    { label: 'Cek meter perpanjangan', value: pendingRenewCount, detail: 'Butuh cek meter', to: '/renew-requests' },
    { label: 'Keluar', value: checkoutCount, detail: 'Review dan finalkan keluar', to: '/stays?status=BOOKINGS' },
  ];
  if (activeArea === 'overview') return null;
  const panels: Array<{ id: string; area: AdminQueueArea[]; node: ReactNode }> = [
    { id: 'stays-finance-overview', area: ['stays-finance'], node: (
      <Row className="g-3">
        <Col lg={6}><SmartChartPanel title="Penghuni & Masa Sewa" subtitle="Booking, bayar awal, perpanjangan, dan keluar dalam satu alur." points={stayPoints} defaultMode="bar" ctaLabel="Buka masa sewa" ctaTo="/stays" totalLabel="Alur" /></Col>
        <Col lg={6}><SmartChartPanel title="Keuangan" subtitle="Tagihan, bukti pembayaran, draft, dan overdue." points={makeAdminFinancePoints(invoices, pendingPaymentReviewCount)} defaultMode="bar" ctaLabel="Semua tagihan" ctaTo="/invoices" totalLabel="Keuangan" /></Col>
      </Row>
    ) },
    { id: 'ops-overview', area: ['ops'], node: (
      <Row className="g-3">
        <Col lg={4}><SmartChartPanel title="Tiket" subtitle="Baru, dikerjakan, dan menunggu cek admin." points={makeAdminTicketPoints(tickets)} defaultMode="bar" ctaLabel="Buka tiket" ctaTo="/tickets" totalLabel="Tiket" /></Col>
        <Col lg={4}><SmartChartPanel title="Staff" subtitle="Ketersediaan kerja dari tiket aktif." points={makeAdminStaffPoints(tickets)} defaultMode="bar" ctaLabel="Kinerja staff" ctaTo="/staff-performance" totalLabel="Staff" /></Col>
        <Col lg={4}><SmartChartPanel title="Kamar" subtitle="Status okupansi dan kesiapan kamar." points={makeRoomPoints(rooms)} defaultMode="bar" ctaLabel="Status kamar" ctaTo="/rooms" totalLabel="Kamar" /></Col>
      </Row>
    ) },
  ];
  const visible = panels.filter((panel) => panel.area.includes(activeArea));
  const hasUsefulData = (() => {
    if (activeArea === 'stays-finance') return pendingApprovalCount + waitingInitialPaymentCount + pendingRenewCount + checkoutCount > 0 || invoices.some(isOpenInvoice) || pendingPaymentReviewCount > 0;
    if (activeArea === 'ops') return tickets.some((ticket) => ['OPEN', 'IN_PROGRESS', 'DONE'].includes(ticket.status)) || rooms.some((room) => ['OCCUPIED', 'RESERVED', 'MAINTENANCE', 'INACTIVE'].includes(room.status));
    return false;
  })();
  if (!visible.length || !hasUsefulData) return null;
  return (
    <div className="admin-overview-charts">
      {visible.map((panel) => <div key={panel.id}>{panel.node}</div>)}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeArea: AdminQueueArea = normalizeAdminArea(new URLSearchParams(location.search).get('area'));
  // OWN-ROUTE-SPLIT: tetap di dashboard yang sama (OWNER `/admin-dashboard` atau ADMIN `/dashboard`) saat pindah area.
  const dashboardBase = location.pathname === '/admin-dashboard' ? '/admin-dashboard' : '/dashboard';
  // FASE-H: 3 area. Overview memuat semua (status strip + antrean butuh seluruh data).
  const isOverview = activeArea === 'overview';
  const needsStaysData = isOverview || activeArea === 'stays-finance';
  const needsFinanceData = isOverview || activeArea === 'stays-finance';
  const needsTicketData = isOverview || activeArea === 'ops';
  const needsRoomData = isOverview || activeArea === 'ops';
  const needsInventoryData = isOverview || activeArea === 'ops';
  const needsAutoOpsData = isOverview;
  const needsStaffPerformanceData = activeArea === 'ops';

  const roomsQuery = useQuery({ queryKey: ['dashboard-admin', 'rooms', activeArea], queryFn: () => listResource<Room>('/rooms', { limit: isOverview ? 500 : 120 }), enabled: needsRoomData, ...MEDIUM_FRESH_QUERY_OPTIONS });
  const inventoryItemsQuery = useQuery({ queryKey: ['dashboard-admin', 'inventory-items', activeArea], queryFn: () => listResource<any>('/inventory-items', { limit: isOverview ? 150 : 80 }), enabled: needsInventoryData, ...MEDIUM_FRESH_QUERY_OPTIONS });
  const staysQuery = useQuery({ queryKey: ['dashboard-admin', 'stays-active', activeArea], queryFn: () => listResource<Stay>('/stays', { status: 'ACTIVE', limit: isOverview ? 300 : 160 }), enabled: needsStaysData, ...MEDIUM_FRESH_QUERY_OPTIONS });
  const invoicesQuery = useQuery({ queryKey: ['dashboard-admin', 'invoices', activeArea], queryFn: () => listResource<Invoice>('/invoices', { limit: isOverview ? 500 : 180 }), enabled: needsFinanceData, ...MEDIUM_FRESH_QUERY_OPTIONS });
  const ticketsQuery = useQuery({ queryKey: ['dashboard-admin', 'tickets', activeArea], queryFn: () => listResource<Ticket>('/tickets', { limit: isOverview ? 150 : 100 }), enabled: needsTicketData, ...MEDIUM_FRESH_QUERY_OPTIONS });
  const renewRequestsQuery = useQuery({ queryKey: ['dashboard-admin', 'renew-requests', activeArea], queryFn: () => listAdminRenewRequests(), enabled: needsStaysData, ...MEDIUM_FRESH_QUERY_OPTIONS });
  const checkoutRequestsPendingQuery = useQuery({ queryKey: ['dashboard-admin', 'checkout-requests-pending', activeArea], queryFn: () => listAdminCheckoutRequests({ status: 'PENDING' }), enabled: needsStaysData, ...ACTION_QUERY_OPTIONS });
  const checkoutRequestsApprovedQuery = useQuery({ queryKey: ['dashboard-admin', 'checkout-requests-approved', activeArea], queryFn: () => listAdminCheckoutRequests({ status: 'APPROVED' }), enabled: needsStaysData, ...ACTION_QUERY_OPTIONS });
  const paymentReviewQuery = useQuery({ queryKey: ['dashboard-admin', 'payment-review', activeArea], queryFn: () => listPaymentReviewQueue({ limit: isOverview ? 25 : 15 }), enabled: needsFinanceData, ...ACTION_QUERY_OPTIONS });
  const staffPerformanceQuery = useQuery({ queryKey: ['dashboard-admin', 'staff-performance', activeArea], queryFn: () => fetchAdminStaffPerformance(), enabled: needsStaffPerformanceData, ...MEDIUM_FRESH_QUERY_OPTIONS });
  const autoOpsQuery = useQuery({ queryKey: ['dashboard-admin', 'auto-ops-status', activeArea], queryFn: fetchAutoOpsStatus, enabled: needsAutoOpsData, ...ACTION_QUERY_OPTIONS });
  // H4: status AI untuk conditional render AiAssistButton di area overview
  const aiStatusQuery = useQuery({ queryKey: ['owner-ai-status'], queryFn: getOwnerAiStatus, staleTime: 300_000, retry: 1 });

  const rooms = roomsQuery.data?.items ?? [];
  const inventoryItems = inventoryItemsQuery.data?.items ?? [];
  const stays = staysQuery.data?.items ?? [];
  const invoices = invoicesQuery.data?.items ?? [];
  const tickets = ticketsQuery.data?.items ?? [];
  const renewRequests = renewRequestsQuery.data?.items?.filter((rr: RenewRequest) =>
    ['PENDING', 'PENDING_DECISION', 'AWAITING_DP', 'DP_SECURED'].includes(rr.status),
  ) ?? [];
  const checkoutPendingRequests = checkoutRequestsPendingQuery.data?.items ?? [];
  const checkoutApprovedRequests = checkoutRequestsApprovedQuery.data?.items ?? [];
  const paymentReviewItems = (paymentReviewQuery.data?.items ?? []).filter((submission: PaymentSubmission) => submission.status === 'PENDING_REVIEW');
  const staffPerformanceItems = staffPerformanceQuery.data?.items ?? [];
  const pendingRenewCount = renewRequests.length;
  const pendingCheckoutRequestCount = checkoutPendingRequests.length;
  const approvedCheckoutRequestCount = checkoutApprovedRequests.length;
  const pendingPaymentReviewCount = makePaymentCount(paymentReviewItems, paymentReviewQuery.data?.meta?.totalItems);
  const overdueInvoices = invoices.filter(isTerlambat);
  const dueSoonInvoices = invoices.filter(isDueSoon);
  const pendingApprovalBookings = stays.filter((stay) => isReservedBookingPendingApproval(stay) && !isExpiredAdminBooking(stay));
  const waitingInitialPaymentBookings = stays.filter((stay) => isReservedBookingWaitingPayment(stay) && !isExpiredAdminBooking(stay));
  const pendingApprovalCount = pendingApprovalBookings.length;
  const waitingInitialPaymentCount = waitingInitialPaymentBookings.length;
  const opsStress = useOperationalStressIndex({ tickets, rooms, pendingCheckoutRequestCount, approvedCheckoutRequestCount, pendingRenewCount, pendingApprovalCount });

  const bookingReviewDeadlines = pendingApprovalBookings.map((stay) => getStayDeadline(stay, ADMIN_SLA_HOURS.bookingReview));
  const tenantPaymentDeadlines = waitingInitialPaymentBookings.map((stay) => getStayDeadline(stay, ADMIN_SLA_HOURS.tenantPayment));
  const paymentMaxDeadlines = paymentReviewItems.map((submission: PaymentSubmission) => addHoursToDate(submission.createdAt ?? submission.paidAt, ADMIN_SLA_HOURS.paymentReviewMax));
  const renewReviewDeadlines = renewRequests.map((request: RenewRequest) => addHoursToDate(request.createdAt, ADMIN_SLA_HOURS.renewReview));
  const checkoutReviewDeadlines = checkoutPendingRequests.map((request: CheckoutRequest) => addHoursToDate(request.createdAt, ADMIN_SLA_HOURS.checkoutReview));
  const checkoutFinalDeadlines = checkoutApprovedRequests.map((request: CheckoutRequest) => addHoursToDate(request.reviewedAt ?? request.updatedAt ?? request.createdAt, ADMIN_SLA_HOURS.checkoutFinal));
  const lowStockCount = inventoryItems.filter(isLowStockItem).length;
  const activeTicketCount = tickets.filter((ticket) => ['OPEN', 'IN_PROGRESS', 'DONE'].includes(ticket.status)).length;
  const ticketWaitingAdminCount = tickets.filter((ticket) => ticket.status === 'DONE').length;
  const unassignedTicketCount = tickets.filter((ticket) => ticket.status === 'OPEN' && !ticket.assignedToId).length;
  const openInvoiceCount = invoices.filter(isOpenInvoice).length;
  const overdueInvoiceCount = overdueInvoices.length;
  const checkoutWorkCount = pendingCheckoutRequestCount + approvedCheckoutRequestCount;
  const expiredBookingReviewCount = countExpiredDates(bookingReviewDeadlines);
  const expiredTenantPaymentCount = countExpiredDates(tenantPaymentDeadlines);
  const expiredPaymentReviewCount = countExpiredDates(paymentMaxDeadlines);
  const expiredRenewCount = countExpiredDates(renewReviewDeadlines);
  const expiredCheckoutCount = countExpiredDates([...checkoutReviewDeadlines, ...checkoutFinalDeadlines]);

  const adminWorkLanes: AdminWorkLane[] = [
    { id: 'booking-review', step: '1', title: 'Review booking', value: pendingApprovalCount, helper: pendingApprovalCount ? 'Putuskan booking sebelum kamar tertahan terlalu lama.' : 'Tidak ada booking baru yang menunggu admin.', sla: `${ADMIN_SLA_HOURS.bookingReview} jam`, nextDeadline: earliestDeadlineLabel(bookingReviewDeadlines), action: 'Review Booking', to: '/stays?status=BOOKINGS', tone: expiredBookingReviewCount ? 'danger' : pendingApprovalCount ? 'warning' : 'success' },
    { id: 'payment-review', step: '2', title: 'Verifikasi pembayaran', value: pendingPaymentReviewCount, helper: pendingPaymentReviewCount ? 'Bukti pending tidak boleh auto-cancel; admin harus putuskan.' : 'Tidak ada bukti bayar pending review.', sla: `${ADMIN_SLA_HOURS.paymentReviewUrgent}/${ADMIN_SLA_HOURS.paymentReviewMax} jam`, nextDeadline: earliestDeadlineLabel(paymentMaxDeadlines), action: 'Verifikasi Pembayaran', to: '/payment-submissions/review', tone: expiredPaymentReviewCount ? 'danger' : pendingPaymentReviewCount ? 'warning' : 'success' },
    { id: 'renew-checkpoint', step: '3', title: 'Review Perpanjangan', value: pendingRenewCount, helper: pendingRenewCount ? 'Catat meter sebelum approve dan tagihan perpanjangan.' : 'Tidak ada perpanjangan menunggu approval.', sla: `${ADMIN_SLA_HOURS.renewReview} jam`, nextDeadline: earliestDeadlineLabel(renewReviewDeadlines), action: 'Review Perpanjangan', to: '/renew-requests', tone: expiredRenewCount ? 'danger' : pendingRenewCount ? 'warning' : 'success' },
    { id: 'checkout-flow', step: '4', title: 'Keluar', value: checkoutWorkCount, helper: checkoutWorkCount ? 'Review pengajuan keluar dan finalkan hanya jika tagihan beres.' : 'Tidak ada pengajuan keluar yang menunggu admin.', sla: `${ADMIN_SLA_HOURS.checkoutReview}/${ADMIN_SLA_HOURS.checkoutFinal} jam`, nextDeadline: earliestDeadlineLabel([...checkoutReviewDeadlines, ...checkoutFinalDeadlines]), action: 'Cek Checkout', to: '/stays?status=BOOKINGS', tone: expiredCheckoutCount ? 'danger' : checkoutWorkCount ? 'warning' : 'success' },
    { id: 'finance-ticket-blockers', step: '5', title: 'Blocker operasional', value: overdueInvoiceCount + ticketWaitingAdminCount + unassignedTicketCount + lowStockCount, helper: 'Tagihan overdue, tiket menunggu admin, dan stok menipis masuk blocker harian.', sla: 'harian', nextDeadline: earliestDeadlineLabel(overdueInvoices.map((invoice) => invoice.dueDate)), action: overdueInvoiceCount ? 'Lihat Tagihan' : ticketWaitingAdminCount || unassignedTicketCount ? 'Lihat Tiket' : 'Cek Stok', to: overdueInvoiceCount ? '/invoices' : ticketWaitingAdminCount || unassignedTicketCount ? '/tickets' : '/inventory/gudang', tone: overdueInvoiceCount ? 'danger' : ticketWaitingAdminCount || unassignedTicketCount || lowStockCount ? 'warning' : 'success' },
  ];

  const adminAssistantItems: AssistantItem[] = dedupeCommandItems([
    expiredPaymentReviewCount > 0 ? { id: 'admin-assistant-payment-expired', severity: 'HIGH' as const, title: 'Bukti pembayaran melewati SLA', message: `${expiredPaymentReviewCount} bukti bayar sudah lewat batas maksimal review. Putuskan agar status tagihan/kamar tidak menggantung.`, count: expiredPaymentReviewCount, actionLabel: 'Verifikasi Pembayaran', actionTo: '/payment-submissions/review', dedupKey: 'admin-payment-expired' } : null,
    pendingPaymentReviewCount > 0 ? { id: 'admin-assistant-payment-pending', severity: 'MEDIUM' as const, title: 'Pembayaran perlu keputusan admin', message: `${pendingPaymentReviewCount} bukti bayar sedang menunggu review.`, count: pendingPaymentReviewCount, actionLabel: 'Review Bayar', actionTo: '/payment-submissions/review', dedupKey: 'admin-payment-pending' } : null,
    pendingApprovalCount > 0 ? { id: 'admin-assistant-booking-review', severity: expiredBookingReviewCount ? 'HIGH' as const : 'MEDIUM' as const, title: 'Booking baru butuh review', message: `${pendingApprovalCount} booking perlu diputuskan.`, count: pendingApprovalCount, actionLabel: 'Review Booking', actionTo: '/stays?status=BOOKINGS', dedupKey: 'admin-booking-review' } : null,
    pendingRenewCount > 0 ? { id: 'admin-assistant-renew', severity: expiredRenewCount ? 'HIGH' as const : 'MEDIUM' as const, title: 'Perpanjangan menunggu cek meter', message: `${pendingRenewCount} perpanjangan menunggu keputusan.`, count: pendingRenewCount, actionLabel: 'Review Renew', actionTo: '/renew-requests', dedupKey: 'admin-renew-pending' } : null,
    checkoutWorkCount > 0 ? { id: 'admin-assistant-checkout', severity: expiredCheckoutCount ? 'HIGH' as const : 'MEDIUM' as const, title: 'Keluar belum selesai', message: `${pendingCheckoutRequestCount} request keluar perlu review dan ${approvedCheckoutRequestCount} pengajuan keluar disetujui perlu final jika tagihan sudah clear.`, count: checkoutWorkCount, actionLabel: 'Cek Checkout', actionTo: '/stays?status=BOOKINGS', dedupKey: 'admin-checkout-work' } : null,
    overdueInvoiceCount > 0 ? { id: 'admin-assistant-overdue', severity: 'HIGH' as const, title: 'Tagihan overdue mengunci flow tenant', message: `${overdueInvoiceCount} tagihan terlambat dapat menahan perpanjangan/keluar.`, count: overdueInvoiceCount, actionLabel: 'Lihat Tagihan', actionTo: '/invoices', dedupKey: 'admin-overdue-invoice' } : null,
    activeTicketCount > 0 ? { id: 'admin-assistant-ticket', severity: ticketWaitingAdminCount || unassignedTicketCount ? 'WARNING' as const : 'INFO' as const, title: 'Tiket operasional perlu dipantau', message: `${activeTicketCount} tiket aktif. ${unassignedTicketCount} belum assign dan ${ticketWaitingAdminCount} menunggu konfirmasi admin.`, count: activeTicketCount, actionLabel: 'Buka Tiket', actionTo: '/tickets', dedupKey: 'admin-active-ticket' } : null,
    waitingInitialPaymentCount > 0 ? { id: 'admin-assistant-waiting-payment', severity: expiredTenantPaymentCount ? 'WARNING' as const : 'INFO' as const, title: 'Booking menunggu bayar tenant', message: `${waitingInitialPaymentCount} booking punya tagihan awal. Pantau agar kamar tidak tertahan.`, count: waitingInitialPaymentCount, actionLabel: 'Pantau Booking', actionTo: '/stays?status=BOOKINGS', dedupKey: 'admin-waiting-payment' } : null,
  ].filter(Boolean) as AssistantItem[]);

  const adminHealthMetrics: MetricChip[] = [
    { id: 'admin-metric-payment', label: 'Bukti pending', value: pendingPaymentReviewCount, helper: expiredPaymentReviewCount ? `${expiredPaymentReviewCount} lewat SLA` : 'Perlu verifikasi manual', status: expiredPaymentReviewCount ? 'DANGER' : pendingPaymentReviewCount ? 'WARNING' : 'SUCCESS', icon: '✅', to: '/payment-submissions/review' },
    { id: 'admin-metric-booking', label: 'Review booking', value: pendingApprovalCount, helper: expiredBookingReviewCount ? `${expiredBookingReviewCount} lewat deadline` : 'Sebelum invoice awal', status: expiredBookingReviewCount ? 'DANGER' : pendingApprovalCount ? 'WARNING' : 'SUCCESS', icon: '📝', to: '/stays?status=BOOKINGS' },
    { id: 'admin-metric-renew', label: 'Perpanjangan pending', value: pendingRenewCount, helper: 'Butuh cek meter', status: pendingRenewCount ? 'WARNING' : 'SUCCESS', icon: '🔁', to: '/renew-requests' },
    { id: 'admin-metric-checkout', label: 'Pekerjaan keluar', value: checkoutWorkCount, helper: `${pendingCheckoutRequestCount} review · ${approvedCheckoutRequestCount} final`, status: checkoutWorkCount ? 'WARNING' : 'SUCCESS', icon: '🚪', to: '/stays?status=BOOKINGS' },
    { id: 'admin-metric-invoice', label: 'Tagihan open', value: openInvoiceCount, helper: overdueInvoiceCount ? `${overdueInvoiceCount} overdue` : 'Belum lunas/dibatalkan', status: overdueInvoiceCount ? 'DANGER' : openInvoiceCount ? 'WARNING' : 'SUCCESS', icon: '🧾', to: '/invoices' },
    { id: 'admin-metric-ticket', label: 'Tiket aktif', value: activeTicketCount, helper: `${unassignedTicketCount} belum assign · ${ticketWaitingAdminCount} perlu cek`, status: ticketWaitingAdminCount || unassignedTicketCount ? 'WARNING' : activeTicketCount ? 'INFO' : 'SUCCESS', icon: '🎫', to: '/tickets' },
  ];

  const queueItems: ActionQueueItem[] = dedupeCommandItems([
    ...pendingApprovalBookings.slice(0, 4).map((stay) => { const createdAt = getStayCreatedAt(stay); const deadline = getStayDeadline(stay, ADMIN_SLA_HOURS.bookingReview); const meta = getDeadlineMeta(deadline, 'Batas review booking'); return { id: `booking-approval-${stay.id}`, ruleId: 'booking-review-sla', entityType: 'stay', entityId: stay.id, priority: meta.isExpired ? 'HIGH' as const : 'MEDIUM' as const, type: '1. Review booking', subject: stay.tenant?.fullName || stay.room?.code || `Booking #${stay.id}`, issue: meta.isExpired ? 'Melewati batas review. AutoOps dapat reset pemesanan.' : 'Putuskan booking sebelum deadline.', receivedAtLabel: createdAt ? makeClock(createdAt) : undefined, ...makeQueueTime(deadline), recommendedAction: 'Review Booking', actionTo: '/stays?status=BOOKINGS' }; }),
    ...paymentReviewItems.slice(0, 4).map((submission: PaymentSubmission) => { const receivedAt = submission.createdAt ?? submission.paidAt; const urgentAt = addHoursToDate(receivedAt, ADMIN_SLA_HOURS.paymentReviewUrgent); const escalateAt = addHoursToDate(receivedAt, ADMIN_SLA_HOURS.paymentReviewEscalate); const maxAt = addHoursToDate(receivedAt, ADMIN_SLA_HOURS.paymentReviewMax); const maxMeta = getDeadlineMeta(maxAt, 'Batas maksimal review bukti'); const urgentMeta = getDeadlineMeta(urgentAt, 'Urgent sejak'); return { id: `payment-review-${submission.id}`, ruleId: 'payment-review-sla', entityType: 'payment-submission', entityId: submission.id, priority: urgentMeta.isExpired ? 'HIGH' as const : 'MEDIUM' as const, type: '2. Review pembayaran', subject: submission.invoice?.invoiceNumber || submission.tenant?.fullName || `Bukti #${submission.id}`, issue: `Urgent sejak ${urgentAt ? makeClock(urgentAt) : '-'}; escalate ${escalateAt ? makeClock(escalateAt) : '-'}.`, receivedAtLabel: receivedAt ? makeClock(receivedAt) : undefined, deadlineLabel: maxMeta.hasDate ? maxMeta.absoluteLabel : undefined, timeStatusLabel: urgentMeta.hasDate ? urgentMeta.relativeLabel : undefined, timeStatusTone: urgentMeta.isExpired ? 'warning' as const : 'info' as const, recommendedAction: 'Verifikasi', actionTo: '/payment-submissions/review' }; }),
    ...renewRequests.slice(0, 3).map((request: RenewRequest) => { const deadline = addHoursToDate(request.createdAt, ADMIN_SLA_HOURS.renewReview); const meta = getDeadlineMeta(deadline, 'Batas review perpanjangan'); return { id: `renew-${request.id}`, ruleId: 'renew-meter-sla', entityType: 'renew', entityId: request.id, priority: meta.isExpired ? 'HIGH' as const : 'MEDIUM' as const, type: '3. Renew meter', subject: request.tenant?.fullName || request.stay?.room?.code || `Renew #${request.id}`, issue: 'Catat meter listrik/air sebelum setujui.', receivedAtLabel: request.createdAt ? makeClock(request.createdAt) : undefined, ...makeQueueTime(deadline), recommendedAction: 'Review Renew', actionTo: '/renew-requests' }; }),
    ...checkoutPendingRequests.slice(0, 3).map((request: CheckoutRequest) => { const deadline = addHoursToDate(request.createdAt, ADMIN_SLA_HOURS.checkoutReview); const meta = getDeadlineMeta(deadline, 'Batas review keluar'); return { id: `checkout-request-${request.id}`, ruleId: 'checkout-review-sla', entityType: 'checkout', entityId: request.id, priority: meta.isExpired ? 'HIGH' as const : 'MEDIUM' as const, type: '4. Review checkout', subject: request.stay?.tenant?.fullName || request.stay?.room?.code || `Checkout #${request.id}`, issue: 'Review pengajuan keluar. Final keluar tetap aksi terpisah setelah tagihan clear.', receivedAtLabel: request.createdAt ? makeClock(request.createdAt) : undefined, ...makeQueueTime(deadline), recommendedAction: 'Cek Checkout', actionTo: '/stays?status=BOOKINGS' }; }),
    ...checkoutApprovedRequests.slice(0, 3).map((request: CheckoutRequest) => { const receivedAt = request.reviewedAt ?? request.updatedAt ?? request.createdAt; const deadline = addHoursToDate(receivedAt, ADMIN_SLA_HOURS.checkoutFinal); const meta = getDeadlineMeta(deadline, 'Batas final keluar'); return { id: `checkout-final-${request.id}`, ruleId: 'checkout-final-sla', entityType: 'checkout', entityId: request.id, priority: meta.isExpired ? 'HIGH' as const : 'MEDIUM' as const, type: '4. Final keluar', subject: request.stay?.tenant?.fullName || request.stay?.room?.code || `Checkout #${request.id}`, issue: 'Request sudah approved. Finalkan checkout jika semua tagihan lunas dan deposit jelas.', receivedAtLabel: receivedAt ? makeClock(receivedAt) : undefined, ...makeQueueTime(deadline), recommendedAction: 'Finalkan', actionTo: '/stays?status=BOOKINGS' }; }),
    ...overdueInvoices.slice(0, 3).map((invoice) => { const meta = getDeadlineMeta(invoice.dueDate, 'Jatuh tempo tagihan'); return { id: `invoice-${invoice.id}`, ruleId: 'invoice-overdue', entityType: 'invoice', entityId: invoice.id, priority: 'HIGH' as const, type: 'Blocker tagihan', subject: invoice.stay?.tenant?.fullName || invoice.invoiceNumber || `Invoice #${invoice.id}`, issue: `Tagihan open memblokir renew/checkout. ${meta.actionLabel}`, receivedAtLabel: invoice.issuedAt ? makeClock(invoice.issuedAt) : undefined, deadlineLabel: meta.hasDate ? meta.absoluteLabel : undefined, timeStatusLabel: meta.hasDate ? meta.relativeLabel : undefined, timeStatusTone: 'danger' as const, recommendedAction: 'Lihat Tagihan', actionTo: `/invoices/${invoice.id}` }; }),
    ...waitingInitialPaymentBookings.slice(0, 3).map((stay) => { const deadline = getStayDeadline(stay, ADMIN_SLA_HOURS.tenantPayment); const meta = getDeadlineMeta(deadline, 'Batas bayar tenant'); return { id: `booking-payment-waiting-${stay.id}`, ruleId: 'booking-payment-waiting', entityType: 'stay', entityId: stay.id, priority: meta.isExpired ? 'HIGH' as const : 'INFO' as const, type: 'Menunggu bayar tenant', subject: stay.tenant?.fullName || stay.room?.code || `Booking #${stay.id}`, issue: meta.isExpired ? 'Tenant melewati batas bayar. AutoOps dapat reset booking dan kamar dilepas.' : 'Bukan pekerjaan admin langsung; pantau agar kamar tidak tertahan terlalu lama.', receivedAtLabel: getStayCreatedAt(stay) ? makeClock(getStayCreatedAt(stay)) : undefined, ...makeQueueTime(deadline), recommendedAction: 'Pantau Booking', actionTo: '/stays?status=BOOKINGS' }; }),
    ...opsStress.queueItems,
  ]);

  const filteredQueueItems = queueItems.filter((item) => itemMatchesAdminArea(item, activeArea));
  const topQueueItem = priorityActionFromQueue(filteredQueueItems.length ? filteredQueueItems : queueItems);
  const urgentQueueCount = filteredQueueItems.filter((item) => item.priority === 'BLOCKER' || item.priority === 'HIGH' || item.timeStatusTone === 'danger').length;
  const activeAreaConfig = ADMIN_QUEUE_AREAS.find((area) => area.id === activeArea) ?? ADMIN_QUEUE_AREAS[0];

  const refreshDashboard = () => {
    const refetches: Array<Promise<unknown>> = [];
    if (needsRoomData) refetches.push(roomsQuery.refetch());
    if (needsInventoryData) refetches.push(inventoryItemsQuery.refetch());
    if (needsStaysData) refetches.push(staysQuery.refetch(), renewRequestsQuery.refetch(), checkoutRequestsPendingQuery.refetch(), checkoutRequestsApprovedQuery.refetch());
    if (needsFinanceData) refetches.push(invoicesQuery.refetch(), paymentReviewQuery.refetch());
    if (needsTicketData) refetches.push(ticketsQuery.refetch());
    if (needsAutoOpsData) refetches.push(autoOpsQuery.refetch());
    if (needsStaffPerformanceData) refetches.push(staffPerformanceQuery.refetch());
    void Promise.all(refetches);
  };

  const coreQueriesLoading = (needsRoomData && roomsQuery.isLoading) || (needsStaysData && staysQuery.isLoading) || (needsFinanceData && invoicesQuery.isLoading) || (needsTicketData && ticketsQuery.isLoading);
  const supportQueriesLoading = (needsInventoryData && inventoryItemsQuery.isLoading) || (needsStaysData && (renewRequestsQuery.isLoading || checkoutRequestsPendingQuery.isLoading || checkoutRequestsApprovedQuery.isLoading)) || (needsFinanceData && paymentReviewQuery.isLoading) || (needsAutoOpsData && autoOpsQuery.isLoading) || (needsStaffPerformanceData && staffPerformanceQuery.isLoading);
  const coreQueriesError = (needsRoomData && roomsQuery.isError) || (needsStaysData && staysQuery.isError) || (needsFinanceData && invoicesQuery.isError) || (needsTicketData && ticketsQuery.isError);
  const supportQueriesError = (needsInventoryData && inventoryItemsQuery.isError) || (needsStaysData && (renewRequestsQuery.isError || checkoutRequestsPendingQuery.isError || checkoutRequestsApprovedQuery.isError)) || (needsFinanceData && paymentReviewQuery.isError) || (needsAutoOpsData && autoOpsQuery.isError) || (needsStaffPerformanceData && staffPerformanceQuery.isError);

  if (coreQueriesLoading) return <LoadingDashboard />;
  if (coreQueriesError) return <Alert variant="danger">Gagal memuat command center admin.</Alert>;

  return (
    <div className="admin-dashboard-queue-first admin-dashboard-simplified">
      <AdminCommandHeader totalQueue={filteredQueueItems.length} urgentCount={urgentQueueCount} activeAreaLabel={activeAreaConfig.label} topQueueItem={topQueueItem} />
      <AssistantInsightLine
        title="Asisten Operasional"
        tone={supportQueriesError ? 'warning' : urgentQueueCount ? 'warning' : topQueueItem ? 'info' : 'success'}
        message={supportQueriesError ? 'Data utama sudah tampil, tetapi sebagian data pendukung gagal dimuat.' : topQueueItem ? `${topQueueItem.type}: ${topQueueItem.issue}` : activeArea === 'overview' ? 'Tidak ada blocker besar. Gunakan tab area untuk membuka detail.' : `${activeAreaConfig.label} sedang aman.`}
      />
      {supportQueriesLoading ? <Alert variant="info" className="admin-support-loading-note">Data pendukung sedang dimuat. Dashboard utama tetap bisa dipakai.</Alert> : null}
      {activeArea === 'overview' ? <AdminOperationsCommandQueue lanes={adminWorkLanes} assistantItems={adminAssistantItems} metrics={adminHealthMetrics} topQueueItem={topQueueItem} queueItems={queueItems} onNavigate={navigate} /> : null}
      {/* H4: Brief AI untuk admin — hanya muncul jika API key dikonfigurasi & area overview */}
      {activeArea === 'overview' && aiStatusQuery.data?.configured ? (
        <section className="owner-panel mt-3 mb-3">
          <div className="owner-panel-heading p-3">
            <div><span className="owner-section-kicker">Bantuan AI</span><h2 className="mb-0">Brief Admin</h2></div>
          </div>
          <div className="owner-panel-body p-3">
            <AiAssistButton<BriefResult>
              label="Buat Brief AI"
              loadingLabel="Menganalisa dengan AI..."
              variant="outline-primary"
              run={generateBrief}
              renderResult={(result) => (
                <AiResultPanel title="Brief Admin" mode={result.mode} fallback={result.fallback} warnings={result.warnings} missingData={result.missingData} usage={result.usage} model={result.model}>
                  <p className="fw-medium mb-2">{result.result?.summary}</p>
                  {result.result?.priorityActions?.length > 0 ? (
                    <ul className="mb-0 ps-3">
                      {result.result.priorityActions.map((a, i) => (
                        <li key={i} className="small">
                          <span className={`badge bg-${a.severity === 'CRITICAL' ? 'danger' : a.severity === 'HIGH' ? 'warning' : a.severity === 'MEDIUM' ? 'info' : 'secondary'} me-1`}>{a.severity}</span>
                          {a.title} — {a.reason}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </AiResultPanel>
              )}
            />
          </div>
        </section>
      ) : null}
      {activeArea === 'overview' ? <AdminTodayStatusStrip rooms={rooms} inventoryItems={inventoryItems} invoices={invoices} tickets={tickets} pendingPaymentReviewCount={pendingPaymentReviewCount} pendingApprovalCount={pendingApprovalCount} pendingRenewCount={pendingRenewCount} checkoutCount={pendingCheckoutRequestCount + approvedCheckoutRequestCount} /> : null}
      {activeArea === 'stays-finance' ? <AdminProcessLine /> : null}
      {activeArea === 'stays-finance' ? <AdminStaysUnifiedList activeStays={stays} bookingReview={pendingApprovalBookings} waitingPayment={waitingInitialPaymentBookings} renewRequests={renewRequests} checkoutPending={checkoutPendingRequests} checkoutApproved={checkoutApprovedRequests} onNavigate={navigate} /> : null}
      {activeArea === 'stays-finance' ? <AdminFinanceWorkspace invoices={invoices} paymentReviewItems={paymentReviewItems} onNavigate={navigate} /> : null}
      {activeArea === 'ops' ? <AdminTicketsWorkspace tickets={tickets} onNavigate={navigate} /> : null}
      {activeArea === 'ops' ? <AdminStaffFrontlineList items={staffPerformanceItems} isLoading={staffPerformanceQuery.isLoading} /> : null}
      {activeArea === 'ops' ? <AdminRoomsStockWorkspace rooms={rooms} inventoryItems={inventoryItems} onNavigate={navigate} /> : null}
      {activeArea === 'overview' ? <ActionQueueTable title="Admin Operations Antrean Aksi" subtitle="Antrean keputusan lintas booking, pembayaran, renew, checkout, tagihan, tiket, dan stok." items={filteredQueueItems} emptyTitle="Tidak ada item mendesak hari ini" emptyDescription="Semua area operasional sedang aman." maxItems={12} collapsible={false} /> : null}
      {activeArea === 'overview' ? <div className="mt-3"><AutoOpsControlPanel status={autoOpsQuery.data} role="ADMIN" onCompleted={refreshDashboard} /><AdminSlaMiniNote status={autoOpsQuery.data} /></div> : null}
      <AdminOverviewCharts activeArea={activeArea} rooms={rooms} invoices={invoices} tickets={tickets} pendingPaymentReviewCount={pendingPaymentReviewCount} pendingApprovalCount={pendingApprovalCount} waitingInitialPaymentCount={waitingInitialPaymentCount} pendingRenewCount={pendingRenewCount} checkoutCount={pendingCheckoutRequestCount + approvedCheckoutRequestCount} />
    </div>
  );
}
