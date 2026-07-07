// FILE: PaymentReviewPage.tsx — review + approve/reject bukti bayar (JALUR UANG)
import { lazy, Suspense, useMemo, useState } from 'react';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import AuthenticatedFileLink from '../../components/common/AuthenticatedFileLink';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import {
  approvePaymentSubmission,
  listPaymentReviewQueue,
  rejectPaymentSubmission,
} from '../../api/paymentSubmissions';
import type { PaymentSubmission } from '../../types';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import { CompactMetrics, type MetricChip } from '../../components/command-center';
import { addHoursToDate, formatDateTimeWib, getDeadlineMeta } from '../../utils/dateTime';
import { compactText } from '../../utils/readabilityRules';
import {
  asPaymentNumber,
  getPaymentAmountLabel,
  getPaymentAmountTone,
  getPaymentRemainingAmount,
  getPaymentReviewSafety,
} from '../../utils/paymentReviewSafety';

const ReviewPaymentModal = lazy(() => import('../../components/payments/ReviewPaymentModal'));

function formatDate(value?: string | null) {
  return formatDateTimeWib(value);
}

function getReviewDeadline(item: PaymentSubmission) {
  return addHoursToDate(item.createdAt ?? item.paidAt, 6);
}

function getReviewSlaText(item: PaymentSubmission) {
  const deadline = getReviewDeadline(item);
  const meta = getDeadlineMeta(deadline, 'Batas review');
  return meta.hasDate ? `${meta.relativeLabel} · max ${meta.absoluteLabel}` : 'Deadline review belum tersedia';
}

function getTargetLabel(item: PaymentSubmission) {
  return item.targetType === 'DEPOSIT' ? 'Deposit booking' : 'Tagihan';
}

function getPaymentImpact(item: PaymentSubmission) {
  return getPaymentReviewSafety(item).impactText;
}

function fmtCompact(v: number) {
  const s = Math.abs(v || 0);
  if (s >= 1_000_000_000) return `Rp ${(s / 1_000_000_000).toFixed(1)} M`;
  if (s >= 1_000_000) return `Rp ${(s / 1_000_000).toFixed(1)} jt`;
  if (s >= 1_000) return `Rp ${(s / 1_000).toFixed(0)} rb`;
  return `Rp ${new Intl.NumberFormat('id-ID').format(s)}`;
}

