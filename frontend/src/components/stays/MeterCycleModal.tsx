import { useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recordMeterCycle, type MeterCycleResult } from '../../api/meterReadings';
import { fetchPublicConfig } from '../../api/settings';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { formatRupiah, formatRupiahWithoutSymbol } from '../../utils/formatCurrency';
import type { Stay } from '../../types';

/**
 * M-2: catat satu siklus meter (listrik + air) sekaligus, lalu auto-terbitkan tagihan
 * meter. OWNER/ADMIN. Pemakaian dihitung dari catatan terakhir, dikurangi jatah gratis.
 */
export default function MeterCycleModal({ show, onHide, stay, onDone }: { show: boolean; onHide: () => void; stay: Stay; onDone?: () => void }) {
  const qc = useQueryClient();
  const publicConfig = useQuery({ queryKey: ['public-config'], queryFn: fetchPublicConfig, enabled: show });
  const waterEnabled = Boolean(publicConfig.data?.waterMeteringEnabled);
  const freeKwh = publicConfig.data?.freeElectricityKwhPerMonth ?? 30;
  const elecTariff = Number(stay.room?.electricityTariffPerKwhRupiah ?? stay.electricityTariffPerKwhRupiah ?? 0);
  const waterTariff = Number(stay.room?.waterTariffPerM3Rupiah ?? stay.waterTariffPerM3Rupiah ?? 0);
  const [readingAt, setReadingAt] = useState(new Date().toISOString().slice(0, 10));
  const [elec, setElec] = useState('');
  const [water, setWater] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<MeterCycleResult | null>(null);

  // Estimasi tagihan (live preview)
  const chargeableElec = useMemo(() => {
    const kwh = parseFloat(elec) || 0;
    if (kwh <= freeKwh) return 0;
    return (kwh - freeKwh) * elecTariff;
  }, [elec, freeKwh, elecTariff]);
  const chargeableWater = useMemo(() => {
    if (!waterEnabled) return 0;
    const m3 = parseFloat(water) || 0;
    return m3 * waterTariff;
  }, [water, waterEnabled, waterTariff]);
  const estimatedTotal = chargeableElec + chargeableWater;

  const mut = useMutation({
    mutationFn: () => recordMeterCycle({
      roomId: Number(stay.roomId),
      readingAt,
      electricityReadingValue: elec.trim(),
      waterReadingValue: waterEnabled && water.trim() ? water.trim() : undefined,
      note: note.trim() || undefined,
    }),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ['meter-readings'] });
      qc.invalidateQueries({ queryKey: ['portal-invoices'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      onDone?.();
    },
  });

  const close = () => { setResult(null); setElec(''); setWater(''); setNote(''); mut.reset(); onHide(); };

  return (
    <Modal show={show} onHide={close} centered>
      <Modal.Header closeButton><Modal.Title>Catat Meter & Terbitkan Tagihan</Modal.Title></Modal.Header>
      <Modal.Body>
        <Alert variant="info" className="small">
          Sistem menghitung pemakaian sejak catatan terakhir, mengurangi jatah gratis ({publicConfig.data?.freeElectricityKwhPerMonth ?? 30} kWh listrik), lalu menerbitkan tagihan meter otomatis.{' '}
          {waterEnabled ? 'Listrik & air dicatat bersama.' : 'Air belum dihitung (aktifkan di Pengaturan ▸ Tarif & Konstanta).'}
        </Alert>
        {result ? (
          <Alert variant={result.invoice ? 'success' : 'secondary'}>
            {result.invoice ? (
              <>
                <div className="fw-semibold">Tagihan terbit: {result.invoice.invoiceNumber}</div>
                <div>Total {formatRupiah(result.invoice.totalAmountRupiah)} · {result.invoice.status}</div>
              </>
            ) : (
              <div>{result.message}</div>
            )}
            <div className="small text-muted mt-1">
              Listrik terpakai {result.summary.elecUsage} kWh (ditagih {result.summary.elecChargeable} kWh){waterEnabled ? `, air ${result.summary.waterUsage} m³ (ditagih ${result.summary.waterChargeable} m³)` : ''}.
            </div>
          </Alert>
        ) : (
          <Form>
            <Form.Group className="mb-2">
              <Form.Label>Tanggal catat</Form.Label>
              <Form.Control type="date" value={readingAt} onChange={(e) => setReadingAt(e.currentTarget.value)} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Angka meter listrik (kWh)</Form.Label>
              <Form.Control inputMode="decimal" value={elec} onChange={(e) => setElec(e.currentTarget.value.replace(/[^0-9.]/g, ''))} placeholder="Angka tertera di meter sekarang" />
            </Form.Group>
            {waterEnabled ? (
              <Form.Group className="mb-2">
                <Form.Label>Angka meter air (m³)</Form.Label>
                <Form.Control inputMode="decimal" value={water} onChange={(e) => setWater(e.currentTarget.value.replace(/[^0-9.]/g, ''))} />
              </Form.Group>
            ) : null}
            <Form.Group className="mb-2">
              <Form.Label>Catatan (opsional)</Form.Label>
              <Form.Control as="textarea" rows={2} value={note} onChange={(e) => setNote(e.currentTarget.value)} />
            </Form.Group>
            {mut.isError ? <Alert variant="danger" className="py-2">{getApiErrorMessage(mut.error, 'Gagal memproses meter')}</Alert> : null}
            {/* Estimasi tagihan live (M-3) */}
            {elec.trim() && !result ? (
              <div className="mt-3 p-3 bg-light rounded small">
                <div className="fw-semibold mb-1">Estimasi tagihan</div>
                <div className="d-flex justify-content-between">
                  <span>Listrik: {parseFloat(elec) || 0} kWh</span>
                  <span>{elecTariff > 0 ? `Rp ${formatRupiahWithoutSymbol(elecTariff)}/kWh` : 'gratis'}</span>
                </div>
                {parseFloat(elec) > freeKwh ? (
                  <div className="d-flex justify-content-between text-danger">
                    <span>{`Kena tagih (>${freeKwh} kWh gratis)`}</span>
                    <span>{formatRupiah(chargeableElec)}</span>
                  </div>
                ) : (
                  <div className="text-success">Dalam jatah gratis {freeKwh} kWh ✅</div>
                )}
                {waterEnabled && water.trim() ? (
                  <div className="d-flex justify-content-between mt-1">
                    <span>Air: {parseFloat(water) || 0} m³ × {formatRupiah(waterTariff)}</span>
                    <span>{formatRupiah(chargeableWater)}</span>
                  </div>
                ) : null}
                {estimatedTotal > 0 ? (
                  <hr className="my-1" />
                ) : null}
                {estimatedTotal > 0 ? (
                  <div className="d-flex justify-content-between fw-bold">
                    <span>Estimasi total tagihan</span>
                    <span>{formatRupiah(estimatedTotal)}</span>
                  </div>
                ) : (
                  <div className="text-success mt-1">Tidak ada tagihan tambahan ✅</div>
                )}
              </div>
            ) : null}
          </Form>
        )}
      </Modal.Body>
      <Modal.Footer>
        {result ? (
          <Button onClick={close}>Selesai</Button>
        ) : (
          <>
            <Button variant="light" onClick={close}>Batal</Button>
            <Button onClick={() => mut.mutate()} disabled={mut.isPending || !elec.trim()}>
              {mut.isPending ? (<><Spinner size="sm" className="me-2" />Memproses...</>) : 'Catat & Terbitkan'}
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}
