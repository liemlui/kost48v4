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
import InvoicePrintLayout from '../../components/reports/InvoicePrintLayout';

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

export default function InvoiceDetailPage() {
  const { id } = useParams();
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

  const totalPaid = useMemo(() => {
    if (!invoice?.payments) return 0;
    return invoice.payments.reduce((sum: number, payment: any) => sum + Number(payment.amountRupiah || 0), 0);
  }, [invoice]);

  const totalInvoice = Number(invoice?.totalAmountRupiah ?? 0);
  const outstanding = Math.max(totalInvoice - totalPaid, 0);
  const isFullyPaid = outstanding <= 0 && totalInvoice > 0;
  const canTakePayment = invoice && !['CANCELLED', 'DRAFT'].includes(invoice.status) && outstanding > 0;
  const isCancelled = invoice?.status === 'CANCELLED';

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
        title={`Detail Invoice #${id}`}
        description="Kelola rincian tagihan, progress pembayaran, dan tindak lanjut satu invoice secara fokus."
        actionLabel="Kembali"
        onAction={() => navigate('/invoices')}
      />
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
      {detailQuery.isError ? <Alert variant="danger">Gagal mengambil detail invoice.</Alert> : null}

      {invoice ? (
        <>
          <Row className="g-4 mb-4">
            <Col lg={8}>
              <Card className="detail-hero border-0 h-100">
                <Card.Body>
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                    <div>
                      <div className="page-eyebrow">Ringkasan invoice</div>
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

                  <Alert variant="info" className="mt-3 mb-0">
                    Flow sederhana yang disarankan: pastikan line tagihan sudah benar → issue invoice → catat pembayaran dari panel kanan. Untuk perhitungan otomatis listrik/air dari meter reading, backend idealnya nanti menyiapkan endpoint preview line utilitas per periode.
                  </Alert>
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
                      {invoice.status === 'DRAFT'
                        ? 'Invoice masih draft. Issue invoice terlebih dahulu sebelum menerima pembayaran.'
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
                    {!showAddLine && invoice.status === 'DRAFT' ? (
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
                        <Alert variant="secondary" className="small mt-3 mb-3">
                          Saat ini line utilitas masih diinput manual dari frontend. Backend ideal berikutnya: endpoint hitung draft invoice otomatis dari selisih meter reading dan tarif stay.
                        </Alert>
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
                    <EmptyState icon="🧾" title="Belum ada rincian invoice" description="Tambahkan setidaknya satu line sebelum invoice diterbitkan." />
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

      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Catat Pembayaran</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="secondary" className="small">
            Simpel: isi tanggal, nominal, dan metode pembayaran. Sistem akan menyesuaikan status invoice sesuai total pembayaran yang masuk.
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
