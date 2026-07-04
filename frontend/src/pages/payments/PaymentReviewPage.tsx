// FILE: PaymentReviewPage.tsx — review + approve/reject bukti bayar (JALUR UANG)
import { useMemo, useState } from 'react';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DonutGauge from '../../components/charts/DonutGauge';
import { CHART_PALETTE, CHART_SEMANTIC } from '../../components/charts/chartPalette';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import AuthenticatedFileLink from '../../components/common/AuthenticatedFileLink';
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
  const riskData = [
    { name: 'Risiko Tinggi', value: highRiskCount, color: CHART_SEMANTIC.danger },
    { name: 'Perlu Checklist', value: manualRiskCount, color: CHART_SEMANTIC.warning },
    { name: 'Aman', value: Math.max(0, items.length - highRiskCount - manualRiskCount), color: CHART_SEMANTIC.success },
  ].filter((d) => d.value > 0);

  const proofRate = items.length > 0 ? Math.round((proofCount / items.length) * 100) : 0;

  const targetData = [
    { name: 'Invoice', value: invoiceCount, color: CHART_PALETTE[0] },
    { name: 'Deposit', value: depositCount, color: CHART_PALETTE[5] },
  ].filter((d) => d.value > 0);

  const methodData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const method = item.paymentMethod ?? 'Tidak Diketahui';
      const label = method === 'TRANSFER' ? 'Transfer' : method === 'CASH' ? 'Tunai' : method === 'QRIS' ? 'QRIS' : method === 'EWALLET' ? 'E-Wallet' : method;
      counts[label] = (counts[label] ?? 0) + 1;
    });
    return Object.entries(counts).map(([label, value], i) => ({ label, value, color: CHART_PALETTE[i % CHART_PALETTE.length] })).sort((a, b) => b.value - a.value);
  }, [items]);

  // F3-12 (V-2): untuk sampel kecil (n<5) sebuah donat proporsi menyesatkan —
  // 1 bukti high-risk jadi lingkaran 100% merah = terbaca "krisis". Tampilkan
  // hitungan eksplisit, donat hanya saat sampel cukup besar.
  const useRiskCounts = items.length < 5;

  if (items.length === 0) return null;

  return (
    <Row className="g-3 mb-3 payment-analytics-row">
      <Col md={4}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Bukti & Kelengkapan</div>
            <div className="panel-subtitle mb-2">Ketersediaan file bukti bayar</div>
            <div className="invoice-collection-gauge-wrap">
              <DonutGauge
                value={proofRate}
                center={<><strong>{proofRate}%</strong><span>Ada Bukti</span></>}
                ariaLabel={`Bukti tersedia: ${proofRate}%`}
                size={120}
                innerRadius={38}
                outerRadius={54}
                color={proofRate >= 80 ? CHART_SEMANTIC.success : proofRate >= 50 ? CHART_SEMANTIC.warning : CHART_SEMANTIC.danger}
                trackColor="rgba(148,163,184,0.15)"
              />
            </div>
            <div className="invoice-gauge-labels mt-2">
              <span>Ada bukti: <strong>{proofCount}</strong></span>
              <span>Tanpa bukti: <strong>{missingProofCount}</strong></span>
            </div>
            <div className="invoice-gauge-labels" style={{ marginTop: 4 }}>
              <span>Total nominal: <strong>{fmtCompact(pendingAmount)}</strong></span>
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Level Risiko</div>
            <div className="panel-subtitle mb-2">
              {useRiskCounts ? `Hitungan risiko dari ${items.length} bukti` : 'Distribusi risiko bukti yang masuk'}
            </div>
            {useRiskCounts ? (
              <div className="payment-risk-count-grid">
                {riskData.map((d) => (
                  <div key={d.name} className="payment-risk-count-item">
                    <span className="payment-risk-count-dot" style={{ background: d.color }} />
                    <strong>{d.value}</strong>
                    <span className="payment-risk-count-label">{d.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="stay-analytics-donut-wrap">
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={44} outerRadius={64} paddingAngle={2} stroke="none">
                        {riskData.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: unknown, name: unknown) => [`${Number(v ?? 0)} bukti`, String(name ?? '')]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="stay-analytics-donut-center"><strong>{items.length}</strong><span>Total</span></div>
                </div>
                <div className="stay-analytics-legend">
                  {riskData.map((d) => <span key={d.name}><i style={{ background: d.color }} />{d.name}: {d.value}</span>)}
                </div>
              </>
            )}
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Metode & Target</div>
            <div className="panel-subtitle mb-2">Cara bayar dan tujuan pembayaran</div>
            {methodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart layout="vertical" data={methodData} margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="label" width={72} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: unknown) => [`${Number(v ?? 0)} bukti`, '']} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} background={{ fill: 'rgba(148,163,184,0.10)' }}>
                    {methodData.map((d) => <Cell key={d.label} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
            <div className="stay-analytics-legend mt-2">
              {targetData.map((d) => <span key={d.name}><i style={{ background: d.color }} />{d.name}: {d.value}</span>)}
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
    { id: 'amount', label: 'Nominal antrean', value: new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(pendingAmount), helper: 'Total nominal pada filter', status: 'SUCCESS', icon: 'Rp' },
    { id: 'risk', label: 'Risiko tinggi', value: highRiskCount, helper: manualRiskCount ? `${manualRiskCount} perlu checklist` : 'Safety check aman', status: highRiskCount ? 'DANGER' : manualRiskCount ? 'WARNING' : 'SUCCESS', icon: '!' },
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
      <AssistantPanel title="Asisten Review Pembayaran" subtitle="Prioritaskan bukti yang menahan flow." items={assistantItems} emptyTitle="Belum ada pembayaran yang menunggu review saat ini" emptyMessage="Semua pembayaran sudah diproses atau belum ada bukti masuk. Refresh jika baru saja ada kiriman baru." />
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
