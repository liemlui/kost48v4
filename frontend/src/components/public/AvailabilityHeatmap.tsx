import { useMemo, useState } from 'react';
import { Badge, Button, Card, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getAvailabilityCalendar } from '../../api/bookings';
import { estimateVacancy } from '../../utils/vacancyEstimate';

/**
 * Heatmap ketersediaan kamar (W-OWN-019) — mobile-first.
 * Satu baris per kamar, blok warna per hari, ketuk baris → detail kamar.
 * Tidak pernah menampilkan nama penghuni.
 */

type DayStatus = 'KOSONG' | 'HUNI' | 'BOOKING_DP' | 'MAINTENANCE' | 'PERPANJANG';

type HeatRoom = {
  id: number;
  code: string;
  status: string;
  checkInDate?: string | null;
  plannedCheckOutDate?: string | null;
  remainingDays?: number | null;
  hasPendingRenew?: boolean | null;
  renewStatus?: string | null;
  days: Record<string, DayStatus>;
};

type HeatData = { from: string; to: string; dates: string[]; rooms: HeatRoom[] };

const DAY_LABEL: Record<DayStatus, string> = {
  KOSONG: 'Kosong',
  HUNI: 'Terisi',
  BOOKING_DP: 'Booking DP',
  MAINTENANCE: 'Perbaikan',
  PERPANJANG: 'Perpanjangan',
};

function localYMD(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function buildDates(days: number, offset: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offset * days);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return localYMD(date);
  });
}

function shortDate(iso: string) {
  const [, month, day] = iso.split('-').map(Number);
  return `${day}/${month}`;
}

function statusTone(status: string) {
  const key = String(status).toUpperCase();
  if (key === 'AVAILABLE') return { bg: 'success', text: undefined, label: 'Kosong' };
  if (key === 'MAINTENANCE') return { bg: 'warning', text: 'dark', label: 'Perbaikan' };
  if (key === 'RESERVED') return { bg: 'info', text: 'dark', label: 'Booking' };
  return { bg: 'secondary', text: undefined, label: 'Terisi' };
}

export default function AvailabilityHeatmap({ days = 14 }: { days?: number }) {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const dates = useMemo(() => buildDates(days, offset), [days, offset]);

  const query = useQuery({
    queryKey: ['availability-heatmap', dates[0], dates[dates.length - 1]],
    queryFn: () => getAvailabilityCalendar({ from: dates[0], to: dates[dates.length - 1] }),
    staleTime: 60_000,
  });

  const rooms = ((query.data as unknown as HeatData | undefined)?.rooms ?? []).slice().sort((a, b) =>
    String(a.code).localeCompare(String(b.code), 'id', { numeric: true }),
  );

  const todayKey = dates[0];
  const counts = rooms.reduce(
    (acc, room) => {
      const status = room.days?.[todayKey] ?? 'HUNI';
      if (status === 'KOSONG') acc.kosong += 1;
      else if (status === 'BOOKING_DP') acc.booking += 1;
      else if (status === 'MAINTENANCE') acc.perbaikan += 1;
      else acc.terisi += 1;
      return acc;
    },
    { kosong: 0, terisi: 0, booking: 0, perbaikan: 0 },
  );

  return (
    <Card className="rm-heatmap border-0 mb-3">
      <Card.Body>
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
          <div>
            <h2 className="h6 mb-1">Ketersediaan {days} hari</h2>
            <div className="text-muted small">
              {shortDate(dates[0])}–{shortDate(dates[dates.length - 1])} ·{' '}
              <strong className="text-success">{counts.kosong} kosong</strong> · {counts.terisi} terisi
              {counts.booking ? ` · ${counts.booking} booking` : ''}
              {counts.perbaikan ? ` · ${counts.perbaikan} perbaikan` : ''}
            </div>
          </div>
          <div className="d-flex gap-1">
            <Button size="sm" variant="outline-secondary" onClick={() => setOffset(offset - 1)} aria-label="Periode sebelumnya">‹</Button>
            <Button size="sm" variant="outline-secondary" onClick={() => setOffset(0)} disabled={offset === 0}>Hari ini</Button>
            <Button size="sm" variant="outline-secondary" onClick={() => setOffset(offset + 1)} aria-label="Periode berikutnya">›</Button>
          </div>
        </div>

        <div className="rm-heatmap-legend mb-2">
          {(Object.keys(DAY_LABEL) as DayStatus[]).map((status) => (
            <span key={status} className={`rm-heatmap-legend-item is-${status.toLowerCase()}`}>
              <i aria-hidden="true" /> {DAY_LABEL[status]}
            </span>
          ))}
        </div>

        {query.isLoading ? (
          <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
        ) : null}
        {query.isError ? (
          <div className="text-muted small py-2">Ketersediaan belum dapat dimuat. Coba muat ulang halaman.</div>
        ) : null}

        <div className="rm-heatmap-table" role="table" aria-label="Ketersediaan kamar per hari">
          {rooms.map((room) => {
            const today = room.days?.[todayKey] ?? 'HUNI';
            const tone = statusTone(room.status);
            const estimate = estimateVacancy({
              status: room.status,
              checkInDate: room.checkInDate,
              plannedCheckOutDate: room.plannedCheckOutDate,
              remainingDays: room.remainingDays,
              hasPendingRenew: room.hasPendingRenew,
              renewStatus: room.renewStatus,
            });
            return (
              <button
                key={room.id}
                type="button"
                className="rm-heatmap-row"
                onClick={() => navigate(`/rooms/${room.id}/detail`)}
                aria-label={`Kamar ${room.code}, ${tone.label}${today === 'KOSONG' ? ', siap dihuni' : `, ${estimate.label.toLowerCase()}`}`}
              >
                <span className="rm-heatmap-room">
                  <strong>{room.code}</strong>
                  <Badge bg={tone.bg} text={tone.text} className="rm-heatmap-badge">{tone.label}</Badge>
                  {today !== 'KOSONG' ? (
                    <span className={`rm-heatmap-vacancy is-${estimate.status.toLowerCase()}`} title={estimate.note}>
                      {estimate.label}
                    </span>
                  ) : (
                    <span className="rm-heatmap-vacancy is-kosong">Siap huni</span>
                  )}
                </span>
                <span className="rm-heatmap-days">
                  {dates.map((date) => {
                    const status = room.days?.[date] ?? 'HUNI';
                    return (
                      <i
                        key={date}
                        className={`rm-heatmap-day is-${status.toLowerCase()}`}
                        title={`${shortDate(date)}: ${DAY_LABEL[status] ?? status}`}
                      />
                    );
                  })}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-muted small mb-0 mt-2">
          “Cenderung kosong” = perkiraan dari tanggal kontrak dan lama tinggal (penghuni baru lebih sering pindah), bukan janji.
          Ketuk baris kamar untuk melihat detail.
        </p>
      </Card.Body>
    </Card>
  );
}
