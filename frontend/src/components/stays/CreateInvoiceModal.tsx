import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { listResource } from '../../api/resources';
import { getMeterReadingsByRoom } from '../../api/meterReadings';
import { getStayInvoiceSuggestion } from '../../api/stays';
import { useInvoices } from '../../hooks/useInvoices';
import type { InvoiceSuggestionItem, MeterReading, Stay, WifiSale } from '../../types';
import CurrencyDisplay from '../common/CurrencyDisplay';

function today() {
  return new Date().toISOString().slice(0, 10);
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

function buildWifiItem(sale: WifiSale): InvoiceSuggestionItem {
  return {
    lineType: 'WIFI',
    description: `WiFi ${sale.packageName ?? 'Paket'}${sale.saleDate ? ` (${sale.saleDate.slice(0, 10)})` : ''}`,
    qty: 1,
    unit: 'paket',
    unitPriceRupiah: Number(sale.soldPriceRupiah ?? 0),
  };
}

export default function CreateInvoiceModal({ show, onHide, stay }: { show: boolean; onHide: () => void; stay: Stay }) {
  const [periodStart, setPeriodStart] = useState(today());
  const [periodEnd, setPeriodEnd] = useState(today());
  const [dueDate, setDueDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceSuggestionItem[]>([]);
  const [error, setError] = useState('');
  const [fallbackInfo, setFallbackInfo] = useState('');
  const [selectedWifiSaleId, setSelectedWifiSaleId] = useState('');
  const { createMutation, addLineMutation } = useInvoices(stay.id, false);

  useEffect(() => {
    if (!show) return;
    setPeriodStart(today());
    setPeriodEnd(today());
    setDueDate(today());
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
            ? 'Endpoint invoice suggestion belum tersedia. Sistem memakai fallback dari data meter dan tarif stay yang ada.'
            : 'Endpoint invoice suggestion belum tersedia dan data meter belum cukup. Anda tetap dapat menambah item manual.'
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
      setError('Penjualan WiFi ini sudah ditambahkan ke invoice.');
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
    try {
      const invoice = await createMutation.mutateAsync({
        stayId: stay.id,
        invoiceNumber: buildInvoiceNumber(stay),
        periodStart,
        periodEnd,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      });

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        await addLineMutation.mutateAsync({
          invoiceId: invoice.id,
          payload: {
            lineType: item.lineType,
            description: item.description,
            qty: Number(item.qty),
            unit: item.unit || undefined,
            unitPriceRupiah: Number(item.unitPriceRupiah),
            sortOrder: index,
          },
        });
      }

      handleClose();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message ?? 'Gagal membuat invoice')
        : 'Gagal membuat invoice';
      setError(Array.isArray(message) ? message.join(', ') : message);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>Buat Invoice Baru</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error ? <Alert variant="danger">{error}</Alert> : null}
        {fallbackInfo ? <Alert variant="warning">{fallbackInfo}</Alert> : null}
        {suggestionQuery.isLoading ? <div className="py-4 text-center"><Spinner /></div> : null}
        {!suggestionQuery.isLoading && !items.length ? <Alert variant="secondary">Belum ada item saran otomatis. Anda tetap bisa menambah item manual di bawah.</Alert> : null}

        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <Form.Group>
              <Form.Label>Period Start</Form.Label>
              <Form.Control type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
            </Form.Group>
          </div>
          <div className="col-md-4">
            <Form.Group>
              <Form.Label>Period End</Form.Label>
              <Form.Control type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
            </Form.Group>
          </div>
          <div className="col-md-4">
            <Form.Group>
              <Form.Label>Due Date</Form.Label>
              <Form.Control type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </Form.Group>
          </div>
        </div>

        <Alert variant="light">
          <div className="fw-semibold mb-2">Ambil dari Penjualan WiFi</div>
          {(wifiSalesQuery.data ?? []).length ? (
            <div className="d-flex flex-wrap gap-2 align-items-end">
              <Form.Group className="flex-grow-1">
                <Form.Label className="small text-muted mb-1">Pilih penjualan WiFi terkait tenant/stay ini</Form.Label>
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
                Tambahkan ke Invoice
              </Button>
            </div>
          ) : (
            <div className="text-muted">Belum ada data WiFi Sales yang terkait dengan tenant atau stay ini.</div>
          )}
        </Alert>

        <Table hover responsive>
          <thead>
            <tr>
              <th>Tipe</th>
              <th>Deskripsi</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Harga Satuan</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.lineType}-${index}`}>
                <td>
                  <Form.Select value={item.lineType} onChange={(event) => handleItemChange(index, 'lineType', event.target.value)}>
                    {['RENT', 'ELECTRICITY', 'WATER', 'PENALTY', 'DISCOUNT', 'WIFI', 'OTHER'].map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Form.Select>
                </td>
                <td>
                  <Form.Control value={item.description} onChange={(event) => handleItemChange(index, 'description', event.target.value)} />
                </td>
                <td>
                  <Form.Control type="number" value={item.qty} onChange={(event) => handleItemChange(index, 'qty', Number(event.target.value))} />
                </td>
                <td>
                  <Form.Control value={item.unit || ''} onChange={(event) => handleItemChange(index, 'unit', event.target.value)} />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    value={item.unitPriceRupiah}
                    onChange={(event) => handleItemChange(index, 'unitPriceRupiah', Number(event.target.value))}
                  />
                </td>
                <td><CurrencyDisplay amount={Number(item.qty || 0) * Number(item.unitPriceRupiah || 0)} /></td>
                <td><Button size="sm" variant="outline-danger" onClick={() => handleRemoveItem(index)}>Hapus</Button></td>
              </tr>
            ))}
          </tbody>
        </Table>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <Button variant="outline-primary" onClick={handleAddItem}>+ Tambah Item</Button>
          <div className="fw-semibold">Total realtime: <CurrencyDisplay amount={totalAmount} /></div>
        </div>

        <Form.Group>
          <Form.Label>Catatan</Form.Label>
          <Form.Control as="textarea" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Batal</Button>
        <Button onClick={handleSubmit} disabled={createMutation.isPending || addLineMutation.isPending || !items.length}>
          {createMutation.isPending || addLineMutation.isPending ? <><Spinner size="sm" className="me-2" />Menyimpan...</> : 'Simpan Invoice'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
