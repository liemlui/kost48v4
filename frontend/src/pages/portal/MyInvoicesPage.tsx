import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Spinner, Table } from 'react-bootstrap';
import { listResource } from '../../api/resources';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PaginationControls from '../../components/common/PaginationControls';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { listMyPaymentSubmissions } from '../../api/paymentSubmissions';
import type { Invoice } from '../../types';
import { getOpenTenantInvoices, getPendingReviewInvoiceIds, isTenantInvoiceOverdue } from '../../utils/tenantRules';
import { isPayableInvoiceStatus, tenantInvoiceStatusLabel } from '../../utils/tenantCopy';
import { getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import { formatDateTimeWib, getDeadlineMeta } from '../../utils/dateTime';

function formatPeriod(start?: string, end?: string) {
  if (!start && !end) return '-';
  return `${formatDateTimeWib(start)} – ${formatDateTimeWib(end)}`;
}

export default function MyInvoicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const tenantId = user?.tenantId;
  const [activeTab, setActiveTab] = useState<'UNPAID' | 'REVIEW' | 'PAID' | 'ALL'>('UNPAID');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const query = useQuery({
    queryKey: ['portal-invoices', { userId, tenantId }],
    queryFn: () => listResource<Invoice>('/invoices/my'),
    enabled: Boolean(userId),
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 30_000,
  });

  const submissionsQuery = useQuery({
    queryKey: ['portal-payment-submissions'],
    queryFn: () => listMyPaymentSubmissions(),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  const allItems = query.data?.items ?? [];
  const pendingReviewByInvoiceId = useMemo(() => getPendingReviewInvoiceIds(submissionsQuery.data?.items ?? []), [submissionsQuery.data]);
  const sortedItems = useMemo(() => [...allItems].sort((a, b) => {
    const aRank = isTenantInvoiceOverdue(a) ? 0 : ['PAID', 'CANCELLED'].includes(a.status) ? 2 : 1;
    const bRank = isTenantInvoiceOverdue(b) ? 0 : ['PAID', 'CANCELLED'].includes(b.status) ? 2 : 1;
    if (aRank !== bRank) return aRank - bRank;
    return new Date(b.dueDate ?? 0).getTime() - new Date(a.dueDate ?? 0).getTime();
  }), [allItems]);

  const openInvoices = useMemo(() => getOpenTenantInvoices(allItems), [allItems]);
  const reviewCount = openInvoices.filter((item) => pendingReviewByInvoiceId.has(item.id)).length;
  const unpaidCount = openInvoices.filter((item) => isPayableInvoiceStatus(item.status) && !pendingReviewByInvoiceId.has(item.id)).length;
  const paidCount = allItems.filter((item) => ['PAID', 'CANCELLED'].includes(item.status)).length;
  const overdueCount = openInvoices.filter((item) => isTenantInvoiceOverdue(item) && !pendingReviewByInvoiceId.has(item.id)).length;

  const visibleItems = sortedItems.filter((item) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'REVIEW') return pendingReviewByInvoiceId.has(item.id);
    if (activeTab === 'PAID') return ['PAID', 'CANCELLED'].includes(item.status);
    return isPayableInvoiceStatus(item.status) && !pendingReviewByInvoiceId.has(item.id);
  });

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const pagedItems = visibleItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="tenant-invoices-page">
      <Card className="content-card border-0 tenant-invoices-compact-card">
        <Card.Body>
          <div className="table-meta align-items-start tenant-invoices-header">
            <div>
              <div className="command-eyebrow">Tagihan Saya</div>
              <div className="panel-title">Daftar tagihan</div>
              <div className="panel-subtitle">Status dan aksi cukup dilihat dari tabel. Bukti yang sedang diperiksa tidak perlu diupload ulang.</div>
            </div>
            <div className="status-tab-bar compact-tabs">
              {[
                { key: 'UNPAID', label: 'Belum Dibayar', count: unpaidCount, cls: 'tab-warn' },
                { key: 'REVIEW', label: 'Sedang Diperiksa', count: reviewCount, cls: 'tab-info' },
                { key: 'PAID', label: 'Selesai', count: paidCount, cls: 'tab-success' },
                { key: 'ALL', label: 'Semua', count: allItems.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`status-tab ${tab.cls ?? ''}${activeTab === tab.key ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.key as typeof activeTab)}
                >
                  {tab.label}
                  <span className="tab-badge">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {overdueCount > 0 ? (
            <Alert variant="warning" className="tenant-short-alert mb-3">
              Ada {overdueCount} tagihan melewati jatuh tempo. Buka baris tagihan untuk bayar dan kirim bukti.
            </Alert>
          ) : null}

          {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
          {query.isError ? <Alert variant="danger">Gagal memuat tagihan kamu. Silakan coba lagi.</Alert> : null}
          {!query.isLoading && !query.isError && !visibleItems.length ? <EmptyState icon="🧾" title="Belum ada tagihan di tab ini" description="Tagihan akan muncul sesuai statusnya saat dibuat atau diperbarui admin." /> : null}
          {!query.isLoading && !query.isError && sortedItems.length > 0 ? (
            <Table hover responsive className="responsive-data-table tenant-invoices-table">
              <thead><tr><th>No. Tagihan</th><th>Masa Sewa</th><th>Jatuh Tempo</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {pagedItems.map((item) => {
                  const overdue = isTenantInvoiceOverdue(item) && !pendingReviewByInvoiceId.has(item.id);
                  const payable = isPayableInvoiceStatus(item.status);
                  const pendingReview = pendingReviewByInvoiceId.has(item.id);
                  return (
                    <tr key={item.id}>
                      <td data-label="No. Tagihan" className="fw-semibold">
                        <Button variant="link" className="p-0 text-decoration-none fw-semibold" onClick={() => navigate(`/portal/invoices/${item.id}`)}>{item.invoiceNumber || `TG-${item.id}`}</Button>
                      </td>
                      <td data-label="Masa Sewa">{formatPeriod(item.periodStart, item.periodEnd)}</td>
                      <td data-label="Jatuh Tempo" className={overdue ? 'text-soft-danger fw-semibold' : ''}>
                        <div className="fw-semibold">{item.dueDate ? formatDateTimeWib(item.dueDate) : '-'}</div>
                        {item.dueDate ? <div className={overdue ? 'small text-soft-danger' : 'small text-muted'}>{getDeadlineMeta(item.dueDate, 'Jatuh tempo').relativeLabel}</div> : null}
                      </td>
                      <td data-label="Total"><CurrencyDisplay amount={getInvoiceTotalAmount(item)} /></td>
                      <td data-label="Status">
                        <StatusBadge
                          status={pendingReview ? 'INFO' : overdue ? 'OVERDUE' : item.status}
                          tone="tenant"
                          domain="invoice"
                          customLabel={pendingReview ? 'Bukti diperiksa' : tenantInvoiceStatusLabel(item.status, overdue)}
                        />
                      </td>
                      <td data-label="Aksi">
                        {pendingReview ? (
                          <Button size="sm" variant="outline-secondary" disabled>Tidak perlu upload ulang</Button>
                        ) : payable ? (
                          <Button size="sm" variant={overdue ? 'danger' : 'primary'} onClick={() => navigate(`/portal/invoices/${item.id}`)}>Bayar & Kirim Bukti</Button>
                        ) : (
                          <Button size="sm" variant="outline-primary" onClick={() => navigate(`/portal/invoices/${item.id}`)}>Lihat</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : null}
          {visibleItems.length > PAGE_SIZE ? (
            <div className="mt-3">
              <PaginationControls currentPage={page} totalPages={totalPages} totalItems={visibleItems.length} pageSize={PAGE_SIZE} onPageChange={setPage} isLoading={query.isLoading} />
            </div>
          ) : null}
        </Card.Body>
      </Card>
    </div>
  );
}
