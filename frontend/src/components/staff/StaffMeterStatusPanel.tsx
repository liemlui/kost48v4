import { useMemo } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { listResource } from '../../api/resources';
import type { MeterReading, Room } from '../../types';

type Props = {
  rooms: Room[];
};

interface MeterRow {
  roomId: number;
  roomCode: string;
  tenantName: string | null;
  recorded: boolean;
  lastReadingAt: string | null;
  lastElectricity: string | null;
  lastWater: string | null;
}

function getMonthRange() {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function formatShortDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function StaffMeterStatusPanel({ rooms }: Props) {
  const { from, to } = useMemo(() => getMonthRange(), []);

  const meterQuery = useQuery({
    queryKey: ['staff-meter-status', from, to],
    queryFn: () => listResource<MeterReading>('/meter-readings', { from, to, limit: 200 }),
    staleTime: 120_000,
  });

  const rows = useMemo<MeterRow[]>(() => {
    const readings = meterQuery.data?.items ?? [];
    // Group by roomId
    const byRoom = new Map<number, MeterReading[]>();
    for (const r of readings) {
      const list = byRoom.get(r.roomId) || [];
      list.push(r);
      byRoom.set(r.roomId, list);
    }

    // Build room map
    const roomMap = new Map<number, Room>();
    for (const room of rooms) roomMap.set(room.id, room);

    // Determine tenant from stays (room may have active stay)
    const result: MeterRow[] = [];
    for (const [roomId, roomReadings] of byRoom) {
      const room = roomMap.get(roomId);
      const latest = roomReadings.reduce((a, b) =>
        new Date(a.readingAt) > new Date(b.readingAt) ? a : b,
      );
      const elec = roomReadings
        .filter((r) => String(r.utilityType).toUpperCase() === 'ELECTRICITY')
        .sort((a, b) => new Date(b.readingAt).getTime() - new Date(a.readingAt).getTime())[0];
      const water = roomReadings
        .filter((r) => String(r.utilityType).toUpperCase() === 'WATER')
        .sort((a, b) => new Date(b.readingAt).getTime() - new Date(a.readingAt).getTime())[0];

      result.push({
        roomId,
        roomCode: room?.code ?? `#${roomId}`,
        tenantName: (room as any)?.activeTenantName ?? null,
        recorded: true,
        lastReadingAt: latest.readingAt,
        lastElectricity: elec ? `${elec.readingValue} kWh` : null,
        lastWater: water ? `${water.readingValue} m³` : null,
      });
    }

    // Rooms without readings
    for (const room of rooms) {
      if (!byRoom.has(room.id)) {
        result.push({
          roomId: room.id,
          roomCode: room.code,
          tenantName: (room as any)?.activeTenantName ?? null,
          recorded: false,
          lastReadingAt: null,
          lastElectricity: null,
          lastWater: null,
        });
      }
    }

    // Sort: BELUM dulu, lalu kode kamar
    return result.sort((a, b) => {
      if (a.recorded !== b.recorded) return a.recorded ? 1 : -1;
      return a.roomCode.localeCompare(b.roomCode);
    });
  }, [meterQuery.data, rooms]);

  const total = rows.length;
  const done = rows.filter((r) => r.recorded).length;
  const pending = total - done;

  return (
    <Card className="staff-panel-card border-0 mt-3">
      <Card.Body>
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <div>
            <strong>📊 Status Meter Bulan Ini</strong>
            <span className="text-muted ms-2 small">
              {meterQuery.isLoading
                ? 'Memuat...'
                : `${done}/${total} kamar sudah catat · ${pending} belum`}
            </span>
          </div>
        </div>

        {meterQuery.isLoading ? (
          <div className="text-center py-3">
            <Spinner animation="border" size="sm" /> Memuat data meter...
          </div>
        ) : rows.length === 0 ? (
          <div className="text-muted small py-2">Belum ada data meter bulan ini.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm table-borderless align-middle mb-0 staff-meter-table">
              <thead>
                <tr className="small text-muted">
                  <th>Kamar</th>
                  <th>Penghuni</th>
                  <th className="text-center">Status</th>
                  <th>Listrik</th>
                  <th>Air</th>
                  <th>Terakhir</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.roomId} className={row.recorded ? '' : 'table-warning-subtle'}>
                    <td className="fw-semibold">{row.roomCode}</td>
                    <td className="text-muted small">{row.tenantName || '—'}</td>
                    <td className="text-center">
                      {row.recorded ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle">SUDAH</span>
                      ) : (
                        <span className="badge bg-warning-subtle text-warning border border-warning-subtle">BELUM</span>
                      )}
                    </td>
                    <td className="small">{row.lastElectricity || '—'}</td>
                    <td className="small">{row.lastWater || '—'}</td>
                    <td className="small text-muted">{formatShortDate(row.lastReadingAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
