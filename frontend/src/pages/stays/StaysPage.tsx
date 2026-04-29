import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listStays } from '../../api/stays';
import { expireReservedBooking, runPaymentSubmissionExpiryCheck } from '../../api/paymentSubmissions';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import PaginationControls from '../../components/common/PaginationControls';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import { getBookingStatusLabel } from '../../utils/statusLabels';
import StatCard from '../../components/common/StatCard';
import ApproveBookingModal from '../../components/stays/ApproveBookingModal';
import type { PaginatedResponse, Stay } from '../../types';
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

  const filteredItems = useMemo(() => {
    const baseItems = statusFilter === 'BOOKINGS'
      ? reservedBookings
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

  const checkoutSoonCount = operationalActive.filter((item) => getCheckoutReminderBadge(item)?.label).length;
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
    ? `Menampilkan ${visibleItems.length} dari ${bookingsTotalItems} booking reserved`
    : `Menampilkan ${filteredItems.length} dari ${meta?.totalItems ?? items.length} data`;

  return (
    <div>
      <PageHeader
        eyebrow="Stay management"
        title="Stays"
        description="Surface ini memisahkan stay operasional dari queue booking reserved, sehingga admin bisa melihat mana yang masih menunggu approval dan mana yang sudah menunggu pembayaran."
        actionLabel="Check-in Baru"
        onAction={() => navigate('/stays/check-in')}
      />

      <Row className="g-4 mb-4">
        <Col md={3}><StatCard title="Total hasil filter" value={isBookingsMode ? bookingsTotalItems : filteredItems.length} subtitle="Baris yang sedang terfilter" icon="📋" /></Col>
        <Col md={3}><StatCard title="Stay aktif" value={operationalActive.length} subtitle="Tenant yang sedang menempati kamar" icon="✅" /></Col>
        <Col md={3}><StatCard title="Menunggu approval" value={pendingApprovalCount} subtitle={expiredBookingsCount ? `${expiredBookingsCount} expired / perlu tindak lanjut` : 'Booking reserved tanpa invoice awal'} icon="🗓️" /></Col>
        <Col md={3}><StatCard title="Menunggu pembayaran" value={waitingPaymentCount} subtitle="Booking approved dengan invoice awal" icon="💳" /></Col>
      </Row>

      <Card className="content-card border-0 mb-4">
        <Card.Body>
          <div className="table-meta">
            <div>
              <div className="panel-title">Filter & pencarian</div>
              <div className="panel-subtitle">Pantau approval booking dan stay operasional dari satu halaman yang lebih ringkas.</div>
            </div>
          </div>

          <div className="toolbar-card mt-3">
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Fokus Data</Form.Label>
                  <Form.Select value={statusFilter} onChange={(e) => handleStatusFilterChange(e.target.value as StayViewFilter)}>
                    <option value="BOOKINGS">Perlu Approval</option>
                    <option value="ACTIVE">Stay Aktif</option>
                    <option value="ALL">Semua Stay</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Pencarian</Form.Label>
                  <Form.Control
                    placeholder="Cari tenant, kamar, source, tujuan stay, atau nomor invoice"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <div className="table-meta-count">{tableCountText}</div>
              </Col>
            </Row>
          </div>
        </Card.Body>
      </Card>

      {!isBookingsMode && reservedBookings.length > 0 ? (
        <Alert variant="info" className="mb-4">
          Ada <strong>{reservedBookings.length}</strong> booking reserved yang sengaja tidak ditampilkan di mode Stay Aktif agar operasional tidak tercampur.
          <Button size="sm" variant="outline-secondary" className="ms-3" onClick={() => handleStatusFilterChange('BOOKINGS')}>Buka Mode Booking</Button>
        </Alert>
      ) : null}

      <Card className="content-card border-0">
        <Card.Body>
          {isBookingsMode ? (
            <Alert variant={expiredBookingsCount ? 'warning' : 'info'} className="small mb-4">
              Baris di bawah ini adalah booking yang perlu ditindaklanjuti. Jika invoice awal belum ada berarti <strong>Menunggu Approval</strong>, dan jika invoice awal sudah ada berarti <strong>Menunggu Pembayaran</strong>.
              {expiredBookingsCount ? ` Saat ini ada ${expiredBookingsCount} booking yang sudah expired dan perlu ditinjau.` : ''}
            </Alert>
          ) : null}

          {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
          {query.isError ? <Alert variant="danger">Gagal mengambil data stay. Silakan coba lagi.</Alert> : null}
          {!query.isLoading && !query.isError && visibleItems.length === 0 ? (
            <EmptyState
              icon={statusFilter === 'BOOKINGS' ? '🗓️' : '🏠'}
              title={statusFilter === 'BOOKINGS' ? 'Belum ada booking reserved' : 'Belum ada data stay'}
              description={statusFilter === 'BOOKINGS'
                ? 'Booking tenant yang masih reserved akan muncul di mode ini.'
                : 'Coba ubah filter atau mulai check-in tenant baru.'}
              action={statusFilter === 'BOOKINGS' ? undefined : { label: 'Check-in Baru', onClick: () => navigate('/stays/check-in') }}
            />
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
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="fw-semibold">{item.tenant?.fullName ?? `Tenant #${item.tenantId}`}</div>
                          <div className="small text-muted">{item.bookingSource ? `Source: ${getStatusLabel(item.bookingSource)}` : item.stayPurpose ? getStatusLabel(item.stayPurpose) : 'Tanpa keterangan tambahan'}</div>
                        </td>
                        <td>
                          <div className="fw-semibold">{item.room?.code ?? `Room #${item.roomId}`}</div>
                          <div className="small text-muted">{item.room?.name || 'Nama kamar belum tersedia'}{item.room?.floor ? ` · Lantai ${item.room.floor}` : ''}</div>
                        </td>
                        <td>
                          <div className="fw-semibold">{formatDateSafe(item.checkInDate)}</div>
                          <div className="small text-muted">Checkout plan: {formatDateSafe(item.plannedCheckOutDate)}</div>
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
                          <div className="d-flex flex-column gap-2">
                            <StatusBadge status={approvalMeta.variant} customLabel={approvalMeta.label} />
                          </div>
                          <div className="small text-muted mt-2">
                            {approvalMeta.helper}
                            {expiryMeta.badgeLabel ? ` ${expiryMeta.badgeLabel}.` : ''}
                            {item.latestInvoiceNumber ? ` Invoice: ${item.latestInvoiceNumber}${item.latestInvoiceStatus ? ` (${getStatusLabel(item.latestInvoiceStatus)})` : ''}.` : ''}
                          </div>
                        </td>
                        <td>
                          {canApprove ? (
                            <Button size="sm" onClick={() => setSelectedBooking(item)}>
                              Approve
                            </Button>
                          ) : expiryMeta.isExpired ? (
                            <Button size="sm" variant="outline-danger" onClick={() => expireMutation.mutate(item.id)} disabled={expireMutation.isPending}>
                              {expireMutation.isPending ? 'Memproses...' : 'Jalankan Expire'}
                            </Button>
                          ) : (
                            <StatusBadge
                              status={getBookingStatusLabel({
                                isReserved: isReservedBooking(item),
                                isExpired: expiryMeta.isExpired,
                                hasInvoice: !approvalMeta.isPendingApproval,
                                isCancelled: item.status === 'CANCELLED',
                                isCompleted: item.status === 'COMPLETED',
                                isActiveOccupied: item.status === 'ACTIVE' && item.room?.status === 'OCCUPIED',
                              }).variant}
                              customLabel={getBookingStatusLabel({
                                isReserved: isReservedBooking(item),
                                isExpired: expiryMeta.isExpired,
                                hasInvoice: !approvalMeta.isPendingApproval,
                                isCancelled: item.status === 'CANCELLED',
                                isCompleted: item.status === 'COMPLETED',
                                isActiveOccupied: item.status === 'ACTIVE' && item.room?.status === 'OCCUPIED',
                              }).label}
                            />
                          )}
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
                        <div className="small text-muted">{item.bookingSource ? `Source: ${getStatusLabel(item.bookingSource)}` : item.stayPurpose ? getStatusLabel(item.stayPurpose) : 'Tanpa keterangan tambahan'}</div>
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
                        <div className="small text-muted">Checkout plan: {formatDateSafe(item.plannedCheckOutDate)}</div>
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
    </div>
  );
}
