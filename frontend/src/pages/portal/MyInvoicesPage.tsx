import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Spinner, Table } from 'react-bootstrap';
import { listResource } from '../../api/resources';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import { AssistantPanel, CompactMetrics, type AssistantItem, type MetricChip } from '../../components/command-center';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { listMyPaymentSubmissions } from '../../api/paymentSubmissions';
import type { Invoice } from '../../types';

const needsPayment = (invoice: Invoice) => ['ISSUED', 'PARTIAL'].includes(invoice.status);

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPeriod(start?: string, end?: string) {
  if (!start && !end) return '-';
  return `${formatDate(start)} – sebelum ${formatDate(end)}`;
}

function isOverdue(invoice: Invoice) {
  if (!invoice.dueDate || ['PAID', 'CANCELLED'].includes(invoice.status)) return false;
  const dueDate = new Date(invoice.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate.getTime() < today.getTime();
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
  const pendingReviewByInvoiceId = useMemo(() => {
    const map = new Map<number, boolean>();
    const items = submissionsQuery.data?.items ?? [];
    for (const s of items) {
      if (s.invoiceId != null && s.status === 'PENDING_REVIEW') {
        map.set(s.invoiceId, true);
      }
    }
    return map;
  }, [submissionsQuery.data]);

  const allItems = query.data?.items ?? [];
  const sortedItems = useMemo(() => [...allItems].sort((a, b) => {
    const aRank = isOverdue(a) ? 0 : ['PAID', 'CANCELLED'].includes(a.status) ? 2 : 1;
    const bRank = isOverdue(b) ? 0 : ['PAID', 'CANCELLED'].includes(b.status) ? 2 : 1;
    if (aRank !== bRank) return aRank - bRank;
    return new Date(b.dueDate ?? 0).getTime() - new Date(a.dueDate ?? 0).getTime();
  }), [allItems]);
  const reviewCount = allItems.filter((item) => pendingReviewByInvoiceId.has(item.id)).length;
  const unpaidCount = allItems.filter((item) => needsPayment(item) && !pendingReviewByInvoiceId.has(item.id)).length;
  const paidCount = allItems.filter((item) => ['PAID', 'CANCELLED'].includes(item.status)).length;
  const overdueCount = allItems.filter(isOverdue).length;
  const assistantItems: AssistantItem[] = [
    overdueCount ? {
      id: 'tenant-overdue',
      severity: 'BLOCKER',
      title: `${overdueCount} tagihan sudah melewati jatuh tempo`,
      message: 'Selesaikan tagihan ini dulu supaya proses sewa dan keluar tidak terhambat.',
      source: 'Tagihan',
      count: overdueCount,
      actionLabel: 'Lihat tagihan',
      onAction: () => setActiveTab('UNPAID'),
    } : null,
    unpaidCount ? {
      id: 'tenant-unpaid',
      severity: 'HIGH',
      title: `${unpaidCount} tagihan perlu dibayar`,
      message: 'Pilih tagihan, upload bukti pembayaran, lalu tunggu pemeriksaan admin.',
      source: 'Portal',
      count: unpaidCount,
      actionLabel: 'Bayar tagihan',
      onAction: () => setActiveTab('UNPAID'),
    } : null,
    reviewCount ? {
      id: 'tenant-review',
      severity: 'INFO',
      title: 'Bukti pembayaran sedang diperiksa',
      message: 'Tidak perlu upload ulang. Admin sedang memeriksa bukti pembayaran kamu.',
      source: 'Bukti pembayaran',
      count: reviewCount,
      actionLabel: 'Lihat status',
      onAction: () => setActiveTab('REVIEW'),
    } : null,
  ].filter(Boolean) as AssistantItem[];

  const metrics: MetricChip[] = [
    { id: 'unpaid', label: 'Perlu Dibayar', value: unpaidCount, helper: 'Tagihan yang butuh aksi kamu', icon: '🧾', status: unpaidCount ? 'WARNING' : 'SUCCESS', onClick: () => setActiveTab('UNPAID') },
    { id: 'review', label: 'Sedang Diperiksa', value: reviewCount, helper: 'Bukti sudah terkirim', icon: '⏳', status: reviewCount ? 'INFO' : 'SUCCESS', onClick: () => setActiveTab('REVIEW') },
    { id: 'overdue', label: 'Terlambat', value: overdueCount, helper: 'Melewati jatuh tempo', icon: '⚠️', status: overdueCount ? 'DANGER' : 'SUCCESS', onClick: () => setActiveTab('UNPAID') },
    { id: 'paid', label: 'Selesai', value: paidCount, helper: 'Lunas/dibatalkan', icon: '✅', status: 'SUCCESS', onClick: () => setActiveTab('PAID') },
  ];

  const visibleItems = sortedItems.filter((item) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'REVIEW') return pendingReviewByInvoiceId.has(item.id);
    if (activeTab === 'PAID') return ['PAID', 'CANCELLED'].includes(item.status);
    return needsPayment(item) && !pendingReviewByInvoiceId.has(item.id);
  });

  return (
    <div>
      <PageHeader eyebrow="Portal finance" title="Tagihan Saya" description="Pantau tagihan dengan bahasa sederhana: perlu dibayar, bukti sedang diperiksa, dan riwayat selesai." />
      <AssistantPanel
        title="Asisten Tagihan Kamu"
        subtitle="Prioritas pembayaran dan status bukti pembayaran kamu."
        items={assistantItems}
        emptyTitle="Tidak ada tagihan yang perlu aksi"
        emptyMessage="Saat ini tidak ada tagihan terbuka atau bukti pembayaran yang menunggu pemeriksaan."
      />
      <CompactMetrics metrics={metrics} />
      <Card className="content-card border-0"><Card.Body>
        <div className="table-meta align-items-start">
          <div><div className="panel-title">Daftar tagihan</div><div className="panel-subtitle">Tab ini memisahkan aksi bayar dari riwayat yang sudah selesai.</div></div>
          <div className="status-tab-bar compact-tabs">
            {[
              { key: 'UNPAID', label: 'Belum Bayar', count: unpaidCount, cls: 'tab-warn' },
              { key: 'REVIEW', label: 'Direview', count: reviewCount, cls: 'tab-info' },
              { key: 'PAID', label: 'Lunas', count: paidCount, cls: 'tab-success' },
              { key: 'ALL', label: 'Semua', count: allItems.length },
            ].map((tab) => <button key={tab.key} className={`status-tab ${tab.cls ?? ''}${activeTab === tab.key ? ' active' : ''}`} onClick={() => setActiveTab(tab.key as any)}>{tab.label}<span className="tab-badge">{tab.count}</span></button>)}
          </div>
        </div>
        {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
        {query.isError ? <Alert variant="danger">Gagal memuat tagihan kamu. Silakan coba lagi.</Alert> : null}
        {!query.isLoading && !query.isError && !visibleItems.length ? <EmptyState icon="🧾" title="Belum ada tagihan" description="Tagihan kamu akan muncul di halaman ini saat sudah dibuat." /> : null}
        {!query.isLoading && !query.isError && sortedItems.length > 0 ? (
          <Table hover responsive>
            <thead><tr><th>No. Tagihan</th><th>Masa Sewa</th><th>Jatuh Tempo</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {visibleItems.map((item) => {
                const overdue = isOverdue(item);
                const unpaid = needsPayment(item);
                return <tr key={item.id}><td className="fw-semibold"><Button variant="link" className="p-0 text-decoration-none fw-semibold" onClick={() => navigate(`/portal/invoices/${item.id}`)}>{item.invoiceNumber || `INV-${item.id}`}</Button></td><td>{formatPeriod(item.periodStart, item.periodEnd)}</td><td className={overdue ? 'text-soft-danger fw-semibold' : ''}>{formatDate(item.dueDate)}</td><td><CurrencyDisplay amount={item.totalAmountRupiah} /></td><td><StatusBadge status={overdue ? 'OVERDUE' : item.status} tone="tenant" domain="invoice" /></td><td>{pendingReviewByInvoiceId.has(item.id) ? <Button size="sm" variant="outline-secondary" disabled>⏳ Sedang Diperiksa</Button> : unpaid ? <Button size="sm" variant={overdue ? 'danger' : 'primary'} onClick={() => navigate(`/portal/invoices/${item.id}`)}>Bayar</Button> : <Button size="sm" variant="outline-primary" onClick={() => navigate(`/portal/invoices/${item.id}`)}>Lihat</Button>}</td></tr>;
              })}
            </tbody>
          </Table>
        ) : null}
      </Card.Body></Card>
    </div>
  );
}