function PaymentAnalyticsPanel({ items, pendingAmount, proofCount, missingProofCount, highRiskCount, manualRiskCount, invoiceCount, depositCount }: {
  items: any[];
  pendingAmount: number;
  proofCount: number;
  missingProofCount: number;
  highRiskCount: number;
  manualRiskCount: number;
  invoiceCount: number;
  depositCount: number;
}) {
  const proofRate = items.length > 0 ? Math.round((proofCount / items.length) * 100) : 0;

  const methodData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const method = item.paymentMethod ?? 'Tidak Diketahui';
      const label = method === 'TRANSFER' ? 'Transfer' : method === 'CASH' ? 'Tunai' : method === 'QRIS' ? 'QRIS' : method === 'EWALLET' ? 'E-Wallet' : method;
      counts[label] = (counts[label] ?? 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [items]);
  const maxMethodCount = Math.max(1, ...methodData.map((item) => item.value));
  const policyBlockedCount = items.filter((item) => item.paymentPolicy && !item.paymentPolicy.canApprove).length;
  const safeCount = Math.max(0, items.length - highRiskCount - manualRiskCount);

  if (items.length === 0) return null;

  return (
    <Row className="g-3 mb-3 payment-analytics-row">
      <Col md={4}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Bukti & Kelengkapan</div>
            <div className="panel-subtitle mb-2">Ketersediaan file bukti bayar</div>
            <div className="d-flex align-items-end justify-content-between gap-3">
              <div>
                <div className="display-6 fw-bold">{proofRate}%</div>
                <div className="small text-muted">Ada bukti</div>
              </div>
              <div className="text-end small">
                <div>Ada: <strong>{proofCount}</strong></div>
                <div>Tanpa: <strong>{missingProofCount}</strong></div>
              </div>
            </div>
            <div className="progress mt-3" style={{ height: 8 }}>
              <div className={`progress-bar ${proofRate >= 80 ? 'bg-success' : proofRate >= 50 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${proofRate}%` }} />
            </div>
            <div className="mt-3 small">
              Total nominal antrean: <strong>{fmtCompact(pendingAmount)}</strong>
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Level Risiko</div>
            <div className="panel-subtitle mb-2">Policy blocker dan bukti yang perlu cek manual</div>
            <div className="payment-risk-count-grid">
              <div className="payment-risk-count-item">
                <span className="payment-risk-count-dot bg-danger" />
                <strong>{highRiskCount}</strong>
                <span className="payment-risk-count-label">Risiko tinggi</span>
              </div>
              <div className="payment-risk-count-item">
                <span className="payment-risk-count-dot bg-warning" />
                <strong>{manualRiskCount}</strong>
                <span className="payment-risk-count-label">Perlu checklist</span>
              </div>
              <div className="payment-risk-count-item">
                <span className="payment-risk-count-dot bg-success" />
                <strong>{safeCount}</strong>
                <span className="payment-risk-count-label">Aman dicek</span>
              </div>
            </div>
            {policyBlockedCount ? (
              <Alert variant="danger" className="small mt-3 mb-0">
                {policyBlockedCount} bukti diblokir policy nominal. Arahkan ke reject/koreksi.
              </Alert>
            ) : null}
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Metode & Target</div>
            <div className="panel-subtitle mb-2">Cara bayar dan tujuan pembayaran</div>
            <div className="d-grid gap-2">
              {methodData.map((method) => (
                <div key={method.label}>
                  <div className="d-flex justify-content-between small mb-1">
                    <span>{method.label}</span>
                    <strong>{method.value}</strong>
                  </div>
                  <div className="progress" style={{ height: 6 }}>
                    <div className="progress-bar bg-info" style={{ width: `${Math.max(8, Math.round((method.value / maxMethodCount) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="stay-analytics-legend mt-2">
              <span>Invoice: {invoiceCount}</span>
              <span>Deposit: {depositCount}</span>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

function CommandFlowStrip() {
  return (
    <Card className="content-card border-0 mb-4 payment-command-strip">
      <Card.Body>
        <div className="section-kicker mb-2">Alur keputusan admin</div>
        <div className="flow-step-grid">
          <div><span>1</span><strong>Cek bukti</strong><small>Nominal, tanggal, file.</small></div>
          <div><span>2</span><strong>Pahami dampak</strong><small>Approve bisa membuka blocker.</small></div>
          <div><span>3</span><strong>Safety belt</strong><small>Checklist untuk risiko.</small></div>
          <div><span>4</span><strong>Follow-up</strong><small>Perbaiki blocker dulu.</small></div>
        </div>
      </Card.Body>
    </Card>
  );
}

export default function PaymentReviewPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'PENDING_REVIEW' | 'REJECTED' | 'APPROVED'>('PENDING_REVIEW');
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [roomId, setRoomId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [selected, setSelected] = useState<PaymentSubmission | null>(null);
  const [modalMode, setModalMode] = useState<'approve' | 'reject'>('approve');
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['payment-review-queue', status, search, paymentMethod, roomId, tenantId],
    queryFn: () => listPaymentReviewQueue({
      status,
      search: search.trim() || undefined,
      paymentMethod: paymentMethod || undefined,
      roomId: roomId.trim() || undefined,
      tenantId: tenantId.trim() || undefined,
      limit: 50,
    }),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const pendingAmount = useMemo(() => items.reduce((sum, item) => sum + asPaymentNumber(item.amountRupiah), 0), [items]);
  const proofCount = useMemo(() => items.filter((item) => Boolean(item.fileUrl)).length, [items]);
  const missingProofCount = useMemo(() => items.filter((item) => !item.fileUrl).length, [items]);
  const policyBlockedCount = useMemo(() => items.filter((item) => item.paymentPolicy && !item.paymentPolicy.canApprove).length, [items]);
  const highRiskCount = useMemo(() => items.filter((item) => getPaymentReviewSafety(item).riskLevel === 'HIGH').length, [items]);
  const manualRiskCount = useMemo(() => items.filter((item) => getPaymentReviewSafety(item).riskLevel === 'MEDIUM').length, [items]);
  const depositCount = useMemo(() => items.filter((item) => item.targetType === 'DEPOSIT').length, [items]);
  const invoiceCount = items.length - depositCount;

  const metrics: MetricChip[] = [
    { id: 'submission', label: 'Menunggu keputusan', value: items.length, helper: 'Sesuai filter status', status: status === 'PENDING_REVIEW' && items.length ? 'WARNING' : 'INFO', icon: '◈' },
    { id: 'amount', label: 'Nominal antrean', value: new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(pendingAmount), helper: 'Total nominal pada filter', status: 'SUCCESS', icon: 'Rp' },
    { id: 'risk', label: 'Risiko tinggi', value: highRiskCount, helper: policyBlockedCount ? `${policyBlockedCount} policy blocker` : manualRiskCount ? `${manualRiskCount} perlu checklist` : 'Safety check aman', status: highRiskCount ? 'DANGER' : manualRiskCount ? 'WARNING' : 'SUCCESS', icon: '!' },
    { id: 'proof', label: 'Bukti tersedia', value: proofCount, helper: missingProofCount ? `${missingProofCount} tanpa file` : 'Semua punya file', status: missingProofCount ? 'WARNING' : 'SUCCESS', icon: '▣' },
    { id: 'mix', label: 'Tagihan / Deposit', value: `${invoiceCount}/${depositCount}`, helper: 'Komposisi antrean', status: 'INFO', icon: '↯' },
  ];

  const refreshRelated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['payment-review-queue'] }),
      queryClient.invalidateQueries({ queryKey: ['tenant-bookings'] }),
      queryClient.invalidateQueries({ queryKey: ['stays'] }),
      queryClient.invalidateQueries({ queryKey: ['rooms'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-owner'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-admin'] }),
      queryClient.invalidateQueries({ queryKey: ['payment-urgency'] }),
      queryClient.invalidateQueries({ queryKey: ['portal-invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['portal-stay'] }),
      queryClient.invalidateQueries({ queryKey: ['portal-stage'] }),
      queryClient.invalidateQueries({ queryKey: ['portal-payment-submissions'] }),
      queryClient.invalidateQueries({ queryKey: ['portal-renew-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['portal-checkout-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['payment-submissions'] }),
      queryClient.invalidateQueries({ queryKey: ['invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['invoice-payments'] }),
      queryClient.invalidateQueries({ queryKey: ['analytics'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-renew-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-checkout-requests'] }),
    ]);
  };

  const approveMutation = useMutation({
    mutationFn: async (submissionId: number) => approvePaymentSubmission(submissionId),
    onSuccess: async () => {
      setSelected(null);
      setActionError(null);
      await refreshRelated();
    },
    onError: (error: any) => {
      setActionError(getApiErrorMessage(error, 'Gagal menyetujui bukti pembayaran.'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ submissionId, reviewNotes }: { submissionId: number; reviewNotes: string }) =>
      rejectPaymentSubmission(submissionId, reviewNotes),
    onSuccess: async () => {
      setSelected(null);
      setActionError(null);
      await refreshRelated();
    },
    onError: (error: any) => {
      setActionError(getApiErrorMessage(error, 'Gagal menolak bukti pembayaran.'));
    },
  });

  return (
    <div className="payment-command-page">
      <PageHeader
        eyebrow="Finance command center"
        title="Review Pembayaran"
        description="Cek bukti, nominal, risiko, lalu putuskan."
      />

      <CommandFlowStrip />
      <CompactMetrics metrics={metrics} />

      {items.length > 0 && (
        <PaymentAnalyticsPanel
          items={items}
          pendingAmount={pendingAmount}
          proofCount={proofCount}
          missingProofCount={missingProofCount}
          highRiskCount={highRiskCount}
          manualRiskCount={manualRiskCount}
          invoiceCount={invoiceCount}
          depositCount={depositCount}
        />
      )}

      <Card className="content-card border-0 mb-4 command-filter-card">
        <Card.Body>
          <div className="status-tab-bar compact-tabs mb-3">
            {[
              { key: 'PENDING_REVIEW', label: 'Menunggu', count: status === 'PENDING_REVIEW' ? items.length : 0, cls: 'tab-warn' },
              { key: 'APPROVED', label: 'Disetujui', count: status === 'APPROVED' ? items.length : 0, cls: 'tab-success' },
              { key: 'REJECTED', label: 'Ditolak', count: status === 'REJECTED' ? items.length : 0, cls: 'tab-danger' },
            ].map((tab) => (
              <button key={tab.key} className={`status-tab ${tab.cls}${status === tab.key ? ' active' : ''}`} onClick={() => { setStatus(tab.key as any); setActionError(null); }}>
                {tab.label}<span className="tab-badge">{tab.count}</span>
              </button>
            ))}
          </div>
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select value={status} onChange={(e) => { setStatus(e.currentTarget.value as any); setActionError(null); }}>
                  <option value="PENDING_REVIEW">Menunggu Review</option>
                  <option value="APPROVED">Disetujui</option>
                  <option value="REJECTED">Ditolak</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Metode</Form.Label>
                <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.currentTarget.value)}>
                  <option value="">Semua Metode</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="CASH">Tunai</option>
                  <option value="QRIS">QRIS</option>
                  <option value="EWALLET">E-Wallet</option>
                  <option value="OTHER">Lainnya</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Kamar ID</Form.Label>
                <Form.Control value={roomId} onChange={(e) => setRoomId(e.currentTarget.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Opsional" />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Tenant ID</Form.Label>
                <Form.Control value={tenantId} onChange={(e) => setTenantId(e.currentTarget.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Opsional" />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Button variant="outline-secondary" className="w-100" onClick={() => query.refetch()}>Refresh</Button>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Pencarian</Form.Label>
                <Form.Control value={search} onChange={(e) => setSearch(e.currentTarget.value)} placeholder="Cari tenant, kamar, invoice, atau nomor referensi" />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="content-card border-0 payment-review-table-card">
        <Card.Body>
          {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
          {query.isError ? <Alert variant="danger">Gagal memuat antrean review pembayaran.</Alert> : null}
          {!query.isLoading && !query.isError && !items.length ? (
            <EmptyState icon="💸" title="Belum ada bukti yang perlu direview" description="Antrean review pembayaran akan muncul saat tenant mengirim bukti bayar." />
          ) : null}

          {!query.isLoading && !query.isError && items.length > 0 ? (
            <Table responsive hover className="align-middle responsive-data-table">
              <thead>
                <tr>
                  <th>Tenant & Kamar</th>
                  <th>Target</th>
                  <th>Nominal</th>
                  <th>Risiko</th>
                  <th>Bukti</th>
                  <th>Status</th>
                  <th>Dampak</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const amountTone = getPaymentAmountTone(item);
                  const safety = getPaymentReviewSafety(item);
                  const amountToneClass = amountTone === 'EXACT' ? 'success' : amountTone === 'OVERPAY' ? 'danger' : 'warning';
                  const reviewMeta = getDeadlineMeta(getReviewDeadline(item), 'Batas review');
                  return (
                    <tr key={item.id} className={safety.riskLevel === 'HIGH' ? 'payment-row-risk-high' : undefined}>
                      <td data-label="Tenant & Kamar">
                        <div className="fw-semibold">{item.tenant?.fullName ?? '-'}</div>
                        <div className="small text-muted">{item.room?.code ?? '-'} · {item.room?.name ?? 'Nama kamar belum tersedia'}</div>
                        <div className="small text-muted">Dibayar: {formatDate(item.paidAt)} · {item.paymentMethod}</div>
                        <div className={reviewMeta.isExpired ? 'small text-soft-danger' : 'small text-muted'}>Masuk: {formatDate(item.createdAt ?? item.paidAt)}</div>
                        <div className={reviewMeta.isExpired ? 'small text-soft-danger fw-semibold' : 'small text-muted'}>{getReviewSlaText(item)}</div>
                      </td>
                      <td data-label="Target">
                        <div className="fw-semibold">{getTargetLabel(item)}</div>
                        <div className="small text-muted">
                          {item.targetType === 'DEPOSIT'
                            ? `Deposit ${getStatusLabel(item.deposit?.paymentStatus ?? 'UNPAID', undefined, { tone: 'admin', domain: 'deposit' })}`
                            : (item.invoice?.invoiceNumber ?? `INV-${item.invoiceId}`)}
                        </div>
                      </td>
                      <td data-label="Nominal">
                        <div className="fw-semibold"><CurrencyDisplay amount={item.amountRupiah} /></div>
                        <span className={`amount-tone-pill ${amountToneClass}`}>{getPaymentAmountLabel(amountTone)}</span>
                        <div className="small text-muted mt-1">Sisa: <CurrencyDisplay amount={getPaymentRemainingAmount(item)} /></div>
                      </td>
                      <td data-label="Risiko">
                        <span className={`payment-risk-pill ${safety.riskTone}`}>{safety.riskLabel}</span>
                        {safety.blockers.length ? <div className="small text-soft-danger mt-1">{safety.blockers[0].title}</div> : null}
                        {!safety.blockers.length && safety.warnings.length ? <div className="small text-muted mt-1">{safety.warnings[0].title}</div> : null}
                      </td>
                      <td data-label="Bukti">
                        {resolveAbsoluteFileUrl(item.fileUrl) ? (
                          <AuthenticatedFileLink src={item.fileUrl} label="Buka Bukti" fileName={item.originalFilename ?? undefined} />
                        ) : <span className="amount-tone-pill warning">Tanpa file</span>}
                      </td>
                      <td data-label="Status"><StatusBadge status={item.status} domain="payment" /></td>
                      <td data-label="Dampak"><div className="small text-muted payment-impact-text">{compactText(getPaymentImpact(item), 72)}</div></td>
                      <td data-label="Aksi">
                        <div className="d-flex gap-2 flex-wrap">
                          {item.status === 'PENDING_REVIEW' ? (
                            <>
                              <Button size="sm" onClick={() => { setSelected(item); setModalMode('approve'); setActionError(null); }}>Review</Button>
                              <Button size="sm" variant="outline-danger" onClick={() => { setSelected(item); setModalMode('reject'); setActionError(null); }}>Tolak</Button>
                            </>
                          ) : <span className="text-muted small">Sudah diproses</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : null}
        </Card.Body>
      </Card>

      {selected ? (
        <Suspense fallback={null}>
          <ReviewPaymentModal
            show={Boolean(selected)}
            mode={modalMode}
            submission={selected}
            busy={approveMutation.isPending || rejectMutation.isPending}
            errorMessage={actionError}
            onHide={() => { setSelected(null); setActionError(null); }}
            onApprove={() => selected && approveMutation.mutate(selected.id)}
            onReject={(reviewNotes) => selected && rejectMutation.mutate({ submissionId: selected.id, reviewNotes })}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
