import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { getResource, postAction } from '../../api/resources';
import client from '../../api/client';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import InvoicePrintLayout from '../../components/reports/InvoicePrintLayout';
import type { InvoicePrintData } from '../../components/reports/InvoicePrintLayout';
import { formatDateSafe } from '../resources/simpleCrudHelpers';
import { listMyPaymentSubmissions } from '../../api/paymentSubmissions';

const lineTypeLabels: Record<string, string> = {
  RENT: 'Sewa',
  ELECTRICITY: 'Listrik',
  WATER: 'Air',
  PENALTY: 'Denda',
  DISCOUNT: 'Diskon',
  WIFI: 'WiFi',
  OTHER: 'Lainnya',
};

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Tunai',
  TRANSFER: 'Transfer',
  QRIS: 'QRIS',
  EWALLET: 'E-Wallet',
  OTHER: 'Lainnya',
};

export default function TenantInvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const detailQuery = useQuery({
    queryKey: ['tenant-invoice', id],
    queryFn: () => getResource<any>(`/invoices/${id}`),
    enabled: !!id,
    retry: false,
  });

  const invoice = detailQuery.data as InvoicePrintData | undefined;

  const totalPaid = useMemo(() => {
    if (!invoice?.payments) return 0;
    return invoice.payments.reduce((sum, p) => sum + Number(p.amountRupiah ?? 0), 0);
  }, [invoice]);

  const totalInvoice = Number(invoice?.totalAmountRupiah ?? 0);
  const outstanding = Math.max(totalInvoice - totalPaid, 0);
  const isPaid = invoice?.status === 'PAID';
  const isCancelled = invoice?.status === 'CANCELLED';

  const tenantName = invoice?.stay?.tenant?.fullName;
  const roomInfo = invoice?.stay?.room
    ? `${invoice.stay.room.code}${invoice.stay.room.name ? ` · ${invoice.stay.room.name}` : ''}`
    : null;

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

  const needsPayment = !isPaid && !isCancelled;

  // ── Pending review detection ──
  const submissionsQuery = useQuery({
    queryKey: ['my-payment-submissions'],
    queryFn: () => listMyPaymentSubmissions(),
    enabled: needsPayment,
    staleTime: 30_000,
  });
  const hasPendingReview = useMemo(() => {
    const items = submissionsQuery.data?.items ?? [];
    return items.some((s: any) => s.invoiceId === Number(id) && s.status === 'PENDING_REVIEW');
  }, [submissionsQuery.data, id]);

  const shouldDisablePay = hasPendingReview || Number(payAmount) <= 0 || Number(payAmount) > outstanding;

  const payMutation = useMutation({
    mutationFn: async () => {
      const stayId = (detailQuery.data as any)?.stay?.id;
      const invoiceId = Number(id);
      if (!stayId || !invoiceId) throw new Error('Data tidak lengkap');

      // If file is selected, upload it first
      let fileUrl: string | undefined;
      let fileKey: string | undefined;
      let originalFilename: string | undefined;
      let mimeType: string | undefined;
      let fileSizeBytes: number | undefined;

      if (payFile) {
        const formData = new FormData();
        formData.append('file', payFile);
        const uploadRes = await client.post('/payment-submissions/upload-proof', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const uploadData = uploadRes.data.data;
        fileUrl = uploadData.fileUrl;
        fileKey = uploadData.fileKey;
        originalFilename = uploadData.originalFilename;
        mimeType = uploadData.mimeType;
        fileSizeBytes = uploadData.fileSizeBytes;
      }

      return postAction<any>('/payment-submissions', {
        stayId,
        invoiceId,
        amountRupiah: Number(payAmount),
        paidAt: new Date().toISOString(),
        paymentMethod: payMethod,
        senderName: paySenderName || undefined,
        senderBankName: paySenderBank || undefined,
        referenceNumber: payRefNumber || undefined,
        notes: payNotes || undefined,
        fileUrl,
        fileKey,
        originalFilename,
        mimeType,
        fileSizeBytes,
      });
    },
    onSuccess: () => {
      setShowPayModal(false);
      queryClient.invalidateQueries({ queryKey: ['tenant-invoice', id] });
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
        <PageHeader title="Invoice Saya" description="Detail tagihan Anda." actionLabel="Kembali" onAction={() => navigate('/portal/invoices')} />
        <Alert variant="danger">Invoice tidak ditemukan atau Anda tidak memiliki akses.</Alert>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div>
        <PageHeader title="Invoice Saya" description="Detail tagihan Anda." actionLabel="Kembali" onAction={() => navigate('/portal/invoices')} />
        <Alert variant="warning">Data invoice tidak tersedia.</Alert>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Invoice #${id}`}
        description="Detail tagihan Anda."
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
            <strong>Invoice Dibatalkan</strong><br />
            Invoice ini telah dibatalkan dan tidak dapat dicetak.
          </Alert>
        ) : null}

        <Row className="g-4 mb-4">
          <Col lg={8}>
            <Card className="detail-hero border-0 h-100">
              <Card.Body>
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                  <div>
                    <div className="page-eyebrow">Ringkasan tagihan</div>
                    <h4 className="mb-1">{invoice.invoiceNumber || `INV-${invoice.id}`}</h4>
                    <div className="text-muted small">
                      {tenantName || '-'}
                      {roomInfo ? ` · ${roomInfo}` : ''}
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <StatusBadge status={invoice.status} />
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
                      <div className="fw-semibold">{formatDateSafe(invoice.dueDate)}</div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="content-card h-100">
              <Card.Body>
                <div className="panel-title mb-2">Cetak Invoice</div>
                <div className="panel-subtitle mb-3">
                  {isCancelled
                    ? 'Invoice yang dibatalkan tidak dapat dicetak.'
                    : 'Cetak invoice atau kwitansi untuk arsip Anda.'}
                </div>
                {needsPayment && hasPendingReview ? (
                  <Alert variant="info" className="small mb-2">⏳ Bukti pembayaran Anda sedang menunggu review admin.</Alert>
                ) : null}
                {needsPayment && !hasPendingReview ? (
                  <Button
                    variant="danger"
                    className="w-100 mb-2"
                    onClick={() => { setPayAmount(String(outstanding)); setShowPayModal(true); }}
                  >
                    💳 Bayar Sekarang
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  className="w-100"
                  onClick={handlePrint}
                  disabled={isCancelled}
                >
                  🖨️ Cetak
                </Button>
                {isPaid && !isCancelled ? (
                  <Alert variant="success" className="mt-3 mb-0 small">
                    Invoice sudah lunas. Saat dicetak akan tampil sebagai <strong>Kwitansi / Tanda Terima</strong>.
                  </Alert>
                ) : !isCancelled ? (
                  <Alert variant="info" className="mt-3 mb-0 small">
                    Invoice belum lunas. Saat dicetak akan tampil sebagai <strong>Tagihan</strong>.
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
                {!invoice.lines?.length ? (
                  <EmptyState icon="🧾" title="Belum ada rincian invoice" />
                ) : (
                  <Table hover responsive>
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
                          <td>{lineTypeLabels[line.lineType] ?? line.lineType}</td>
                          <td>{line.description || '-'}</td>
                          <td>{line.qty}{line.unit ? ` ${line.unit}` : ''}</td>
                          <td><CurrencyDisplay amount={line.unitPriceRupiah} /></td>
                          <td><CurrencyDisplay amount={line.lineAmountRupiah} /></td>
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
                  <Table hover responsive size="sm">
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
                          <td>{formatDateSafe(payment.paymentDate)}</td>
                          <td>{paymentMethodLabels[payment.method] ?? payment.method}</td>
                          <td>{payment.referenceNo || '-'}</td>
                          <td><CurrencyDisplay amount={payment.amountRupiah} /></td>
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
          <Modal.Title>Upload Bukti Pembayaran</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="small">
            Upload bukti pembayaran untuk invoice <strong>{invoice.invoiceNumber || `INV-${invoice.id}`}</strong>. Admin akan memverifikasi pembayaran Anda.
          </Alert>
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
                  <Form.Label className="fw-semibold">Bukti Pembayaran (opsional)</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = (e.target as HTMLInputElement).files?.[0] ?? null;
                      setPayFile(file);
                    }}
                  />
                  <Form.Text className="text-muted">Format: JPG, PNG, atau PDF. Maks 5MB.</Form.Text>
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
            onClick={() => payMutation.mutate()}
            disabled={payMutation.isPending || shouldDisablePay}
          >
            {payMutation.isPending ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}