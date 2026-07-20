// FILE: DashboardAdmin.tsx — dashboard admin: operasional, keuangan, okupansi
import { useState, type ReactNode } from 'react';
import { Alert, Col, Row, Table } from 'react-bootstrap';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import EmptyState from '../../components/common/EmptyState';
import PaginationControls from '../../components/common/PaginationControls';
import StatusBadge from '../../components/common/StatusBadge';
import { AssistantPanel, ActionQueueTable, AdminHealthBar, ActionKanbanBoard, ActionCalendar, type ActionQueueItem, type AssistantItem } from '../../components/command-center';
import SegmentedTabs from '../../components/common/SegmentedTabs';
import { AssistantInsightLine, EntityBadgeFilterBar } from '../../components/workspace';
import AutoOpsControlPanel from '../../components/auto-ops/AutoOpsControlPanel';
import SmartChartPanel, { type SmartChartPoint } from '../../components/charts/SmartChartPanel';
import GaugeChart from '../../components/charts/GaugeChart';
import ActivityRing from '../../components/charts/ActivityRing';
import ComplicationGrid, { type ComplicationItem } from '../../components/common/ComplicationGrid';
import SnippetCard from '../../components/common/SnippetCard';
import RatingDisplay from '../../components/common/RatingDisplay';
import DateRangeFilter, { type DateRangeValue, computeRange } from '../../components/common/DateRangeFilter';
import { generateBrief, getOwnerAiStatus, type BriefResult } from '../../api/ai';
import AiAssistButton from '../../components/ai/AiAssistButton';
import AiResultPanel from '../../components/ai/AiResultPanel';
import { fetchAdminDashboardAggregate } from '../../api/adminDashboard';
import { fetchAutoOpsStatus } from '../../api/autoOps';
import { fetchAdminStaffPerformance } from '../../api/staffPerformance';
import { getSurveySummary } from '../../api/surveys';
import { useOperationalStressIndex } from '../../hooks/useOperationalStressIndex';
import { useClientPagination } from '../../hooks/useClientPagination';
import { dedupeCommandItems } from '../../utils/commandCenterDedup';
import { addHoursToDate, formatDateTimeWib, getDeadlineMeta } from '../../utils/dateTime';
import type { CheckoutRequest, InventoryItem, Invoice, PaymentSubmission, RenewRequest, Room, Stay, Ticket } from '../../types';
import { useQuery } from '@tanstack/react-query';
import {
  type AutoOpsStatusLike, type AdminWorkLane,
  ACTION_QUERY_OPTIONS, ADMIN_SLA_HOURS,
  formatDateSafe, formatNumber,
  daysFromToday, isOpenInvoice, isTerlambat, isDueSoon,
  isReservedBookingPendingApproval, isReservedBookingWaitingPayment, isExpiredAdminBooking,
  getStayCreatedAt, getStayDeadline, getInvoiceTime,
  makeClock, makeLastUpdatedLabel, makeQueueTime, earliestDeadlineLabel, priorityActionFromQueue,
  makePaymentCount, makeRoomPoints, makePercent, countExpiredDates, isLowStockItem,
  LoadingDashboard,
} from './dashboardShared';
import { AdminStaffFrontlineList, AdminStaysUnifiedList, AdminFinanceWorkspace, AdminTicketsWorkspace, AdminRoomsStockWorkspace } from './AdminWorkspaces';
import { useAuth } from '../../context/AuthContext';
import { getTenantKtpReviewQueue } from '../../api/tenants';

// FASE-H: area kerja admin dipadatkan dari 6 → 3 (Ringkasan · Penghuni & Uang · Operasional).
type AdminQueueArea = 'overview' | 'stays-finance' | 'ops';
const CHECKOUT_STAYS_ROUTE = '/stays?status=CHECKOUT';

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


