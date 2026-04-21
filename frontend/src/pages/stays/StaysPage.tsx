import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listStays } from '../../api/stays';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import PaginationControls from '../../components/common/PaginationControls';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import StatCard from '../../components/common/StatCard';
import type { Stay } from '../../types';

function formatDateSafe(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '-';
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

function daysFromToday(targetDate: string | Date | null | undefined): number | null {
  if (!targetDate) return null;
  try {
    const date = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    if (Number.isNaN(date.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function getCheckoutReminderBadge(stay: Stay): { label: string; status: string } | null {
  if (stay.status !== 'ACTIVE' || stay.room?.status === 'RESERVED' || !stay.plannedCheckOutDate) return null;
  const daysLeft = daysFromToday(stay.plannedCheckOutDate);
  if (daysLeft === null || daysLeft < 0 || daysLeft > 10) return null;
  if (daysLeft >= 8) return { label: 'H-10', status: 'WARNING' };
  if (daysLeft >= 4) return { label: 'H-7', status: 'INFO' };
  return { label: 'H-3', status: 'DANGER' };
}

type StayViewFilter = 'ACTIVE' | 'BOOKINGS' | 'ALL';

export default function StaysPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFromUrl = searchParams.get('status') || undefined;
  const initialFilter: StayViewFilter = statusFromUrl === 'ACTIVE' || statusFromUrl === 'BOOKINGS' ? statusFromUrl : 'ALL';
  const [statusFilter, setStatusFilter] = useState<StayViewFilter>(initialFilter);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const isBookingsMode = statusFilter === 'BOOKINGS';
  const apiStatusFilter = statusFilter === 'ALL' ? undefined : 'ACTIVE';
  const effectivePage = isBookingsMode ? 1 : page;
  const effectiveLimit = isBookingsMode ? 200 : PAGE_SIZE;

  const query = useQuery({
    queryKey: ['stays', statusFilter, effectivePage, effectiveLimit],
    queryFn: () => listStays({ status: apiStatusFilter, page: effectivePage, limit: effectiveLimit }),
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const reservedBookings = useMemo(() => items.filter((item) => item.status === 'ACTIVE' && item.room?.status === 'RESERVED'), [items]);
  const operationalActive = useMemo(() => items.filter((item) => item.status === 'ACTIVE' && item.room?.status !== 'RESERVED'), [items]);

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
  }, [statusFilter]);

  const checkoutSoonCount = operationalActive.filter((item) => getCheckoutReminderBadge(item)?.label).length;
  const meta = query.data?.meta;
  const tableCountText = isBookingsMode
    ? `Menampilkan ${filteredItems.length} booking reserved` + (effectiveLimit > PAGE_SIZE ? ' terbaru (read-only)' : '')
    : `Menampilkan ${filteredItems.length} dari ${meta?.totalItems ?? items.length} data`;

  return (
    <div>
      <PageHeader
        eyebrow="Stay management"
        title="Stays"
        description="Surface ini tetap fokus ke stay operasional, dengan tambahan tampilan read-only untuk booking reserved pada Fase 4.0."
        actionLabel="Check-in Baru"
        onAction={() => navigate('/stays/check-in')}
      />

      <Row className="g-4 mb-4">
        <Col md={3}><StatCard title="Total hasil filter" value={filteredItems.length} subtitle="Baris yang sedang ditampilkan" icon="📋" /></Col>
        <Col md={3}><StatCard title="Stay aktif" value={operationalActive.length} subtitle="Tenant yang sedang menempati kamar" icon="✅" /></Col>
        <Col md={3}><StatCard title="Booking reserved" value={reservedBookings.length} subtitle="Masuk mode baca tanpa approval" icon="🗓️" /></Col>
        <Col md={3}><StatCard title="Perlu reminder" value={checkoutSoonCount} subtitle="Checkout ≤ 10 hari" icon="⏳" /></Col>
      </Row>

      <Card className="content-card border-0 mb-4">
        <Card.Body>
          <div className="table-meta">
            <div>
              <div className="panel-title">Filter & pencarian</div>
              <div className="panel-subtitle">Gunakan mode tampilan untuk membedakan stay operasional dengan booking reserved read-only.</div>
            </div>
            <div className="summary-strip">
              <div className="summary-chip">
                <span className="summary-chip-label">Reserved</span>
                <span className="summary-chip-value">{reservedBookings.length}</span>
              </div>
              <div className="summary-chip">
                <span className="summary-chip-label">Operasional</span>
                <span className="summary-chip-value">{operationalActive.length}</span>
              </div>
            </div>
          </div>

          <div className="toolbar-card mt-3">
            <Row className="g-3 align-items-end">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Mode Tampilan</Form.Label>
                  <Form.Select value={statusFilter} onChange={(e) => handleStatusFilterChange(e.target.value as StayViewFilter)}>
                    <option value="ALL">Semua Stay</option>
                    <option value="ACTIVE">Stay Aktif</option>
                    <option value="BOOKINGS">Booking Reserved</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Pencarian</Form.Label>
                  <Form.Control
                    placeholder="Cari tenant, kamar, source, atau tujuan stay"
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

      <Card className="content-card border-0">
        <Card.Body>
          {isBookingsMode ? (
            <Alert variant="info" className="small mb-4">
              Booking reserved pada Fase 4.0 bersifat <strong>read-only</strong>. Approval admin, invoice awal booking, dan pembayaran mandiri tetap ditahan sampai Fase 4.1+ resmi dibuka.
            </Alert>
          ) : null}

          {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
          {query.isError ? <Alert variant="danger">Gagal mengambil data stay. Silakan coba lagi.</Alert> : null}
          {!query.isLoading && !query.isError && filteredItems.length === 0 ? (
            <EmptyState
              icon={statusFilter === 'BOOKINGS' ? '🗓️' : '🏠'}
              title={statusFilter === 'BOOKINGS' ? 'Belum ada booking reserved' : 'Belum ada data stay'}
              description={statusFilter === 'BOOKINGS'
                ? 'Booking tenant yang masih reserved akan muncul di mode ini sebagai daftar baca.'
                : 'Coba ubah filter atau mulai check-in tenant baru.'}
              action={statusFilter === 'BOOKINGS' ? undefined : { label: 'Check-in Baru', onClick: () => navigate('/stays/check-in') }}
            />
          ) : null}

          {!query.isLoading && !query.isError && filteredItems.length > 0 && isBookingsMode ? (
            <Table hover responsive className="mb-0">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Kamar</th>
                  <th>Check-in</th>
                  <th>Pricing</th>
                  <th>Masa Berlaku</th>
                  <th>Status Booking</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
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
                      <div className="small text-muted">Reserved hingga tanggal ini</div>
                    </td>
                    <td>
                      <div className="d-flex flex-column gap-2">
                        <StatusBadge status="RESERVED" />
                        <StatusBadge status="WARNING" customLabel="Menunggu Fase 4.1" />
                      </div>
                    </td>
                    <td>
                      <div className="small text-muted">Belum ada aksi approval pada fase ini.</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}

          {!query.isLoading && !query.isError && filteredItems.length > 0 && !isBookingsMode ? (
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
                {filteredItems.map((item) => {
                  const reminderBadge = getCheckoutReminderBadge(item);
                  const isReservedBooking = item.room?.status === 'RESERVED';
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
                          <StatusBadge status={item.status} customLabel={isReservedBooking ? 'Booking Aktif' : undefined} />
                          {isReservedBooking ? <StatusBadge status="RESERVED" /> : null}
                          {isReservedBooking ? <StatusBadge status="WARNING" customLabel="Read-only" /> : null}
                          {reminderBadge ? <StatusBadge status={reminderBadge.status} customLabel={reminderBadge.label} /> : null}
                        </div>
                      </td>
                      <td>
                        <div>{item.checkInDate ? formatDateSafe(item.checkInDate) : 'Belum Check-in'}</div>
                        {isReservedBooking ? <div className="small text-muted">Berlaku s.d. {formatDateSafe(item.expiresAt)}</div> : null}
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
                          <div className="small text-muted">Lihat di mode booking</div>
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
    </div>
  );
}
