import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { Navigate, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { listResource } from '../../api/resources';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRoute } from '../../config/navigation';
import type { Invoice, Room, Stay } from '../../types';

type DashboardListSummary<T> = {
  items: T[];
  totalItems: number;
  isTruncated: boolean;
};

async function fetchAllPagesForDashboard<T>(
  path: string,
  params?: Record<string, unknown>,
  pageSize = 100,
  maxPages = 50,
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

  return {
    items,
    totalItems,
    isTruncated: totalItems > items.length || totalPages > maxPages,
  };
}

function formatDateSafe(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '-';
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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

function isOverdue(invoice: Invoice) {
  if (!invoice.dueDate || ['PAID', 'CANCELLED'].includes(invoice.status)) return false;
  const dueDate = new Date(invoice.dueDate);
  if (Number.isNaN(dueDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function LoadingDashboard() {
  return <div className="py-5 text-center"><Spinner animation="border" /></div>;
}

function SmallTable({ title, subtitle, headers, rows, emptyTitle, emptyDescription }: {
  title: string;
  subtitle: string;
  headers: string[];
  rows: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <Card className="content-card border-0 h-100">
      <Card.Body>
        <div className="table-meta">
          <div>
            <div className="panel-title">{title}</div>
            <div className="panel-subtitle">{subtitle}</div>
          </div>
        </div>
        <Table responsive hover className="mt-3">
          <thead>
            <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
          </thead>
          <tbody>{rows}</tbody>
        </Table>
        {!rows ? <EmptyState icon="🗂️" title={emptyTitle} description={emptyDescription} /> : null}
      </Card.Body>
    </Card>
  );
}

function OwnerDashboard() {
  const navigate = useNavigate();
  const roomsQuery = useQuery({ queryKey: ['dashboard-owner', 'rooms'], queryFn: () => listResource<Room>('/rooms', { limit: 500 }) });
  const staysQuery = useQuery({ queryKey: ['dashboard-owner', 'stays'], queryFn: () => listResource<Stay>('/stays', { status: 'ACTIVE', limit: 200 }) });
  const invoicesQuery = useQuery({ queryKey: ['dashboard-owner', 'invoices-summary'], queryFn: () => fetchAllPagesForDashboard<Invoice>('/invoices') });
  const expensesQuery = useQuery({ queryKey: ['dashboard-owner', 'expenses-summary'], queryFn: () => fetchAllPagesForDashboard<any>('/expenses') });

  if (roomsQuery.isLoading || staysQuery.isLoading || invoicesQuery.isLoading || expensesQuery.isLoading) return <LoadingDashboard />;
  if (roomsQuery.isError || staysQuery.isError || invoicesQuery.isError || expensesQuery.isError) return <Alert variant="danger">Gagal memuat dashboard owner.</Alert>;

  const rooms = roomsQuery.data?.items ?? [];
  const activeStays = staysQuery.data?.items ?? [];
  const invoices = invoicesQuery.data?.items ?? [];
  const invoiceTotalItems = invoicesQuery.data?.totalItems ?? invoices.length;
  const invoiceIsTruncated = Boolean(invoicesQuery.data?.isTruncated);
  const expenses = expensesQuery.data?.items ?? [];
  const expenseTotalItems = expensesQuery.data?.totalItems ?? expenses.length;
  const expenseIsTruncated = Boolean(expensesQuery.data?.isTruncated);

  const occupiedRooms = rooms.filter((room) => room.status === 'OCCUPIED').length;
  const availableRooms = rooms.filter((room) => room.status === 'AVAILABLE').length;
  const billed = invoices.filter((invoice) => ['ISSUED', 'PARTIAL', 'PAID'].includes(invoice.status)).reduce((sum, invoice) => sum + Number(invoice.totalAmountRupiah ?? 0), 0);
  const collected = invoices.filter((invoice) => invoice.status === 'PAID').reduce((sum, invoice) => sum + Number(invoice.totalAmountRupiah ?? 0), 0);
  const overdue = invoices.filter(isOverdue);
  const totalExpense = expenses.reduce((sum, expense) => sum + Number(expense.amountRupiah ?? 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Owner surface"
        title="Dashboard Owner"
        description="Ringkasan strategis properti untuk melihat kesehatan bisnis, koleksi tagihan, biaya, dan okupansi tanpa tenggelam di tabel operasional mentah."
        secondaryAction={<Button variant="outline-primary" onClick={() => navigate('/invoices')}>Lihat tagihan utama</Button>}
      />

      {invoiceIsTruncated ? (
        <Alert variant="warning" className="mb-3 py-2 small">
Ringkasan invoice belum memuat semua data. KPI saat ini dihitung dari <strong>{invoices.length}</strong> invoice, sementara total di database <strong>{invoiceTotalItems}</strong>.
        </Alert>
      ) : null}

      {expenseIsTruncated ? (
        <Alert variant="warning" className="mb-3 py-2 small">
          Ringkasan expense belum memuat semua data. Total expense saat ini dihitung dari <strong>{expenses.length}</strong> data, sementara total di database <strong>{expenseTotalItems}</strong>.
        </Alert>
      ) : null}

      <Row className="g-4 mb-4">
        <Col md={6} xl={3}><StatCard title="Stay aktif" value={activeStays.length} subtitle="Permintaan inti properti" icon="🏠" /></Col>
        <Col md={6} xl={3}><StatCard title="Kamar terisi" value={occupiedRooms} subtitle={`Tersedia ${availableRooms} kamar kosong`} icon="📈" /></Col>
        <Col md={6} xl={3}><StatCard title="Total billed" value={new Intl.NumberFormat('id-ID').format(billed)} subtitle="Estimasi tagihan yang sudah terbentuk" icon="🧾" /></Col>
        <Col md={6} xl={3}><StatCard title="Total collected" value={new Intl.NumberFormat('id-ID').format(collected)} subtitle={`Expense tercatat ${new Intl.NumberFormat('id-ID').format(totalExpense)}`} icon="💰" variant={collected >= totalExpense ? 'success' : 'warning'} /></Col>
      </Row>

      <Row className="g-4">
        <Col xl={7}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="table-meta">
                <div>
                  <div className="panel-title">Indikator keputusan cepat</div>
                  <div className="panel-subtitle">Hal yang paling cepat memengaruhi cashflow dan utilisasi properti hari ini.</div>
                </div>
              </div>
              <div className="kpi-list mt-3">
                <div className="kpi-item"><div><div className="card-title-soft">Invoice overdue</div><strong>{overdue.length}</strong></div><StatusBadge status={overdue.length ? 'WARNING' : 'SUCCESS'} customLabel={overdue.length ? 'Butuh aksi' : 'Aman'} /></div>
                <div className="kpi-item"><div><div className="card-title-soft">Collected / billed</div><strong>{billed ? `${Math.round((collected / billed) * 100)}%` : '0%'}</strong></div><StatusBadge status={collected >= billed ? 'SUCCESS' : 'INFO'} customLabel="Collection ratio" /></div>
                <div className="kpi-item"><div><div className="card-title-soft">Occ. rate kasar</div><strong>{rooms.length ? `${Math.round((occupiedRooms / rooms.length) * 100)}%` : '0%'}</strong></div><StatusBadge status="INFO" customLabel="Occupancy" /></div>
                <div className="kpi-item"><div><div className="card-title-soft">Cashflow ringkas</div><strong>{collected - totalExpense >= 0 ? 'Positif' : 'Tertekan'}</strong></div><StatusBadge status={collected - totalExpense >= 0 ? 'SUCCESS' : 'WARNING'} customLabel="Management view" /></div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={5}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="table-meta">
                <div>
                  <div className="panel-title">Invoice paling mendesak</div>
                  <div className="panel-subtitle">Bantu owner melihat tekanan koleksi tanpa membuka detail operasional satu per satu.</div>
                </div>
              </div>
              {!overdue.length ? (
                <EmptyState icon="✅" title="Tidak ada overdue" description="Belum ada invoice overdue yang perlu perhatian owner saat ini." />
              ) : (
                <Table responsive hover className="mt-3">
                  <thead><tr><th>Invoice</th><th>Tenant</th><th>Due</th></tr></thead>
                  <tbody>
                    {overdue.slice(0, 5).map((invoice) => (
                      <tr key={invoice.id} className="clickable-row" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                        <td><div className="fw-semibold">{invoice.invoiceNumber || `INV-${invoice.id}`}</div><div className="small text-muted">{invoice.status}</div></td>
                        <td>{invoice.stay?.tenant?.fullName || `Stay #${invoice.stayId}`}</td>
                        <td>{formatDateSafe(invoice.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const roomsQuery = useQuery({ queryKey: ['dashboard-admin', 'rooms'], queryFn: () => listResource<Room>('/rooms', { limit: 500 }) });
  const staysQuery = useQuery({ queryKey: ['dashboard-admin', 'stays'], queryFn: () => listResource<Stay>('/stays', { status: 'ACTIVE', limit: 200 }) });
  const reservedBookingsQuery = useQuery({ queryKey: ['dashboard-admin', 'reserved-bookings'], queryFn: () => listResource<Stay>('/stays', { status: 'ACTIVE', limit: 200 }) });
  const invoicesQuery = useQuery({ queryKey: ['dashboard-admin', 'invoices'], queryFn: () => listResource<Invoice>('/invoices', { limit: 1000 }) });
  const depositCompletedQuery = useQuery({ queryKey: ['dashboard-admin', 'deposit-completed'], queryFn: () => listResource<Stay>('/stays', { depositStatus: 'HELD', status: 'COMPLETED', limit: 50 }) });
  const depositCancelledQuery = useQuery({ queryKey: ['dashboard-admin', 'deposit-cancelled'], queryFn: () => listResource<Stay>('/stays', { depositStatus: 'HELD', status: 'CANCELLED', limit: 50 }) });
  const ticketsQuery = useQuery({ queryKey: ['dashboard-admin', 'tickets'], queryFn: () => listResource<any>('/tickets', { limit: 100 }) });

  if ([roomsQuery, staysQuery, invoicesQuery, depositCompletedQuery, depositCancelledQuery, ticketsQuery, reservedBookingsQuery].some((q) => q.isLoading)) return <LoadingDashboard />;
  if ([roomsQuery, staysQuery, invoicesQuery, depositCompletedQuery, depositCancelledQuery, ticketsQuery, reservedBookingsQuery].some((q) => q.isError)) return <Alert variant="danger">Gagal memuat dashboard admin.</Alert>;

  const rooms = roomsQuery.data?.items ?? [];
  const activeStays = staysQuery.data?.items ?? [];
  const invoices = invoicesQuery.data?.items ?? [];
  const tickets = ticketsQuery.data?.items ?? [];
  const depositQueue = [...(depositCompletedQuery.data?.items ?? []), ...(depositCancelledQuery.data?.items ?? [])];
  const dueSoonInvoices = invoices.filter((invoice) => {
    const daysLeft = daysFromToday(invoice.dueDate);
    return !['PAID', 'CANCELLED'].includes(invoice.status) && daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
  });
  const checkoutSoon = activeStays.filter((stay) => {
    const daysLeft = daysFromToday(stay.plannedCheckOutDate);
    return stay.status === 'ACTIVE' && daysLeft !== null && daysLeft >= 0 && daysLeft <= 10;
  });
  const allStays = reservedBookingsQuery.data?.items ?? [];
  const reservedWithoutInvoice = allStays.filter((stay) => {
    return (
      stay.status === 'ACTIVE' &&
      stay.room?.status === 'RESERVED' &&
      stay.bookingSource === 'WEBSITE' &&
      Boolean(stay.expiresAt) &&
      !(Number(stay.invoiceCount ?? 0) > 0 || Boolean(stay.latestInvoiceId))
    );
  });
  const pendingApprovalCount = reservedWithoutInvoice.length;

  return (
    <div>
      <PageHeader
        eyebrow="Admin surface"
        title="Dashboard Admin"
        description="Control center operasional harian: stay aktif, tagihan prioritas, ticket, dan queue yang benar-benar perlu follow-up hari ini."
        actionLabel="Check-in Baru"
        onAction={() => navigate('/stays/check-in')}
      />

      <Row className="g-4 mb-4">
        <Col md={6} xl={3}><StatCard title="Stay aktif" value={activeStays.length} subtitle="Pusat kerja backoffice" icon="🏠" /></Col>
        <Col md={6} xl={3}><StatCard title="Due soon" value={dueSoonInvoices.length} subtitle="≤ 3 hari ke jatuh tempo" icon="🧾" variant={dueSoonInvoices.length ? 'warning' : 'success'} /></Col>
        <Col md={6} xl={3}><StatCard title="Checkout soon" value={checkoutSoon.length} subtitle="≤ 10 hari ke planned checkout" icon="⏳" variant={checkoutSoon.length ? 'info' : 'success'} /></Col>
        <Col md={6} xl={3}><StatCard title="Deposit queue" value={depositQueue.length} subtitle="Butuh review setelah checkout" icon="💼" variant={depositQueue.length ? 'warning' : 'success'} /></Col>
        <Col md={6} xl={3}><StatCard title="Menunggu Approval" value={pendingApprovalCount} subtitle="Booking baru perlu ditinjau" icon="🗓️" variant={pendingApprovalCount ? 'warning' : 'success'} /></Col>
      </Row>

      <Row className="g-4">
        <Col xl={8}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="table-meta">
                <div>
                  <div className="panel-title">Queue prioritas admin</div>
                  <div className="panel-subtitle">Tidak ada lagi tombol check-in ganda. Fokuskan dashboard ini pada queue, bukan CTA yang redundant.</div>
                </div>
              </div>
              <Table responsive hover className="mt-3">
                <thead><tr><th>Queue</th><th>Jumlah</th><th>Catatan</th></tr></thead>
                <tbody>
                  <tr className="clickable-row" onClick={() => navigate('/invoices')}><td>Invoice due soon</td><td>{dueSoonInvoices.length}</td><td>Tagihan yang harus segera difollow-up</td></tr>
                  <tr className="clickable-row" onClick={() => navigate('/stays')}><td>Stay checkout soon</td><td>{checkoutSoon.length}</td><td>Persiapan perpanjangan atau checkout</td></tr>
                  <tr className="clickable-row" onClick={() => navigate('/tickets')}><td>Ticket terbuka</td><td>{tickets.filter((item) => ['OPEN', 'IN_PROGRESS'].includes(item.status)).length}</td><td>Triage, assign, dan tindak lanjut teknis</td></tr>
                  <tr className="clickable-row" onClick={() => navigate('/stays')}><td>Antrian deposit</td><td>{depositQueue.length}</td><td>Review setelah stay selesai / dibatalkan</td></tr>
                  <tr className="clickable-row" onClick={() => navigate('/stays?status=BOOKINGS')}><td>Booking baru (reserved)</td><td>{pendingApprovalCount}</td><td>Menunggu approval & pembuatan invoice awal</td></tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col xl={4}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="table-meta">
                <div>
                  <div className="panel-title">Kondisi kamar</div>
                  <div className="panel-subtitle">Ringkasan cepat untuk tindakan operasional admin.</div>
                </div>
              </div>
              <div className="kpi-list mt-3">
                <div className="kpi-item"><div><div className="card-title-soft">Kamar terisi</div><strong>{rooms.filter((room) => room.status === 'OCCUPIED').length}</strong></div><StatusBadge status="INFO" customLabel="Occupied" /></div>
                <div className="kpi-item"><div><div className="card-title-soft">Kamar kosong</div><strong>{rooms.filter((room) => room.status === 'AVAILABLE').length}</strong></div><StatusBadge status="SUCCESS" customLabel="Available" /></div>
                <div className="kpi-item"><div><div className="card-title-soft">Maintenance / nonaktif</div><strong>{rooms.filter((room) => ['MAINTENANCE', 'INACTIVE'].includes(room.status)).length}</strong></div><StatusBadge status="WARNING" customLabel="Perlu cek" /></div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function StaffDashboard() {
  const navigate = useNavigate();
  const ticketsQuery = useQuery({ queryKey: ['dashboard-staff', 'tickets'], queryFn: () => listResource<any>('/tickets', { limit: 100 }) });
  const inventoryQuery = useQuery({ queryKey: ['dashboard-staff', 'inventory'], queryFn: () => listResource<any>('/inventory-items', { limit: 100 }) });
  const roomsQuery = useQuery({ queryKey: ['dashboard-staff', 'rooms'], queryFn: () => listResource<Room>('/rooms', { limit: 100 }) });

  if (ticketsQuery.isLoading || inventoryQuery.isLoading || roomsQuery.isLoading) return <LoadingDashboard />;
  if (ticketsQuery.isError || inventoryQuery.isError || roomsQuery.isError) return <Alert variant="danger">Gagal memuat dashboard staff.</Alert>;

  const tickets = ticketsQuery.data?.items ?? [];
  const inventory = inventoryQuery.data?.items ?? [];
  const rooms = roomsQuery.data?.items ?? [];
  const openTickets = tickets.filter((item) => item.status === 'OPEN');
  const inProgress = tickets.filter((item) => item.status === 'IN_PROGRESS');
const lowStock = inventory.filter((item) => Number(item.qtyOnHand ?? 0) <= Number((item.lowStockThreshold ?? 0) || 3));
  return (
    <div>
      <PageHeader
        eyebrow="Staff surface"
        title="Dashboard Staff"
        description="Fokus staff dipersempit ke ticket lapangan, progress pekerjaan, kebutuhan stok, dan konteks kamar yang relevan."
        secondaryAction={<Button variant="outline-primary" onClick={() => navigate('/tickets')}>Buka ticket</Button>}
      />

      <Row className="g-4 mb-4">
        <Col md={6} xl={3}><StatCard title="Open ticket" value={openTickets.length} subtitle="Belum diproses" icon="🎫" variant={openTickets.length ? 'warning' : 'success'} /></Col>
        <Col md={6} xl={3}><StatCard title="In progress" value={inProgress.length} subtitle="Pekerjaan berjalan" icon="🛠️" /></Col>
        <Col md={6} xl={3}><StatCard title="Low stock" value={lowStock.length} subtitle="Butuh cek inventory" icon="📦" variant={lowStock.length ? 'warning' : 'success'} /></Col>
        <Col md={6} xl={3}><StatCard title="Kamar maintenance" value={rooms.filter((room) => room.status === 'MAINTENANCE').length} subtitle="Perlu tindak lanjut teknis" icon="🚪" /></Col>
      </Row>

      <Row className="g-4">
        <Col xl={7}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="table-meta">
                <div>
                  <div className="panel-title">Ticket lapangan aktif</div>
                  <div className="panel-subtitle">Backoffice create ticket tidak lagi jadi fokus. Staff cukup menerima queue dan mengeksekusi pekerjaan.</div>
                </div>
              </div>
              {!openTickets.length && !inProgress.length ? (
                <EmptyState icon="✅" title="Tidak ada ticket aktif" description="Belum ada pekerjaan teknis yang membutuhkan tindak lanjut staff saat ini." />
              ) : (
                <Table responsive hover className="mt-3">
                  <thead><tr><th>Tiket</th><th>Status</th><th>Relasi</th></tr></thead>
                  <tbody>
                    {[...openTickets, ...inProgress].slice(0, 8).map((ticket) => (
                      <tr key={ticket.id} className="clickable-row" onClick={() => navigate('/tickets')}>
                        <td><div className="fw-semibold">{ticket.ticketNumber || `TIK-${ticket.id}`}</div><div className="small text-muted">{ticket.title || '-'}</div></td>
                        <td><StatusBadge status={ticket.status} /></td>
                        <td>{ticket.roomId ? `Room #${ticket.roomId}` : ticket.stayId ? `Stay #${ticket.stayId}` : 'Context umum'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col xl={5}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <div className="table-meta">
                <div>
                  <div className="panel-title">Inventory low stock</div>
                  <div className="panel-subtitle">Movement dan room items nantinya di-embed; dashboard staff cukup melihat item yang perlu tindakan.</div>
                </div>
              </div>
              {!lowStock.length ? (
                <EmptyState icon="📦" title="Stok aman" description="Tidak ada item yang melewati ambang low stock saat ini." />
              ) : (
                <Table responsive hover className="mt-3">
                  <thead><tr><th>Item</th><th>Stok</th></tr></thead>
                  <tbody>
                    {lowStock.slice(0, 8).map((item) => (
                      <tr key={item.id} className="clickable-row" onClick={() => navigate('/inventory-items')}>
                        <td><div className="fw-semibold">{item.name || `Item #${item.id}`}</div><div className="small text-muted">{item.category || 'Tanpa kategori'}</div></td>
                        <td>{item.qtyOnHand ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === 'OWNER') return <OwnerDashboard />;
  if (user?.role === 'ADMIN') return <AdminDashboard />;
  if (user?.role === 'STAFF') return <StaffDashboard />;
  
  // Fallback aman untuk role yang tidak dikenal atau TENANT
  // Redirect ke route default sesuai role
  return <Navigate to={getDefaultRoute(user?.role)} replace />;
}
