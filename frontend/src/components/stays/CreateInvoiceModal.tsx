import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { listResource } from '../../api/resources';
import { getMeterReadingsByRoom } from '../../api/meterReadings';
import { getStayInvoiceSuggestion } from '../../api/stays';
import { useInvoices } from '../../hooks/useInvoices';
import type { InvoiceSuggestionItem, MeterReading, Stay, WifiSale } from '../../types';
import CurrencyDisplay from '../common/CurrencyDisplay';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isPeriodEndAfterStart(periodStart: string, periodEnd: string) {
  return new Date(`${periodEnd}T00:00:00.000Z`).getTime() > new Date(`${periodStart}T00:00:00.000Z`).getTime();
}

function buildInvoiceNumber(stay: Stay) {
  return `INV-STAY-${stay.id}-${Date.now()}`;
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function latestPair(readings: MeterReading[], utilityType: 'ELECTRICITY' | 'WATER') {
  return readings
    .filter((item) => item.utilityType === utilityType)
    .sort((a, b) => new Date(a.readingAt).getTime() - new Date(b.readingAt).getTime())
    .slice(-2);
}

function buildFallbackSuggestion(stay: Stay, readings: MeterReading[]) {
  const items: InvoiceSuggestionItem[] = [];

  if (stay.agreedRentAmountRupiah) {
    items.push({
      lineType: 'RENT',
      description: 'Sewa',
      qty: 1,
      unit: 'bulan',
      unitPriceRupiah: Number(stay.agreedRentAmountRupiah),
    });
  }

  const electricity = latestPair(readings, 'ELECTRICITY');
  const water = latestPair(readings, 'WATER');

  if (electricity.length === 2 && stay.electricityTariffPerKwhRupiah) {
    const usage = toNumber(electricity[1].readingValue) - toNumber(electricity[0].readingValue);
    if (usage > 0) {
      items.push({
        lineType: 'ELECTRICITY',
        description: `Listrik (${usage} kWh)`,
        qty: usage,
        unit: 'kWh',
        unitPriceRupiah: Number(stay.electricityTariffPerKwhRupiah),
      });
    }
  }

  if (water.length === 2 && stay.waterTariffPerM3Rupiah) {
    const usage = toNumber(water[1].readingValue) - toNumber(water[0].readingValue);
    if (usage > 0) {
      items.push({
        lineType: 'WATER',
        description: `Air (${usage} m³)`,
        qty: usage,
        unit: 'm³',
        unitPriceRupiah: Number(stay.waterTariffPerM3Rupiah),
      });
    }
  }

  return items;
}


const invoiceLineTypeOptions = [
  { value: 'RENT', label: 'Sewa' },
  { value: 'ELECTRICITY', label: 'Listrik' },
  { value: 'WATER', label: 'Air' },
  { value: 'PENALTY', label: 'Denda' },
  { value: 'DISCOUNT', label: 'Diskon' },
  { value: 'WIFI', label: 'WiFi' },
  { value: 'OTHER', label: 'Lainnya' },
];

function buildWifiItem(sale: WifiSale): InvoiceSuggestionItem {
  return {
    lineType: 'WIFI',
    description: `WiFi ${sale.packageName ?? 'Paket'}${sale.saleDate ? ` (${sale.saleDate.slice(0, 10)})` : ''}`,
    qty: 1,
    unit: 'paket',
    unitPriceRupiah: Number(sale.soldPriceRupiah ?? 0),
  };
}

export default function CreateInvoiceModal({
  show,
  onHide,
  stay,
  onAccountingNotice,
}: {
  show: boolean;
  onHide: () => void;
  stay: Stay;
  onAccountingNotice?: (message: string) => void;
}) {
  const [periodStart, setPeriodStart] = useState(today());
  const [periodEnd, setPeriodEnd] = useState(addDaysIso(today(), 1));
  const [dueDate, setDueDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceSuggestionItem[]>([]);
  const [error, setError] = useState('');
  const [fallbackInfo, setFallbackInfo] = useState('');
  const [selectedWifiSaleId, setSelectedWifiSaleId] = useState('');
  const { createMutation, createAndIssueMutation, addLineMutation, issueMutation } = useInvoices(stay.id, false);

  useEffect(() => {
    if (!show) return;
    const start = today();
    setPeriodStart(start);
    setPeriodEnd(addDaysIso(start, 1));
    setDueDate(start);
    setNotes('');
    setError('');
    setSelectedWifiSaleId('');
  }, [show, stay.id]);

  const suggestionQuery = useQuery({
    queryKey: ['stay', stay.id, 'invoice-suggestion'],
    enabled: show,
    queryFn: async () => {
      try {
        const suggestion = await getStayInvoiceSuggestion(stay.id);
        setFallbackInfo('');
        return suggestion;
      } catch {
        const readings = await getMeterReadingsByRoom(stay.roomId);
        const fallbackItems = buildFallbackSuggestion(stay, readings);
        setFallbackInfo(
          fallbackItems.length
            ? 'Saran tagihan otomatis belum tersedia. Sistem memakai data meter dan tarif sewa yang ada.'
            : 'Saran tagihan otomatis belum tersedia dan data meter belum cukup. Anda tetap dapat menambah item manual.'
        );
        return fallbackItems;
      }
    },
  });

  const wifiSalesQuery = useQuery({
    queryKey: ['stay', stay.id, 'wifi-sales'],
    enabled: show,
    queryFn: async () => {
      const direct = await listResource<WifiSale>('/wifi-sales', { tenantId: stay.tenantId, stayId: stay.id, limit: 50 }).catch(() => ({ items: [] }));
      if (direct.items?.length) return direct.items;
      const fallback = await listResource<WifiSale>('/wifi-sales', {
        search: stay.tenant?.fullName ?? '',
        limit: 20,
      }).catch(() => ({ items: [] }));
      return fallback.items ?? [];
    },
  });

  useEffect(() => {
    if (show && suggestionQuery.data) {
      setItems(suggestionQuery.data.length ? suggestionQuery.data : buildFallbackSuggestion(stay, []));
    }
  }, [show, suggestionQuery.data, stay]);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unitPriceRupiah || 0), 0),
    [items],
  );

  const handlePeriodStartChange = (value: string) => {
    setPeriodStart(value);
    if (!isPeriodEndAfterStart(value, periodEnd)) {
      setPeriodEnd(addDaysIso(value, 1));
    }
  };

  const handleItemChange = (index: number, key: keyof InvoiceSuggestionItem, value: string | number) => {
    setItems((prev) => prev.map((item, currentIndex) => (currentIndex === index ? { ...item, [key]: value } : item)));
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { lineType: 'OTHER', description: '', qty: 1, unit: 'item', unitPriceRupiah: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleAddWifiSale = () => {
    const sale = (wifiSalesQuery.data ?? []).find((item) => String(item.id) === selectedWifiSaleId);
    if (!sale) return;
    const wifiItem = buildWifiItem(sale);
    const alreadyExists = items.some((item) => item.lineType === 'WIFI' && item.description === wifiItem.description);
    if (alreadyExists) {
      setError('Penjualan WiFi ini sudah ditambahkan ke tagihan.');
      return;
    }
    setItems((prev) => [...prev, wifiItem]);
    setSelectedWifiSaleId('');
    setError('');
  };

  const handleClose = () => {
    setError('');
    onHide();
  };

  const handleSubmit = async () => {
    setError('');
    if (!isPeriodEndAfterStart(periodStart, periodEnd)) {
      setError('Tanggal akhir periode harus setelah tanggal mulai periode.');
      return;
    }
    try {
      const result = await createAndIssueMutation.mutateAsync({
        stayId: stay.id,
        invoiceNumber: buildInvoiceNumber(stay),
        periodStart,
        periodEnd,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        lines: items.map((item, index) => ({
          lineType: item.lineType,
          description: item.description,
          qty: String(Number(item.qty)),
          unit: item.unit || undefined,
          unitPriceRupiah: Number(item.unitPriceRupiah),
          sortOrder: index,
        })),
      });
      if (result.accounting?.accountingWarning) {
        onAccountingNotice?.(result.accounting.accountingWarning);
      }
      handleClose();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message ?? 'Gagal membuat tagihan')
        : 'Gagal membuat tagihan';
      setError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="xl" fullscreen="lg-down">
      <Modal.Header closeButton>
        <Modal.Title>Buat Tagihan Baru</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error ? <Alert variant="danger">{error}</Alert> : null}
        {fallbackInfo ? <Alert variant="warning">{fallbackInfo}</Alert> : null}
        {suggestionQuery.isLoading ? <div className="py-4 text-center"><Spinner /></div> : null}
        {!suggestionQuery.isLoading && !items.length ? <Alert variant="secondary">Belum ada item saran otomatis. Anda tetap bisa menambah item manual di bawah.</Alert> : null}

        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <Form.Group>
              <Form.Label>Awal Periode</Form.Label>
              <Form.Control type="date" value={periodStart} onChange={(event) => handlePeriodStartChange(event.target.value)} />
            </Form.Group>
          </div>
          <div className="col-md-4">
            <Form.Group>
              <Form.Label>Akhir Periode</Form.Label>
              <Form.Control type="date" value={periodEnd} min={addDaysIso(periodStart, 1)} onChange={(event) => setPeriodEnd(event.target.value)} />
            </Form.Group>
          </div>
          <div className="col-md-4">
            <Form.Group>
              <Form.Label>Jatuh Tempo</Form.Label>
              <Form.Control type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </Form.Group>
          </div>
        </div>

        {!isPeriodEndAfterStart(periodStart, periodEnd) ? (
          <Alert variant="warning">Tanggal akhir periode harus setelah tanggal mulai periode. Tagihan 0 hari tidak boleh diterbitkan.</Alert>
        ) : null}

        <Alert variant="light">
          <div className="fw-semibold mb-2">Ambil dari Penjualan WiFi</div>
          {(wifiSalesQuery.data ?? []).length ? (
            <div className="d-flex flex-wrap gap-2 align-items-end">
              <Form.Group className="flex-grow-1">
                <Form.Label className="small text-muted mb-1">Pilih penjualan WiFi terkait penghuni atau masa sewa ini</Form.Label>
                <Form.Select value={selectedWifiSaleId} onChange={(event) => setSelectedWifiSaleId(event.target.value)}>
                  <option value="">Pilih penjualan WiFi</option>
                  {(wifiSalesQuery.data ?? []).map((sale) => (
                    <option key={sale.id} value={sale.id}>
                      {(sale.packageName ?? 'Paket WiFi')} · Rp {Number(sale.soldPriceRupiah ?? 0).toLocaleString('id-ID')} · {sale.customerName ?? 'Customer'}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Button variant="outline-primary" onClick={handleAddWifiSale} disabled={!selectedWifiSaleId}>
                Tambahkan ke Tagihan
              </Button>
            </div>
          ) : (
            <div className="text-muted">Belum ada penjualan WiFi yang terkait dengan penghuni atau masa sewa ini.</div>
          )}
        </Alert>

        <div className="invoice-line-editor mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="fw-semibold">Rincian Tagihan</div>
            <div className="small text-muted">Setiap item disimpan sebagai baris tagihan saat diterbitkan.</div>
          </div>
          {items.map((item, index) => (
            <div className="border rounded-4 p-3 mb-3 bg-white shadow-sm" key={`${item.lineType}-${index}`}>
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <div className="small text-uppercase text-muted fw-semibold">Item {index + 1}</div>
                  <div className="fw-semibold"><CurrencyDisplay amount={Number(item.qty || 0) * Number(item.unitPriceRupiah || 0)} /></div>
                </div>
                <Button size="sm" variant="outline-danger" onClick={() => handleRemoveItem(index)}>Hapus</Button>
              </div>
              <div className="row g-3 align-items-end">
                <div className="col-lg-2 col-md-4">
                  <Form.Group>
                    <Form.Label className="small text-muted">Tipe</Form.Label>
                    <Form.Select value={item.lineType} onChange={(event) => handleItemChange(index, 'lineType', event.target.value)}>
                      {invoiceLineTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </div>
                <div className="col-lg-4 col-md-8">
                  <Form.Group>
                    <Form.Label className="small text-muted">Deskripsi</Form.Label>
                    <Form.Control value={item.description} onChange={(event) => handleItemChange(index, 'description', event.target.value)} placeholder="Contoh: Sewa kamar bulan Juni" />
                  </Form.Group>
                </div>
                <div className="col-lg-2 col-md-4 col-6">
                  <Form.Group>
                    <Form.Label className="small text-muted">Qty</Form.Label>
                    <Form.Control type="number" min="0" value={item.qty} onChange={(event) => handleItemChange(index, 'qty', Number(event.target.value))} />
                  </Form.Group>
                </div>
                <div className="col-lg-2 col-md-4 col-6">
                  <Form.Group>
                    <Form.Label className="small text-muted">Unit</Form.Label>
                    <Form.Control value={item.unit || ''} onChange={(event) => handleItemChange(index, 'unit', event.target.value)} placeholder="bulan" />
                  </Form.Group>
                </div>
                <div className="col-lg-2 col-md-4">
                  <Form.Group>
                    <Form.Label className="small text-muted">Harga Satuan</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={item.unitPriceRupiah}
                      onChange={(event) => handleItemChange(index, 'unitPriceRupiah', Number(event.target.value))}
                    />
                  </Form.Group>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <Button variant="outline-primary" onClick={handleAddItem}>+ Tambah Item</Button>
          <div className="fw-semibold">Total sementara: <CurrencyDisplay amount={totalAmount} /></div>
        </div>

        <Form.Group>
          <Form.Label>Catatan</Form.Label>
          <Form.Control as="textarea" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Batal</Button>
        <Button onClick={handleSubmit} disabled={createAndIssueMutation.isPending || createMutation.isPending || addLineMutation.isPending || issueMutation.isPending || !items.length || !isPeriodEndAfterStart(periodStart, periodEnd)}>
          {createAndIssueMutation.isPending || createMutation.isPending || addLineMutation.isPending || issueMutation.isPending
            ? <><Spinner size="sm" className="me-2" />Membuat dan menerbitkan tagihan...</>
            : 'Simpan & Terbitkan Tagihan'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
