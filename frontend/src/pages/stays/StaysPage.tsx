import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listStays } from '../../api/stays';
import { expireReservedBooking, runPaymentSubmissionExpiryCheck } from '../../api/paymentSubmissions';
import { approveCheckoutRequest, listAdminCheckoutRequests, rejectCheckoutRequest } from '../../api/checkoutRequests';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import PaginationControls from '../../components/common/PaginationControls';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import { getBookingStatusLabel } from '../../utils/statusLabels';
import { AssistantPanel, ActionQueueTable, CompactMetrics, type ActionQueueItem, type AssistantItem, type MetricChip } from '../../components/command-center';
import ApproveBookingModal from '../../components/stays/ApproveBookingModal';
import RejectCheckoutModal from '../../components/checkout-requests/RejectCheckoutModal';
import type { CheckoutRequest, PaginatedResponse, Stay } from '../../types';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import { daysUntilDate, formatDateId, getBookingExpiryMeta } from '../../utils/bookingExpiry';

function formatDateSafe(dateValue: string | Date | null | undefined): string {
  return formatDateId(dateValue);
}

function daysFromToday(targetDate: string | Date | null | undefined): number | null {
  return daysUntilDate(targetDate);
}

function isReservedBooking(stay: Stay): boolean {
  return (
    stay.status === 'ACTIVE' &&
    stay.room?.status === 'RESERVED' &&
    stay.bookingSource === 'WEBSITE' &&
    Boolean(stay.expiresAt)
  );
}

function isOperationalActiveStay(stay: Stay): boolean {
  return stay.status === 'ACTIVE' && stay.room?.status === 'OCCUPIED';
}

function isCheckoutDueOrOverdue(stay: Stay): boolean {
  if (stay.status !== 'ACTIVE' || stay.room?.status !== 'OCCUPIED' || !stay.plannedCheckOutDate) return false;
  const daysLeft = daysFromToday(stay.plannedCheckOutDate);
  return daysLeft !== null && daysLeft <= 10;
}

function getCheckoutReminderBadge(stay: Stay): { label: string; status: string } | null {
  if (stay.status !== 'ACTIVE' || stay.room?.status !== 'OCCUPIED' || !stay.plannedCheckOutDate) return null;
  const daysLeft = daysFromToday(stay.plannedCheckOutDate);
  if (daysLeft === null || daysLeft < 0 || daysLeft > 10) return null;
  if (daysLeft >= 8) return { label: 'H-10', status: 'WARNING' };
  if (daysLeft >= 4) return { label: 'H-7', status: 'INFO' };
  return { label: 'H-3', status: 'DANGER' };
}

function getBookingApprovalMeta(stay: Stay) {
  const hasInitialInvoice = Number(stay.invoiceCount ?? 0) > 0 || Boolean(stay.latestInvoiceId);

  if (hasInitialInvoice) {
    return {
      isPendingApproval: false,
      label: 'Menunggu Pembayaran',
      variant: 'INFO',
      helper:
        stay.latestInvoiceNumber
          ? `Invoice awal ${stay.latestInvoiceNumber} sudah terbentuk. Booking ini tidak lagi menunggu approval.`
          : 'Invoice awal booking sudah terbentuk. Booking ini tidak lagi menunggu approval.',
    };
  }

  return {
    isPendingApproval: true,
    label: 'Menunggu Approval',
    variant: 'WARNING',
    helper: 'Booking reserved ini masih menunggu approval admin dan pembentukan invoice awal.',
  };
}

async function listAllActiveStaysForBookings(maxPages = 50): Promise<PaginatedResponse<Stay>> {
  const pageSize = 100;
  const items: Stay[] = [];
  let page = 1;
  let totalPages = 1;
  let totalItems = 0;

  do {
    const response = await listStays({ status: 'ACTIVE', page, limit: pageSize });
    items.push(...(response.items ?? []));
    totalPages = response.meta?.totalPages ?? 1;
    totalItems = response.meta?.totalItems ?? items.length;

    if (!(response.items ?? []).length) break;
    page += 1;
  } while (page <= totalPages && page <= maxPages);

  return {
    items,
    meta: {
      page: 1,
      limit: items.length || pageSize,
      totalItems,
      totalPages,
    },
  };
}

