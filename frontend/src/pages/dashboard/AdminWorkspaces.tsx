// Workspace components diekstrak dari DashboardAdmin.tsx (refactor 2026-06-19: kecilkan file 86KB untuk AI-read).
// 5 workspace tabel filterable: Staff, Stays, Finance, Tickets, Rooms. Semua prop-driven (tanpa state bersama).
import { useState, type ReactNode } from 'react';
import { Alert, Button, Card, Col, Modal, Row, Table } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import EmptyState from '../../components/common/EmptyState';
import ClickableRow from '../../components/common/ClickableRow';
import PaginationControls from '../../components/common/PaginationControls';
import StatusBadge from '../../components/common/StatusBadge';
import { AssistantPanel, ActionQueueTable, type ActionQueueItem, type AssistantItem, type MetricChip } from '../../components/command-center';
import { AssistantInsightLine, EntityBadgeFilterBar } from '../../components/workspace';
import AutoOpsControlPanel from '../../components/auto-ops/AutoOpsControlPanel';
import SmartChartPanel, { type SmartChartPoint } from '../../components/charts/SmartChartPanel';
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

function getTicketAssigneeLabel(ticket: Ticket) {
  return ticket.assignedTo?.fullName || (ticket.assignedToId ? `Staff #${ticket.assignedToId}` : 'Belum ditugaskan');
}

