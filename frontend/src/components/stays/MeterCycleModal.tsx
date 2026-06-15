import { useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recordMeterCycle, type MeterCycleResult } from '../../api/meterReadings';
import { fetchOperationalSettings } from '../../api/settings';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import type { Stay } from '../../types';

/**
 * M-2: catat satu siklus meter (listrik + air) sekaligus, lalu auto-terbitkan tagihan
 * meter. OWNER/ADMIN. Pemakaian dihitung dari catatan terakhir, dikurangi jatah gratis.
 */
export default function MeterCycleModal({ show, onHide, stay, onDone }: { show: boolean; onHide: () => void; stay: Stay; onDone?: () => void }) {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ['operational-settings'], queryFn: fetchOperationalSettings, enabled: show });
  const waterEnabled = Boolean(settings.data?.waterMeteringEnabled);
  const [readingAt, setReadingAt] = useState(new Date().toISOString().slice(0, 10));
  const [elec, setElec] = useState('');
  const [water, setWater] = useState('');
  const [note, setNote] = useState('');
  const [result, setResult] = useState<MeterCycleResult | null>(null);

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
          Sistem menghitung pemakaian sejak catatan terakhir, mengurangi jatah gratis ({settings.data?.freeElectricityKwhPerMonth ?? 30} kWh listrik), lalu menerbitkan tagihan meter otomatis.{' '}
          {waterEnabled ? 'Listrik & air dicatat bersama.' : 'Air belum dihitung (aktifkan di Pengaturan ▸ Tarif & Konstanta).'}
        </Alert>
        {result ? (
          <Alert variant={result.invoice ? 'success' : 'secondary'}>
            {result.invoice ? (
              <>
                <div className="fw-semibold">Tagihan terbit: {result.invoice.invoiceNumber}</div>
                <div>Total Rp {result.invoice.totalAmountRupiah.toLocaleString('id-ID')} · {result.invoice.status}</div>
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
