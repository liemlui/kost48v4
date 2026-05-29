import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Spinner, Table } from 'react-bootstrap';
import { listResource } from '../../api/resources';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import type { AssistantItem, MetricChip } from '../../components/command-center';
import { AssistantInsightLine, StatusStrip } from '../../components/workspace';
import StatusBadge from '../../components/common/StatusBadge';
import TenantPriorityBoard from '../../components/tenant/TenantPriorityBoard';
import { useAuth } from '../../context/AuthContext';
import { listMyPaymentSubmissions } from '../../api/paymentSubmissions';
import type { Invoice } from '../../types';
import { getOpenTenantInvoices, getPendingReviewInvoiceIds, isTenantInvoiceOverdue } from '../../utils/tenantRules';
import { isPayableInvoiceStatus, TENANT_PAYMENT_REVIEW_MESSAGE, tenantInvoiceStatusLabel } from '../../utils/tenantCopy';
import { getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import { formatDateTimeWib, getDeadlineMeta } from '../../utils/dateTime';
import { compactText } from '../../utils/readabilityRules';
import { limitRepeatedActions } from '../../utils/actionDedup';

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
    queryKey: ['my-payment-submissions'],
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
  const draftCount = openInvoices.filter((item) => item.status === 'DRAFT').length;
  const paidCount = allItems.filter((item) => ['PAID', 'CANCELLED'].includes(item.status)).length;
  const overdueCount = openInvoices.filter((item) => isTenantInvoiceOverdue(item) && !pendingReviewByInvoiceId.has(item.id)).length;
  const primaryUnpaidInvoice = sortedItems.find((item) => isPayableInvoiceStatus(item.status) && !pendingReviewByInvoiceId.has(item.id));

  const assistantItems: AssistantItem[] = [
    overdueCount ? {
      id: 'tenant-overdue',
      severity: 'BLOCKER',
      title: `${overdueCount} tagihan sudah melewati jatuh tempo`,
      message: primaryUnpaidInvoice?.dueDate ? `Jatuh tempo ${formatDateTimeWib(primaryUnpaidInvoice.dueDate)}. ${getDeadlineMeta(primaryUnpaidInvoice.dueDate, 'Jatuh tempo').relativeLabel}.` : 'Bayar dulu agar proses lain tidak terblokir.',
      source: 'Tagihan',
      count: overdueCount,
      actionLabel: 'Lihat tagihan',
      onAction: () => primaryUnpaidInvoice ? navigate(`/portal/invoices/${primaryUnpaidInvoice.id}`) : setActiveTab('UNPAID'),
    } : null,
    unpaidCount ? {
      id: 'tenant-unpaid',
      severity: 'HIGH',
      title: `${unpaidCount} tagihan perlu dibayar`,
      message: primaryUnpaidInvoice?.dueDate ? `Pilih tagihan, bayar dan kirim bukti sebelum ${formatDateTimeWib(primaryUnpaidInvoice.dueDate)}.` : 'Bayar + kirim bukti dalam satu langkah.',
      source: 'Tagihan',
      count: unpaidCount,
      actionLabel: primaryUnpaidInvoice ? 'Buka & bayar' : 'Lihat tagihan',
      onAction: () => primaryUnpaidInvoice ? navigate(`/portal/invoices/${primaryUnpaidInvoice.id}`) : setActiveTab('UNPAID'),
    } : null,
    reviewCount ? {
      id: 'tenant-review',
      severity: 'INFO',
      title: 'Bukti pembayaran sedang diperiksa',
      message: TENANT_PAYMENT_REVIEW_MESSAGE,
      source: 'Bukti pembayaran',
      count: reviewCount,
      actionLabel: 'Lihat status',
      onAction: () => setActiveTab('REVIEW'),
    } : null,
    draftCount ? {
      id: 'tenant-draft',
      severity: 'INFO',
      title: `${draftCount} tagihan sedang disiapkan admin`,
      message: 'Belum perlu bayar. Tunggu admin.',
      source: 'Tagihan',
      count: draftCount,
      actionLabel: 'Lihat semua',
      onAction: () => setActiveTab('ALL'),
    } : null,
  ].filter(Boolean) as AssistantItem[];

  const metrics: MetricChip[] = [
    { id: 'unpaid', label: 'Perlu Dibayar', value: unpaidCount, helper: 'Tagihan yang butuh aksi kamu', icon: '🧾', status: unpaidCount ? 'WARNING' : 'SUCCESS', onClick: () => setActiveTab('UNPAID') },
    { id: 'review', label: 'Sedang Diperiksa', value: reviewCount, helper: 'Bukti sudah terkirim', icon: '🔎', status: reviewCount ? 'INFO' : 'SUCCESS', onClick: () => setActiveTab('REVIEW') },
    { id: 'overdue', label: 'Terlambat', value: overdueCount, helper: 'Melewati jatuh tempo', icon: '⚠️', status: overdueCount ? 'DANGER' : 'SUCCESS', onClick: () => setActiveTab('UNPAID') },
    { id: 'paid', label: 'Selesai', value: paidCount, helper: 'Lunas/dibatalkan', icon: '✅', status: 'SUCCESS', onClick: () => setActiveTab('PAID') },
  ];

  const visibleItems = sortedItems.filter((item) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'REVIEW') return pendingReviewByInvoiceId.has(item.id);
    if (activeTab === 'PAID') return ['PAID', 'CANCELLED'].includes(item.status);
    return isPayableInvoiceStatus(item.status) && !pendingReviewByInvoiceId.has(item.id);
  });

  return (
    <div>
      <PageHeader eyebrow="Portal Penghuni" title="Tagihan Saya" description="Bayar, cek bukti, dan lihat riwayat tagihan." />
      <AssistantInsightLine
        title="Asisten Tagihan Kamu"
        tone={assistantItems[0]?.severity === 'BLOCKER' || assistantItems[0]?.severity === 'HIGH' ? 'warning' : assistantItems[0] ? 'info' : 'success'}
        message={assistantItems[0] ? compactText(`${assistantItems[0].title}. ${assistantItems[0].message}`, 105) : 'Tidak ada aksi tagihan.'}
        actionLabel={assistantItems[0]?.actionLabel}
        onAction={assistantItems[0]?.onAction}
      />
      <StatusStrip
        items={metrics.map((metric) => ({
          id: metric.id,
          label: metric.label,
          value: metric.value,
          helper: metric.helper,
          tone: metric.status === 'DANGER' ? 'danger' : metric.status === 'WARNING' ? 'warning' : metric.status === 'SUCCESS' ? 'success' : 'info',
          onClick: metric.onClick,
        }))}
      />
      <TenantPriorityBoard
        title="Prioritas Tagihan"
        subtitle="Maksimal tiga prioritas tagihan."
        items={limitRepeatedActions(assistantItems, 2)}
      />
      <Card className="content-card border-0"><Card.Body>
        <div className="table-meta align-items-start">
          <div><div className="panel-title">Daftar tagihan</div><div className="panel-subtitle">Pilih tab, lalu ambil aksi.</div></div>
          <div className="status-tab-bar compact-tabs">
            {[
              { key: 'UNPAID', label: 'Belum Dibayar', count: unpaidCount, cls: 'tab-warn' },
              { key: 'REVIEW', label: 'Sedang Diperiksa', count: reviewCount, cls: 'tab-info' },
              { key: 'PAID', label: 'Selesai', count: paidCount, cls: 'tab-success' },
              { key: 'ALL', label: 'Semua', count: allItems.length },
            ].map((tab) => <button key={tab.key} className={`status-tab ${tab.cls ?? ''}${activeTab === tab.key ? ' active' : ''}`} onClick={() => setActiveTab(tab.key as any)}>{tab.label}<span className="tab-badge">{tab.count}</span></button>)}
          </div>
        </div>
        {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
        {query.isError ? <Alert variant="danger">Gagal memuat tagihan kamu. Silakan coba lagi.</Alert> : null}
        {!query.isLoading && !query.isError && !visibleItems.length ? <EmptyState icon="🧾" title="Belum ada tagihan di tab ini" description="Tagihan akan muncul sesuai statusnya saat dibuat atau diperbarui admin." /> : null}
        {!query.isLoading && !query.isError && sortedItems.length > 0 ? (
          <Table hover responsive className="responsive-data-table">
            <thead><tr><th>No. Tagihan</th><th>Masa Sewa</th><th>Jatuh Tempo</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {visibleItems.map((item) => {
                const overdue = isTenantInvoiceOverdue(item) && !pendingReviewByInvoiceId.has(item.id);
                const payable = isPayableInvoiceStatus(item.status);
                const pendingReview = pendingReviewByInvoiceId.has(item.id);
                return (
                  <tr key={item.id}>
                    <td data-label="No. Tagihan" className="fw-semibold"><Button variant="link" className="p-0 text-decoration-none fw-semibold" onClick={() => navigate(`/portal/invoices/${item.id}`)}>{item.invoiceNumber || `TG-${item.id}`}</Button></td>
                    <td data-label="Masa Sewa">{formatPeriod(item.periodStart, item.periodEnd)}</td>
                    <td data-label="Jatuh Tempo" className={overdue ? 'text-soft-danger fw-semibold' : ''}>
                      <div className="fw-semibold">{item.dueDate ? formatDateTimeWib(item.dueDate) : '-'}</div>
                      {item.dueDate ? <div className={overdue ? 'small text-soft-danger' : 'small text-muted'}>{getDeadlineMeta(item.dueDate, 'Jatuh tempo').relativeLabel}</div> : null}
                    </td>
                    <td data-label="Total"><CurrencyDisplay amount={getInvoiceTotalAmount(item)} /></td>
                    <td data-label="Status"><StatusBadge status={pendingReview ? 'INFO' : overdue ? 'OVERDUE' : item.status} tone="tenant" domain="invoice" customLabel={pendingReview ? 'Sedang Diperiksa' : tenantInvoiceStatusLabel(item.status, overdue)} /></td>
                    <td data-label="Aksi">{pendingReview ? <Button size="sm" variant="outline-secondary" disabled>🔎 Sedang Diperiksa</Button> : payable ? <Button size="sm" variant={overdue ? 'danger' : 'primary'} onClick={() => navigate(`/portal/invoices/${item.id}`)}>Bayar & Kirim Bukti</Button> : <Button size="sm" variant="outline-primary" onClick={() => navigate(`/portal/invoices/${item.id}`)}>Lihat</Button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : null}
      </Card.Body></Card>
    </div>
  );
}