export function AdminStaffFrontlineList({ items, isLoading, dense }: { items: any[]; isLoading?: boolean; dense?: boolean }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'GOOD' | 'HELP' | 'EVALUATE'>('ALL');
  const staffRows = [...items].sort((a, b) => Number(b?.score?.final ?? 0) - Number(a?.score?.final ?? 0));
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
  const staffPagination = useClientPagination(filteredRows, [filter, filteredRows.length, dense], dense ? 3 : 10);
  return (
    <Card className="content-card border-0 mb-3 admin-staff-frontline-card true-workspace-card">
      <Card.Body>
        <div className="table-meta align-items-start">
          <div>
            <div className="panel-title">Staff & skor bulan ini</div>
            <div className="panel-subtitle">Klik row staff untuk membuka detail kinerja.</div>
          </div>
          <span className="unified-table-hint">10 staff per halaman</span>
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
              {staffPagination.pagedItems.map((item) => {
                const score = getScore(item);
                const category = item?.category?.label ?? 'Belum dinilai';
                const tone = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger';
                const name = item?.staff?.fullName ?? 'Staff';
                return (
                  <ClickableRow key={item?.staff?.id ?? name} onClick={() => navigate('/staff-performance')} label={`Lihat kinerja ${name}`}>
                    <td><strong>{name}</strong><div className="small text-muted">{item?.staff?.email ?? 'Klik untuk detail kinerja'}</div></td>
                    <td><StatusBadge status={tone.toUpperCase()} customLabel={String(score)} /></td>
                    <td>{category}</td>
                    <td>{item?.monthlyKpi?.ticketsDone ?? 0}</td>
                    <td>{item?.monthlyKpi?.routineDone ?? 0}</td>
                    <td>{isNeedHelp(item) ? <StatusBadge status="WARNING" customLabel="Perlu bantuan" /> : <span className="text-muted small">Aman</span>}</td>
                  </ClickableRow>
                );
              })}
            </tbody>
          </Table>
        ) : null}
        {staffPagination.hasPagination ? (
          <div className="table-pagination-shell mt-3">
            <PaginationControls currentPage={staffPagination.page} totalPages={staffPagination.totalPages} totalItems={staffPagination.totalItems} pageSize={staffPagination.pageSize} onPageChange={staffPagination.setPage} isLoading={Boolean(isLoading)} />
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}

type AdminStayFlowFilter = 'ALL' | 'BOOKING' | 'ACTIVE' | 'RENEW' | 'CHECKOUT' | 'FOLLOWUP';
type AdminStayFlowRow = { id: string; group: Exclude<AdminStayFlowFilter, 'ALL' | 'FOLLOWUP'>; tenant: string; room: string; statusLabel: string; tone: 'success' | 'info' | 'warning' | 'danger'; deadline?: string; helper: string; to: string; actionLabel: string };

export function AdminStaysUnifiedList({ activeStays, bookingReview, waitingPayment, renewRequests, checkoutPending, checkoutApproved, onNavigate, dense }: { activeStays: Stay[]; bookingReview: Stay[]; waitingPayment: Stay[]; renewRequests: RenewRequest[]; checkoutPending: CheckoutRequest[]; checkoutApproved: CheckoutRequest[]; onNavigate: (to: string) => void; dense?: boolean }) {
  const [filter, setFilter] = useState<AdminStayFlowFilter>('ALL');

  const bookingRows: AdminStayFlowRow[] = [...bookingReview, ...waitingPayment]
    .filter((stay) => stay.status === 'ACTIVE' && !isExpiredAdminBooking(stay))
    .map((stay) => {
      const needsReview = isReservedBookingPendingApproval(stay);
      const deadline = getStayDeadline(stay, needsReview ? ADMIN_SLA_HOURS.bookingReview : ADMIN_SLA_HOURS.tenantPayment);
      const meta = getDeadlineMeta(deadline, needsReview ? 'Batas review booking' : 'Batas bayar tenant');
      return { id: `booking-${stay.id}`, group: 'BOOKING', tenant: stay.tenant?.fullName || `Tenant #${stay.tenantId}`, room: stay.room?.code || `Kamar #${stay.roomId}`, statusLabel: needsReview ? 'Booking baru' : 'Menunggu bayar', tone: meta.isExpired ? 'danger' : needsReview ? 'warning' : 'info', deadline: meta.hasDate ? `${meta.clockLabel} · ${meta.relativeLabel}` : undefined, helper: needsReview ? 'Perlu review admin sebelum tagihan awal.' : 'Penghuni wajib bayar dan kirim bukti dalam satu langkah.', to: `/stays/${stay.id}`, actionLabel: needsReview ? 'Review' : 'Detail' };
    });

  const activeRows: AdminStayFlowRow[] = activeStays
    .filter((stay) => stay.status === 'ACTIVE' && stay.room?.status === 'OCCUPIED')
    .map((stay) => {
      const days = daysFromToday(stay.plannedCheckOutDate);
      const followUp = days !== null && days <= 14;
      return { id: `active-${stay.id}`, group: 'ACTIVE', tenant: stay.tenant?.fullName || `Tenant #${stay.tenantId}`, room: stay.room?.code || `Kamar #${stay.roomId}`, statusLabel: followUp ? 'Akhir masa dekat' : 'Aktif', tone: followUp ? 'warning' : 'success', deadline: stay.plannedCheckOutDate ? formatDateTimeWib(stay.plannedCheckOutDate) : undefined, helper: followUp ? 'Follow-up perpanjangan/keluar sebelum akhir masa sewa.' : 'Penghuni sedang menempati kamar.', to: `/stays/${stay.id}`, actionLabel: 'Detail' };
    });

  const renewRows: AdminStayFlowRow[] = renewRequests.map((request) => {
    const deadline = addHoursToDate(request.createdAt, ADMIN_SLA_HOURS.renewReview);
    const meta = getDeadlineMeta(deadline, 'Batas review perpanjangan');
    return { id: `renew-${request.id}`, group: 'RENEW', tenant: request.tenant?.fullName || request.stay?.tenant?.fullName || `Renew #${request.id}`, room: request.stay?.room?.code || '-', statusLabel: 'Perpanjangan', tone: meta.isExpired ? 'danger' : 'warning', deadline: meta.hasDate ? `${meta.clockLabel} · ${meta.relativeLabel}` : undefined, helper: 'Catat meter sebelum setujui perpanjangan dan buat tagihan utilitas.', to: '/renew-requests', actionLabel: 'Review' };
  });

  const checkoutRows: AdminStayFlowRow[] = [...checkoutPending, ...checkoutApproved].map((request) => {
    const approved = request.status === 'APPROVED';
    const baseTime = approved ? request.reviewedAt ?? request.updatedAt ?? request.createdAt : request.createdAt;
    const deadline = addHoursToDate(baseTime, approved ? ADMIN_SLA_HOURS.checkoutFinal : ADMIN_SLA_HOURS.checkoutReview);
    const meta = getDeadlineMeta(deadline, approved ? 'Batas final keluar' : 'Batas review keluar');
    return { id: `checkout-${request.id}`, group: 'CHECKOUT', tenant: request.stay?.tenant?.fullName || `Masa sewa #${request.stayId}`, room: request.stay?.room?.code || '-', statusLabel: approved ? 'Keluar disetujui' : 'Review keluar', tone: meta.isExpired ? 'danger' : approved ? 'info' : 'warning', deadline: meta.hasDate ? `${meta.clockLabel} · ${meta.relativeLabel}` : undefined, helper: approved ? 'Final keluar tetap lewat detail masa sewa.' : 'Setujui/tolak rencana keluar penghuni.', to: `/stays/${request.stayId}`, actionLabel: approved ? 'Finalkan' : 'Review' };
  });

  const rows = [...bookingRows, ...activeRows, ...renewRows, ...checkoutRows];
  const filteredRows = rows.filter((row) => {
    if (filter === 'ALL') return true;
    if (filter === 'FOLLOWUP') return row.tone === 'danger' || row.tone === 'warning';
    return row.group === filter;
  });
  const rowPagination = useClientPagination(filteredRows, [filter, filteredRows.length, dense], dense ? 3 : 10);
  const countBy = (value: AdminStayFlowFilter) => value === 'ALL' ? rows.length : value === 'FOLLOWUP' ? rows.filter((row) => row.tone === 'danger' || row.tone === 'warning').length : rows.filter((row) => row.group === value).length;

  return (
    <Card className="content-card border-0 mb-3">
      <Card.Body>
        <div className="table-meta align-items-start">
          <div><div className="panel-title">Semua Proses Sewa</div><div className="panel-subtitle">View ini hanya menampilkan stay aktif atau sedang diproses.</div></div>
          <span className="unified-table-hint">Klik row untuk detail</span>
        </div>
        <EntityBadgeFilterBar activeId={filter} onChange={(id) => setFilter(id as AdminStayFlowFilter)} filters={[
          { id: 'ALL', label: 'Semua Proses', count: countBy('ALL'), tone: 'info' },
          { id: 'BOOKING', label: 'Booking Baru', count: countBy('BOOKING'), tone: 'warning' },
          { id: 'ACTIVE', label: 'Aktif', count: countBy('ACTIVE'), tone: 'success' },
          { id: 'RENEW', label: 'Perpanjangan', count: countBy('RENEW'), tone: 'warning' },
          { id: 'CHECKOUT', label: 'Keluar', count: countBy('CHECKOUT'), tone: 'info' },
          { id: 'FOLLOWUP', label: 'Perlu Follow-up', count: countBy('FOLLOWUP'), tone: 'danger' },
        ]} />
        {!rowPagination.pagedItems.length ? <EmptyState icon="✅" title="Tidak ada proses di filter ini" description="Data cancelled, expired, dan arsip memang tidak ditampilkan di command center." /> : (
          <Table responsive hover className="compact-data-table admin-stays-unified-table mb-0">
            <thead><tr><th>Tenant</th><th>Kamar</th><th>Status</th><th>Deadline</th><th>Catatan</th><th>Detail</th></tr></thead>
            <tbody>
              {rowPagination.pagedItems.map((row) => (
                <ClickableRow key={row.id} onClick={() => onNavigate(row.to)} label={`${row.actionLabel}: ${row.tenant}`}>
                  <td><strong>{row.tenant}</strong></td>
                  <td>{row.room}</td>
                  <td><StatusBadge status={row.tone.toUpperCase()} customLabel={row.statusLabel} /></td>
                  <td>{row.deadline ?? <span className="text-muted">-</span>}</td>
                  <td className="small text-muted">{row.helper}</td>
                  <td><span className="row-arrow-cell" aria-label={`Buka ${row.actionLabel}`}>›</span></td>
                </ClickableRow>
              ))}
            </tbody>
          </Table>
        )}
        {rowPagination.hasPagination ? <div className="table-pagination-shell mt-3"><PaginationControls currentPage={rowPagination.page} totalPages={rowPagination.totalPages} totalItems={rowPagination.totalItems} pageSize={rowPagination.pageSize} onPageChange={rowPagination.setPage} /></div> : null}
      </Card.Body>
    </Card>
  );
}

type AdminFinanceDashboardFilter = 'ALL' | 'PAYMENT_REVIEW' | 'OPEN' | 'OVERDUE' | 'DRAFT' | 'PAID';
type AdminFinanceRow = { id: string; group: Exclude<AdminFinanceDashboardFilter, 'ALL'>; subject: string; flow: string; statusLabel: string; tone: 'success' | 'info' | 'warning' | 'danger'; amount: number; deadline?: string; helper: string; to: string };

export function AdminFinanceWorkspace({ invoices, paymentReviewItems, onNavigate, dense }: { invoices: Invoice[]; paymentReviewItems: PaymentSubmission[]; onNavigate: (to: string) => void; dense?: boolean }) {
  const [filter, setFilter] = useState<AdminFinanceDashboardFilter>('ALL');

  const paymentRows: AdminFinanceRow[] = paymentReviewItems.filter((s) => s.status === 'PENDING_REVIEW').map((submission) => {
    const receivedAt = submission.createdAt ?? submission.paidAt;
    const deadline = addHoursToDate(receivedAt, ADMIN_SLA_HOURS.paymentReviewMax);
    const meta = getDeadlineMeta(deadline, 'Batas review bukti');
    const tenantName = submission.tenant?.fullName || submission.submittedBy?.fullName || `Tenant #${submission.tenantId}`;
    return { id: `payment-${submission.id}`, group: 'PAYMENT_REVIEW', subject: tenantName, flow: 'Bukti bayar', statusLabel: meta.isExpired ? 'Lewat SLA' : 'Perlu verifikasi', tone: meta.isExpired ? 'danger' : 'warning', amount: Number(submission.amountRupiah ?? 0), deadline: meta.hasDate ? `${meta.clockLabel} · ${meta.relativeLabel}` : undefined, helper: submission.invoice?.invoiceNumber ? `Tagihan ${submission.invoice.invoiceNumber}` : 'Bukti pembayaran menunggu admin.', to: '/payment-submissions/review' };
  });

  const invoiceRows: AdminFinanceRow[] = invoices.filter((invoice) => invoice.status !== 'CANCELLED').map((invoice) => {
    const overdue = isTerlambat(invoice);
    const open = isOpenInvoice(invoice);
    const dueMeta = getDeadlineMeta(invoice.dueDate ?? getInvoiceTime(invoice, ADMIN_SLA_HOURS.tenantPayment), 'Jatuh tempo');
    const tenantName = invoice.stay?.tenant?.fullName || `Masa sewa #${invoice.stayId}`;
    const roomCode = invoice.stay?.room?.code ? ` · ${invoice.stay.room.code}` : '';
    const group: AdminFinanceRow['group'] = overdue ? 'OVERDUE' : invoice.status === 'DRAFT' ? 'DRAFT' : invoice.status === 'PAID' ? 'PAID' : 'OPEN';
    return { id: `invoice-${invoice.id}`, group, subject: `${tenantName}${roomCode}`, flow: invoice.invoiceNumber || `Tagihan #${invoice.id}`, statusLabel: overdue ? 'Terlambat' : invoice.status === 'DRAFT' ? 'Belum Terbit' : invoice.status === 'PAID' ? 'Lunas' : 'Tagihan aktif', tone: overdue ? 'danger' : invoice.status === 'DRAFT' ? 'warning' : invoice.status === 'PAID' ? 'success' : open ? 'info' : 'success', amount: Number(getInvoiceTotalAmount(invoice) ?? invoice.totalAmountRupiah ?? 0), deadline: dueMeta.hasDate ? `${dueMeta.clockLabel} · ${dueMeta.relativeLabel}` : undefined, helper: overdue ? 'Perlu follow-up cepat.' : invoice.status === 'DRAFT' ? 'Belum tampil ke penghuni.' : invoice.status === 'PAID' ? 'Sudah selesai.' : 'Pantau pembayaran dan bukti bayar.', to: `/invoices/${invoice.id}` };
  });

  const allRows = [...paymentRows, ...invoiceRows];
  const rows = allRows.filter((row) => filter === 'ALL' ? true : row.group === filter).sort((a, b) => { const rank: Record<string, number> = { PAYMENT_REVIEW: 0, OVERDUE: 1, DRAFT: 2, OPEN: 3, PAID: 4 }; return (rank[a.group] ?? 9) - (rank[b.group] ?? 9) || b.amount - a.amount; });
  const financePagination = useClientPagination(rows, [filter, rows.length, dense], dense ? 3 : 10);
  const countBy = (value: AdminFinanceDashboardFilter) => value === 'ALL' ? allRows.length : allRows.filter((row) => row.group === value).length;

  return (
    <Card className="content-card border-0 mb-3 true-workspace-card">
      <Card.Body>
        <div className="table-meta align-items-start">
          <div><div className="panel-title">Semua proses finance</div><div className="panel-subtitle">Tagihan dan bukti pembayaran tampil langsung di tab Finance.</div></div>
          <span className="unified-table-hint">10 item per halaman</span>
        </div>
        <EntityBadgeFilterBar activeId={filter} onChange={(id) => setFilter(id as AdminFinanceDashboardFilter)} filters={[
          { id: 'ALL', label: 'Semua Keuangan', count: countBy('ALL'), tone: 'info' },
          { id: 'PAYMENT_REVIEW', label: 'Bukti Bayar', count: countBy('PAYMENT_REVIEW'), tone: 'warning' },
          { id: 'OPEN', label: 'Tagihan Aktif', count: countBy('OPEN'), tone: 'info' },
          { id: 'OVERDUE', label: 'Terlambat', count: countBy('OVERDUE'), tone: 'danger' },
          { id: 'DRAFT', label: 'Belum Terbit', count: countBy('DRAFT'), tone: 'warning' },
          { id: 'PAID', label: 'Lunas', count: countBy('PAID'), tone: 'success' },
        ]} />
        {!rows.length ? <EmptyState icon="✅" title="Finance aman pada filter ini" description="Tidak ada tagihan atau bukti pembayaran yang perlu ditampilkan." /> : (
          <Table responsive hover className="compact-data-table mb-0">
            <thead><tr><th>Penghuni / Masa Sewa</th><th>Alur</th><th>Status</th><th>Nominal</th><th>Batas Waktu</th><th>Catatan</th><th>Detail</th></tr></thead>
            <tbody>
              {financePagination.pagedItems.map((row) => (
                <ClickableRow key={row.id} onClick={() => onNavigate(row.to)} label={`${row.flow}: ${row.subject}`}>
                  <td><strong>{row.subject}</strong></td>
                  <td>{row.flow}</td>
                  <td><StatusBadge status={row.tone.toUpperCase()} customLabel={row.statusLabel} /></td>
                  <td>Rp {formatNumber(row.amount)}</td>
                  <td>{row.deadline ?? <span className="text-muted">-</span>}</td>
                  <td className="small text-muted">{row.helper}</td>
                  <td><span className="row-arrow-cell">›</span></td>
                </ClickableRow>
              ))}
            </tbody>
          </Table>
        )}
        {financePagination.hasPagination ? <div className="table-pagination-shell mt-3"><PaginationControls currentPage={financePagination.page} totalPages={financePagination.totalPages} totalItems={financePagination.totalItems} pageSize={financePagination.pageSize} onPageChange={financePagination.setPage} /></div> : null}
      </Card.Body>
    </Card>
  );
}

type AdminTicketDashboardFilter = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CLOSED';

export function AdminTicketsWorkspace({ tickets, onNavigate, dense }: { tickets: Ticket[]; onNavigate: (to: string) => void; dense?: boolean }) {
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
  const rows = activeTickets.filter((ticket) => filter === 'ALL' ? true : ticket.status === filter).sort((a, b) => { const rank: Record<string, number> = { OPEN: 0, IN_PROGRESS: 1, DONE: 2, CLOSED: 3 }; return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime(); });
  const ticketPagination = useClientPagination(rows, [filter, rows.length, dense], dense ? 3 : 10);

  return (
    <Card className="content-card border-0 mb-3 true-workspace-card">
      <Card.Body>
        <div className="table-meta align-items-start">
          <div><div className="panel-title">Semua tiket aktif</div><div className="panel-subtitle">Tiket DONE bisa ditutup setelah admin mengecek hasil staff.</div></div>
          <span className="unified-table-hint">10 tiket per halaman</span>
        </div>
        <EntityBadgeFilterBar activeId={filter} onChange={(id) => setFilter(id as AdminTicketDashboardFilter)} filters={[
          { id: 'ALL', label: 'Semua', count: countBy('ALL'), tone: 'info' },
          { id: 'OPEN', label: 'Baru', count: countBy('OPEN'), tone: 'danger' },
          { id: 'IN_PROGRESS', label: 'Dikerjakan', count: countBy('IN_PROGRESS'), tone: 'warning' },
          { id: 'DONE', label: 'Perlu Cek', count: countBy('DONE'), tone: 'info' },
          { id: 'CLOSED', label: 'Selesai', count: countBy('CLOSED'), tone: 'success' },
        ]} />
        {!rows.length ? <EmptyState icon="🎫" title="Tidak ada tiket pada filter ini" description="Tiket batal/arsip tidak diprioritaskan di workspace utama." /> : (
          <Table responsive hover className="compact-data-table mb-0">
            <thead><tr><th>Tiket</th><th>Status</th><th>Lokasi / orang</th><th>Petugas</th><th>Diperbarui</th><th>Aksi</th></tr></thead>
            <tbody>
              {ticketPagination.pagedItems.map((ticket) => (
                <ClickableRow key={ticket.id} onClick={() => setDetailTicket(ticket)} label={`Buka tiket ${ticket.ticketNumber ?? `TIK-${ticket.id}`}`}>
                  <td><strong>{ticket.ticketNumber ?? `TIK-${ticket.id}`}</strong><div className="small text-muted">{ticket.title ?? 'Tiket operasional'}</div></td>
                  <td><StatusBadge status={ticket.status} /></td>
                  <td>{ticket.tenant?.fullName || ticket.room?.code || ticket.room?.name || (ticket.roomId ? `Kamar #${ticket.roomId}` : 'Belum ada lokasi')}</td>
                  <td>{ticket.assignedToId ? getTicketAssigneeLabel(ticket) : <span className="text-muted">Belum ditugaskan</span>}</td>
                  <td>{formatDateSafe(ticket.updatedAt ?? ticket.createdAt)}</td>
                  <td onClick={(event) => event.stopPropagation()}>
                    {ticket.status === 'DONE' ? <Button size="sm" variant="success" onClick={() => setCloseTarget(ticket)} disabled={closeTicketMutation.isPending}>Tutup</Button> : <span className="row-arrow-cell">›</span>}
                  </td>
                </ClickableRow>
              ))}
            </tbody>
          </Table>
        )}
        {ticketPagination.hasPagination ? <div className="table-pagination-shell mt-3"><PaginationControls currentPage={ticketPagination.page} totalPages={ticketPagination.totalPages} totalItems={ticketPagination.totalItems} pageSize={ticketPagination.pageSize} onPageChange={ticketPagination.setPage} /></div> : null}
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
          <Alert variant="info" className="py-2 small">Pastikan pekerjaan staff sudah dicek. Aksi ini mengubah tiket dari DONE menjadi CLOSED.</Alert>
          {closeTicketMutation.isError ? <Alert variant="danger" className="py-2 small">Gagal menutup tiket. Buka halaman Tiket jika tiket membutuhkan status final barang.</Alert> : null}
          <div className="small text-muted">{closeTarget?.ticketNumber ?? `Tiket #${closeTarget?.id ?? ''}`} · {closeTarget?.title ?? 'Tiket operasional'}</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setCloseTarget(null)}>Batal</Button>
          <Button variant="success" onClick={() => closeTarget ? closeTicketMutation.mutate(closeTarget) : undefined} disabled={!closeTarget || closeTicketMutation.isPending}>{closeTicketMutation.isPending ? 'Menutup...' : 'Tutup Tiket'}</Button>
          <Button variant="outline-primary" onClick={() => onNavigate('/tickets')}>Buka Halaman Tiket</Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}

type AdminRoomsDashboardFilter = 'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE' | 'STOCK_LOW';

export function AdminRoomsStockWorkspace({ rooms, inventoryItems, onNavigate, dense }: { rooms: Room[]; inventoryItems: any[]; onNavigate: (to: string) => void; dense?: boolean }) {
  const [filter, setFilter] = useState<AdminRoomsDashboardFilter>('ALL');
  const lowStockItems = inventoryItems.filter(isLowStockItem);
  const activeRooms = rooms.filter((room) => room.status !== 'INACTIVE');
  const countBy = (value: AdminRoomsDashboardFilter) => {
    if (value === 'ALL') return activeRooms.length;
    if (value === 'STOCK_LOW') return lowStockItems.length;
    if (value === 'MAINTENANCE') return activeRooms.filter((room) => ['MAINTENANCE', 'INACTIVE'].includes(String(room.status))).length;
    return activeRooms.filter((room) => room.status === value).length;
  };
  const roomRows = activeRooms.filter((room) => {
    if (filter === 'ALL') return true;
    if (filter === 'MAINTENANCE') return ['MAINTENANCE', 'INACTIVE'].includes(String(room.status));
    if (filter === 'STOCK_LOW') return false;
    return room.status === filter;
  });
  const roomPagination = useClientPagination(roomRows, [filter, roomRows.length, dense], dense ? 3 : 10);
  const stockPagination = useClientPagination(lowStockItems, [filter, lowStockItems.length, dense], dense ? 3 : 10);

  return (
    <Card className="content-card border-0 mb-3 true-workspace-card">
      <Card.Body>
        <div className="table-meta align-items-start">
          <div><div className="panel-title">Kamar & stok</div><div className="panel-subtitle">Tab ini langsung menampilkan kamar.</div></div>
          <span className="unified-table-hint">Klik row untuk detail</span>
        </div>
        <EntityBadgeFilterBar activeId={filter} onChange={(id) => setFilter(id as AdminRoomsDashboardFilter)} filters={[
          { id: 'ALL', label: 'Semua Kamar', count: countBy('ALL'), tone: 'info' },
          { id: 'AVAILABLE', label: 'Tersedia', count: countBy('AVAILABLE'), tone: 'success' },
          { id: 'OCCUPIED', label: 'Terisi', count: countBy('OCCUPIED'), tone: 'info' },
          { id: 'RESERVED', label: 'Dipesan', count: countBy('RESERVED'), tone: 'warning' },
          { id: 'MAINTENANCE', label: 'Perlu Cek', count: countBy('MAINTENANCE'), tone: 'danger' },
          { id: 'STOCK_LOW', label: 'Stok Menipis', count: countBy('STOCK_LOW'), tone: 'warning' },
        ]} />
        {filter === 'STOCK_LOW' ? (
          !lowStockItems.length ? <EmptyState icon="📦" title="Tidak ada stok menipis" description="Stok gudang aman berdasarkan qty dan batas minimum." /> : (
            <>
              <Table responsive hover className="compact-data-table mb-0">
                <thead><tr><th>Barang</th><th>Kategori</th><th>Stok</th><th>Min</th><th>Status</th></tr></thead>
                <tbody>{stockPagination.pagedItems.map((item) => <ClickableRow key={item.id} onClick={() => onNavigate('/inventory-items')} label={`Lihat barang ${item.name ?? `Barang #${item.id}`}`}><td><strong>{item.name ?? `Barang #${item.id}`}</strong><div className="small text-muted">{item.sku ?? '-'}</div></td><td>{item.category ?? '-'}</td><td>{String(item.qtyOnHand ?? 0)}</td><td>{String(item.minQty ?? 0)}</td><td><StatusBadge status="WARNING" customLabel="Stok menipis" /></td></ClickableRow>)}</tbody>
              </Table>
              {stockPagination.hasPagination ? <div className="table-pagination-shell mt-3"><PaginationControls currentPage={stockPagination.page} totalPages={stockPagination.totalPages} totalItems={stockPagination.totalItems} pageSize={stockPagination.pageSize} onPageChange={stockPagination.setPage} /></div> : null}
            </>
          )
        ) : (
          !roomRows.length ? <EmptyState icon="🚪" title="Tidak ada kamar pada filter ini" description="Pilih badge lain untuk melihat status kamar berbeda." /> : (
            <>
              <Table responsive hover className="compact-data-table mb-0">
                <thead><tr><th>Kamar</th><th>Status</th><th>Penghuni / pemesan</th><th>Tarif bulanan</th><th>Detail</th></tr></thead>
                <tbody>{roomPagination.pagedItems.map((room) => { const tenantName = room.currentStay?.tenant?.fullName; return <ClickableRow key={room.id} onClick={() => onNavigate(`/rooms/${room.id}`)} label={`Buka detail kamar ${room.code}`}><td><strong>{room.code}</strong><div className="small text-muted">{room.name ?? room.floor ?? '-'}</div></td><td><StatusBadge status={room.status} /></td><td>{tenantName ?? (room.status === 'AVAILABLE' ? 'Kosong' : 'Belum ada nama')}</td><td>Rp {formatNumber(Number(room.monthlyRateRupiah ?? 0))}</td><td><span className="row-arrow-cell">›</span></td></ClickableRow>; })}</tbody>
              </Table>
              {roomPagination.hasPagination ? <div className="table-pagination-shell mt-3"><PaginationControls currentPage={roomPagination.page} totalPages={roomPagination.totalPages} totalItems={roomPagination.totalItems} pageSize={roomPagination.pageSize} onPageChange={roomPagination.setPage} /></div> : null}
            </>
          )
        )}
      </Card.Body>
    </Card>
  );
}

