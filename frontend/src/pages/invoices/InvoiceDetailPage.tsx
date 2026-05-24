import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Modal, Row, Table } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { createResource, getResource } from '../../api/resources';
import { formatDateSafe } from '../resources/simpleCrudHelpers';
import { getInvoiceOutstandingAmount, getInvoicePaidAmount, getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import InvoicePrintLayout from '../../components/reports/InvoicePrintLayout';
import { useAuth } from '../../context/AuthContext';
import { AssistantPanel, BlockedReasonCard, CompactMetrics, LifecycleTimeline, type AssistantItem, type MetricChip, type TimelineStep } from '../../components/command-center';

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Tunai',
  TRANSFER: 'Transfer',
  QRIS: 'QRIS',
  EWALLET: 'E-Wallet',
  OTHER: 'Lainnya',
};

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
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManageFinance = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showAddLine, setShowAddLine] = useState(false);
  const [lineForm, setLineForm] = useState({ lineType: 'RENT', description: '', qty: '1.00', unit: '', unitPriceRupiah: '', sortOrder: '0' });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ paymentDate: '', amountRupiah: '', method: 'TRANSFER', referenceNo: '', note: '' });

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const successTimerRef = useRef<number | null>(null);

  const detailQuery = useQuery({ queryKey: ['invoice', id], queryFn: () => getResource<any>(`/invoices/${id}`), enabled: !!id });

  const addLineMutation = useMutation({
    mutationFn: () => createResource(`/invoices/${id}/lines`, {
      ...lineForm,
      qty: lineForm.qty,
      unitPriceRupiah: Number(lineForm.unitPriceRupiah),
      sortOrder: Number(lineForm.sortOrder),
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setError('');
      setLineForm({ lineType: 'RENT', description: '', qty: '1.00', unit: '', unitPriceRupiah: '', sortOrder: '0' });
      setShowAddLine(false);
    },
    onError: (err: any) => setError(err?.response?.data?.message || 'Gagal menambah rincian'),
  });

  const addPaymentMutation = useMutation({
    mutationFn: () => createResource('/invoice-payments', {
      invoiceId: Number(id),
      paymentDate: paymentForm.paymentDate,
      amountRupiah: Number(paymentForm.amountRupiah),
      method: paymentForm.method,
      referenceNo: paymentForm.referenceNo || undefined,
      note: paymentForm.note || undefined,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setError('');
      setPaymentForm({ paymentDate: '', amountRupiah: '', method: 'TRANSFER', referenceNo: '', note: '' });
      setShowPaymentModal(false);
      setSuccessMessage('Pembayaran berhasil dicatat.');
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
      successTimerRef.current = window.setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (err: any) => setError(err?.response?.data?.message || 'Gagal menambah pembayaran'),
  });

  useEffect(() => {
    return () => {
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    };
  }, []);

  const invoice = detailQuery.data;

  const totalPaid = useMemo(() => getInvoicePaidAmount(invoice as any), [invoice]);
  const totalInvoice = useMemo(() => getInvoiceTotalAmount(invoice as any), [invoice]);
  const outstanding = useMemo(() => getInvoiceOutstandingAmount(invoice as any), [invoice]);
  const isFullyPaid = outstanding <= 0 && totalInvoice > 0;
  const canTakePayment = canManageFinance && invoice && !['CANCELLED', 'DRAFT'].includes(invoice.status) && outstanding > 0;
  const isCancelled = invoice?.status === 'CANCELLED';
  const isDraft = invoice?.status === 'DRAFT';
  const isOpenInvoice = invoice && !['PAID', 'CANCELLED'].includes(invoice.status);
  const isOverdue = invoice && ['ISSUED', 'PARTIAL'].includes(invoice.status) && isPastDue(invoice.dueDate);

  const assistantItems: AssistantItem[] = invoice ? [
    isOverdue ? {
      id: 'invoice-overdue',
      severity: 'BLOCKER',
      title: 'Tagihan ini sudah melewati jatuh tempo',
      message: 'Follow-up tenant atau catat pembayaran agar checkout dan cashflow tidak ikut macet.',
      source: 'Finance',
      actionLabel: canTakePayment ? 'Catat Pembayaran' : undefined,
      onAction: canTakePayment ? () => setShowPaymentModal(true) : undefined,
    } : null,
    isOpenInvoice && !isOverdue ? {
      id: 'invoice-open',
      severity: isDraft ? 'MEDIUM' : 'HIGH',
      title: isDraft ? 'Draft belum terlihat tenant' : 'Masih ada sisa tagihan',
      message: isDraft ? 'Terbitkan tagihan setelah rincian benar agar tenant bisa melihatnya.' : 'Tagihan terbuka akan menjadi blocker saat final checkout sampai dilunasi atau dibatalkan.',
      source: 'Business rule',
      actionLabel: canTakePayment && !isDraft ? 'Catat Pembayaran' : undefined,
      onAction: canTakePayment && !isDraft ? () => setShowPaymentModal(true) : undefined,
    } : null,
    isFullyPaid ? {
      id: 'invoice-paid',
      severity: 'SUCCESS',
      title: 'Tagihan sudah lunas',
      message: 'Invoice ini tidak lagi menjadi blocker untuk proses checkout.',
      source: 'Finance',
    } : null,
  ].filter(Boolean) as AssistantItem[] : [];

  const metrics: MetricChip[] = invoice ? [
    { id: 'total', label: 'Total Tagihan', value: <CurrencyDisplay amount={totalInvoice} /> as any, helper: invoice.invoiceNumber || `INV-${invoice.id}`, icon: '🧾', status: invoice.status },
    { id: 'paid', label: 'Sudah Dibayar', value: <CurrencyDisplay amount={totalPaid} /> as any, helper: `${invoice.payments?.length ?? 0} pembayaran tercatat`, icon: '💳', status: totalPaid > 0 ? 'SUCCESS' : 'INFO' },
    { id: 'remaining', label: 'Sisa Tagihan', value: <CurrencyDisplay amount={outstanding} /> as any, helper: isOpenInvoice ? 'Harus selesai sebelum checkout final' : 'Tidak ada sisa', icon: '⚖️', status: outstanding > 0 ? 'WARNING' : 'SUCCESS' },
    { id: 'due', label: 'Jatuh Tempo', value: formatDateSafe(invoice.dueDate), helper: isOverdue ? 'Sudah overdue' : 'Tanggal follow-up', icon: '⏰', status: isOverdue ? 'DANGER' : 'INFO' },
  ] : [];

  const timelineSteps: TimelineStep[] = invoice ? [
    { id: 'draft', label: 'Draft tagihan', description: 'Rincian dibuat dan belum tenant-facing.', status: invoice.status === 'DRAFT' ? 'active' : 'done' },
    { id: 'issued', label: 'Tagihan diterbitkan', description: 'Tenant dapat melihat dan membayar tagihan.', status: invoice.status === 'DRAFT' ? 'pending' : ['CANCELLED'].includes(invoice.status) ? 'blocked' : 'done' },
    { id: 'payment', label: 'Pembayaran berjalan', description: 'Pembayaran bisa penuh atau sebagian.', status: invoice.status === 'PARTIAL' ? 'active' : invoice.status === 'PAID' ? 'done' : invoice.status === 'CANCELLED' ? 'blocked' : 'pending' },
    { id: 'closed', label: invoice.status === 'CANCELLED' ? 'Dibatalkan' : 'Selesai', description: invoice.status === 'PAID' ? 'Tagihan lunas dan tidak memblokir checkout.' : 'Menunggu pelunasan atau pembatalan.', status: invoice.status === 'PAID' ? 'done' : invoice.status === 'CANCELLED' ? 'blocked' : 'pending' },
  ] : [];

  const handlePrint = () => {
    window.print();
  };
  const paymentAmount = Number(paymentForm.amountRupiah) || 0;
  const isOverpay = paymentAmount > outstanding;
  const paymentPreview = paymentAmount > 0
    ? isOverpay
      ? { label: 'Melebihi sisa tagihan', variant: 'danger' }
      : paymentAmount === outstanding
        ? { label: 'Akan lunas', variant: 'success' }
        : { label: 'Bayar sebagian', variant: 'warning' }
    : null;

  const tenantName = invoice?.stay?.tenant?.fullName;
  const roomInfo = invoice?.stay?.room
    ? `${invoice.stay.room.code}${invoice.stay.room.name ? ` · ${invoice.stay.room.name}` : ''}`
    : null;

  const setQuickPayment = (amount: number) => {
    setPaymentForm((prev) => ({ ...prev, amountRupiah: String(Math.max(amount, 0)) }));
  };

  return (
    <div>
      <PageHeader
        title={`Detail Tagihan #${id}`}
        description="Kelola rincian tagihan, progress pembayaran, dan blocker checkout dari satu tempat."
        actionLabel="Kembali"
        onAction={() => navigate('/invoices')}
      />
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
      {detailQuery.isError ? <Alert variant="danger">Gagal mengambil detail tagihan.</Alert> : null}

      {invoice ? (
        <>
          <AssistantPanel
            title="Asisten Tagihan"
            subtitle="Membaca status pembayaran, jatuh tempo, dan dampaknya ke proses checkout."
            items={assistantItems}
            emptyTitle="Tagihan aman"
            emptyMessage="Tidak ada blocker besar pada tagihan ini."
          />

          <CompactMetrics metrics={metrics} />

          {isOpenInvoice ? (
            <BlockedReasonCard
              title="Tagihan ini masih bisa memblokir final checkout"
              reason="Business rule aktif: checkout final hanya boleh dilakukan jika semua tagihan masa sewa sudah PAID atau CANCELLED. DRAFT juga dihitung sebagai tagihan terbuka."
              actionLabel={canTakePayment && !isDraft ? 'Catat Pembayaran' : undefined}
              actionTo={undefined}
              variant={isOverdue ? 'DANGER' : 'WARNING'}
            />
          ) : null}

          <LifecycleTimeline
            title="Lifecycle Tagihan"
            subtitle="Alur dari draft sampai lunas/dibatalkan, supaya dampak bisnisnya terlihat."
            steps={timelineSteps}
          />
          <Row className="g-4 mb-4">
            <Col lg={8}>
              <Card className="detail-hero border-0 h-100">
                <Card.Body>
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <div className="page-eyebrow">Ringkasan tagihan</div>
                      <h4 className="mb-1">{invoice.invoiceNumber || `INV-${invoice.id}`}</h4>
                      <div className="text-muted small">
                        {tenantName || `Stay #${invoice.stayId}`}
                        {roomInfo ? ` · ${roomInfo}` : ''}
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <StatusBadge status={invoice.status} />
                      {isFullyPaid ? <StatusBadge status="PAID" customLabel="Sudah lunas" /> : null}
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
                  <div className="panel-title mb-2">Aksi cepat pembayaran</div>
                  <div className="panel-subtitle mb-3">Supaya tim finance tidak perlu menghitung manual setiap kali menerima transfer.</div>

                  <div className="d-grid gap-2">
                    <Button variant="outline-primary" onClick={() => { setQuickPayment(outstanding); setShowPaymentModal(true); }} disabled={!canTakePayment}>
                      Bayar penuh sesuai sisa tagihan
                    </Button>
                    <Button variant="outline-secondary" onClick={() => { setQuickPayment(Math.floor(outstanding / 2)); setShowPaymentModal(true); }} disabled={!canTakePayment || outstanding <= 1}>
                      Isi nominal setengah sisa
                    </Button>
                    <Button variant="primary" onClick={() => setShowPaymentModal(true)} disabled={!canTakePayment}>
                      Catat pembayaran manual
                    </Button>
                  </div>

                  {!canTakePayment ? (
                    <div className="small text-muted mt-3">
                      {!canManageFinance
                        ? 'Pencatatan pembayaran dilakukan oleh admin.'
                        : invoice.status === 'DRAFT'
                          ? 'Tagihan masih disiapkan. Terbitkan tagihan dulu sebelum menerima pembayaran.'
                          : invoice.status === 'CANCELLED'
                            ? 'Invoice dibatalkan sehingga tidak bisa menerima pembayaran.'
                            : 'Invoice ini sudah lunas.'}
                    </div>
                  ) : null}

                  <hr className="my-3" />
                  <div className="panel-title mb-2">Cetak Invoice</div>
                  <div className="panel-subtitle mb-3">
                    {isCancelled
                      ? 'Invoice yang dibatalkan tidak dapat dicetak.'
                      : 'Cetak invoice atau kwitansi untuk arsip.'}
                  </div>
                  <Button
                    variant="outline-secondary"
                    className="w-100"
                    onClick={handlePrint}
                    disabled={isCancelled}
                  >
                    🖨️ Cetak
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-4">
            <Col lg={7}>
              <Card className="content-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <div className="panel-title">Rincian Tagihan</div>
                      <div className="panel-subtitle">Pastikan komponen tagihan benar sebelum invoice di-issue atau dibayar.</div>
                    </div>
                    {canManageFinance && !showAddLine && invoice.status === 'DRAFT' ? (
                      <Button size="sm" variant="outline-primary" onClick={() => setShowAddLine(true)}>
                        Tambah Rincian
                      </Button>
                    ) : null}
                  </div>

                  {showAddLine ? (
                    <Card className="mb-3 bg-light border">
                      <Card.Body>
                        <h6 className="mb-3">Tambah Rincian Baru</h6>
                        <Row className="g-3">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Tipe</Form.Label>
                              <Form.Select value={lineForm.lineType} onChange={(e) => setLineForm((prev) => ({ ...prev, lineType: e.target.value }))}>
                                {Object.entries(lineTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Satuan</Form.Label>
                              <Form.Control value={lineForm.unit} onChange={(e) => setLineForm((prev) => ({ ...prev, unit: e.target.value }))} placeholder="bulan, kWh, m3, dll" />
                            </Form.Group>
                          </Col>
                          <Col md={12}>
                            <Form.Group>
                              <Form.Label>Deskripsi</Form.Label>
                              <Form.Control value={lineForm.description} onChange={(e) => setLineForm((prev) => ({ ...prev, description: e.target.value }))} />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Kuantitas</Form.Label>
                              <Form.Control value={lineForm.qty} onChange={(e) => setLineForm((prev) => ({ ...prev, qty: e.target.value }))} />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label>Harga Satuan</Form.Label>
                              <Form.Control type="number" value={lineForm.unitPriceRupiah} onChange={(e) => setLineForm((prev) => ({ ...prev, unitPriceRupiah: e.target.value }))} />
                            </Form.Group>
                          </Col>
                        </Row>
                        <div className="d-flex gap-2">
                          <Button size="sm" onClick={() => addLineMutation.mutate()} disabled={addLineMutation.isPending || !lineForm.description || !lineForm.unitPriceRupiah}>
                            {addLineMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                          </Button>
                          <Button size="sm" variant="outline-secondary" onClick={() => setShowAddLine(false)}>
                            Batal
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  ) : null}

                  {!invoice.lines?.length ? (
                    <EmptyState icon="🧾" title="Belum ada rincian tagihan" description="Tambahkan setidaknya satu rincian sebelum tagihan diterbitkan." />
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
                        {invoice.lines.map((line: any) => (
                          <tr key={line.id}>
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
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <div className="panel-title">Riwayat Pembayaran</div>
                      <div className="panel-subtitle">Semua pembayaran yang sudah dicatat ke invoice ini.</div>
                    </div>
                    {canTakePayment ? (
                      <Button size="sm" variant="primary" onClick={() => setShowPaymentModal(true)}>
                        Catat Pembayaran
                      </Button>
                    ) : null}
                  </div>

                  {!invoice.payments?.length ? (
                    <EmptyState icon="💳" title="Belum ada pembayaran tercatat" description="Saat tenant membayar, catat nominal dan metode pembayaran dari panel ini." />
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
        </>
      ) : null}

      {/* ========== PRINT LAYOUT (hidden until print) ========== */}
      {invoice ? (
        <div className="print-only">
          <InvoicePrintLayout data={invoice} />
        </div>
      ) : null}

      <Modal show={showPaymentModal && canManageFinance} onHide={() => setShowPaymentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Catat Pembayaran</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="secondary" className="small">
            Simpel: isi tanggal, nominal, dan metode pembayaran. Sistem akan menyesuaikan status tagihan sesuai total pembayaran yang masuk.
          </Alert>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Tanggal</Form.Label>
              <Form.Control type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentDate: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Nominal</Form.Label>
              <InputGroup>
                <InputGroup.Text>Rp</InputGroup.Text>
                <Form.Control
                  type="number"
                  value={paymentForm.amountRupiah}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, amountRupiah: e.target.value }))}
                  isInvalid={isOverpay}
                />
                {paymentPreview ? (
                  <InputGroup.Text>
                    <Badge bg={paymentPreview.variant}>{paymentPreview.label}</Badge>
                  </InputGroup.Text>
                ) : null}
              </InputGroup>
              <div className="d-flex flex-wrap gap-2 mt-2">
                <Button size="sm" variant="outline-secondary" onClick={() => setQuickPayment(outstanding)}>
                  Isi sisa tagihan penuh
                </Button>
                {outstanding > 1 ? (
                  <Button size="sm" variant="outline-secondary" onClick={() => setQuickPayment(Math.floor(outstanding / 2))}>
                    Isi setengah sisa
                  </Button>
                ) : null}
              </div>
              {isOverpay ? (
                <Form.Text className="text-danger">Nominal melebihi sisa tagihan.</Form.Text>
              ) : (
                <Form.Text className="text-muted">Sisa tagihan saat ini: </Form.Text>
              )}
              {!isOverpay ? <div className="small mt-1"><CurrencyDisplay amount={outstanding} /></div> : null}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Metode</Form.Label>
              <Form.Select value={paymentForm.method} onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}>
                {Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Referensi</Form.Label>
              <Form.Control value={paymentForm.referenceNo} onChange={(e) => setPaymentForm((prev) => ({ ...prev, referenceNo: e.target.value }))} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Catatan</Form.Label>
              <Form.Control as="textarea" rows={3} value={paymentForm.note} onChange={(e) => setPaymentForm((prev) => ({ ...prev, note: e.target.value }))} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={() => addPaymentMutation.mutate()}
            disabled={addPaymentMutation.isPending || isOverpay || !paymentForm.amountRupiah || !paymentForm.paymentDate}
          >
            {addPaymentMutation.isPending ? 'Menyimpan...' : 'Simpan Pembayaran'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
