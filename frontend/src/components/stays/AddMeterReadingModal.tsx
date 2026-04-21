import { useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { useMeterReadings } from '../../hooks/useMeterReadings';
import { MeterReading, Stay } from '../../types';

function parseReadingValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function latestValue(readings: MeterReading[], utilityType: 'ELECTRICITY' | 'WATER') {
  const filtered = readings
    .filter((item) => item.utilityType === utilityType)
    .sort((a, b) => new Date(a.readingAt).getTime() - new Date(b.readingAt).getTime());
  return filtered.length ? parseReadingValue(filtered[filtered.length - 1].readingValue) : 0;
}

export default function AddMeterReadingModal({
  show,
  onHide,
  stay,
  readings,
}: {
  show: boolean;
  onHide: () => void;
  stay: Stay;
  readings: MeterReading[];
}) {
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 10));
  const [currentElectricityKwh, setCurrentElectricityKwh] = useState('');
  const [currentWaterM3, setCurrentWaterM3] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saveStage, setSaveStage] = useState<'idle' | 'electricity-saved'>('idle');
  const { createMutation } = useMeterReadings(stay.roomId, false);

  const previousElectricity = useMemo(() => latestValue(readings, 'ELECTRICITY'), [readings]);
  const previousWater = useMemo(() => latestValue(readings, 'WATER'), [readings]);
  const usageElectricity = currentElectricityKwh ? parseReadingValue(currentElectricityKwh) - previousElectricity : 0;
  const usageWater = currentWaterM3 ? parseReadingValue(currentWaterM3) - previousWater : 0;

  const reset = () => {
    setRecordedAt(new Date().toISOString().slice(0, 10));
    setCurrentElectricityKwh('');
    setCurrentWaterM3('');
    setNote('');
    setError('');
    setSaveStage('idle');
  };

  const handleClose = () => {
    reset();
    onHide();
  };

  const handleSubmit = async () => {
    setError('');
    const nextElectricity = parseReadingValue(currentElectricityKwh);
    const nextWater = parseReadingValue(currentWaterM3);

    // Validasi frontend
    if (!currentElectricityKwh.trim() || !currentWaterM3.trim()) {
      setError('Nilai listrik dan air wajib diisi.');
      return;
    }
    if (nextElectricity < previousElectricity) {
      setError(`Nilai listrik (${nextElectricity} kWh) harus lebih besar atau sama dengan nilai sebelumnya (${previousElectricity} kWh).`);
      return;
    }
    if (nextWater < previousWater) {
      setError(`Nilai air (${nextWater} m³) harus lebih besar atau sama dengan nilai sebelumnya (${previousWater} m³).`);
      return;
    }
    if (nextElectricity === 0 && nextWater === 0) {
      setError('Nilai meter tidak boleh 0 untuk kedua utility.');
      return;
    }

    try {
      // Konversi tanggal ke format ISO string (YYYY-MM-DDTHH:mm:ss.sssZ)
      // Gunakan waktu tengah hari di timezone lokal, lalu konversi ke ISO string
      const readingAtISO = new Date(recordedAt + 'T12:00:00').toISOString();
      
      // Simpan listrik terlebih dahulu
      await createMutation.mutateAsync({
        roomId: stay.roomId,
        utilityType: 'ELECTRICITY',
        readingAt: readingAtISO,
        readingValue: String(nextElectricity),
        note: note.trim() || undefined,
      });
      
      // Update stage dan simpan air
      setSaveStage('electricity-saved');
      await createMutation.mutateAsync({
        roomId: stay.roomId,
        utilityType: 'WATER',
        readingAt: readingAtISO,
        readingValue: String(nextWater),
        note: note.trim() || undefined,
      });
      
      handleClose();
    } catch (err: any) {
      const backendMessage = err?.response?.data?.message || 'Gagal menyimpan meter terbaru';
      if (saveStage === 'electricity-saved') {
        setError(`${backendMessage} Catatan listrik sudah tersimpan, tetapi air gagal. Periksa riwayat meter sebelum mencoba lagi.`);
      } else {
        setError(backendMessage);
      }
    }
  };

  const isFormValid = currentElectricityKwh.trim() && currentWaterM3.trim() && 
    parseReadingValue(currentElectricityKwh) >= previousElectricity && 
    parseReadingValue(currentWaterM3) >= previousWater;

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Catat Meter Terbaru</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error ? <Alert variant="danger">{error}</Alert> : null}
        
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <Alert variant="light" className="border h-100">
              <h6 className="mb-2">Meter Sebelumnya</h6>
              <div className="d-flex justify-content-between">
                <div>
                  <div className="text-muted small">Listrik</div>
                  <div className="fw-bold">{previousElectricity} kWh</div>
                </div>
                <div>
                  <div className="text-muted small">Air</div>
                  <div className="fw-bold">{previousWater} m³</div>
                </div>
              </div>
            </Alert>
          </div>
          <div className="col-md-6">
            <Alert variant="info" className="border h-100">
              <h6 className="mb-2">Info Penyimpanan</h6>
              <div className="small">
                Meter disimpan sebagai dua pencatatan terpisah: listrik lalu air. Pastikan kedua nilai valid sebelum menyimpan.
              </div>
            </Alert>
          </div>
        </div>

        <Form.Group className="mb-3">
          <Form.Label>Tanggal Pencatatan</Form.Label>
          <Form.Control 
            type="date" 
            value={recordedAt} 
            onChange={(e) => setRecordedAt(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
          <Form.Text className="text-muted">Tanggal saat pencatatan meter dilakukan</Form.Text>
        </Form.Group>

        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <Form.Group>
              <Form.Label>Listrik Saat Ini (kWh)</Form.Label>
              <Form.Control 
                type="number" 
                step="0.001"
                min={previousElectricity}
                value={currentElectricityKwh} 
                onChange={(e) => setCurrentElectricityKwh(e.target.value)}
                placeholder={`Minimal ${previousElectricity}`}
                isInvalid={Boolean(currentElectricityKwh) && parseReadingValue(currentElectricityKwh) < previousElectricity}
              />
              <Form.Control.Feedback type="invalid">
                Nilai harus ≥ {previousElectricity} kWh
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Pemakaian: {usageElectricity > 0 ? usageElectricity.toFixed(3) : '0'} kWh
              </Form.Text>
            </Form.Group>
          </div>
          <div className="col-md-6">
            <Form.Group>
              <Form.Label>Air Saat Ini (m³)</Form.Label>
              <Form.Control 
                type="number" 
                step="0.001"
                min={previousWater}
                value={currentWaterM3} 
                onChange={(e) => setCurrentWaterM3(e.target.value)}
                placeholder={`Minimal ${previousWater}`}
                isInvalid={Boolean(currentWaterM3) && parseReadingValue(currentWaterM3) < previousWater}
              />
              <Form.Control.Feedback type="invalid">
                Nilai harus ≥ {previousWater} m³
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Pemakaian: {usageWater > 0 ? usageWater.toFixed(3) : '0'} m³
              </Form.Text>
            </Form.Group>
          </div>
        </div>

        <Form.Group>
          <Form.Label>Catatan (Opsional)</Form.Label>
          <Form.Control 
            as="textarea" 
            rows={3} 
            value={note} 
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan tambahan tentang pencatatan meter..."
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Batal</Button>
        <Button 
          onClick={handleSubmit} 
          disabled={createMutation.isPending || !isFormValid}
          variant={isFormValid ? 'primary' : 'secondary'}
        >
          {createMutation.isPending ? (
            <>
              <Spinner size="sm" className="me-2" />
              {saveStage === 'electricity-saved' ? 'Menyimpan air...' : 'Menyimpan listrik...'}
            </>
          ) : 'Simpan Meter'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
