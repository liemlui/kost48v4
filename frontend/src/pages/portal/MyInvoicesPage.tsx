import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Spinner, Table } from 'react-bootstrap';
import { listResource } from '../../api/resources';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import type { Invoice } from '../../types';

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPeriod(start?: string, end?: string) {
  if (!start && !end) return '-';
  return `${formatDate(start)} – ${formatDate(end)}`;
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

  const query = useQuery({
    queryKey: ['portal-invoices', { userId, tenantId }],
    queryFn: () => listResource<Invoice>('/invoices/my'),
    enabled: Boolean(userId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
  });
  const allItems = query.data?.items ?? [];
  const sortedItems = useMemo(() => [...allItems].sort((a, b) => {
    const aRank = isOverdue(a) ? 0 : ['PAID', 'CANCELLED'].includes(a.status) ? 2 : 1;
    const bRank = isOverdue(b) ? 0 : ['PAID', 'CANCELLED'].includes(b.status) ? 2 : 1;
    if (aRank !== bRank) return aRank - bRank;
    return new Date(b.dueDate ?? 0).getTime() - new Date(a.dueDate ?? 0).getTime();
  }), [allItems]);

  return (
    <div>
      <PageHeader title="Invoice Saya" description="Riwayat tagihan Anda. Untuk booking reserved yang masih menunggu pembayaran, kirim bukti bayar dari halaman Pemesanan Saya agar alurnya tetap satu tempat." />
      <Alert variant="info" className="mb-4 small">Alur booking payment disatukan di halaman <strong>Pemesanan Saya</strong>. Halaman ini tetap fokus untuk melihat dokumen tagihan dan statusnya.</Alert>
      <Card className="content-card border-0 mb-4"><Card.Body><div className="summary-strip"><div className="summary-chip"><span className="summary-chip-label">Total invoice</span><span className="summary-chip-value">{allItems.length}</span></div><div className="summary-chip"><span className="summary-chip-label">Belum lunas</span><span className="summary-chip-value">{allItems.filter((item) => ['ISSUED', 'PARTIAL'].includes(item.status)).length}</span></div><div className="summary-chip"><span className="summary-chip-label">Overdue</span><span className="summary-chip-value">{allItems.filter(isOverdue).length}</span></div></div></Card.Body></Card>
      <Card className="content-card border-0"><Card.Body>
        {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
        {query.isError ? <Alert variant="danger">Gagal memuat invoice Anda. Silakan coba lagi.</Alert> : null}
        {!query.isLoading && !query.isError && !sortedItems.length ? <EmptyState icon="🧾" title="Belum ada invoice" description="Tagihan Anda akan muncul di halaman ini saat sudah dibuat." /> : null}
        {!query.isLoading && !query.isError && sortedItems.length > 0 ? (
          <Table hover responsive>
            <thead><tr><th>No. Invoice</th><th>Periode</th><th>Jatuh Tempo</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {sortedItems.map((item) => {
                const overdue = isOverdue(item);
                return <tr key={item.id}><td className="fw-semibold"><Button variant="link" className="p-0 text-decoration-none fw-semibold" onClick={() => navigate(`/portal/invoices/${item.id}`)}>{item.invoiceNumber || `INV-${item.id}`}</Button></td><td>{formatPeriod(item.periodStart, item.periodEnd)}</td><td className={overdue ? 'text-soft-danger fw-semibold' : ''}>{formatDate(item.dueDate)}</td><td><CurrencyDisplay amount={item.totalAmountRupiah} /></td><td><StatusBadge status={overdue ? 'OVERDUE' : item.status} /></td><td><Button size="sm" variant="outline-primary" onClick={() => navigate(`/portal/invoices/${item.id}`)}>Lihat</Button></td></tr>;
              })}
            </tbody>
          </Table>
        ) : null}
      </Card.Body></Card>
    </div>
  );
}
