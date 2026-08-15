// FILE: AssistTenantPage.tsx — "Selesaikan atas nama tenant" untuk tenant gagap teknologi.
// OWNER/ADMIN menyelesaikan 3 aksi dalam SATU layar (tanpa lompat 3 menu):
//   1) Catat meter listrik otomatis (baca counter Tuya) → terbitkan tagihan meter
//   2) Catat pembayaran tunai untuk tiap tagihan terbuka
//   3) Tutup tagihan (tagihan menjadi LUNAS)
import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import { listStays } from '../../api/stays';
import { issueInvoice } from '../../api/invoices';
import { createPayment } from '../../api/payments';
import { recordMeterCycle, type MeterCycleResult } from '../../api/meterReadings';
import { fetchPublicConfig } from '../../api/settings';
import { useInvoices } from '../../hooks/useInvoices';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { getInvoiceOutstandingAmount, getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import type { Invoice, Stay } from '../../types';

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function isOpen(invoice: Invoice): boolean {
  return !['PAID', 'CANCELLED'].includes(invoice.status);
}

export default function AssistTenantPage() {
  const queryClient = useQueryClient();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [selectedStayId, setSelectedStayId] = useState<number | null>(null);
  const [meterNote, setMeterNote] = useState('');
  const [meterResult, setMeterResult] = useState<MeterCycleResult | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<number | null>(null);
  const [issuingInvoiceId, setIssuingInvoiceId] = useState<number | null>(null);

  const activeStaysQuery = useQuery({
    queryKey: ['stays', 'assist-active'],
    queryFn: () => listStays({ status: 'ACTIVE', page: 1, limit: 200 }),
  });
  const activeStays = activeStaysQuery.data?.items ?? [];

  const selectedStay: Stay | undefined = useMemo(
    () => activeStays.find((stay) => stay.id === selectedStayId),
    [activeStays, selectedStayId],
  );

  const publicConfigQuery = useQuery({ queryKey: ['public-config'], queryFn: fetchPublicConfig });
  const waterEnabled = Boolean(publicConfigQuery.data?.waterMeteringEnabled);
  const freeKwh = publicConfigQuery.data?.freeElectricityKwhPerMonth ?? 30;

  const invoicesQuery = useInvoices(selectedStayId ?? undefined, selectedStayId !== null);
  const invoices = invoicesQuery.data?.items ?? [];

  const openInvoices = useMemo(() => invoices.filter(isOpen), [invoices]);
  const totalOutstanding = useMemo(
    () => openInvoices.reduce((sum, invoice) => sum + getInvoiceOutstandingAmount(invoice), 0),
    [openInvoices],
  );

  const meterMutation = useMutation({
    mutationFn: () => recordMeterCycle({
      roomId: Number(selectedStay?.roomId),
      readingAt: today,
      autoElectricity: true,
      note: meterNote.trim() || undefined,
    }),
    onSuccess: (data) => {
      setMeterResult(data);
      setMeterNote('');
      queryClient.invalidateQueries({ queryKey: ['meter-readings'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['stay', selectedStayId, 'invoices'] });
      queryClient.invalidateQueries({ queryKey: ['stays'] });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      const outstanding = getInvoiceOutstandingAmount(invoice);
      await createPayment({
        invoiceId: invoice.id,
        paymentDate: today,
        amountRupiah: outstanding,
        method: 'CASH',
        note: 'Dibayar tunai atas nama tenant (bypass)',
      });
      return invoice.id;
    },
    onSuccess: (invoiceId) => {
      setPayingInvoiceId(null);
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['stay', selectedStayId, 'invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['stays'] });
    },
    onError: () => setPayingInvoiceId(null),
  });

  const issueMutation = useMutation({
    mutationFn: (invoiceId: number) => issueInvoice(invoiceId),
    onSuccess: () => {
      setIssuingInvoiceId(null);
      queryClient.invalidateQueries({ queryKey: ['stay', selectedStayId, 'invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['stays'] });
    },
    onError: () => setIssuingInvoiceId(null),
  });

  const resetForStay = (stayId: number) => {
    setSelectedStayId(stayId);
    setMeterResult(null);
    setMeterNote('');
    setPayingInvoiceId(null);
    setIssuingInvoiceId(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Bantu Penghuni"
        title="Selesaikan atas Nama Tenant"
        description="Untuk tenant yang gagap teknologi: catat meter otomatis, terima pembayaran tunai, dan tutup tagihan dalam satu layar — tanpa berpindah menu."
      />

      {/* Langkah 0 — pilih tenant */}
      <Card className="content-card border-0 mb-3">
        <Card.Body>
          <h5 className="mb-2">1. Pilih Penghuni</h5>
          <div className="text-muted mb-3">Pilih masa sewa aktif yang ingin kamu selesaikan atas namanya.</div>
          {activeStaysQuery.isLoading ? (
            <div className="py-3 text-center"><Spinner animation="border" size="sm" /> Memuat penghuni aktif...</div>
          ) : activeStaysQuery.isError ? (
            <Alert variant="danger">Gagal memuat daftar masa sewa aktif.</Alert>
          ) : activeStays.length === 0 ? (
            <Alert variant="secondary">Tidak ada masa sewa aktif saat ini.</Alert>
          ) : (
            <Form.Select
              value={selectedStayId ?? ''}
              onChange={(e) => resetForStay(Number(e.currentTarget.value))}
              aria-label="Pilih penghuni aktif"
            >
              <option value="" disabled>— Pilih penghuni aktif —</option>
              {activeStays.map((stay) => (
                <option key={stay.id} value={stay.id}>
                  {stay.tenant?.fullName ?? `Penghuni #${stay.tenantId}`} · Kamar {stay.room?.code ?? stay.roomId} · s/d {formatDate(stay.plannedCheckOutDate)}
                </option>
              ))}
            </Form.Select>
          )}
        </Card.Body>
      </Card>

      {selectedStay ? (
        <>
          {/* Info tenant terpilih */}
          <Card className="content-card border-0 mb-3">
            <Card.Body>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <div className="fw-semibold fs-5">{selectedStay.tenant?.fullName ?? `Penghuni #${selectedStay.tenantId}`}</div>
                  <div className="text-muted">
                    Kamar {selectedStay.room?.code ?? selectedStay.roomId} · Check-in {formatDate(selectedStay.checkInDate)} · Akhir sewa {formatDate(selectedStay.plannedCheckOutDate)}
                  </div>
                </div>
                <StatusBadge status={selectedStay.status} />
              </div>
            </Card.Body>
          </Card>

          {/* Langkah 2 — catat meter otomatis */}
          <Card className="content-card border-0 mb-3">
            <Card.Body>
              <h5 className="mb-2">2. Catat Meter Listrik (Otomatis)</h5>
              <div className="text-muted mb-3">
                Sistem membaca total kWh kumulatif dari meter Tuya, lalu menerbitkan tagihan listrik otomatis (jatah gratis {freeKwh} kWh/bulan).
                {waterEnabled ? ' Air ikut dicatat bila diaktifkan di Pengaturan.' : ''}
              </div>
              {meterResult ? (
                <Alert variant={meterResult.invoice ? 'success' : 'secondary'}>
                  {meterResult.invoice ? (
                    <>
                      <div className="fw-semibold">Tagihan meter terbit: {meterResult.invoice.invoiceNumber}</div>
                      <div>Total {formatRupiahLike(meterResult.invoice.totalAmountRupiah)} · {meterResult.invoice.status}</div>
                    </>
                  ) : (
                    <div>{meterResult.message}</div>
                  )}
                  <div className="small text-muted mt-1">
                    Listrik terpakai {meterResult.summary.elecUsage} kWh (ditagih {meterResult.summary.elecChargeable} kWh)
                    {waterEnabled && meterResult.summary.waterUsage !== undefined ? `, air ${meterResult.summary.waterUsage} m³ (ditagih ${meterResult.summary.waterChargeable} m³)` : ''}.
                  </div>
                </Alert>
              ) : (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Catatan (opsional)</Form.Label>
                    <Form.Control as="textarea" rows={2} value={meterNote} onChange={(e) => setMeterNote(e.currentTarget.value)} placeholder="Contoh: dicatat bersama tenant" />
                  </Form.Group>
                  {meterMutation.isError ? <Alert variant="danger" className="py-2">{getApiErrorMessage(meterMutation.error, 'Gagal membaca meter otomatis')}</Alert> : null}
                  <Button
                    variant="primary"
                    onClick={() => meterMutation.mutate()}
                    disabled={meterMutation.isPending}
                  >
                    {meterMutation.isPending ? (<><Spinner size="sm" className="me-2" />Membaca meter & menerbitkan tagihan...</>) : '🔄 Baca Meter Otomatis & Terbitkan Tagihan'}
                  </Button>
                </>
              )}
            </Card.Body>
          </Card>

          {/* Langkah 3 — catat pembayaran tunai / tutup tagihan */}
          <Card className="content-card border-0 mb-3">
            <Card.Body>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div>
                  <h5 className="mb-1">3. Tutup Tagihan (Terima Tunai)</h5>
                  <div className="text-muted">Catat pembayaran tunai sebesar sisa tagihan. Tagihan otomatis berstatus LUNAS.</div>
                </div>
                <Badge bg={totalOutstanding > 0 ? 'warning' : 'success'} text={totalOutstanding > 0 ? 'dark' : 'white'}>
                  Sisa total {totalOutstanding > 0 ? <CurrencyDisplay amount={totalOutstanding} /> : 'Rp 0'}
                </Badge>
              </div>

              {paymentMutation.isError ? <Alert variant="danger" className="py-2">{getApiErrorMessage(paymentMutation.error, 'Gagal mencatat pembayaran')}</Alert> : null}
              {invoicesQuery.isLoading ? (
                <div className="py-4 text-center"><Spinner /></div>
              ) : invoicesQuery.isError ? (
                <Alert variant="danger">Gagal memuat tagihan masa sewa ini.</Alert>
              ) : openInvoices.length === 0 ? (
                <Alert variant="success">
                  ✅ Tidak ada tagihan terbuka. Semua tagihan masa sewa ini sudah lunas atau dibatalkan.
                </Alert>
              ) : (
                <Table hover responsive className="responsive-data-table mb-0">
                  <thead>
                    <tr>
                      <th>Tagihan</th>
                      <th>Jatuh Tempo</th>
                      <th>Total</th>
                      <th>Sisa</th>
                      <th>Status</th>
                      <th style={{ width: 220 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openInvoices.map((invoice) => {
                      const outstanding = getInvoiceOutstandingAmount(invoice);
                      const isDraft = invoice.status === 'DRAFT';
                      return (
                        <tr key={invoice.id}>
                          <td data-label="Tagihan">
                            <div className="fw-semibold">{invoice.invoiceNumber || `INV-${invoice.id}`}</div>
                            <div className="small text-muted">{formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}</div>
                          </td>
                          <td data-label="Jatuh Tempo">{formatDate(invoice.dueDate)}</td>
                          <td data-label="Total"><CurrencyDisplay amount={getInvoiceTotalAmount(invoice)} /></td>
                          <td data-label="Sisa">
                            <span className={outstanding > 0 ? 'fw-semibold' : 'text-muted'}><CurrencyDisplay amount={outstanding} /></span>
                          </td>
                          <td data-label="Status">
                            <StatusBadge status={invoice.status} customLabel={getStatusLabel(invoice.status, undefined, { domain: 'invoice' })} domain="invoice" />
                          </td>
                          <td data-label="Aksi">
                            {isDraft ? (
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() => { setIssuingInvoiceId(invoice.id); issueMutation.mutate(invoice.id); }}
                                disabled={issueMutation.isPending}
                              >
                                {issueMutation.isPending && issuingInvoiceId === invoice.id ? 'Menerbitkan...' : 'Terbitkan'}
                              </Button>
                            ) : outstanding > 0 ? (
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => { setPayingInvoiceId(invoice.id); paymentMutation.mutate(invoice); }}
                                disabled={paymentMutation.isPending}
                              >
                                {paymentMutation.isPending && payingInvoiceId === invoice.id ? (
                                  <><Spinner size="sm" className="me-2" />Menyimpan...</>
                                ) : (
                                  <>💵 Catat Tunai <CurrencyDisplay amount={outstanding} /></>
                                )}
                              </Button>
                            ) : (
                              <span className="text-muted small">Sudah lunas</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      ) : null}
    </div>
  );
}

// Format Rupiah untuk angka sederhana (total tagihan meter) tanpa import tambahan.
function formatRupiahLike(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
}
