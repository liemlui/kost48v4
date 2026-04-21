import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import AddMeterReadingModal from './AddMeterReadingModal';
import { MeterReading, MeterRow, Stay } from '../../types';

function numeric(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildRows(readings: MeterReading[]): MeterRow[] {
  const sorted = [...readings].sort((a, b) => new Date(a.readingAt).getTime() - new Date(b.readingAt).getTime());
  const grouped = new Map<string, MeterRow>();

  sorted.forEach((reading) => {
    const dateKey = String(reading.readingAt).slice(0, 10);
    const row = grouped.get(dateKey) ?? { dateKey, readingAt: reading.readingAt };
    if (reading.utilityType === 'ELECTRICITY') row.electricityKwh = numeric(reading.readingValue);
    if (reading.utilityType === 'WATER') row.waterM3 = numeric(reading.readingValue);
    grouped.set(dateKey, row);
  });

  const rows = Array.from(grouped.values()).sort((a, b) => new Date(a.readingAt).getTime() - new Date(b.readingAt).getTime());
  let prevElectricity: number | null = null;
  let prevWater: number | null = null;

  return rows.map((row, index) => {
    const next = { ...row };
    if (typeof next.electricityKwh === 'number') {
      next.usageElectricityKwh = index === 0 || prevElectricity === null ? 0 : next.electricityKwh - prevElectricity;
      prevElectricity = next.electricityKwh;
    }
    if (typeof next.waterM3 === 'number') {
      next.usageWaterM3 = index === 0 || prevWater === null ? 0 : next.waterM3 - prevWater;
      prevWater = next.waterM3;
    }
    return next;
  });
}

/**
 * Memisahkan meter readings menjadi dua kategori:
 * 1. Sejak Check-in Stay Ini (readingAt >= checkInDate)
 * 2. Riwayat Kamar Sebelumnya (readingAt < checkInDate)
 */
function categorizeReadings(readings: MeterReading[], checkInDate?: string) {
  if (!checkInDate) {
    return { sinceCheckIn: readings, beforeCheckIn: [] as MeterReading[] };
  }

  const checkIn = new Date(checkInDate);
  if (Number.isNaN(checkIn.getTime())) {
    return { sinceCheckIn: readings, beforeCheckIn: [] as MeterReading[] };
  }
  checkIn.setHours(0, 0, 0, 0);

  const sinceCheckIn: MeterReading[] = [];
  const beforeCheckIn: MeterReading[] = [];

  readings.forEach((reading) => {
    const readingDate = new Date(reading.readingAt);
    readingDate.setHours(0, 0, 0, 0);

    if (readingDate >= checkIn) {
      sinceCheckIn.push(reading);
    } else {
      beforeCheckIn.push(reading);
    }
  });

  return { sinceCheckIn, beforeCheckIn };
}

export default function MeterTab({
  stay,
  readings,
  isLoading,
  isError,
}: {
  stay: Stay;
  readings?: MeterReading[];
  isLoading: boolean;
  isError: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  
  // Kategorikan readings menjadi "sejak check-in" dan "sebelum check-in"
  const { sinceCheckIn, beforeCheckIn } = useMemo(() => 
    categorizeReadings(readings ?? [], stay.checkInDate), 
    [readings, stay.checkInDate]
  );
  
  // Buat rows untuk masing-masing kategori
  const sinceCheckInRows = useMemo(() => buildRows(sinceCheckIn), [sinceCheckIn]);
  const beforeCheckInRows = useMemo(() => buildRows(beforeCheckIn), [beforeCheckIn]);

  const initialMeter = useMemo(() => {
    if (!sinceCheckInRows.length) return { electricity: 0, water: 0, date: '-' };
    const firstRow = sinceCheckInRows[0];
    return {
      electricity: firstRow.electricityKwh || 0,
      water: firstRow.waterM3 || 0,
      date: firstRow.dateKey,
    };
  }, [sinceCheckInRows]);
  
  // Hitung total pemakaian hanya untuk periode sejak check-in
  const totalUsageSinceCheckIn = useMemo(() => {
    return sinceCheckInRows.reduce((acc, row) => ({
      electricity: acc.electricity + (row.usageElectricityKwh || 0),
      water: acc.water + (row.usageWaterM3 || 0),
    }), { electricity: 0, water: 0 });
  }, [sinceCheckInRows]);

  // Dapatkan meter terbaru dari periode sejak check-in
  const latestMeter = useMemo(() => {
    if (!sinceCheckInRows.length) return null;
    const lastRow = sinceCheckInRows[sinceCheckInRows.length - 1];
    return {
      electricity: lastRow.electricityKwh || 0,
      water: lastRow.waterM3 || 0,
      date: lastRow.dateKey,
    };
  }, [sinceCheckInRows]);

  return (
    <Card className="content-card">
      <Card.Body>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div>
            <h5 className="mb-1">Riwayat Meter</h5>
            <div className="text-muted">Pencatatan listrik dan air untuk stay ini.</div>
          </div>
          <Button onClick={() => setShowModal(true)} variant="primary">
            + Catat Meter Terbaru
          </Button>
        </div>

        {/* Informasi Ringkasan */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <Card className="border">
              <Card.Body className="py-3">
                <div className="text-muted small">Meter Awal Check-in ({initialMeter.date})</div>
                <div className="d-flex justify-content-between">
                  <div>
                    <div className="fw-semibold">Listrik</div>
                    <div>{initialMeter.electricity.toFixed(3)} kWh</div>
                  </div>
                  <div>
                    <div className="fw-semibold">Air</div>
                    <div>{initialMeter.water.toFixed(3)} m³</div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
          
          {latestMeter && (
            <div className="col-md-4">
              <Card className="border">
                <Card.Body className="py-3">
                  <div className="text-muted small">Meter Terbaru ({latestMeter.date})</div>
                  <div className="d-flex justify-content-between">
                    <div>
                      <div className="fw-semibold">Listrik</div>
                      <div>{latestMeter.electricity} kWh</div>
                    </div>
                    <div>
                      <div className="fw-semibold">Air</div>
                      <div>{latestMeter.water} m³</div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          )}
          
          <div className="col-md-4">
            <Card className="border">
              <Card.Body className="py-3">
                <div className="text-muted small">Total Pemakaian (Sejak Check-in)</div>
                <div className="d-flex justify-content-between">
                  <div>
                    <div className="fw-semibold">Listrik</div>
                    <div>{totalUsageSinceCheckIn.electricity.toFixed(3)} kWh</div>
                  </div>
                  <div>
                    <div className="fw-semibold">Air</div>
                    <div>{totalUsageSinceCheckIn.water.toFixed(3)} m³</div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>

        {/* Loading, Error, Empty States */}
        {isLoading ? (
          <div className="py-5 text-center">
            <Spinner />
            <div className="mt-2 text-muted">Memuat data meter...</div>
          </div>
        ) : null}
        
        {isError ? (
          <Alert variant="danger">
            <div className="fw-semibold">Gagal mengambil data meter</div>
            <div className="small">Coba refresh halaman atau hubungi administrator.</div>
          </Alert>
        ) : null}
        
        {!isLoading && !isError && sinceCheckInRows.length === 0 && beforeCheckInRows.length === 0 ? (
          <Alert variant="secondary" className="text-center py-4">
            <div className="fw-semibold mb-2">Belum ada pencatatan meter</div>
            <div className="small mb-3">Klik "Catat Meter Terbaru" untuk menambahkan pencatatan pertama.</div>
            <Button onClick={() => setShowModal(true)} size="sm">
              Tambah Pencatatan Pertama
            </Button>
          </Alert>
        ) : null}

        {/* Section: Sejak Check-in Stay Ini */}
        {!isLoading && !isError && sinceCheckInRows.length > 0 ? (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="mb-0">Sejak Check-in Stay Ini</h6>
                <div className="text-muted small">
                  Pencatatan meter sejak tenant check-in pada {stay.checkInDate ? new Date(stay.checkInDate).toLocaleDateString('id-ID') : '-'}
                </div>
              </div>
              <div className="text-muted small">
                Total: {totalUsageSinceCheckIn.electricity.toFixed(3)} kWh listrik · {totalUsageSinceCheckIn.water.toFixed(3)} m³ air
              </div>
            </div>
            
            <div className="table-responsive mb-4">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Tanggal</th>
                    <th>Listrik (kWh)</th>
                    <th>Air (m³)</th>
                    <th>Pemakaian Listrik</th>
                    <th>Pemakaian Air</th>
                  </tr>
                </thead>
                <tbody>
                  {sinceCheckInRows.map((row) => (
                    <tr key={row.dateKey}>
                      <td className="fw-semibold">{row.dateKey}</td>
                      <td>{row.electricityKwh?.toFixed(3) ?? '-'}</td>
                      <td>{row.waterM3?.toFixed(3) ?? '-'}</td>
                      <td>
                        {row.usageElectricityKwh !== undefined ? (
                          <Badge bg={row.usageElectricityKwh > 0 ? 'info' : 'light'} text={row.usageElectricityKwh > 0 ? 'white' : 'dark'}>
                            {row.usageElectricityKwh.toFixed(3)} kWh
                          </Badge>
                        ) : '-'}
                      </td>
                      <td>
                        {row.usageWaterM3 !== undefined ? (
                          <Badge bg={row.usageWaterM3 > 0 ? 'success' : 'light'} text={row.usageWaterM3 > 0 ? 'white' : 'dark'}>
                            {row.usageWaterM3.toFixed(3)} m³
                          </Badge>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        ) : null}

        {/* Section: Riwayat Kamar Sebelumnya */}
        {!isLoading && !isError && beforeCheckInRows.length > 0 ? (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="mb-0">Riwayat Kamar Sebelumnya</h6>
                <div className="text-muted small">
                  Pencatatan meter sebelum tenant check-in (history kamar)
                </div>
              </div>
              <div className="text-muted small">
                {beforeCheckInRows.length} pencatatan
              </div>
            </div>
            
            <div className="table-responsive">
              <Table hover className="mb-0" size="sm">
                <thead className="table-light">
                  <tr>
                    <th>Tanggal</th>
                    <th>Listrik (kWh)</th>
                    <th>Air (m³)</th>
                    <th>Pemakaian Listrik</th>
                    <th>Pemakaian Air</th>
                  </tr>
                </thead>
                <tbody>
                  {beforeCheckInRows.map((row) => (
                    <tr key={row.dateKey}>
                      <td className="fw-semibold">{row.dateKey}</td>
                      <td>{row.electricityKwh?.toFixed(3) ?? '-'}</td>
                      <td>{row.waterM3?.toFixed(3) ?? '-'}</td>
                      <td>
                        {row.usageElectricityKwh !== undefined ? (
                          <Badge bg="light" text="dark">
                            {row.usageElectricityKwh.toFixed(3)} kWh
                          </Badge>
                        ) : '-'}
                      </td>
                      <td>
                        {row.usageWaterM3 !== undefined ? (
                          <Badge bg="light" text="dark">
                            {row.usageWaterM3.toFixed(3)} m³
                          </Badge>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        ) : null}
      </Card.Body>

      <AddMeterReadingModal
        show={showModal}
        onHide={() => setShowModal(false)}
        stay={stay}
        readings={readings ?? []}
      />
    </Card>
  );
}
