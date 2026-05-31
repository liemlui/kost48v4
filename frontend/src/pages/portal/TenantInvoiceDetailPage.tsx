import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { getResource } from '../../api/resources';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import TenantPriorityBoard from '../../components/tenant/TenantPriorityBoard';
import { LifecycleTimeline, type AssistantItem, type MetricChip, type TimelineStep } from '../../components/command-center';
import { AssistantInsightLine, StatusStrip } from '../../components/workspace';
import InvoicePrintLayout from '../../components/reports/InvoicePrintLayout';
import type { InvoicePrintData } from '../../components/reports/InvoicePrintLayout';
import { listMyPaymentSubmissions, submitPaymentWithProof } from '../../api/paymentSubmissions';
import { isPayableInvoiceStatus, isPendingReviewStatus, TENANT_PAYMENT_REVIEW_MESSAGE, tenantInvoiceStatusLabel } from '../../utils/tenantCopy';
import { getInvoiceUtilitySummary, invoiceKindLabel } from '../../utils/invoiceUtility';
import { getInvoiceOutstandingAmount, getInvoicePaidAmount, getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import { formatDateTimeWib, getDeadlineMeta, parseDateTimeSafe } from '../../utils/dateTime';
import { toTenantFriendlyError } from '../../utils/tenantErrorCopy';
import { TENANT_PAYMENT_PROOF_ACCEPT, prepareTenantPaymentProof, tenantPaymentProofReadyLabel } from '../../utils/tenantPaymentProof';
import { compactText } from '../../utils/readabilityRules';

const lineTypeLabels: Record<string, string> = {
  RENT: 'Sewa',
  ELECTRICITY: 'Listrik',
  WATER: 'Air',
  PENALTY: 'Denda',
  DISCOUNT: 'Diskon',
  WIFI: 'WiFi',
  OTHER: 'Lainnya',
};

function isPastDue(dueDate: string | Date | null | undefined) {
  const due = parseDateTimeSafe(dueDate);
  if (!due) return false;
  return due.getTime() < Date.now();
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Tunai',
  TRANSFER: 'Transfer',
  QRIS: 'QRIS',
  EWALLET: 'E-Wallet',
  OTHER: 'Lainnya',
};

function toPositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function TenantInvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const detailQuery = useQuery({
    queryKey: ['portal-invoice', id],
    queryFn: () => getResource<any>(`/invoices/${id}`),
    enabled: !!id,
    retry: false,
  });

  const invoice = detailQuery.data as InvoicePrintData | undefined;

  const totalPaid = useMemo(() => getInvoicePaidAmount(invoice as any), [invoice]);
  const totalInvoice = useMemo(() => getInvoiceTotalAmount(invoice as any), [invoice]);
  const outstanding = useMemo(() => getInvoiceOutstandingAmount(invoice as any), [invoice]);
  const isPaid = invoice?.status === 'PAID';
  const isCancelled = invoice?.status === 'CANCELLED';
  const tenantName = invoice?.stay?.tenant?.fullName;
  const roomInfo = invoice?.stay?.room
    ? `${invoice.stay.room.code}${invoice.stay.room.name ? ` · ${invoice.stay.room.name}` : ''}`
    : null;
  const utilitySummary = useMemo(() => getInvoiceUtilitySummary(invoice?.lines), [invoice?.lines]);
  const hasRenewUtilityLines = utilitySummary.hasUtilityLines;
  const invoiceKind = invoiceKindLabel(invoice?.lines);

  const handlePrint = () => {
    window.print();
  };

  // ── Payment upload modal ──
  const queryClient = useQueryClient();
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('TRANSFER');
  const [paySenderName, setPaySenderName] = useState('');
  const [paySenderBank, setPaySenderBank] = useState('');
  const [payRefNumber, setPayRefNumber] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payFile, setPayFile] = useState<File | null>(null);
  const [payFileLabel, setPayFileLabel] = useState('');
  const [payProofPreviewUrl, setPayProofPreviewUrl] = useState<string | null>(null);
  const [payFormError, setPayFormError] = useState('');

  const needsPayment = !isPaid && !isCancelled;

  useEffect(() => {
    if (!showPayModal) return;
    setPayAmount(String(outstanding));
    setPayFile(null);
    setPayFileLabel('');
    setPayProofPreviewUrl(null);
    setPayNotes('');
    setPayFormError('');
  }, [showPayModal, outstanding]);

  // ── Pending review detection ──
  const submissionsQuery = useQuery({
    queryKey: ['portal-payment-submissions'],
    queryFn: () => listMyPaymentSubmissions(),
    enabled: needsPayment,
    staleTime: 30_000,
  });
  const hasPendingReview = useMemo(() => {
    const items = submissionsQuery.data?.items ?? [];
    return items.some((s: any) => s.invoiceId === Number(id) && isPendingReviewStatus(s.status));
  }, [submissionsQuery.data, id]);

  const hasPayableAmount = outstanding > 0;
  const canSubmitPayment = Boolean(invoice && isPayableInvoiceStatus(invoice.status) && hasPayableAmount);
  const isOverdue = invoice && canSubmitPayment && isPastDue(invoice.dueDate);
  const dueMeta = getDeadlineMeta(invoice?.dueDate, 'Jatuh tempo');
  const assistantItems: AssistantItem[] = invoice ? [
    hasPendingReview ? {
      id: 'review',
      severity: 'INFO',
      title: 'Bukti pembayaran kamu sedang diperiksa',
      message: TENANT_PAYMENT_REVIEW_MESSAGE,
      source: 'Bukti pembayaran',
    } : null,
    canSubmitPayment && !hasPendingReview ? {
      id: 'needs-payment',
      severity: isOverdue ? 'BLOCKER' : 'HIGH',
      title: isOverdue ? 'Tagihan sudah melewati jatuh tempo' : 'Tagihan ini perlu dibayar',
      message: invoice.dueDate ? `${dueMeta.actionLabel} Bayar + kirim bukti di sini.` : 'Bayar + kirim bukti di sini.',
      source: 'Tagihan',
      actionLabel: 'Bayar & Kirim Bukti',
      onAction: () => { setPayAmount(String(outstanding)); setShowPayModal(true); },
    } : null,
    invoice.status === 'DRAFT' ? {
      id: 'draft',
      severity: 'INFO',
      title: 'Tagihan sedang disiapkan admin',
      message: 'Belum perlu bayar. Tunggu admin.',
      source: 'Tagihan',
    } : null,
    isPaid ? {
      id: 'paid',
      severity: 'SUCCESS',
      title: 'Tagihan sudah lunas',
      message: 'Simpan halaman ini sebagai arsip.',
      source: 'Riwayat',
    } : null,
  ].filter(Boolean) as AssistantItem[] : [];

  const metrics: MetricChip[] = invoice ? [
    { id: 'total', label: 'Total Tagihan', value: <CurrencyDisplay amount={totalInvoice} /> as any, helper: invoice.invoiceNumber || `TG-${invoice.id}`, icon: '🧾', status: invoice.status },
    { id: 'paid', label: 'Sudah Dibayar', value: <CurrencyDisplay amount={totalPaid} /> as any, helper: `${invoice.payments?.length ?? 0} pembayaran tercatat`, icon: '💳', status: totalPaid > 0 ? 'SUCCESS' : 'INFO' },
    { id: 'outstanding', label: 'Sisa Tagihan', value: <CurrencyDisplay amount={outstanding} /> as any, helper: hasPendingReview ? 'Bukti sedang diperiksa' : canSubmitPayment ? hasPayableAmount ? 'Perlu dibayar' : 'Tidak ada nominal bayar' : invoice.status === 'DRAFT' ? 'Sedang disiapkan admin' : 'Selesai', icon: '⚖️', status: hasPendingReview ? 'INFO' : outstanding > 0 ? 'WARNING' : 'SUCCESS' },
    { id: 'due', label: 'Jatuh Tempo', value: dueMeta.hasDate ? dueMeta.clockLabel : '-', helper: dueMeta.hasDate ? `${dueMeta.relativeLabel} · ${dueMeta.absoluteLabel}` : 'Jam belum tersedia', icon: '⏰', status: isOverdue ? 'DANGER' : 'INFO' },
  ] : [];

  const timelineSteps: TimelineStep[] = invoice ? [
    { id: 'issued', label: 'Tagihan tersedia', description: 'Tagihan tersedia.', status: invoice.status === 'DRAFT' ? 'pending' : 'done' },
    { id: 'proof', label: 'Bukti pembayaran', description: hasPendingReview ? TENANT_PAYMENT_REVIEW_MESSAGE : canSubmitPayment ? 'Bayar + kirim bukti.' : 'Tidak perlu bukti tambahan.', status: hasPendingReview ? 'active' : canSubmitPayment ? 'pending' : 'done' },
    { id: 'verified', label: 'Verifikasi admin', description: isPaid ? 'Pembayaran sudah diverifikasi.' : 'Menunggu admin.', status: isPaid ? 'done' : hasPendingReview ? 'active' : 'pending' },
    { id: 'complete', label: 'Tagihan selesai', description: isPaid ? 'Tagihan sudah lunas.' : 'Selesai setelah lunas.', status: isPaid ? 'done' : isCancelled ? 'blocked' : 'pending' },
  ] : [];

  const parsedPayAmount = Number(payAmount);
  const shouldDisablePay = hasPendingReview || !canSubmitPayment || !Number.isFinite(parsedPayAmount) || parsedPayAmount <= 0 || parsedPayAmount > outstanding || !payFile;

  const handlePayFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setPayFile(null);
      setPayFileLabel('');
      setPayProofPreviewUrl(null);
      return;
    }

    try {
      const prepared = await prepareTenantPaymentProof(file);
      setPayFile(prepared);
      setPayFileLabel(tenantPaymentProofReadyLabel(prepared));
      setPayProofPreviewUrl(URL.createObjectURL(prepared));
      setPayFormError('');
    } catch (error) {
      setPayFile(null);
      setPayFileLabel('');
      setPayProofPreviewUrl(null);
      setPayFormError(error instanceof Error ? error.message : 'Bukti pembayaran tidak valid. Gunakan JPG, PNG, atau WebP maksimal 2MB.');
      event.target.value = '';
    }
  };

  const payMutation = useMutation({
    mutationFn: async () => {
      const detail = detailQuery.data as any;
      const stayId = toPositiveNumber(detail?.stayId ?? detail?.stay?.id);
      const invoiceId = toPositiveNumber(detail?.id ?? id);
      const amountRupiah = toPositiveNumber(payAmount);
      if (!stayId || !invoiceId) throw new Error('Data tagihan belum lengkap. Coba muat ulang halaman.');
      if (!hasPayableAmount) throw new Error('Tagihan ini tidak memiliki nominal yang perlu dibayar. Hubungi admin jika statusnya belum sesuai.');
      if (!amountRupiah) throw new Error('Jumlah pembayaran wajib lebih dari Rp0.');
      if (amountRupiah > outstanding) throw new Error('Jumlah pembayaran tidak boleh melebihi sisa tagihan.');
      if (!payFile) throw new Error('Upload bukti pembayaran dulu sebelum mengirim.');

      return submitPaymentWithProof({
        stayId,
        invoiceId,
        targetType: 'INVOICE',
        amountRupiah,
        paidAt: new Date().toISOString(),
        paymentMethod: payMethod,
        senderName: paySenderName || undefined,
        senderBankName: paySenderBank || undefined,
        referenceNumber: payRefNumber || undefined,
        notes: payNotes || undefined,
      }, payFile);
    },
    onSuccess: () => {
      setShowPayModal(false);
      queryClient.invalidateQueries({ queryKey: ['portal-invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['portal-payment-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['portal-invoices'] });
    },
  });

  if (detailQuery.isLoading) {
    return (
      <div className="py-5 text-center">
        <Spinner animation="border" />
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div>
        <PageHeader eyebrow="Portal Penghuni" title="Tagihan Saya" description="Detail tagihan kamu." actionLabel="Kembali" onAction={() => navigate('/portal/invoices')} />
        <Alert variant="danger">Tagihan tidak ditemukan atau kamu tidak memiliki akses.</Alert>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div>
        <PageHeader eyebrow="Portal Penghuni" title="Tagihan Saya" description="Detail tagihan kamu." actionLabel="Kembali" onAction={() => navigate('/portal/invoices')} />
        <Alert variant="warning">Data tagihan tidak tersedia.</Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Portal Penghuni"
        title={`Tagihan #${id}`}
        description={hasPendingReview ? 'Bukti pembayaran sedang diperiksa. Tidak perlu upload ulang.' : hasRenewUtilityLines ? 'Sewa baru + listrik/air dari catatan meter.' : hasPayableAmount ? 'Detail tagihan dan pembayaran.' : 'Detail tagihan dan statusnya.'}
        actionLabel="Kembali"
        onAction={() => navigate('/portal/invoices')}
      />

      {/* ========== PRINT LAYOUT (hidden until print) ========== */}
      <div className="print-only">
        <InvoicePrintLayout data={invoice} />
      </div>

      {/* ========== SCREEN VIEW ========== */}
      <div className="no-print">
        {isCancelled ? (
          <Alert variant="danger">
            <strong>Tagihan Dibatalkan</strong><br />
            Tagihan ini telah dibatalkan dan tidak dapat dicetak.
          </Alert>
        ) : null}

        <Card className={`tenant-main-action-card ${hasPendingReview ? 'tenant-main-action-review' : 'tenant-main-action-info'} border-0 mb-4`}>
          <Card.Body>
            <div>
              <div className="command-eyebrow">Status tagihan</div>
              <h3>{assistantItems[0]?.title ?? 'Tidak ada aksi tambahan'}</h3>
              <p>{assistantItems[0] ? compactText(assistantItems[0].message, 90) : 'Detail pembayaran ada di bawah.'}</p>
            </div>
            {assistantItems[0]?.actionLabel ? <Button variant="primary" onClick={assistantItems[0].onAction}>{assistantItems[0].actionLabel}</Button> : null}
          </Card.Body>
        </Card>

        <Row className="g-4 mb-4">
          <Col lg={8}>
            <Card className="detail-hero border-0 h-100">
              <Card.Body>
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                  <div>
                    <div className="page-eyebrow">Ringkasan tagihan</div>
                    <h4 className="mb-1">{invoice.invoiceNumber || `TG-${invoice.id}`}</h4>
                    <div className="small text-primary fw-semibold mb-1">{invoiceKind}</div>
                    <div className="text-muted small">
                      {tenantName || '-'}
                      {roomInfo ? ` · ${roomInfo}` : ''}
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <StatusBadge status={hasPendingReview ? 'INFO' : invoice.status} tone="tenant" domain="invoice" customLabel={hasPendingReview ? 'Sedang Diperiksa' : tenantInvoiceStatusLabel(invoice.status, Boolean(isOverdue))} />
                    {isPaid ? <StatusBadge status="PAID" customLabel="Sudah lunas" /> : null}
                  </div>
                </div>

                <Row className="g-3">
                  <Col md={3} sm={6}>
                    <div className="metric-tile">
                      <div className="card-title-soft">Total Tagihan</div>
                      <div className="fw-semibold"><CurrencyDisplay amount={totalInvoice} /></div>
                    </div>
                  </Col>
                  <Col md={3} sm={6}>
                    <div className="metric-tile">
                      <div className="card-title-soft">Sudah Dibayar</div>
                      <div className="fw-semibold"><CurrencyDisplay amount={totalPaid} /></div>
                    </div>
                  </Col>
                  <Col md={3} sm={6}>
                    <div className="metric-tile">
                      <div className="card-title-soft">Sisa Tagihan</div>
                      <div className="fw-semibold"><CurrencyDisplay amount={outstanding} /></div>
                    </div>
                  </Col>
                  <Col md={3} sm={6}>
                    <div className="metric-tile">
                      <div className="card-title-soft">Jatuh Tempo</div>
                      <div className="fw-semibold">{dueMeta.hasDate ? dueMeta.absoluteLabel : '-'}</div>
                      {dueMeta.hasDate ? <div className={isOverdue ? 'small text-soft-danger mt-1' : 'small text-muted mt-1'}>{dueMeta.relativeLabel}</div> : null}
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="content-card h-100">
              <Card.Body>
                <div className="panel-title mb-2">Arsip Tagihan</div>
                <div className="panel-subtitle mb-3">
                  {isCancelled
                    ? 'Tagihan yang dibatalkan tidak dapat dicetak.'
                    : hasPendingReview ? 'Bukti pembayaran sudah masuk. Tunggu admin memeriksa.' : 'Cetak tagihan atau kwitansi untuk arsip kamu.'}
                </div>
                {needsPayment && hasPendingReview ? (
                  <Alert variant="info" className="small mb-2">🔎 {TENANT_PAYMENT_REVIEW_MESSAGE}</Alert>
                ) : null}
                {invoice.status === 'DRAFT' ? (
                  <Alert variant="info" className="small mb-2">Tagihan sedang disiapkan admin. Belum ada aksi bayar yang perlu kamu lakukan.</Alert>
                ) : null}
                {canSubmitPayment && !hasPendingReview ? (
                  <Button
                    variant="danger"
                    className="w-100 mb-2"
                    onClick={() => { setPayAmount(String(outstanding)); setShowPayModal(true); }}
                  >
                    💳 Bayar & Kirim Bukti
                  </Button>
                ) : null}
                <Button
                  variant={hasPendingReview ? "outline-secondary" : "primary"}
                  className="w-100"
                  onClick={handlePrint}
                  disabled={isCancelled}
                >
                  🖨️ {hasPendingReview ? 'Cetak Arsip' : 'Cetak'}
                </Button>
                {isPaid && !isCancelled ? (
                  <Alert variant="success" className="mt-3 mb-0 small">
                    Tagihan sudah lunas. Saat dicetak akan tampil sebagai <strong>Kwitansi / Tanda Terima</strong>.
                  </Alert>
                ) : hasPendingReview ? (
                  <Alert variant="info" className="mt-3 mb-0 small">
                    Status akan berubah setelah admin menyetujui pembayaran.
                  </Alert>
                ) : !isCancelled ? (
                  <Alert variant="info" className="mt-3 mb-0 small">
                    Tagihan belum lunas. Saat dicetak akan tampil sebagai <strong>Tagihan</strong>.
                  </Alert>
                ) : null}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="g-4">
          <Col lg={7}>
            <Card className="content-card">
              <Card.Body>
                <div className="panel-title mb-3">Rincian Tagihan</div>
                {hasRenewUtilityLines ? (
                  <Alert variant="info" className="small">
                    <div className="fw-semibold mb-1">Termasuk catatan meter perpanjangan.</div>
                    <div>Biaya listrik dan air dihitung dari selisih meter.</div>
                    <div className="d-flex flex-wrap gap-2 mt-3">
                      <span className="badge bg-primary-subtle text-primary-emphasis">Sewa: <CurrencyDisplay amount={utilitySummary.rentAmount} /></span>
                      <span className="badge bg-info-subtle text-info-emphasis">Listrik: {utilitySummary.electricityUsage.toFixed(3)} {utilitySummary.electricityUnit} · <CurrencyDisplay amount={utilitySummary.electricityAmount} /></span>
                      <span className="badge bg-success-subtle text-success-emphasis">Air: {utilitySummary.waterUsage.toFixed(3)} {utilitySummary.waterUnit} · <CurrencyDisplay amount={utilitySummary.waterAmount} /></span>
                    </div>
                  </Alert>
                ) : null}
                {!invoice.lines?.length ? (
                  <EmptyState icon="🧾" title="Belum ada rincian tagihan" />
                ) : (
                  <Table hover responsive className="responsive-data-table">
                    <thead>
                      <tr>
                        <th>Tipe</th>
                        <th>Deskripsi</th>
                        <th>Qty</th>
                        <th>Harga Satuan</th>
                        <th>Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.lines.map((line: any, idx: number) => (
                        <tr key={line.id ?? idx}>
                          <td data-label="Tipe">{lineTypeLabels[line.lineType] ?? line.lineType}</td>
                          <td data-label="Deskripsi">{line.description || '-'}</td>
                          <td data-label="Qty">{line.qty}{line.unit ? ` ${line.unit}` : ''}</td>
                          <td data-label="Harga Satuan"><CurrencyDisplay amount={line.unitPriceRupiah} /></td>
                          <td data-label="Jumlah"><CurrencyDisplay amount={line.lineAmountRupiah} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={5}>
            <Card className="content-card mb-4">
              <Card.Body>
                <div className="panel-title mb-3">Riwayat Pembayaran</div>
                {!invoice.payments?.length ? (
                  <EmptyState icon="💳" title="Belum ada pembayaran tercatat" />
                ) : (
                  <Table hover responsive size="sm" className="responsive-data-table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Metode</th>
                        <th>Referensi</th>
                        <th>Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.payments.map((payment: any) => (
                        <tr key={payment.id}>
                          <td data-label="Tanggal">{formatDateTimeWib(payment.paymentDate)}</td>
                          <td data-label="Metode">{paymentMethodLabels[payment.method] ?? payment.method}</td>
                          <td data-label="Referensi">{payment.referenceNo || '-'}</td>
                          <td data-label="Nominal"><CurrencyDisplay amount={payment.amountRupiah} /></td>
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

      {/* ── Payment Upload Modal ── */}
      <Modal show={showPayModal} onHide={() => setShowPayModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Bayar & Kirim Bukti</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="small">
            Bayar dan kirim bukti pembayaran untuk tagihan <strong>{invoice.invoiceNumber || `TG-${invoice.id}`}</strong>. {dueMeta.hasDate ? `Batas bayar: ${dueMeta.absoluteLabel}. ${dueMeta.relativeLabel}. ` : ''}Admin akan memeriksa pembayaran kamu. Setelah terkirim, kamu tidak perlu upload ulang.
          </Alert>
          {payFormError ? <Alert variant="warning" className="small">{payFormError}</Alert> : null}
          {payMutation.isError ? (
            <Alert variant="danger" className="small">
              {toTenantFriendlyError(payMutation.error, 'Gagal mengirim bukti pembayaran. Cek nominal dan file, lalu coba lagi.')}
            </Alert>
          ) : null}
          {totalInvoice <= 0 && (invoice.lines?.length ?? 0) > 0 ? (
            <Alert variant="warning" className="small">
              Total tagihan dihitung dari rincian karena data total lama belum tersinkron.
            </Alert>
          ) : null}
          <Form>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Jumlah Dibayar (Rp)</Form.Label>
                  <Form.Control
                    type="text"
                    inputMode="numeric"
                    value={payAmount}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setPayAmount(digits);
                    }}
                    placeholder="Jumlah pembayaran"
                  />
                  <Form.Text className="text-muted">
                    Sisa tagihan: <CurrencyDisplay amount={outstanding} />
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Metode Pembayaran</Form.Label>
                  <Form.Select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                  >
                    <option value="TRANSFER">Transfer</option>
                    <option value="QRIS">QRIS</option>
                    <option value="EWALLET">E-Wallet</option>
                    <option value="CASH">Tunai</option>
                    <option value="OTHER">Lainnya</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Nama Pengirim</Form.Label>
                  <Form.Control
                    type="text"
                    value={paySenderName}
                    onChange={(e) => setPaySenderName(e.target.value)}
                    placeholder="Nama di rekening pengirim"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Bank Pengirim</Form.Label>
                  <Form.Control
                    type="text"
                    value={paySenderBank}
                    onChange={(e) => setPaySenderBank(e.target.value)}
                    placeholder="Nama bank pengirim"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Nomor Referensi</Form.Label>
                  <Form.Control
                    type="text"
                    value={payRefNumber}
                    onChange={(e) => setPayRefNumber(e.target.value)}
                    placeholder="Nomor transaksi / referensi"
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Catatan (opsional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="Catatan tambahan untuk admin"
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Bukti pembayaran</Form.Label>
                  <Form.Control
                    type="file"
                    accept={TENANT_PAYMENT_PROOF_ACCEPT}
                    onChange={handlePayFileChange}
                  />
                  <Form.Text className="text-muted">JPG/PNG/WebP, maksimal 2MB.</Form.Text>
                  {payFileLabel ? <div className="small mt-2">File siap dikirim: <strong>{payFileLabel}</strong></div> : null}
                  {payProofPreviewUrl ? (
                    <div className="mt-3">
                      <img src={payProofPreviewUrl} alt="Pratinjau bukti pembayaran" style={{ width: 180, maxWidth: '100%', height: 140, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(15, 23, 42, 0.12)' }} />
                      <div className="small text-muted mt-2">Pratinjau bukti pembayaran sebelum dikirim ke admin.</div>
                    </div>
                  ) : null}
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPayModal(false)} disabled={payMutation.isPending}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!payFile) {
                setPayFormError('Upload bukti pembayaran dulu. Setelah terkirim, kamu tidak perlu upload ulang.');
                return;
              }
              setPayFormError('');
              payMutation.mutate();
            }}
            disabled={payMutation.isPending || shouldDisablePay}
          >
            {payMutation.isPending ? 'Mengirim...' : 'Bayar & Kirim Bukti'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}