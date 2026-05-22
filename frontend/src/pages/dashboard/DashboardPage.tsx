import { useState, type ReactNode } from 'react';
import { Alert, Button, Card, Col, Collapse, Row, Spinner, Tab, Table, Tabs } from 'react-bootstrap';
import { Navigate, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { AssistantPanel, ActionQueueTable, CompactMetrics, type ActionQueueItem, type AssistantItem, type MetricChip } from '../../components/command-center';
import StaffMotivationDashboard from '../../components/staff/StaffMotivationDashboard';
import SmartChartPanel, { type SmartChartPoint } from '../../components/charts/SmartChartPanel';
import { listResource } from '../../api/resources';
import { listAdminRenewRequests } from '../../api/renewRequests';
import { listAdminCheckoutRequests } from '../../api/checkoutRequests';
import { listPaymentReviewQueue } from '../../api/paymentSubmissions';
import { fetchBusinessHealth } from '../../api/finance';
import { fetchMyStaffRoutineKpi, fetchStaffRoutineToday } from '../../api/staffRoutines';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRoute } from '../../config/navigation';
import { useBusinessHealthScore } from '../../hooks/useBusinessHealthScore';
import { useCashflowForecast } from '../../hooks/useCashflowForecast';
import { useOperationalStressIndex } from '../../hooks/useOperationalStressIndex';
import { dedupeCommandItems } from '../../utils/commandCenterDedup';
import type { Invoice, PaymentSubmission, RenewRequest, Room, Stay, Ticket } from '../../types';
import { useQuery } from '@tanstack/react-query';

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
  if (!dateValue) return '-';
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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
                  <td><div className="fw-semibold">{invoice.invoiceNumber || `INV-${invoice.id}`}</div><div className="small text-muted">Rp {formatNumber(Number(invoice.totalAmountRupiah ?? 0))}</div></td>
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
        title="Compact Business Health Cockpit"
        description="Ringkas: assistant mendiagnosis, queue berisi pekerjaan konkret, detail disembunyikan di tab dan drill-down laporan."
        secondaryAction={<><Button variant="outline-secondary" onClick={refreshDashboard}>Refresh</Button><Button variant="outline-primary" onClick={() => navigate('/reports?tab=command')}>Buka Reports</Button></>}
      />
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
  const [activeTab, setActiveTab] = useState('priorities');
  const roomsQuery = useQuery({ queryKey: ['dashboard-admin', 'rooms'], queryFn: () => listResource<Room>('/rooms', { limit: 500 }) });
  const staysQuery = useQuery({ queryKey: ['dashboard-admin', 'stays-active'], queryFn: () => listResource<Stay>('/stays', { status: 'ACTIVE', limit: 300 }) });
  const bookingsQuery = useQuery({ queryKey: ['dashboard-admin', 'bookings'], queryFn: () => listResource<Stay>('/stays', { limit: 300 }) });
  const invoicesQuery = useQuery({ queryKey: ['dashboard-admin', 'invoices'], queryFn: () => listResource<Invoice>('/invoices', { limit: 500 }) });
  const ticketsQuery = useQuery({ queryKey: ['dashboard-admin', 'tickets'], queryFn: () => listResource<Ticket>('/tickets', { limit: 150 }) });
  const depositCompleteStaysQuery = useQuery({ queryKey: ['dashboard-admin', 'stays-deposit-complete'], queryFn: () => listResource<Stay>('/stays', { status: 'COMPLETED', limit: 100 }) });
  const renewRequestsQuery = useQuery({ queryKey: ['dashboard-admin', 'renew-requests'], queryFn: () => listAdminRenewRequests({ status: 'PENDING' }), ...MEDIUM_FRESH_QUERY_OPTIONS });
  const checkoutRequestsPendingQuery = useQuery({ queryKey: ['dashboard-admin', 'checkout-requests-pending'], queryFn: () => listAdminCheckoutRequests({ status: 'PENDING' }), ...ACTION_QUERY_OPTIONS });
  const checkoutRequestsApprovedQuery = useQuery({ queryKey: ['dashboard-admin', 'checkout-requests-approved'], queryFn: () => listAdminCheckoutRequests({ status: 'APPROVED' }), ...ACTION_QUERY_OPTIONS });
  const paymentReviewQuery = useQuery({ queryKey: ['dashboard-admin', 'payment-review'], queryFn: () => listPaymentReviewQueue({ limit: 25 }), ...ACTION_QUERY_OPTIONS });

  const rooms = roomsQuery.data?.items ?? [];
  const stays = staysQuery.data?.items ?? [];
  const bookings = bookingsQuery.data?.items ?? [];
  const invoices = invoicesQuery.data?.items ?? [];
  const tickets = ticketsQuery.data?.items ?? [];
  const depositCompleteStays = depositCompleteStaysQuery.data?.items ?? [];
  const pendingRenewCount = renewRequestsQuery.data?.items?.filter((rr: RenewRequest) => rr.status === 'PENDING').length ?? 0;
  const pendingCheckoutRequestCount = checkoutRequestsPendingQuery.data?.items?.length ?? 0;
  const approvedCheckoutRequestCount = checkoutRequestsApprovedQuery.data?.items?.length ?? 0;
  const pendingPaymentReviewCount = makePaymentCount(paymentReviewQuery.data?.items ?? [], paymentReviewQuery.data?.meta?.totalItems);
  const overdueInvoices = invoices.filter(isOverdue);
  const dueSoonInvoices = invoices.filter(isDueSoon);
  const periodEndingSoon = stays.filter((stay) => {
    const days = daysFromToday(stay.plannedCheckOutDate);
    return days !== null && days >= 0 && days <= 14;
  });
  const pendingApprovalCount = bookings.filter((stay) => stay.status === 'RESERVED').length;
  const depositQueue = depositCompleteStays.filter((stay) => stay.depositStatus === 'HELD' || Number(stay.depositAmountRupiah ?? 0) > Number(stay.depositRefundedRupiah ?? 0));
  const opsStress = useOperationalStressIndex({ tickets, rooms, pendingCheckoutRequestCount, approvedCheckoutRequestCount, pendingRenewCount, pendingApprovalCount });

  const assistantItems: AssistantItem[] = dedupeCommandItems([
    ...(pendingPaymentReviewCount ? [{ id: 'admin-payment-review', ruleId: 'payment-review', entityType: 'payment-submission', entityId: 'summary', severity: 'HIGH' as const, title: 'Verifikasi pembayaran menahan flow', message: `${pendingPaymentReviewCount} bukti pembayaran perlu diputuskan sebelum invoice/booking dianggap clear.`, count: pendingPaymentReviewCount, source: 'Payment review', actionLabel: 'Verifikasi', actionTo: '/payment-submissions/review' }] : []),
    ...opsStress.assistantItems,
    ...(overdueInvoices.length ? [{ id: 'admin-overdue', ruleId: 'invoice-overdue', entityType: 'invoice', entityId: 'summary', severity: 'HIGH' as const, title: 'Tagihan overdue perlu follow-up', message: `${overdueInvoices.length} tagihan melewati jatuh tempo dan bisa memblokir flow checkout.`, count: overdueInvoices.length, source: 'Invoices', actionLabel: 'Lihat Tagihan', actionTo: '/invoices' }] : []),
    ...(pendingRenewCount ? [{ id: 'admin-renew', ruleId: 'renew-pending', entityType: 'renew', entityId: 'summary', severity: 'MEDIUM' as const, title: 'Permintaan perpanjangan menunggu review', message: 'Approval renew akan menerbitkan invoice renewal dan memperpanjang masa sewa.', count: pendingRenewCount, source: 'Renew', actionLabel: 'Review Renew', actionTo: '/renew-requests' }] : []),
  ]);

  const metrics: MetricChip[] = [
    ...opsStress.metrics,
    { id: 'payment-review', label: 'Payment review', value: pendingPaymentReviewCount, helper: 'Butuh keputusan admin', status: pendingPaymentReviewCount ? 'WARNING' : 'SUCCESS', icon: '💸', to: '/payment-submissions/review' },
    { id: 'overdue', label: 'Overdue', value: overdueInvoices.length, helper: 'Tagihan macet', status: overdueInvoices.length ? 'DANGER' : 'SUCCESS', icon: '⚠️', to: '/invoices' },
  ];

  const queueItems: ActionQueueItem[] = dedupeCommandItems([
    ...(pendingPaymentReviewCount ? [{ id: 'payment-review', ruleId: 'payment-review', entityType: 'payment-submission', entityId: 'summary', priority: 'HIGH' as const, type: 'Pembayaran', subject: `${pendingPaymentReviewCount} bukti`, issue: 'Review agar cashflow dan aktivasi booking tidak tertahan.', recommendedAction: 'Verifikasi', actionTo: '/payment-submissions/review' }] : []),
    ...opsStress.queueItems,
    ...overdueInvoices.slice(0, 3).map((invoice) => ({ id: `invoice-${invoice.id}`, ruleId: 'invoice-overdue', entityType: 'invoice', entityId: invoice.id, priority: 'HIGH' as const, type: 'Tagihan overdue', subject: invoice.stay?.tenant?.fullName || invoice.invoiceNumber || `Invoice #${invoice.id}`, issue: `Jatuh tempo ${formatDateSafe(invoice.dueDate)}.`, recommendedAction: 'Lihat Tagihan', actionTo: `/invoices/${invoice.id}` })),
    ...(pendingRenewCount ? [{ id: 'renew', ruleId: 'renew-pending', entityType: 'renew', entityId: 'summary', priority: 'MEDIUM' as const, type: 'Perpanjangan', subject: `${pendingRenewCount} request`, issue: 'Tenant menunggu keputusan masa sewa.', recommendedAction: 'Review', actionTo: '/renew-requests' }] : []),
    ...(pendingApprovalCount ? [{ id: 'booking-approval', ruleId: 'booking-approval', entityType: 'stay', entityId: 'reserved', priority: 'MEDIUM' as const, type: 'Booking', subject: `${pendingApprovalCount} booking baru`, issue: 'Reserved tanpa invoice awal perlu approval.', recommendedAction: 'Review booking', actionTo: '/stays?status=BOOKINGS' }] : []),
  ]);

  const refreshDashboard = () => {
    void Promise.all([
      roomsQuery.refetch(), staysQuery.refetch(), bookingsQuery.refetch(), invoicesQuery.refetch(), ticketsQuery.refetch(), depositCompleteStaysQuery.refetch(),
      renewRequestsQuery.refetch(), checkoutRequestsPendingQuery.refetch(), checkoutRequestsApprovedQuery.refetch(), paymentReviewQuery.refetch(),
    ]);
  };

  if (roomsQuery.isLoading || staysQuery.isLoading || bookingsQuery.isLoading || invoicesQuery.isLoading || ticketsQuery.isLoading || depositCompleteStaysQuery.isLoading || renewRequestsQuery.isLoading || checkoutRequestsPendingQuery.isLoading || checkoutRequestsApprovedQuery.isLoading || paymentReviewQuery.isLoading) return <LoadingDashboard />;
  if (roomsQuery.isError || staysQuery.isError || bookingsQuery.isError || invoicesQuery.isError || ticketsQuery.isError || depositCompleteStaysQuery.isError || renewRequestsQuery.isError || checkoutRequestsPendingQuery.isError || checkoutRequestsApprovedQuery.isError || paymentReviewQuery.isError) return <Alert variant="danger">Gagal memuat command center admin.</Alert>;

  return (
    <div>
      <PageHeader
        eyebrow="Admin Command Center"
        title="Operations Action Queue Commander"
        description="Admin melihat antrean kerja hari ini. Detail non-urgent dipindah ke tab agar dashboard tidak penuh."
        secondaryAction={<><Button variant="outline-secondary" onClick={refreshDashboard}>Refresh</Button><Button variant="outline-primary" onClick={() => navigate('/payment-submissions/review')}>Verifikasi Pembayaran</Button></>}
      />
      <AssistantPanel title="Asisten Operasional Admin" subtitle="Diagnosis ringkas, tidak mengulang semua row queue." items={assistantItems} maxItems={3} />
      <CompactMetrics metrics={metrics.slice(0, 6)} />
      <Tabs activeKey={activeTab} onSelect={(key) => setActiveTab(key ?? 'priorities')} className="command-tabs mb-3">
        <Tab eventKey="priorities" title="Prioritas"><ActionQueueTable title="Action Queue Hari Ini" subtitle="Urutan pekerjaan paling berdampak pada cashflow, tenant, dan kamar." items={queueItems} maxItems={10} /></Tab>
        <Tab eventKey="rooms" title="Kamar"><SmartChartPanel title="Kondisi Kamar" subtitle="Mode chart bisa diganti; detail okupansi ada di reports." points={makeRoomPoints(rooms)} defaultMode="bar" ctaLabel="Occupancy report" ctaTo="/reports?tab=operations" totalLabel="Kamar" /></Tab>
        <Tab eventKey="exceptions" title="Exception"><Row className="g-4"><Col xl={6}><Card className="content-card border-0"><Card.Body><div className="panel-title mb-1">Exception Singkat</div><div className="panel-subtitle mb-3">Flow yang berpotensi macet.</div><div className="kpi-list"><div className="kpi-item"><span>Due soon</span><strong>{dueSoonInvoices.length}</strong></div><div className="kpi-item"><span>Masa sewa ≤14 hari</span><strong>{periodEndingSoon.length}</strong></div><div className="kpi-item"><span>Deposit queue</span><strong>{depositQueue.length}</strong></div></div></Card.Body></Card></Col><Col xl={6}><FinanceReadinessCard /></Col></Row></Tab>
      </Tabs>
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
