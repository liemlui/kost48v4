import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import ReviewPaymentModal from '../../components/payments/ReviewPaymentModal';
import {
  approvePaymentSubmission,
  listPaymentReviewQueue,
  rejectPaymentSubmission,
} from '../../api/paymentSubmissions';
import type { PaymentSubmission } from '../../types';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import { AssistantPanel, CompactMetrics, type AssistantItem, type MetricChip } from '../../components/command-center';
import { addHoursToDate, formatDateTimeWib, getDeadlineMeta } from '../../utils/dateTime';
import { compactText } from '../../utils/readabilityRules';
import {
  asPaymentNumber,
  getPaymentAmountLabel,
  getPaymentAmountTone,
  getPaymentRemainingAmount,
  getPaymentReviewSafety,
} from '../../utils/paymentReviewSafety';

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
  const [selected, setSelected] = useState<PaymentSubmission | null>(null);
  const [modalMode, setModalMode] = useState<'approve' | 'reject'>('approve');
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['payment-review-queue', status, search],
    queryFn: () => listPaymentReviewQueue({ status, search: search.trim() || undefined, limit: 100 }),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const pendingAmount = useMemo(() => items.reduce((sum, item) => sum + asPaymentNumber(item.amountRupiah), 0), [items]);
  const proofCount = useMemo(() => items.filter((item) => Boolean(item.fileUrl)).length, [items]);
  const missingProofCount = useMemo(() => items.filter((item) => !item.fileUrl).length, [items]);
  const mismatchCount = useMemo(() => items.filter((item) => {
    if (item.targetType === 'DEPOSIT') return false;
    const remaining = getPaymentRemainingAmount(item);
    return remaining > 0 && asPaymentNumber(item.amountRupiah) !== remaining;
  }).length, [items]);
  const highRiskCount = useMemo(() => items.filter((item) => getPaymentReviewSafety(item).riskLevel === 'HIGH').length, [items]);
  const manualRiskCount = useMemo(() => items.filter((item) => getPaymentReviewSafety(item).riskLevel === 'MEDIUM').length, [items]);
  const depositCount = useMemo(() => items.filter((item) => item.targetType === 'DEPOSIT').length, [items]);
  const invoiceCount = items.length - depositCount;

  const assistantItems: AssistantItem[] = [
    ...(status === 'PENDING_REVIEW' && items.length ? [{ id: 'pending', severity: 'HIGH' as const, title: 'Bukti menahan flow', message: `${items.length} bukti menunggu keputusan. Review maksimal 6 jam.`, count: items.length, source: 'Review pembayaran' }] : []),
    ...(highRiskCount ? [{ id: 'high-risk', severity: 'HIGH' as const, title: 'Ada risiko tinggi', message: `${highRiskCount} bukti perlu cek manual.`, count: highRiskCount, source: 'Safety belt' }] : []),
    ...(mismatchCount ? [{ id: 'mismatch', severity: 'WARNING' as const, title: 'Nominal tidak sama dengan sisa tagihan', message: `${mismatchCount} bukti bisa menjadi pembayaran parsial atau overpay. Jangan approve otomatis tanpa cek manual.`, count: mismatchCount, source: 'Amount check' }] : []),
    ...(missingProofCount ? [{ id: 'missing-proof', severity: 'WARNING' as const, title: 'Ada submission tanpa file bukti', message: 'Approve dinonaktifkan untuk bukti tanpa file. Tolak dan minta tenant upload ulang agar audit trail aman.', count: missingProofCount, source: 'Proof file' }] : []),
  ];

  const metrics: MetricChip[] = [
    { id: 'submission', label: 'Menunggu keputusan', value: items.length, helper: 'Sesuai filter status', status: status === 'PENDING_REVIEW' && items.length ? 'WARNING' : 'INFO', icon: '◈' },
    { id: 'amount', label: 'Nominal queue', value: new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(pendingAmount), helper: 'Total nominal pada filter', status: 'SUCCESS', icon: 'Rp' },
    { id: 'risk', label: 'Risiko tinggi', value: highRiskCount, helper: manualRiskCount ? `${manualRiskCount} perlu checklist` : 'Safety check aman', status: highRiskCount ? 'DANGER' : manualRiskCount ? 'WARNING' : 'SUCCESS', icon: '!' },
    { id: 'proof', label: 'Bukti tersedia', value: proofCount, helper: missingProofCount ? `${missingProofCount} tanpa file` : 'Semua punya file', status: missingProofCount ? 'WARNING' : 'SUCCESS', icon: '▣' },
    { id: 'mix', label: 'Tagihan / Deposit', value: `${invoiceCount}/${depositCount}`, helper: 'Komposisi queue', status: 'INFO', icon: '↯' },
  ];

  const refreshRelated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['payment-review-queue'] }),
      queryClient.invalidateQueries({ queryKey: ['tenant-bookings'] }),
      queryClient.invalidateQueries({ queryKey: ['stays'] }),
      queryClient.invalidateQueries({ queryKey: ['rooms'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['portal-invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['portal-stay'] }),
      queryClient.invalidateQueries({ queryKey: ['portal-stage'] }),
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
      setActionError(error?.response?.data?.message ?? 'Gagal menyetujui bukti pembayaran.');
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
      setActionError(error?.response?.data?.message ?? 'Gagal menolak bukti pembayaran.');
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
      <AssistantPanel title="Asisten Review Pembayaran" subtitle="Prioritaskan bukti yang menahan flow." items={assistantItems} emptyTitle="Queue pembayaran aman" emptyMessage="Filter ini aman." />
      <CompactMetrics metrics={metrics} />

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
            <Col md={6}>
              <Form.Group>
                <Form.Label>Pencarian</Form.Label>
                <Form.Control value={search} onChange={(e) => setSearch(e.currentTarget.value)} placeholder="Cari tenant, kamar, invoice, atau nomor referensi" />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Button variant="outline-secondary" className="w-100" onClick={() => query.refetch()}>Refresh</Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="content-card border-0 payment-review-table-card">
        <Card.Body>
          {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
          {query.isError ? <Alert variant="danger">Gagal memuat queue review pembayaran.</Alert> : null}
          {!query.isLoading && !query.isError && !items.length ? (
            <EmptyState icon="💸" title="Belum ada bukti yang perlu direview" description="Queue review pembayaran akan muncul saat tenant mengirim bukti bayar." />
          ) : null}

          {!query.isLoading && !query.isError && items.length > 0 ? (
            <Table responsive hover className="align-middle">
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
                      <td>
                        <div className="fw-semibold">{item.tenant?.fullName ?? '-'}</div>
                        <div className="small text-muted">{item.room?.code ?? '-'} · {item.room?.name ?? 'Nama kamar belum tersedia'}</div>
                        <div className="small text-muted">Dibayar: {formatDate(item.paidAt)} · {item.paymentMethod}</div>
                        <div className={reviewMeta.isExpired ? 'small text-soft-danger' : 'small text-muted'}>Masuk: {formatDate(item.createdAt ?? item.paidAt)}</div>
                        <div className={reviewMeta.isExpired ? 'small text-soft-danger fw-semibold' : 'small text-muted'}>{getReviewSlaText(item)}</div>
                      </td>
                      <td>
                        <div className="fw-semibold">{getTargetLabel(item)}</div>
                        <div className="small text-muted">
                          {item.targetType === 'DEPOSIT'
                            ? `Deposit ${getStatusLabel(item.deposit?.paymentStatus ?? 'UNPAID', undefined, { tone: 'admin', domain: 'deposit' })}`
                            : (item.invoice?.invoiceNumber ?? `INV-${item.invoiceId}`)}
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold"><CurrencyDisplay amount={item.amountRupiah} /></div>
                        <span className={`amount-tone-pill ${amountToneClass}`}>{getPaymentAmountLabel(amountTone)}</span>
                        <div className="small text-muted mt-1">Sisa: <CurrencyDisplay amount={getPaymentRemainingAmount(item)} /></div>
                      </td>
                      <td>
                        <span className={`payment-risk-pill ${safety.riskTone}`}>{safety.riskLabel}</span>
                        {safety.blockers.length ? <div className="small text-soft-danger mt-1">{safety.blockers[0].title}</div> : null}
                        {!safety.blockers.length && safety.warnings.length ? <div className="small text-muted mt-1">{safety.warnings[0].title}</div> : null}
                      </td>
                      <td>
                        {item.fileUrl ? (
                          <Button as="a" href={resolveAbsoluteFileUrl(item.fileUrl) ?? '#'} target="_blank" rel="noreferrer" size="sm" variant="outline-secondary">Buka Bukti</Button>
                        ) : <span className="amount-tone-pill warning">Tanpa file</span>}
                      </td>
                      <td><StatusBadge status={item.status} domain="payment" /></td>
                      <td><div className="small text-muted payment-impact-text">{compactText(getPaymentImpact(item), 72)}</div></td>
                      <td>
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
    </div>
  );
}
