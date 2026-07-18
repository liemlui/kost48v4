import '../../styles/tenant-area';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import DonutGauge from '../../components/charts/DonutGauge';
import PageHeader from '../../components/common/PageHeader';
import { listResource } from '../../api/resources';
import { listMyPaymentSubmissions } from '../../api/paymentSubmissions';
import SubmitBatchPaymentModal from '../../components/portal/SubmitBatchPaymentModal';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PaginationControls from '../../components/common/PaginationControls';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import type { Invoice } from '../../types';
import { getOpenTenantInvoices, getPendingReviewInvoiceIds, isTenantInvoiceOverdue } from '../../utils/tenantRules';
import { isPayableInvoiceStatus, tenantInvoiceStatusLabel } from '../../utils/tenantCopy';
import { getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import { invoicePurposeMeta } from '../../utils/invoiceUtility';
import { formatDateTimeWib, getDeadlineMeta } from '../../utils/dateTime';
import { formatRupiah, formatRupiahWithoutSymbol, formatCompactRupiah } from '../../utils/formatCurrency';

function TenantInvoiceSnapshot({ allItems, paidCount, unpaidCount, overdueCount }: { allItems: any[]; paidCount: number; unpaidCount: number; overdueCount: number }) {
  const totalBilled = useMemo(() => allItems.reduce((s, inv) => s + (Number(inv.totalAmountRupiah) || 0), 0), [allItems]);
  // Audit U-04: invoice berstatus PAID dihitung lunas penuh meski riwayat
  // pembayarannya kosong (data lama) — agar gauge konsisten dengan tab "Selesai".
  const totalPaid = useMemo(
    () =>
      allItems.reduce(
        (s, inv) =>
          s + (inv.status === 'PAID' ? (Number(inv.totalAmountRupiah) || 0) : (Number(inv.paidAmountRupiah) || 0)),
        0,
      ),
    [allItems],
  );
  const outstanding = Math.max(0, totalBilled - totalPaid);
  const paidRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  const statusBars = [
    { label: 'Lunas', value: paidCount, color: '#16a34a' },
    { label: 'Belum Bayar', value: unpaidCount, color: '#f59e0b' },
    { label: 'Overdue', value: overdueCount, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  if (allItems.length === 0) return null;

  return (
    <Row className="g-3 mb-3 tenant-invoice-snapshot-row">
      <Col sm={5}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Tingkat Pelunasan</div>
            <div className="panel-subtitle mb-2">Dari total tagihan yang diterbitkan</div>
            <div className="invoice-collection-gauge-wrap">
              <DonutGauge
                value={paidRate}
                center={<><strong>{paidRate}%</strong><span>Lunas</span></>}
                ariaLabel={`Tingkat pelunasan: ${paidRate}%`}
                size={110}
                innerRadius={35}
                outerRadius={50}
                color={paidRate >= 80 ? '#16a34a' : paidRate >= 50 ? '#f59e0b' : '#ef4444'}
                trackColor="rgba(148,163,184,0.15)"
              />
            </div>
            <div className="invoice-gauge-labels mt-1">
              <span>Terbayar: <strong>{formatCompactRupiah(totalPaid)}</strong></span>
              <span>Sisa: <strong>{formatCompactRupiah(outstanding)}</strong></span>
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col sm={7}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Tagihan per Status</div>
            <div className="panel-subtitle mb-2">Jumlah tagihan berdasarkan kondisi bayar</div>
            {/* Mini bar chart — works at all widths (no ResponsiveContainer zero-width issue) */}
            <div className="invoice-status-minibars">
              {statusBars.length === 0 ? (
                <p className="text-muted small mb-0">Belum ada tagihan</p>
              ) : (
                statusBars.map((d) => {
                  const maxVal = Math.max(...statusBars.map((s) => s.value), 1);
                  const pct = Math.round((d.value / maxVal) * 100);
                  return (
                    <div key={d.label} className="invoice-status-minibar-row">
                      <span className="invoice-status-minibar-label">{d.label}</span>
                      <div className="invoice-status-minibar-track">
                        <div
                          className="invoice-status-minibar-fill"
                          style={{ width: `${pct}%`, background: d.color }}
                        />
                      </div>
                      <strong className="invoice-status-minibar-value">{d.value}</strong>
                    </div>
                  );
                })
              )}
            </div>

          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

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
  const PAGE_SIZE = 5;

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

  const qc = useQueryClient();
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchInvoices, setBatchInvoices] = useState<Invoice[]>([]);
  const [batchStayId, setBatchStayId] = useState<number>(0);

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
    <div>
      <PageHeader
        eyebrow="Portal Penghuni"
        title="Tagihan Saya"
        description="Daftar tagihan kos, pantau status bayar, dan kirim bukti transfer."
      />
      <div className="tenant-invoices-page">
      <Card className="content-card border-0 tenant-invoices-compact-card">
        <Card.Body>
          <div className="table-meta align-items-start tenant-invoices-header">
            <div>
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

          {/* Audit U-04: gauge tidak boleh menghitung DRAFT/CANCELLED — angka harus
              konsisten dengan tab (DRAFT belum ditagihkan, CANCELLED bukan kewajiban). */}
          {allItems.length > 0 && (
            <TenantInvoiceSnapshot
              allItems={allItems.filter((item: any) => !['DRAFT', 'CANCELLED'].includes(item.status))}
              paidCount={paidCount}
              unpaidCount={unpaidCount}
              overdueCount={overdueCount}
            />
          )}

          {overdueCount > 0 ? (
            <Alert variant="warning" className="tenant-short-alert mb-3">
              Ada {overdueCount} tagihan melewati jatuh tempo. Buka baris tagihan untuk bayar dan kirim bukti.
            </Alert>
          ) : null}

          {/* M-4: Grouping invoice sewa + meter OPEN yang bisa dibayar sekaligus */}
          {(() => {
            const groupable = openInvoices.filter((inv) =>
              isPayableInvoiceStatus(inv.status) && !pendingReviewByInvoiceId.has(inv.id)
            );
            const groupedByStay = new Map<number, Invoice[]>();
            groupable.forEach((inv) => {
              const stayId = inv.stayId;
              if (!groupedByStay.has(stayId)) groupedByStay.set(stayId, []);
              groupedByStay.get(stayId)!.push(inv);
            });
            // Filter hanya stay yang punya >=2 invoice OPEN (sewa + meter)
            const batchCandidates: Invoice[][] = [];
            groupedByStay.forEach((invs) => {
              if (invs.length >= 2) batchCandidates.push(invs);
            });
            if (batchCandidates.length === 0) return null;
            return batchCandidates.map((invs) => {
              const total = invs.reduce((s, inv) => s + getInvoiceTotalAmount(inv), 0);
              return (
                <Alert key={`batch-${invs[0].stayId}`} variant="info" className="tenant-short-alert mb-3 d-flex flex-wrap align-items-center justify-content-between">
                  <div className="small">
                    <strong>Bayar sekaligus</strong> — {invs.length} tagihan untuk masa sewa ini dapat dibayar bersama: total <strong>{formatRupiah(total)}</strong>.
                    Kirim 1 bukti bayar untuk semua.
                  </div>
                  <div className="d-flex gap-2">
                    {invs.map((inv) => (
                      <Button key={inv.id} size="sm" variant="outline-primary" onClick={() => navigate(`/portal/invoices/${inv.id}`)}>
                        {inv.invoiceNumber || `#${inv.id}`}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setBatchInvoices(invs);
                        setBatchStayId(invs[0].stayId);
                        setShowBatchModal(true);
                      }}
                    >
                      Bayar Semua
                    </Button>
                  </div>
                </Alert>
              );
            });
          })()}

          {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
          {query.isError ? <Alert variant="danger">Gagal memuat tagihan kamu. Silakan coba lagi.</Alert> : null}
          {!query.isLoading && !query.isError && !visibleItems.length ? <EmptyState icon="🧾" title="Belum ada tagihan di tab ini" description="Tagihan akan muncul sesuai statusnya saat dibuat atau diperbarui admin." /> : null}
          {!query.isLoading && !query.isError && sortedItems.length > 0 ? (
            <Table hover responsive className="responsive-data-table tenant-invoices-table">
              <thead><tr><th>Tagihan</th><th>Masa Sewa</th><th>Jatuh Tempo</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {pagedItems.map((item) => {
                  const overdue = isTenantInvoiceOverdue(item) && !pendingReviewByInvoiceId.has(item.id);
                  const payable = isPayableInvoiceStatus(item.status);
                  const pendingReview = pendingReviewByInvoiceId.has(item.id);
                  return (
                    <tr key={item.id}>
                      <td data-label="Tagihan" className="fw-semibold">
                        {(() => { const m = invoicePurposeMeta(item); return (
                          <Badge bg={m.bg} className="mb-1 d-inline-flex align-items-center gap-1"><span aria-hidden>{m.icon}</span> Tagihan {m.label}</Badge>
                        ); })()}
                        <div><Button variant="link" className="p-0 text-decoration-none text-muted small" onClick={() => navigate(`/portal/invoices/${item.id}`)}>{item.invoiceNumber || `TG-${item.id}`}</Button></div>
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

      <SubmitBatchPaymentModal
        show={showBatchModal}
        invoices={batchInvoices}
        stayId={batchStayId}
        onHide={() => setShowBatchModal(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['portal-invoices'] });
          qc.invalidateQueries({ queryKey: ['portal-payment-submissions'] });
        }}
      />
    </div>
    </div>
  );
}