function AdminCommandHeader({ totalQueue, urgentCount, activeAreaLabel, dense, onToggleDense }: {
  totalQueue: number;
  urgentCount: number;
  activeAreaLabel: string;
  topQueueItem?: ActionQueueItem;
  dense?: boolean;
  onToggleDense?: () => void;
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
          {onToggleDense ? (
            <button type="button" className="btn btn-outline-secondary btn-sm admin-density-toggle" onClick={onToggleDense} aria-pressed={dense}>
              {dense ? '⊕ Lengkap' : '⊟ Ringkas'}
            </button>
          ) : null}
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



function AdminOverviewCharts({ activeArea, rooms, invoices, tickets, pendingPaymentReviewCount, pendingApprovalCount, waitingInitialPaymentCount, pendingRenewCount, checkoutCount, dense }: { activeArea: AdminQueueArea; rooms: Room[]; invoices: Invoice[]; tickets: Ticket[]; pendingPaymentReviewCount: number; pendingApprovalCount: number; waitingInitialPaymentCount: number; pendingRenewCount: number; checkoutCount: number; dense?: boolean }) {
  const stayPoints: SmartChartPoint[] = [
    { label: 'Review booking', value: pendingApprovalCount, detail: 'Menunggu keputusan admin', to: '/stays?status=BOOKINGS' },
    { label: 'Menunggu bayar', value: waitingInitialPaymentCount, detail: 'Tenant punya deadline bayar', to: '/stays?status=BOOKINGS' },
    { label: 'Cek meter perpanjangan', value: pendingRenewCount, detail: 'Butuh cek meter', to: '/renew-requests' },
    { label: 'Keluar', value: checkoutCount, detail: 'Review dan finalkan keluar', to: CHECKOUT_STAYS_ROUTE },
  ];
  if (activeArea === 'overview' || dense) return null;
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
  const { user } = useAuth();
  const activeArea: AdminQueueArea = normalizeAdminArea(new URLSearchParams(location.search).get('area'));
  const [dense, setDense] = useState<boolean>(() => localStorage.getItem('admin-density') === 'compact');
  const [staysFinanceSubTab, setStaysFinanceSubTab] = useState<'stays' | 'finance'>('stays');
  const [opsSubTab, setOpsSubTab] = useState<'tickets' | 'rooms'>('tickets');
  const [queueExpanded, setQueueExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar'>(() => {
    const stored = localStorage.getItem('admin-queue-view');
    return (stored === 'board' || stored === 'calendar') ? stored : 'list';
  });
  const [aiBriefOpen, setAiBriefOpen] = useState(false);
  const handleViewMode = (v: 'list' | 'board' | 'calendar') => {
    setViewMode(v);
    localStorage.setItem('admin-queue-view', v);
  };
  const handleToggleDense = () => {
    setDense((prev) => {
      const next = !prev;
      localStorage.setItem('admin-density', next ? 'compact' : 'full');
      return next;
    });
  };
  const toggleQueueExpanded = () => setQueueExpanded((value) => !value);
  const toggleAiBrief = () => setAiBriefOpen((value) => !value);
  const dashboardBase = location.pathname === '/admin-dashboard' ? '/admin-dashboard' : '/dashboard';
  const isOverview = activeArea === 'overview';

  const aggregateQuery = useQuery({ queryKey: ['admin-dashboard-aggregate'], queryFn: fetchAdminDashboardAggregate, staleTime: 60_000, retry: 1, retryDelay: 1000 });
  const staffPerformanceQuery = useQuery({ queryKey: ['dashboard-admin', 'staff-performance'], queryFn: () => fetchAdminStaffPerformance(), enabled: activeArea === 'ops', ...ACTION_QUERY_OPTIONS });
  const autoOpsQuery = useQuery({ queryKey: ['dashboard-admin', 'auto-ops-status'], queryFn: fetchAutoOpsStatus, enabled: isOverview || (activeArea === 'ops' && opsSubTab === 'tickets'), ...ACTION_QUERY_OPTIONS });
  const aiStatusQuery = useQuery({ queryKey: ['owner-ai-status'], queryFn: getOwnerAiStatus, staleTime: 300_000, retry: 1 });
  const surveySummaryQuery = useQuery({ queryKey: ['survey-summary'], queryFn: getSurveySummary, staleTime: 300_000, retry: 1 });
  const ktpReviewQuery = useQuery({ queryKey: ['tenants', 'ktp-review'], queryFn: getTenantKtpReviewQueue, staleTime: 60_000, retry: 1 });
  const canUseAdminBriefAi = user?.role === 'OWNER' && aiStatusQuery.data?.configured === true;

  const rooms = aggregateQuery.data?.rooms.items ?? [];
  const inventoryItems = aggregateQuery.data?.inventoryItems.items ?? [];
  const stays = aggregateQuery.data?.stays.items ?? [];
  const invoices = aggregateQuery.data?.invoices.items ?? [];
  const tickets = aggregateQuery.data?.tickets.items ?? [];
  const renewRequests = aggregateQuery.data?.renewRequests.items ?? [];
  const checkoutPendingRequests = aggregateQuery.data?.checkoutPending.items ?? [];
  const checkoutApprovedRequests = aggregateQuery.data?.checkoutApproved.items ?? [];
  const paymentReviewItems = aggregateQuery.data?.paymentReview.items ?? [];
  const facilityGapSummary = aggregateQuery.data?.facilityGaps;
  const facilityGapCount = facilityGapSummary?.meta.totalItems ?? 0;
  const facilityGapPreview = facilityGapSummary?.items ?? [];
  const staffPerformanceItems = staffPerformanceQuery.data?.items ?? [];
  const pendingRenewCount = renewRequests.length;
  const pendingCheckoutRequestCount = checkoutPendingRequests.length;
  const approvedCheckoutRequestCount = checkoutApprovedRequests.length;
  const pendingPaymentReviewCount = makePaymentCount(paymentReviewItems, aggregateQuery.data?.paymentReview.meta?.totalItems);
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
  const ktpReviewItems = ktpReviewQuery.data ?? [];
  const autoOpsExpiredCount = Number(autoOpsQuery.data?.expiredCandidates ?? autoOpsQuery.data?.expiredBookings ?? autoOpsQuery.data?.expiredBookingCandidates ?? 0);
  const autoOpsHeldCount = Number(autoOpsQuery.data?.heldForPaymentReview ?? autoOpsQuery.data?.paymentPendingReview ?? autoOpsQuery.data?.pendingReviewCount ?? 0);
  const autoOpsOrphanCount = Number(autoOpsQuery.data?.orphanReservedRooms ?? autoOpsQuery.data?.orphanReservedRoomCount ?? autoOpsQuery.data?.reservedOrphans ?? 0);
  const autoOpsNeedsAction = autoOpsExpiredCount + autoOpsHeldCount + autoOpsOrphanCount > 0;
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
    { id: 'ktp-review', step: '0', title: 'Verifikasi KTP', value: ktpReviewItems.length, helper: ktpReviewItems.length ? 'Periksa foto, cocokkan data, lihat rekomendasi AI, lalu putuskan.' : 'Tidak ada KTP yang menunggu pemeriksaan.', sla: 'secepatnya', nextDeadline: undefined, action: 'Periksa KTP', to: '/tenants?ktpStatus=PENDING_REVIEW', tone: ktpReviewItems.length ? 'warning' : 'success' },
    { id: 'booking-review', step: '1', title: 'Review booking', value: pendingApprovalCount, helper: pendingApprovalCount ? 'Putuskan booking sebelum kamar tertahan terlalu lama.' : 'Tidak ada booking baru yang menunggu admin.', sla: `${ADMIN_SLA_HOURS.bookingReview} jam`, nextDeadline: earliestDeadlineLabel(bookingReviewDeadlines), action: 'Review Booking', to: '/stays?status=BOOKINGS', tone: expiredBookingReviewCount ? 'danger' : pendingApprovalCount ? 'warning' : 'success' },
    { id: 'payment-review', step: '2', title: 'Verifikasi pembayaran', value: pendingPaymentReviewCount, helper: pendingPaymentReviewCount ? 'Bukti pending tidak boleh auto-cancel; admin harus putuskan.' : 'Tidak ada bukti bayar pending review.', sla: `${ADMIN_SLA_HOURS.paymentReviewUrgent}/${ADMIN_SLA_HOURS.paymentReviewMax} jam`, nextDeadline: earliestDeadlineLabel(paymentMaxDeadlines), action: 'Verifikasi Pembayaran', to: '/payment-submissions/review', tone: expiredPaymentReviewCount ? 'danger' : pendingPaymentReviewCount ? 'warning' : 'success' },
    { id: 'renew-checkpoint', step: '3', title: 'Review Perpanjangan', value: pendingRenewCount, helper: pendingRenewCount ? 'Catat meter sebelum approve dan tagihan perpanjangan.' : 'Tidak ada perpanjangan menunggu approval.', sla: `${ADMIN_SLA_HOURS.renewReview} jam`, nextDeadline: earliestDeadlineLabel(renewReviewDeadlines), action: 'Review Perpanjangan', to: '/renew-requests', tone: expiredRenewCount ? 'danger' : pendingRenewCount ? 'warning' : 'success' },
    { id: 'checkout-flow', step: '4', title: 'Keluar', value: checkoutWorkCount, helper: checkoutWorkCount ? 'Review pengajuan keluar dan finalkan hanya jika tagihan beres.' : 'Tidak ada pengajuan keluar yang menunggu admin.', sla: `${ADMIN_SLA_HOURS.checkoutReview}/${ADMIN_SLA_HOURS.checkoutFinal} jam`, nextDeadline: earliestDeadlineLabel([...checkoutReviewDeadlines, ...checkoutFinalDeadlines]), action: 'Cek Checkout', to: CHECKOUT_STAYS_ROUTE, tone: expiredCheckoutCount ? 'danger' : checkoutWorkCount ? 'warning' : 'success' },
    { id: 'finance-ticket-blockers', step: '5', title: 'Blocker operasional', value: overdueInvoiceCount + ticketWaitingAdminCount + unassignedTicketCount + lowStockCount, helper: 'Tagihan overdue, tiket menunggu admin, dan stok menipis masuk blocker harian.', sla: 'harian', nextDeadline: earliestDeadlineLabel(overdueInvoices.map((invoice) => invoice.dueDate)), action: overdueInvoiceCount ? 'Lihat Tagihan' : ticketWaitingAdminCount || unassignedTicketCount ? 'Lihat Tiket' : 'Cek Stok', to: overdueInvoiceCount ? '/invoices' : ticketWaitingAdminCount || unassignedTicketCount ? '/tickets' : '/inventory/gudang', tone: overdueInvoiceCount ? 'danger' : ticketWaitingAdminCount || unassignedTicketCount || lowStockCount ? 'warning' : 'success' },
  ];

  const queueItems: ActionQueueItem[] = dedupeCommandItems([
    ...ktpReviewItems.slice(0, 5).map((tenant) => ({ id: `ktp-review-${tenant.id}`, ruleId: 'ktp-review', entityType: 'tenant', entityId: tenant.id, priority: 'MEDIUM' as const, type: 'Verifikasi KTP', subject: tenant.fullName, issue: 'Foto sudah diunggah. Periksa hasil OCR dan rekomendasi AI sebelum approve.', recommendedAction: 'Review KTP', actionTo: '/tenants?ktpStatus=PENDING_REVIEW' })),
    ...pendingApprovalBookings.slice(0, 4).map((stay) => { const createdAt = getStayCreatedAt(stay); const deadline = getStayDeadline(stay, ADMIN_SLA_HOURS.bookingReview); const meta = getDeadlineMeta(deadline, 'Batas review booking'); return { id: `booking-approval-${stay.id}`, ruleId: 'booking-review-sla', entityType: 'stay', entityId: stay.id, priority: meta.isExpired ? 'HIGH' as const : 'MEDIUM' as const, type: '1. Review booking', subject: stay.tenant?.fullName || stay.room?.code || `Booking #${stay.id}`, issue: meta.isExpired ? 'Melewati batas review. AutoOps dapat reset pemesanan.' : 'Putuskan booking sebelum deadline.', receivedAtLabel: createdAt ? makeClock(createdAt) : undefined, ...makeQueueTime(deadline), recommendedAction: 'Review Booking', actionTo: '/stays?status=BOOKINGS' }; }),
    ...paymentReviewItems.slice(0, 4).map((submission: PaymentSubmission) => { const receivedAt = submission.createdAt ?? submission.paidAt; const urgentAt = addHoursToDate(receivedAt, ADMIN_SLA_HOURS.paymentReviewUrgent); const escalateAt = addHoursToDate(receivedAt, ADMIN_SLA_HOURS.paymentReviewEscalate); const maxAt = addHoursToDate(receivedAt, ADMIN_SLA_HOURS.paymentReviewMax); const maxMeta = getDeadlineMeta(maxAt, 'Batas maksimal review bukti'); const urgentMeta = getDeadlineMeta(urgentAt, 'Urgent sejak'); return { id: `payment-review-${submission.id}`, ruleId: 'payment-review-sla', entityType: 'payment-submission', entityId: submission.id, priority: urgentMeta.isExpired ? 'HIGH' as const : 'MEDIUM' as const, type: '2. Review pembayaran', subject: submission.invoice?.invoiceNumber || submission.tenant?.fullName || `Bukti #${submission.id}`, issue: `Urgent sejak ${urgentAt ? makeClock(urgentAt) : '-'}; escalate ${escalateAt ? makeClock(escalateAt) : '-'}.`, receivedAtLabel: receivedAt ? makeClock(receivedAt) : undefined, deadlineLabel: maxMeta.hasDate ? maxMeta.absoluteLabel : undefined, timeStatusLabel: urgentMeta.hasDate ? urgentMeta.relativeLabel : undefined, timeStatusTone: urgentMeta.isExpired ? 'warning' as const : 'info' as const, recommendedAction: 'Verifikasi', actionTo: '/payment-submissions/review' }; }),
    ...renewRequests.slice(0, 3).map((request: RenewRequest) => { const deadline = addHoursToDate(request.createdAt, ADMIN_SLA_HOURS.renewReview); const meta = getDeadlineMeta(deadline, 'Batas review perpanjangan'); return { id: `renew-${request.id}`, ruleId: 'renew-meter-sla', entityType: 'renew', entityId: request.id, priority: meta.isExpired ? 'HIGH' as const : 'MEDIUM' as const, type: '3. Renew meter', subject: request.tenant?.fullName || request.stay?.room?.code || `Renew #${request.id}`, issue: 'Catat meter listrik/air sebelum setujui.', receivedAtLabel: request.createdAt ? makeClock(request.createdAt) : undefined, ...makeQueueTime(deadline), recommendedAction: 'Review Renew', actionTo: '/renew-requests' }; }),
    ...checkoutPendingRequests.slice(0, 3).map((request: CheckoutRequest) => { const deadline = addHoursToDate(request.createdAt, ADMIN_SLA_HOURS.checkoutReview); const meta = getDeadlineMeta(deadline, 'Batas review keluar'); return { id: `checkout-request-${request.id}`, ruleId: 'checkout-review-sla', entityType: 'checkout', entityId: request.id, priority: meta.isExpired ? 'HIGH' as const : 'MEDIUM' as const, type: '4. Review checkout', subject: request.stay?.tenant?.fullName || request.stay?.room?.code || `Checkout #${request.id}`, issue: 'Review pengajuan keluar. Final keluar tetap aksi terpisah setelah tagihan clear.', receivedAtLabel: request.createdAt ? makeClock(request.createdAt) : undefined, ...makeQueueTime(deadline), recommendedAction: 'Cek Checkout', actionTo: CHECKOUT_STAYS_ROUTE }; }),
    ...checkoutApprovedRequests.slice(0, 3).map((request: CheckoutRequest) => { const receivedAt = request.reviewedAt ?? request.updatedAt ?? request.createdAt; const deadline = addHoursToDate(receivedAt, ADMIN_SLA_HOURS.checkoutFinal); const meta = getDeadlineMeta(deadline, 'Batas final keluar'); return { id: `checkout-final-${request.id}`, ruleId: 'checkout-final-sla', entityType: 'checkout', entityId: request.id, priority: meta.isExpired ? 'HIGH' as const : 'MEDIUM' as const, type: '4. Final keluar', subject: request.stay?.tenant?.fullName || request.stay?.room?.code || `Checkout #${request.id}`, issue: 'Request sudah approved. Finalkan checkout jika semua tagihan lunas dan deposit jelas.', receivedAtLabel: receivedAt ? makeClock(receivedAt) : undefined, ...makeQueueTime(deadline), recommendedAction: 'Finalkan', actionTo: CHECKOUT_STAYS_ROUTE }; }),
    ...overdueInvoices.slice(0, 3).map((invoice) => { const meta = getDeadlineMeta(invoice.dueDate, 'Jatuh tempo tagihan'); return { id: `invoice-${invoice.id}`, ruleId: 'invoice-overdue', entityType: 'invoice', entityId: invoice.id, priority: 'HIGH' as const, type: 'Blocker tagihan', subject: invoice.stay?.tenant?.fullName || invoice.invoiceNumber || `Invoice #${invoice.id}`, issue: `Tagihan open memblokir renew/checkout. ${meta.actionLabel}`, receivedAtLabel: invoice.issuedAt ? makeClock(invoice.issuedAt) : undefined, deadlineLabel: meta.hasDate ? meta.absoluteLabel : undefined, timeStatusLabel: meta.hasDate ? meta.relativeLabel : undefined, timeStatusTone: 'danger' as const, recommendedAction: 'Lihat Tagihan', actionTo: `/invoices/${invoice.id}` }; }),
    ...waitingInitialPaymentBookings.slice(0, 3).map((stay) => { const deadline = getStayDeadline(stay, ADMIN_SLA_HOURS.tenantPayment); const meta = getDeadlineMeta(deadline, 'Batas bayar tenant'); return { id: `booking-payment-waiting-${stay.id}`, ruleId: 'booking-payment-waiting', entityType: 'stay', entityId: stay.id, priority: meta.isExpired ? 'HIGH' as const : 'INFO' as const, type: 'Menunggu bayar tenant', subject: stay.tenant?.fullName || stay.room?.code || `Booking #${stay.id}`, issue: meta.isExpired ? 'Tenant melewati batas bayar. AutoOps dapat reset booking dan kamar dilepas.' : 'Bukan pekerjaan admin langsung; pantau agar kamar tidak tertahan terlalu lama.', receivedAtLabel: getStayCreatedAt(stay) ? makeClock(getStayCreatedAt(stay)) : undefined, ...makeQueueTime(deadline), recommendedAction: 'Pantau Booking', actionTo: '/stays?status=BOOKINGS' }; }),
    ...opsStress.queueItems,
  ]);

  const filteredQueueItems = queueItems.filter((item) => itemMatchesAdminArea(item, activeArea));
  const topQueueItem = priorityActionFromQueue(filteredQueueItems.length ? filteredQueueItems : queueItems);
  const urgentQueueCount = filteredQueueItems.filter((item) => item.priority === 'BLOCKER' || item.priority === 'HIGH' || item.timeStatusTone === 'danger').length;
  const activeAreaConfig = ADMIN_QUEUE_AREAS.find((area) => area.id === activeArea) ?? ADMIN_QUEUE_AREAS[0];

  const refreshDashboard = () => {
    void Promise.all([aggregateQuery.refetch(), autoOpsQuery.refetch()]);
  };

  const supportQueriesLoading = staffPerformanceQuery.isLoading || autoOpsQuery.isLoading;
  const supportQueriesError = staffPerformanceQuery.isError || autoOpsQuery.isError;

  if (aggregateQuery.isLoading) return <LoadingDashboard />;
  if (aggregateQuery.isError) return <Alert variant="danger">Gagal memuat command center admin.</Alert>;

  return (
    <div className="admin-dashboard-queue-first admin-dashboard-simplified">
      <AdminCommandHeader totalQueue={filteredQueueItems.length} urgentCount={urgentQueueCount} activeAreaLabel={activeAreaConfig.label} topQueueItem={topQueueItem} dense={dense} onToggleDense={handleToggleDense} />
      <AssistantInsightLine
        title="Asisten Operasional"
        tone={supportQueriesError ? 'warning' : urgentQueueCount ? 'warning' : topQueueItem ? 'info' : 'success'}
        message={supportQueriesError ? 'Data utama sudah tampil, tetapi sebagian data pendukung gagal dimuat.' : topQueueItem ? `${topQueueItem.type}: ${topQueueItem.issue}` : activeArea === 'overview' ? 'Tidak ada blocker besar. Gunakan tab area untuk membuka detail.' : `${activeAreaConfig.label} sedang aman.`}
      />
      {activeArea === 'overview' && facilityGapCount > 0 ? (
        <Alert variant="warning" className="d-flex flex-wrap align-items-center gap-2 py-2">
          <div className="flex-fill">
            <strong>{facilityGapCount} kamar disembunyikan dari katalog publik.</strong>
            <span className="ms-1">
              Lengkapi gap fasilitas-inventaris{facilityGapSummary?.meta.acGapItems ? `, termasuk ${facilityGapSummary.meta.acGapItems} gap AC` : ''}.
            </span>
            {facilityGapPreview.length ? (
              <span className="d-block small text-muted">
                Contoh: {facilityGapPreview.map((room) => room.code || room.name || `Kamar #${room.roomId}`).join(', ')}
              </span>
            ) : null}
          </div>
          <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => navigate('/rooms')}>
            Cek kamar
          </button>
        </Alert>
      ) : null}
      {supportQueriesLoading ? <Alert variant="info" className="admin-support-loading-note">Data pendukung sedang dimuat. Dashboard utama tetap bisa dipakai.</Alert> : null}
      {/* N-02: AdminHealthBar ringkas */}
      {activeArea === 'overview' ? (
        <AdminHealthBar
          occupiedCount={rooms.filter((room) => room.status === 'OCCUPIED').length}
          totalRooms={rooms.length}
          overdueInvoiceCount={overdueInvoiceCount}
          pendingPaymentReviewCount={pendingPaymentReviewCount}
          activeTicketCount={activeTicketCount}
          stayWorkCount={pendingApprovalCount + pendingRenewCount + checkoutWorkCount}
          lowStockCount={lowStockCount}
        />
      ) : null}
      {/* Visual Dashboard: Gauge, ActivityRing, SnippetCard, ComplicationGrid, RatingDisplay */}
      {activeArea === 'overview' ? (
        <section className="owner-panel mt-3 mb-3">
          <div className="owner-panel-heading p-3">
            <div>
              <span className="owner-section-kicker">Visual Dashboard</span>
              <h2 className="mb-0">Metrik Cepat</h2>
            </div>
          </div>
          <div className="owner-panel-body p-3">
            <Row className="g-3">
              <Col xs={12} md={6} lg={3}>
                <div className="d-flex flex-column align-items-center">
                  <GaugeChart
                    value={rooms.filter((room) => room.status === 'OCCUPIED').length}
                    max={rooms.length || 1}
                    label="Okupansi"
                    unit="%"
                    size={140}
                    helperText={`${rooms.filter((room) => room.status === 'OCCUPIED').length} dari ${rooms.length} kamar terisi`}
                  />
                </div>
              </Col>
              <Col xs={12} md={6} lg={3}>
                <div className="d-flex flex-column align-items-center">
                  <ActivityRing
                    segments={[
                      { label: 'Terisi', value: rooms.length > 0 ? rooms.filter((r) => r.status === 'OCCUPIED').length / rooms.length : 0, color: '#16a34a' },
                      { label: 'Booking', value: rooms.length > 0 ? rooms.filter((r) => r.status === 'RESERVED').length / rooms.length : 0, color: '#3b82f6' },
                      { label: 'Kosong', value: rooms.length > 0 ? rooms.filter((r) => r.status === 'AVAILABLE').length / rooms.length : 0, color: '#94a3b8' },
                    ]}
                    size={120}
                    centerValue={`${rooms.length > 0 ? Math.round((rooms.filter((r) => r.status === 'OCCUPIED').length / rooms.length) * 100) : 0}%`}
                    centerLabel="Okupansi"
                  />
                </div>
              </Col>
              <Col xs={12} md={6} lg={3}>
                <SnippetCard
                  icon={<span>🧾</span>}
                  title="Tagihan Open"
                  value={openInvoiceCount}
                  unit="tagihan"
                  accentColor={overdueInvoiceCount > 0 ? '#dc2626' : '#3b82f6'}
                  badge={overdueInvoiceCount > 0 ? `${overdueInvoiceCount} overdue` : undefined}
                  badgeColor={overdueInvoiceCount > 0 ? '#dc2626' : undefined}
                  to="/invoices"
                  trend={overdueInvoiceCount > 0 ? 'up' : 'flat'}
                  trendLabel={overdueInvoiceCount > 0 ? 'perlu perhatian' : 'aman'}
                />
              </Col>
              <Col xs={12} md={6} lg={3}>
                <SnippetCard
                  icon={<span>🎫</span>}
                  title="Tiket Aktif"
                  value={activeTicketCount}
                  unit="tiket"
                  accentColor={unassignedTicketCount > 0 ? '#f59e0b' : '#3b82f6'}
                  badge={unassignedTicketCount > 0 ? `${unassignedTicketCount} unassigned` : undefined}
                  badgeColor={unassignedTicketCount > 0 ? '#f59e0b' : undefined}
                  to="/tickets"
                  trend={activeTicketCount > 0 ? 'up' : 'flat'}
                  trendLabel={activeTicketCount > 0 ? 'sedang berjalan' : 'tidak ada'}
                />
              </Col>
            </Row>
            <Row className="g-3 mt-2">
              <Col xs={12}>
                <ComplicationGrid
                  columns={4}
                  items={[
                    { id: 'occupancy', icon: <span>🏠</span>, label: 'Okupansi', value: rooms.length > 0 ? Math.round((rooms.filter((r) => r.status === 'OCCUPIED').length / rooms.length) * 100) : 0, unit: '%', color: '#16a34a', to: '/rooms', badge: `${rooms.filter((r) => r.status === 'OCCUPIED').length}/${rooms.length}` },
                    { id: 'pending-approval', icon: <span>📋</span>, label: 'Review Booking', value: pendingApprovalCount, color: pendingApprovalCount > 0 ? '#f59e0b' : '#16a34a', to: '/stays?status=BOOKINGS', badge: pendingApprovalCount || undefined },
                    { id: 'payment-review', icon: <span>💳</span>, label: 'Review Bayar', value: pendingPaymentReviewCount, color: pendingPaymentReviewCount > 0 ? '#f59e0b' : '#16a34a', to: '/payment-submissions/review', badge: pendingPaymentReviewCount || undefined },
                    { id: 'renew', icon: <span>🔄</span>, label: 'Perpanjangan', value: pendingRenewCount, color: pendingRenewCount > 0 ? '#3b82f6' : '#16a34a', to: '/renew-requests', badge: pendingRenewCount || undefined },
                    { id: 'checkout', icon: <span>🚪</span>, label: 'Checkout', value: checkoutWorkCount, color: checkoutWorkCount > 0 ? '#f59e0b' : '#16a34a', to: '/stays?status=CHECKOUT', badge: checkoutWorkCount || undefined },
                    { id: 'overdue', icon: <span>⚠️</span>, label: 'Overdue', value: overdueInvoiceCount, color: overdueInvoiceCount > 0 ? '#dc2626' : '#16a34a', to: '/invoices', badge: overdueInvoiceCount || undefined },
                    { id: 'tickets', icon: <span>🎫</span>, label: 'Tiket Aktif', value: activeTicketCount, color: activeTicketCount > 0 ? '#f59e0b' : '#16a34a', to: '/tickets', badge: activeTicketCount || undefined },
                    { id: 'low-stock', icon: <span>📦</span>, label: 'Stok Menipis', value: lowStockCount, color: lowStockCount > 0 ? '#f59e0b' : '#16a34a', to: '/inventory/gudang', badge: lowStockCount || undefined },
                  ]}
                />
              </Col>
            </Row>
            {surveySummaryQuery.data && surveySummaryQuery.data.count > 0 ? (
              <div className="d-flex align-items-center gap-2 mt-3 p-2 rounded-3" style={{ background: '#f8fafc' }}>
                <span className="fw-semibold small">⭐ Survei Penghuni</span>
                <RatingDisplay value={Number(surveySummaryQuery.data.avgOverall ?? 0)} maxRating={5} size={16} showValue label={`dari ${surveySummaryQuery.data.count} respons`} />
                {surveySummaryQuery.data.recommendRate !== null ? (
                  <span className="small text-muted">| 👍 {surveySummaryQuery.data.recommendRate}% rekomendasi</span>
                ) : null}
                <Link to="/surveys" className="small ms-auto" style={{ whiteSpace: 'nowrap' }}>Lihat semua →</Link>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {activeArea === 'overview' && (autoOpsQuery.isError || autoOpsNeedsAction) ? (
        <Alert variant={autoOpsQuery.isError ? 'danger' : 'warning'} className="d-flex flex-wrap align-items-center gap-2 py-2">
          <div className="flex-fill">
            <strong>{autoOpsQuery.isError ? 'AutoOps mengalami kendala.' : 'AutoOps perlu tindakan.'}</strong>
            <span className="d-block small text-muted">
              {autoOpsQuery.isError
                ? 'Status AutoOps tidak berhasil dimuat. Buka Operasional untuk cek lagi.'
                : `${autoOpsExpiredCount + autoOpsHeldCount + autoOpsOrphanCount} kandidat perlu diproses di Operasional.`
              }
            </span>
          </div>
          <button
            type="button"
            className={`btn btn-sm ${autoOpsQuery.isError ? 'btn-outline-danger' : 'btn-outline-warning'}`}
            onClick={() => navigate(`${dashboardBase}?area=ops`)}
          >
            Cek di Operasional →
          </button>
        </Alert>
      ) : null}
      {activeArea === 'overview' ? (
        <ActionQueueTable
          title="Ringkasan antrean"
          subtitle="5 pekerjaan paling penting hari ini."
          items={filteredQueueItems.slice(0, 5)}
          emptyTitle="Tidak ada item mendesak hari ini"
          emptyDescription="Semua area operasional sedang aman."
          maxItems={5}
          collapsible={false}
        />
      ) : null}
      {activeArea === 'overview' ? (
        <section className="owner-panel mt-3 mb-3">
          <div
            className="owner-panel-heading p-3"
            onClick={() => setQueueExpanded((prev) => !prev)}
            role="button"
            tabIndex={0}
            aria-expanded={queueExpanded}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleQueueExpanded();
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <div>
              <span className="owner-section-kicker">Antrean lengkap</span>
              <h2 className="mb-0">Semua Antrean</h2>
            </div>
            <span>{queueExpanded ? '^' : 'v'}</span>
          </div>
          {queueExpanded ? (
            <div className="owner-panel-body p-3">
              <SegmentedTabs<'list' | 'board' | 'calendar'>
                items={[
                  { key: 'list', label: 'Daftar', icon: '☰', count: filteredQueueItems.length || undefined },
                  { key: 'board', label: 'Papan', icon: '📌' },
                  { key: 'calendar', label: 'Kalender', icon: '🗓' },
                ]}
                value={viewMode}
                onChange={handleViewMode}
                ariaLabel="Mode tampilan antrean aksi"
                size="sm"
              />
              {viewMode === 'list' ? (
                <ActionQueueTable
                  title="Admin Operations Antrean Aksi"
                  subtitle="Antrean keputusan lintas booking, pembayaran, renew, checkout, tagihan, tiket, dan stok."
                  items={filteredQueueItems}
                  emptyTitle="Tidak ada item mendesak hari ini"
                  emptyDescription="Semua area operasional sedang aman."
                  maxItems={12}
                  collapsible={false}
                />
              ) : null}
              {viewMode === 'board' ? <ActionKanbanBoard items={filteredQueueItems} /> : null}
              {viewMode === 'calendar' ? <ActionCalendar items={filteredQueueItems} /> : null}
            </div>
          ) : null}
        </section>
      ) : null}
      {/* Daily Assistant digantikan oleh AdminWorkLane cards di atas */}
      {activeArea === 'stays-finance' ? <AdminProcessLine /> : null}
      {activeArea === 'stays-finance' ? (
        <SegmentedTabs<'stays' | 'finance'>
          items={[
            { key: 'stays', label: 'Booking & Huni', icon: '🏠' },
            { key: 'finance', label: 'Tagihan & Bayar', icon: '🧾' },
          ]}
          value={staysFinanceSubTab}
          onChange={setStaysFinanceSubTab}
          ariaLabel="Sub-area keuangan"
          size="sm"
        />
      ) : null}
      {activeArea === 'stays-finance' && staysFinanceSubTab === 'stays' && ktpReviewItems.length > 0 ? (
        <Alert variant="warning" className="mb-3">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <div className="flex-fill">
              <strong>{ktpReviewItems.length} KTP menunggu pemeriksaan admin.</strong>
              <span className="d-block small text-muted">Periksa foto, cocokkan data, lalu buka halaman data penghuni untuk review manual.</span>
            </div>
          </div>
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Kamar</th>
                <th>Upload</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {ktpReviewItems.slice(0, 5).map((tenant) => {
                const roomLabel = tenant.currentStay?.room?.code || tenant.currentStay?.room?.name || (tenant.activeStayId ? `Masa sewa #${tenant.activeStayId}` : '-');
                return (
                  <tr key={tenant.id}>
                    <td><strong>{tenant.fullName}</strong></td>
                    <td>{roomLabel}</td>
                    <td><StatusBadge status="SUCCESS" customLabel="Terunggah" /></td>
                    <td>
                      <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => navigate('/tenants?ktpStatus=PENDING_REVIEW')}>
                        Periksa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {ktpReviewItems.length > 5 ? <div className="small text-muted mt-2">+{ktpReviewItems.length - 5} antrean KTP lainnya menunggu di Data Penghuni.</div> : null}
        </Alert>
      ) : null}
      {activeArea === 'stays-finance' && staysFinanceSubTab === 'finance' && canUseAdminBriefAi ? (
        <section className="owner-panel mt-3 mb-3">
          <div
            className="owner-panel-heading p-3"
            onClick={toggleAiBrief}
            role="button"
            tabIndex={0}
            aria-expanded={aiBriefOpen}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleAiBrief();
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <div>
              <span className="owner-section-kicker">🔍 Brief AI (Owner)</span>
              <h2 className="mb-0">Analisa Keuangan</h2>
            </div>
            <span>{aiBriefOpen ? '^' : 'v'}</span>
          </div>
          {aiBriefOpen ? (
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
          ) : null}
        </section>
      ) : null}
      {activeArea === 'stays-finance' && staysFinanceSubTab === 'stays' ? <AdminStaysUnifiedList activeStays={stays} bookingReview={pendingApprovalBookings} waitingPayment={waitingInitialPaymentBookings} renewRequests={renewRequests} checkoutPending={checkoutPendingRequests} checkoutApproved={checkoutApprovedRequests} onNavigate={navigate} dense={dense} /> : null}
      {activeArea === 'stays-finance' && staysFinanceSubTab === 'finance' ? <AdminFinanceWorkspace invoices={invoices} paymentReviewItems={paymentReviewItems} onNavigate={navigate} dense={dense} /> : null}
      {activeArea === 'ops' ? (
        <SegmentedTabs<'tickets' | 'rooms'>
          items={[
            { key: 'tickets', label: 'Tiket & Staff', icon: '👷' },
            { key: 'rooms', label: 'Kamar & Stok', icon: '🏘️' },
          ]}
          value={opsSubTab}
          onChange={setOpsSubTab}
          ariaLabel="Sub-area operasional"
          size="sm"
        />
      ) : null}
      {activeArea === 'ops' && opsSubTab === 'tickets' ? (
        <>
          <div className="mt-3">
            <AutoOpsControlPanel status={autoOpsQuery.data} role="ADMIN" onCompleted={refreshDashboard} />
            <AdminSlaMiniNote status={autoOpsQuery.data} />
          </div>
          <AdminTicketsWorkspace tickets={tickets} onNavigate={navigate} dense={dense} />
          <AdminStaffFrontlineList items={staffPerformanceItems} isLoading={staffPerformanceQuery.isLoading} dense={dense} />
        </>
      ) : null}
      {activeArea === 'ops' && opsSubTab === 'rooms' ? <AdminRoomsStockWorkspace rooms={rooms} inventoryItems={inventoryItems} onNavigate={navigate} dense={dense} /> : null}
      <AdminOverviewCharts activeArea={activeArea} rooms={rooms} invoices={invoices} tickets={tickets} pendingPaymentReviewCount={pendingPaymentReviewCount} pendingApprovalCount={pendingApprovalCount} waitingInitialPaymentCount={waitingInitialPaymentCount} pendingRenewCount={pendingRenewCount} checkoutCount={pendingCheckoutRequestCount + approvedCheckoutRequestCount} dense={dense} />
    </div>
  );
}