type StayViewFilter = 'ACTIVE' | 'BOOKINGS' | 'ALL';

export default function StaysPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFromUrl = searchParams.get('status') || undefined;
  const initialFilter: StayViewFilter = statusFromUrl === 'ACTIVE' || statusFromUrl === 'BOOKINGS' ? statusFromUrl : 'BOOKINGS';
  const [statusFilter, setStatusFilter] = useState<StayViewFilter>(initialFilter);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<Stay | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CheckoutRequest | null>(null);
  const PAGE_SIZE = 20;

  const isBookingsMode = statusFilter === 'BOOKINGS';
  const apiStatusFilter = statusFilter === 'ALL' ? undefined : 'ACTIVE';

  const expireMutation = useMutation({
    mutationFn: async (stayId?: number) => (stayId ? expireReservedBooking(stayId) : runPaymentSubmissionExpiryCheck()),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-submissions'] }),
      ]);
    },
  });

  const checkoutRequestsQuery = useQuery({
    queryKey: ['admin-checkout-requests', 'PENDING'],
    queryFn: () => listAdminCheckoutRequests({ status: 'PENDING' }),
    enabled: isBookingsMode,
  });

  const approvedCheckoutRequestsQuery = useQuery({
    queryKey: ['admin-checkout-requests', 'APPROVED'],
    queryFn: () => listAdminCheckoutRequests({ status: 'APPROVED' }),
    enabled: isBookingsMode,
  });

  const pendingCheckoutRequests = useMemo(() => {
    if (!checkoutRequestsQuery.data?.items) return [];
    return checkoutRequestsQuery.data.items.filter((r) => r.status === 'PENDING');
  }, [checkoutRequestsQuery.data]);

  const approvedCheckoutRequests = useMemo(() => {
    if (!approvedCheckoutRequestsQuery.data?.items) return [];
    return approvedCheckoutRequestsQuery.data.items.filter((r) => r.status === 'APPROVED');
  }, [approvedCheckoutRequestsQuery.data]);

  const approveCrMutation = useMutation({
    mutationFn: async (id: number) => approveCheckoutRequest(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-checkout-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
      ]);
    },
  });

  const rejectCrMutation = useMutation({
    mutationFn: async ({ id, reviewNotes }: { id: number; reviewNotes: string }) =>
      rejectCheckoutRequest(id, { reviewNotes }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-checkout-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
      ]);
      setRejectTarget(null);
    },
  });

  const query = useQuery({
    queryKey: ['stays', statusFilter, isBookingsMode ? 'bookings-all' : page],
    queryFn: () => (
      isBookingsMode
        ? listAllActiveStaysForBookings()
        : listStays({ status: apiStatusFilter, page, limit: PAGE_SIZE })
    ),
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const reservedBookings = useMemo(() => items.filter((item) => isReservedBooking(item)), [items]);
  const operationalActive = useMemo(() => items.filter((item) => isOperationalActiveStay(item)), [items]);
  const checkoutDue = useMemo(() => operationalActive.filter((item) => isCheckoutDueOrOverdue(item)), [operationalActive]);

  const filteredItems = useMemo(() => {
    const baseItems = statusFilter === 'BOOKINGS'
      ? [...reservedBookings, ...checkoutDue]
      : statusFilter === 'ACTIVE'
        ? operationalActive
        : items;

    const term = keyword.trim().toLowerCase();
    return baseItems.filter((item) =>
      !term || [
        item.tenant?.fullName,
        item.room?.code,
        item.room?.name,
        item.pricingTerm,
        item.bookingSource,
        item.stayPurpose,
        item.latestInvoiceNumber,
      ].some((value) => String(value ?? '').toLowerCase().includes(term)),
    );
  }, [items, keyword, operationalActive, reservedBookings, statusFilter]);

  const handleStatusFilterChange = (filter: StayViewFilter) => {
    setStatusFilter(filter);
    const nextParams = new URLSearchParams(searchParams);
    if (filter === 'ALL') {
      nextParams.delete('status');
    } else {
      nextParams.set('status', filter);
    }
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    setPage(1);
  }, [statusFilter, keyword]);

  const checkoutSoonCount = checkoutDue.length;
  const pendingCheckoutRequestCount = pendingCheckoutRequests.length;
  const approvedCheckoutRequestCount = approvedCheckoutRequests.length;
  const expiredBookingsCount = reservedBookings.filter((item) => getBookingExpiryMeta(item.expiresAt).isExpired).length;
  const pendingApprovalCount = reservedBookings.filter((item) => getBookingApprovalMeta(item).isPendingApproval).length;
  const waitingPaymentCount = reservedBookings.filter((item) => !getBookingApprovalMeta(item).isPendingApproval).length;
  const meta = query.data?.meta;
  const paginatedFilteredItems = isBookingsMode
    ? filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : filteredItems;
  const bookingsTotalItems = isBookingsMode ? filteredItems.length : 0;
  const bookingsTotalPages = isBookingsMode ? Math.max(1, Math.ceil(bookingsTotalItems / PAGE_SIZE)) : 1;
  const visibleItems = isBookingsMode ? paginatedFilteredItems : filteredItems;
  const tableCountText = isBookingsMode
    ? `Menampilkan ${visibleItems.length} dari ${bookingsTotalItems} item butuh tindakan`
    : `Menampilkan ${filteredItems.length} dari ${meta?.totalItems ?? items.length} data`;

  const assistantItems: AssistantItem[] = [
    pendingCheckoutRequestCount ? {
      id: 'checkout-pending',
      severity: 'HIGH',
      title: `${pendingCheckoutRequestCount} pengajuan keluar menunggu review`,
      message: 'Admin perlu setujui/tolak rencana keluar. Ini belum final checkout dan belum melepas kamar.',
      source: 'Checkout request',
      count: pendingCheckoutRequestCount,
      actionLabel: 'Lihat antrean',
      onAction: () => handleStatusFilterChange('BOOKINGS'),
    } : null,
    approvedCheckoutRequestCount ? {
      id: 'checkout-approved',
      severity: 'BLOCKER',
      title: `${approvedCheckoutRequestCount} rencana keluar sudah disetujui tapi belum final`,
      message: 'Final checkout tetap harus dilakukan dari detail masa sewa setelah tagihan terbuka diselesaikan.',
      source: 'Lifecycle',
      count: approvedCheckoutRequestCount,
      actionLabel: 'Proses final',
      onAction: () => handleStatusFilterChange('BOOKINGS'),
    } : null,
    expiredBookingsCount ? {
      id: 'booking-expired',
      severity: 'WARNING',
      title: `${expiredBookingsCount} booking reserved sudah kedaluwarsa`,
      message: 'Jalankan expiry check atau review booking agar kamar tidak tertahan tidak produktif.',
      source: 'Booking',
      count: expiredBookingsCount,
      actionLabel: 'Lihat booking',
      onAction: () => handleStatusFilterChange('BOOKINGS'),
    } : null,
    checkoutSoonCount ? {
      id: 'checkout-soon',
      severity: 'MEDIUM',
      title: `${checkoutSoonCount} masa sewa mendekati akhir`,
      message: 'Follow-up renew/keluar agar tenant dan operasional siap sebelum tanggal akhir masa sewa.',
      source: 'Masa sewa',
      count: checkoutSoonCount,
      actionLabel: 'Lihat due',
      onAction: () => handleStatusFilterChange('BOOKINGS'),
    } : null,
  ].filter(Boolean) as AssistantItem[];

  const metrics: MetricChip[] = [
    { id: 'active', label: 'Masa sewa aktif', value: operationalActive.length, helper: 'Tenant sedang menempati kamar', icon: '🏠', status: 'SUCCESS', onClick: () => handleStatusFilterChange('ACTIVE') },
    { id: 'approval', label: 'Menunggu approval', value: pendingApprovalCount, helper: 'Booking reserved tanpa invoice awal', icon: '📝', status: pendingApprovalCount ? 'WARNING' : 'SUCCESS', onClick: () => handleStatusFilterChange('BOOKINGS') },
    { id: 'due', label: 'Akhir masa sewa dekat', value: checkoutSoonCount, helper: 'H-10 sampai overdue', icon: '⏰', status: checkoutSoonCount ? 'WARNING' : 'SUCCESS', onClick: () => handleStatusFilterChange('BOOKINGS') },
    { id: 'checkout', label: 'Pengajuan keluar', value: pendingCheckoutRequestCount + approvedCheckoutRequestCount, helper: `${approvedCheckoutRequestCount} sudah disetujui`, icon: '🚪', status: pendingCheckoutRequestCount || approvedCheckoutRequestCount ? 'DANGER' : 'SUCCESS', onClick: () => handleStatusFilterChange('BOOKINGS') },
  ];

  const actionQueueItems: ActionQueueItem[] = [
    ...approvedCheckoutRequests.map((cr) => ({
      id: `approved-${cr.id}`,
      priority: 'BLOCKER' as const,
      type: 'Final checkout',
      subject: cr.stay?.tenant?.fullName ?? `Stay #${cr.stayId}`,
      issue: 'Rencana keluar sudah disetujui, tetapi kamar belum dilepas sampai final checkout dijalankan.',
      age: cr.reviewedAt ? `Disetujui ${formatDateSafe(cr.reviewedAt)}` : undefined,
      recommendedAction: 'Buka detail',
      actionTo: `/stays/${cr.stayId}`,
    })),
    ...pendingCheckoutRequests.map((cr) => ({
      id: `pending-${cr.id}`,
      priority: 'HIGH' as const,
      type: 'Review keluar',
      subject: cr.stay?.tenant?.fullName ?? `Stay #${cr.stayId}`,
      issue: `Tenant mengajukan keluar pada ${formatDateSafe(cr.requestedCheckOutDate)}.`,
      age: cr.createdAt ? `Diajukan ${formatDateSafe(cr.createdAt)}` : undefined,
      recommendedAction: 'Review',
      actionTo: `/stays/${cr.stayId}`,
    })),
    ...reservedBookings.slice(0, 4).map((stay) => {
      const expiryMeta = getBookingExpiryMeta(stay.expiresAt);
      const approvalMeta = getBookingApprovalMeta(stay);
      return {
        id: `booking-${stay.id}`,
        priority: expiryMeta.isExpired ? 'WARNING' as const : approvalMeta.isPendingApproval ? 'MEDIUM' as const : 'INFO' as const,
        type: 'Booking',
        subject: stay.tenant?.fullName ?? `Tenant #${stay.tenantId}`,
        issue: approvalMeta.helper,
        age: expiryMeta.helperText,
        recommendedAction: approvalMeta.isPendingApproval ? 'Approve booking' : 'Buka detail',
        actionTo: `/stays/${stay.id}`,
      };
    }),
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Lifecycle Command Center"
        title="Masa Sewa & Booking"
        description="Pisahkan booking, masa sewa aktif, akhir masa sewa, dan pengajuan keluar supaya admin tahu flow mana yang perlu tindakan."
        actionLabel="Check-in Baru"
        onAction={() => navigate('/stays/check-in')}
      />

      <AssistantPanel
        title="Asisten Lifecycle"
        subtitle="Prioritas booking, renew/keluar, dan final checkout berdasarkan data masa sewa."
        items={assistantItems}
        emptyTitle="Tidak ada lifecycle blocker besar"
        emptyMessage="Tidak ada pengajuan keluar atau booking expired yang menonjol pada data saat ini."
      />
      <CompactMetrics metrics={metrics} />
      <ActionQueueTable
        title="Lifecycle Action Queue"
        subtitle="Antrean yang paling berdampak ke kamar tertahan, tenant keluar, atau booking belum selesai."
        items={actionQueueItems}
        emptyTitle="Tidak ada antrean lifecycle"
        emptyDescription="Booking, renew/keluar, dan final checkout sedang aman pada filter ini."
      />

      <Card className="content-card border-0 mb-3">
        <Card.Body className="py-3">
          <div className="table-meta mb-0">
            <div>
              <div className="panel-title">Fokus Data</div>
              <div className="panel-subtitle">Pilih mode kerja dulu, lalu tab di atas tabel akan mengikuti konteksnya.</div>
            </div>
            <span className="table-meta-count">{tableCountText}</span>
          </div>
          <div className="compact-filter-bar mt-3">
            <Form.Select
              aria-label="Fokus data stay"
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value as StayViewFilter)}
              style={{ maxWidth: 260 }}
            >
              <option value="BOOKINGS">Perlu Tindakan</option>
              <option value="ACTIVE">Masa Sewa Aktif</option>
              <option value="ALL">Semua Masa Sewa</option>
            </Form.Select>
            <Form.Control
              placeholder="🔍  Tenant, kamar, invoice..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            <div className="summary-strip compact-summary">
              <span className="summary-chip"><span className="summary-chip-label">Booking</span><span className="summary-chip-value">{reservedBookings.length}</span></span>
              <span className="summary-chip"><span className="summary-chip-label">Due</span><span className="summary-chip-value">{checkoutDue.length}</span></span>
              <span className="summary-chip"><span className="summary-chip-label">Rencana keluar</span><span className="summary-chip-value">{pendingCheckoutRequestCount}</span></span>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="content-card border-0">
        <Card.Body>
          <div className="table-meta align-items-start">
            <div>
              <div className="panel-title">{isBookingsMode ? 'Queue booking & renew/keluar' : statusFilter === 'ACTIVE' ? 'Masa sewa operasional aktif' : 'Semua data masa sewa'}</div>
              <div className="panel-subtitle">Tab pills langsung mengontrol data tabel, tanpa alert panjang.</div>
            </div>
            <div className="status-tab-bar compact-tabs">
              <button className={`status-tab tab-danger${statusFilter === 'BOOKINGS' ? ' active' : ''}`} onClick={() => handleStatusFilterChange('BOOKINGS')}>
                Perlu Tindakan
                <span className="tab-badge">{isBookingsMode ? bookingsTotalItems + pendingCheckoutRequestCount : checkoutDue.length + reservedBookings.length + pendingCheckoutRequestCount}</span>
              </button>
              <button className={`status-tab tab-success${statusFilter === 'ACTIVE' ? ' active' : ''}`} onClick={() => handleStatusFilterChange('ACTIVE')}>
                Masa Sewa Aktif
                <span className="tab-badge">{operationalActive.length}</span>
              </button>
              <button className={`status-tab${statusFilter === 'ALL' ? ' active' : ''}`} onClick={() => handleStatusFilterChange('ALL')}>
                Semua Masa Sewa
                <span className="tab-badge">{items.length}</span>
              </button>
            </div>
          </div>

          {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
          {query.isError ? <Alert variant="danger">Gagal mengambil data masa sewa. Silakan coba lagi.</Alert> : null}
          {!query.isLoading && !query.isError && visibleItems.length === 0 ? (
            <EmptyState
              icon={statusFilter === 'BOOKINGS' ? '🗓️' : '🏠'}
              title={statusFilter === 'BOOKINGS' ? 'Tidak ada item yang perlu ditindaklanjuti' : 'Belum ada data masa sewa'}
              description={statusFilter === 'BOOKINGS'
                ? 'Semua booking sudah ditangani dan tidak ada masa sewa yang mendekati tanggal renew/keluar.'
                : 'Coba ubah filter atau mulai check-in tenant baru.'}
              action={statusFilter === 'BOOKINGS' ? undefined : { label: 'Check-in Baru', onClick: () => navigate('/stays/check-in') }}
            />
          ) : null}

          {isBookingsMode && pendingCheckoutRequests.length > 0 ? (
            <>
              <h6 className="fw-semibold mt-3 mb-2">🔔 Pengajuan Rencana Keluar Kamar — Menunggu Review</h6>
              <Table hover responsive className="mb-3">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Kamar</th>
                    <th>Tgl Diajukan</th>
                    <th>Alasan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCheckoutRequests.map((cr) => (
                    <tr key={`cr-${cr.id}`}>
                      <td>
                        <div className="fw-semibold">{cr.stay?.tenant?.fullName ?? '-'}</div>
                        <div className="small text-muted">{cr.stay?.tenant?.phone ?? ''}</div>
                      </td>
                      <td>
                        <div className="fw-semibold">{cr.stay?.room?.code ?? '-'}</div>
                        <div className="small text-muted">Masa sewa #{cr.stayId}</div>
                      </td>
                      <td>
                        <div>{formatDateSafe(cr.requestedCheckOutDate)}</div>
                        {cr.createdAt ? <div className="small text-muted">Diajukan {formatDateSafe(cr.createdAt)}</div> : null}
                      </td>
                      <td>
                        <div>{cr.checkoutReason || cr.requestNotes || '-'}</div>
                        {cr.requestNotes && cr.checkoutReason !== cr.requestNotes ? (
                          <div className="small text-muted">Catatan: {cr.requestNotes}</div>
                        ) : null}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => approveCrMutation.mutate(cr.id)}
                            disabled={approveCrMutation.isPending}
                          >
                            {approveCrMutation.isPending ? '...' : 'Setujui Rencana'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => setRejectTarget(cr)}
                            disabled={rejectCrMutation.isPending}
                          >
                            Tolak
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <hr className="my-1" />
            </>
          ) : null}

          {isBookingsMode && approvedCheckoutRequests.length > 0 ? (
            <>
              <h6 className="fw-semibold mt-4 mb-2">✅ Rencana Keluar — Rencana Disetujui</h6>
              <p className="small text-muted mb-2">
                Jadwal keluar telah disetujui. Tenant masih tercatat menghuni sampai admin menjalankan Final checkout dari halaman detail stay.
              </p>
              <Table hover responsive className="mb-3">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Kamar</th>
                    <th>Tgl Keluar Diajukan</th>
                    <th>Alasan</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedCheckoutRequests.map((cr) => (
                    <tr key={`approved-cr-${cr.id}`}>
                      <td>
                        <div className="fw-semibold">{cr.stay?.tenant?.fullName ?? '-'}</div>
                        <div className="small text-muted">{cr.stay?.tenant?.phone ?? ''}</div>
                      </td>
                      <td>
                        <div className="fw-semibold">{cr.stay?.room?.code ?? '-'}</div>
                        <div className="small text-muted">Masa sewa #{cr.stayId}</div>
                      </td>
                      <td>
                        <div>{formatDateSafe(cr.requestedCheckOutDate)}</div>
                        {cr.reviewedAt ? <div className="small text-muted">Disetujui {formatDateSafe(cr.reviewedAt)}</div> : null}
                      </td>
                      <td>
                        <div>{cr.checkoutReason || cr.requestNotes || '-'}</div>
                      </td>
                      <td>
                        <StatusBadge status="APPROVED" customLabel="Rencana Disetujui" />
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => navigate(`/stays/${cr.stayId}`)}
                        >
                          Lihat Detail Masa Sewa
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <hr className="my-1" />
            </>
          ) : null}

          {isBookingsMode ? (
            <>
              <h6 className="fw-semibold mt-3 mb-2">Booking & Checkout Due</h6>
            </>
          ) : null}

          {!query.isLoading && !query.isError && visibleItems.length > 0 && isBookingsMode ? (
            <>
              <Table hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Kamar</th>
                    <th>Check-in</th>
                    <th>Pricing</th>
                    <th>Masa Berlaku</th>
                    <th>Status Booking</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => {
                    const expiryMeta = getBookingExpiryMeta(item.expiresAt);
                    const approvalMeta = getBookingApprovalMeta(item);
                    const canApprove = approvalMeta.isPendingApproval && !expiryMeta.isExpired;
                    const bookingStatusResult = getBookingStatusLabel({
                      isReserved: isReservedBooking(item),
                      isExpired: expiryMeta.isExpired,
                      hasInvoice: !approvalMeta.isPendingApproval,
                      isCancelled: item.status === 'CANCELLED',
                      isCompleted: item.status === 'COMPLETED',
                      isActiveOccupied: item.status === 'ACTIVE' && item.room?.status === 'OCCUPIED',
                    });
                    const showExpirySubBadge = expiryMeta.variant === 'DANGER' || expiryMeta.variant === 'WARNING';
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="fw-semibold">{item.tenant?.fullName ?? `Tenant #${item.tenantId}`}</div>
                          {item.tenant?.identityNumber ? (
                            <div className="small text-muted font-monospace">NIK: {item.tenant.identityNumber}</div>
                          ) : null}
                          <div className="small text-muted">{item.bookingSource ? `Sumber: ${getStatusLabel(item.bookingSource)}` : item.stayPurpose ? getStatusLabel(item.stayPurpose) : 'Tanpa keterangan tambahan'}</div>
                        </td>
                        <td>
                          <div className="fw-semibold">{item.room?.code ?? `Room #${item.roomId}`}</div>
                          <div className="small text-muted">{item.room?.name || 'Nama kamar belum tersedia'}{item.room?.floor ? ` · Lantai ${item.room.floor}` : ''}</div>
                        </td>
                        <td>
                          <div className="fw-semibold">{formatDateSafe(item.checkInDate)}</div>
                          <div className="small text-muted">Renew/keluar: {formatDateSafe(item.plannedCheckOutDate)}</div>
                        </td>
                        <td>
                          <div className="fw-semibold">{item.pricingTerm ? getStatusLabel(item.pricingTerm) : '-'}</div>
                          <div className="small text-muted">Deposit <CurrencyDisplay amount={item.depositAmountRupiah} showZero={false} /></div>
                        </td>
                        <td>
                          <div className="fw-semibold">{formatDateSafe(item.expiresAt)}</div>
                          <div className="small text-muted">{expiryMeta.helperText}</div>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-2 align-items-center">
                            <StatusBadge status={bookingStatusResult.variant} customLabel={bookingStatusResult.label} />
                            {showExpirySubBadge ? (
                              <StatusBadge status={expiryMeta.variant} customLabel={expiryMeta.badgeLabel} />
                            ) : null}
                          </div>
                          <div className="small text-muted mt-2">
                            {approvalMeta.helper}
                            {item.latestInvoiceNumber ? ` Invoice: ${item.latestInvoiceNumber}${item.latestInvoiceStatus ? ` (${getStatusLabel(item.latestInvoiceStatus)})` : ''}.` : ''}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            {canApprove ? (
                              <Button size="sm" onClick={() => setSelectedBooking(item)}>
                                Setujui Booking
                              </Button>
                            ) : null}
                            {expiryMeta.isExpired ? (
                              <Button size="sm" variant="outline-danger" onClick={() => expireMutation.mutate(item.id)} disabled={expireMutation.isPending}>
                                {expireMutation.isPending ? 'Memproses...' : 'Jalankan Kedaluwarsa'}
                              </Button>
                            ) : null}
                            {!canApprove && !expiryMeta.isExpired ? (
                              <Button size="sm" variant="outline-secondary" onClick={() => navigate(`/stays/${item.id}`)}>
                                Detail
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              <div className="mt-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={bookingsTotalPages}
                  totalItems={bookingsTotalItems}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  isLoading={query.isLoading}
                />
              </div>
            </>
          ) : null}

          {!query.isLoading && !query.isError && visibleItems.length > 0 && !isBookingsMode ? (
            <Table hover responsive className="mb-0">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Kamar</th>
                  <th>Status</th>
                  <th>Check-in</th>
                  <th>Pricing</th>
                  <th>Deposit</th>
                  <th style={{ width: 140 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const reminderBadge = getCheckoutReminderBadge(item);
                  const isReservedBooking = item.room?.status === 'RESERVED';
                  const expiryMeta = getBookingExpiryMeta(item.expiresAt);
                  const onOpen = () => navigate(`/stays/${item.id}`);
                  return (
                    <tr
                      key={item.id}
                      className={isReservedBooking ? '' : 'clickable-row'}
                      onClick={isReservedBooking ? undefined : onOpen}
                      tabIndex={isReservedBooking ? undefined : 0}
                      role={isReservedBooking ? undefined : 'button'}
                      onKeyDown={isReservedBooking ? undefined : (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onOpen();
                        }
                      }}
                    >
                      <td>
                        <div className="fw-semibold">{item.tenant?.fullName ?? `Tenant #${item.tenantId}`}</div>
                        <div className="small text-muted">{item.bookingSource ? `Sumber: ${getStatusLabel(item.bookingSource)}` : item.stayPurpose ? getStatusLabel(item.stayPurpose) : 'Tanpa keterangan tambahan'}</div>
                      </td>
                      <td>
                        <div className="fw-semibold">{item.room?.code ?? `Room #${item.roomId}`}</div>
                        <div className="small text-muted">{item.room?.name || 'Nama kamar belum tersedia'}</div>
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-2">
                          <StatusBadge status={item.status} />
                          {reminderBadge ? <StatusBadge status={reminderBadge.status} customLabel={reminderBadge.label} /> : null}
                        </div>
                      </td>
                      <td>
                        <div>{item.checkInDate ? formatDateSafe(item.checkInDate) : 'Belum Check-in'}</div>
                        {isReservedBooking ? <div className="small text-muted">Berlaku s.d. {formatDateSafe(item.expiresAt)} · {expiryMeta.helperText}</div> : null}
                      </td>
                      <td>
                        <div className="fw-semibold">{item.pricingTerm ? getStatusLabel(item.pricingTerm) : '-'}</div>
                        <div className="small text-muted">Renew/keluar: {formatDateSafe(item.plannedCheckOutDate)}</div>
                      </td>
                      <td>
                        <CurrencyDisplay amount={item.depositAmountRupiah} showZero={false} />
                        {item.depositStatus && item.depositStatus !== 'HELD' ? (
                          <div className="small text-muted mt-1">
                            {item.depositStatus === 'REFUNDED'
                              ? 'Dikembalikan'
                              : item.depositStatus === 'PARTIALLY_REFUNDED'
                                ? 'Sebagian dikembalikan'
                                : item.depositStatus === 'FORFEITED'
                                  ? 'Hangus'
                                  : item.depositStatus}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {isReservedBooking ? (
                          <Button size="sm" variant="outline-secondary" onClick={(event) => { event.stopPropagation(); handleStatusFilterChange('BOOKINGS'); }}>Mode Booking</Button>
                        ) : (
                          <div style={{ width: 32, textAlign: 'center', color: 'var(--text-muted)' }}>›</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : null}

          {!isBookingsMode ? (
            <div className="mt-3">
              <PaginationControls
                currentPage={page}
                totalPages={meta?.totalPages ?? 1}
                totalItems={meta?.totalItems ?? items.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                isLoading={query.isLoading}
              />
            </div>
          ) : null}
        </Card.Body>
      </Card>

      <ApproveBookingModal show={Boolean(selectedBooking)} onHide={() => setSelectedBooking(null)} booking={selectedBooking} />

      <RejectCheckoutModal
        show={Boolean(rejectTarget)}
        onHide={() => setRejectTarget(null)}
        onSubmit={(reviewNotes) => {
          rejectCrMutation.mutate({ id: rejectTarget!.id, reviewNotes });
        }}
        isSubmitting={rejectCrMutation.isPending}
      />
    </div>
  );
}