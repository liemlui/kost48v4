import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { getResource } from '../../api/resources';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import InvoicePrintLayout from '../../components/reports/InvoicePrintLayout';
import type { InvoicePrintData } from '../../components/reports/InvoicePrintLayout';
import { formatDateSafe } from '../resources/simpleCrudHelpers';

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
    </div>
  );
}