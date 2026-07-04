import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import AddMeterReadingModal from './AddMeterReadingModal';
import MeterCycleModal from './MeterCycleModal';
import { useAuth } from '../../context/AuthContext';
import { MeterReading, Stay } from '../../types';
import { numeric, buildMeterRows, categorizeReadings } from '../../utils/meterUsage';
import { formatRupiah, formatRupiahWithoutSymbol } from '../../utils/formatCurrency';

function rupiah(value: number) {
  return `{formatRupiah(value)}`;
}

export default function MeterTab({
  stay,
  readings,
  isLoading,
  isError,
  simpleMode = false,
}: {
  stay: Stay;
  readings?: MeterReading[];
  isLoading: boolean;
  isError: boolean;
  simpleMode?: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [showCycle, setShowCycle] = useState(false);
  const { user } = useAuth();
  const canIssue = user?.role === 'OWNER' || user?.role === 'ADMIN';

  // Kategorikan readings menjadi "sejak check-in" dan "sebelum check-in"
  const { sinceCheckIn, beforeCheckIn } = useMemo(() => 
    categorizeReadings(readings ?? [], stay.checkInDate), 
    [readings, stay.checkInDate]
  );
  
  // Buat rows untuk masing-masing kategori
  const sinceCheckInRows = useMemo(() => buildMeterRows(sinceCheckIn), [sinceCheckIn]);
  const beforeCheckInRows = useMemo(() => buildMeterRows(beforeCheckIn), [beforeCheckIn]);

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

  const visibleSinceRows = useMemo(() => (
    simpleMode ? sinceCheckInRows.slice(-5).reverse() : sinceCheckInRows
  ), [simpleMode, sinceCheckInRows]);

  const estimatedUtilityAmount = useMemo(() => {
    const electricityRate = numeric(stay.room?.electricityTariffPerKwhRupiah ?? stay.electricityTariffPerKwhRupiah);
    const waterRate = numeric(stay.room?.waterTariffPerM3Rupiah ?? stay.waterTariffPerM3Rupiah);
    return {
      electricity: totalUsageSinceCheckIn.electricity * electricityRate,
      water: totalUsageSinceCheckIn.water * waterRate,
      electricityRate,
      waterRate,
    };
  }, [stay.room?.electricityTariffPerKwhRupiah, stay.room?.waterTariffPerM3Rupiah, stay.electricityTariffPerKwhRupiah, stay.waterTariffPerM3Rupiah, totalUsageSinceCheckIn]);

  const hasNegativeUsage = sinceCheckInRows.some((row) => numeric(row.usageElectricityKwh) < 0 || numeric(row.usageWaterM3) < 0);

  return (
    <Card className="content-card">
      <Card.Body>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div>
            <h5 className="mb-1">{simpleMode ? 'Catat Meter' : 'Riwayat Meter'}</h5>
            <div className="text-muted">{simpleMode ? 'Cek angka terakhir, lalu catat angka baru bila diminta.' : 'Catatan listrik dan air untuk masa sewa ini.'}</div>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {canIssue ? (
              <Button onClick={() => setShowCycle(true)} variant="primary">
                Catat & Terbitkan Tagihan
              </Button>
            ) : null}
            <Button onClick={() => setShowModal(true)} variant={canIssue ? 'outline-secondary' : 'primary'}>
              + Catat Meter
            </Button>
          </div>
        </div>

        <Alert variant={hasNegativeUsage ? 'danger' : 'info'} className="small">
          <div className="fw-semibold mb-1">Cek meter perpanjangan</div>
          <div>Setiap perpanjangan wajib mencatat meter terbaru. Sistem akan menghitung selisih dari catatan sebelumnya dan memasukkan biaya listrik/air ke tagihan perpanjangan.</div>
          {sinceCheckInRows.length ? (
            <div className="mt-2">Estimasi pemakaian sejak masuk: listrik {totalUsageSinceCheckIn.electricity.toFixed(3)} kWh × {rupiah(estimatedUtilityAmount.electricityRate)} = <strong>{rupiah(estimatedUtilityAmount.electricity)}</strong>; air {totalUsageSinceCheckIn.water.toFixed(3)} m³ × {rupiah(estimatedUtilityAmount.waterRate)} = <strong>{rupiah(estimatedUtilityAmount.water)}</strong>.</div>
          ) : null}
          {hasNegativeUsage ? <div className="mt-2 fw-semibold">Ada angka pemakaian negatif. Cek ulang urutan/angka meter sebelum renew atau checkout.</div> : null}
        </Alert>

        {/* Informasi Ringkasan */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <Card className="border">
              <Card.Body className="py-3">
                <div className="text-muted small">Meter awal masuk ({initialMeter.date})</div>
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
                <div className="text-muted small">Total pemakaian sejak masuk</div>
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
            <div className="fw-semibold">Gagal memuat catatan meter</div>
            <div className="small">Muat ulang halaman. Kalau tetap gagal, laporkan ke admin.</div>
          </Alert>
        ) : null}
        
        {!isLoading && !isError && sinceCheckInRows.length === 0 && (!beforeCheckInRows.length || simpleMode) ? (
          <Alert variant="secondary" className="text-center py-4">
            <div className="fw-semibold mb-2">Belum ada pencatatan meter</div>
            <div className="small mb-3">Klik "Catat Meter" untuk mencatat angka pertama.</div>
            <Button onClick={() => setShowModal(true)} size="sm">
              Catat Meter Pertama
            </Button>
          </Alert>
        ) : null}

        {/* Section: Sejak penghuni masuk */}
        {!isLoading && !isError && sinceCheckInRows.length > 0 ? (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="mb-0">Sejak penghuni masuk</h6>
                <div className="text-muted small">
                  Catatan meter sejak penghuni masuk tanggal {stay.checkInDate ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(stay.checkInDate)) : '-'}
                </div>
              </div>
              <div className="text-muted small">
                Total: {totalUsageSinceCheckIn.electricity.toFixed(3)} kWh listrik · {totalUsageSinceCheckIn.water.toFixed(3)} m³ air
              </div>
            </div>
            
            <div className="table-responsive mb-4">
              <Table hover className="mb-0 responsive-data-table">
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
                  {visibleSinceRows.map((row) => (
                    <tr key={row.dateKey}>
                      <td data-label="Tanggal" className="fw-semibold">{row.dateKey}</td>
                      <td data-label="Listrik (kWh)">{row.electricityKwh?.toFixed(3) ?? '-'}</td>
                      <td data-label="Air (m³)">{row.waterM3?.toFixed(3) ?? '-'}</td>
                      <td data-label="Pemakaian Listrik">
                        {row.usageElectricityKwh !== undefined ? (
                          <Badge bg={row.usageElectricityKwh > 0 ? 'info' : 'light'} text={row.usageElectricityKwh > 0 ? 'white' : 'dark'}>
                            {row.usageElectricityKwh.toFixed(3)} kWh
                          </Badge>
                        ) : '-'}
                      </td>
                      <td data-label="Pemakaian Air">
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

        {/* Section: Catatan kamar sebelumnya */}
        {!simpleMode && !isLoading && !isError && beforeCheckInRows.length > 0 ? (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h6 className="mb-0">Catatan kamar sebelumnya</h6>
                <div className="text-muted small">
                  Catatan meter sebelum penghuni sekarang masuk
                </div>
              </div>
              <div className="text-muted small">
                {beforeCheckInRows.length} pencatatan
              </div>
            </div>
            
            <div className="table-responsive">
              <Table hover className="mb-0 responsive-data-table" size="sm">
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
                      <td data-label="Tanggal" className="fw-semibold">{row.dateKey}</td>
                      <td data-label="Listrik (kWh)">{row.electricityKwh?.toFixed(3) ?? '-'}</td>
                      <td data-label="Air (m³)">{row.waterM3?.toFixed(3) ?? '-'}</td>
                      <td data-label="Pemakaian Listrik">
                        {row.usageElectricityKwh !== undefined ? (
                          <Badge bg="light" text="dark">
                            {row.usageElectricityKwh.toFixed(3)} kWh
                          </Badge>
                        ) : '-'}
                      </td>
                      <td data-label="Pemakaian Air">
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
      {canIssue ? (
        <MeterCycleModal show={showCycle} onHide={() => setShowCycle(false)} stay={stay} />
      ) : null}
    </Card>
  );
}
