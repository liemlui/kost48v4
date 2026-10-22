import { useMemo, useState } from 'react';
import { Badge, Button, Card, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getAvailabilityCalendar } from '../../api/bookings';
import { estimateVacancy } from '../../utils/vacancyEstimate';

/**
 * Heatmap ketersediaan kamar (W-OWN-019) — mobile-first.
 * Satu baris per kamar, blok warna per hari, sumbu tanggal di atas grid,
 * tombol kode kamar → detail kamar. Tidak pernah menampilkan nama penghuni.
 *
 * Audit 22 Okt 2026: sumbu tanggal ditambahkan (sebelumnya kolom tidak
 * berlabel sehingga pengguna tidak tahu blok mana tanggal berapa), semantik
 * tabel diperbaiki (role row/cell — sebelumnya role="table" berisi <button>
 * sehingga axe melaporkan aria-required-children kritis), lama tinggal
 * ditampilkan, dan keadaan memuat/galat/kosong diberi jalan keluar.
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

const DAY_MS = 24 * 60 * 60 * 1000;

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

function dayNumber(iso: string) {
  return iso.split('-')[2];
}

/** "Sudah tinggal N bulan" dari tanggal check-in; null bila datanya tidak ada. */
function tenureLabel(checkInDate?: string | null): string | null {
  if (!checkInDate) return null;
  const start = new Date(`${checkInDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const days = Math.floor((Date.now() - start.getTime()) / DAY_MS);
  if (days < 0) return null;
  const months = Math.floor(days / 30.44);
  if (months < 1) return 'Baru masuk';
  return `Sudah tinggal ${months} bulan`;
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

  const estimates = rooms.map((room) => ({
    room,
    estimate: estimateVacancy({
      status: room.status,
      checkInDate: room.checkInDate,
      plannedCheckOutDate: room.plannedCheckOutDate,
      remainingDays: room.remainingDays,
      hasPendingRenew: room.hasPendingRenew,
      renewStatus: room.renewStatus,
    }),
  }));
  const likelyEmpty = estimates.filter(
    ({ estimate }) => estimate.status === 'CENDERUNG_KOSONG' || estimate.status === 'MUNGKIN',
  ).length;

  const isEmpty = !query.isLoading && !query.isError && rooms.length === 0;

  return (
    <Card className="rm-heatmap border-0 mb-3">
      <Card.Body>
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
          <div>
            <h2 className="h6 mb-1">Ketersediaan {days} hari</h2>
            <div className="text-muted small">
              {shortDate(dates[0])}–{shortDate(dates[dates.length - 1])} · hari {shortDate(dates[0])}:{' '}
              <strong className="text-success">{counts.kosong} kosong</strong> · {counts.terisi} terisi
              {counts.booking ? ` · ${counts.booking} booking` : ''}
              {counts.perbaikan ? ` · ${counts.perbaikan} perbaikan` : ''}
            </div>
            <div className="text-muted small">
              {likelyEmpty} kamar diperkirakan berpeluang kosong dalam {days} hari — perkiraan dari
              tanggal kontrak dan lama tinggal, bukan janji.
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
          <div className="rm-heatmap-state text-muted small" role="status">
            <Spinner animation="border" size="sm" aria-hidden="true" />
            <span>Memuat ketersediaan…</span>
          </div>
        ) : null}

        {query.isError ? (
          <div className="rm-heatmap-state text-center" role="alert">
            <span className="text-muted small">Ketersediaan belum dapat dimuat.</span>
            <Button size="sm" variant="outline-primary" onClick={() => void query.refetch()}>
              Coba lagi
            </Button>
          </div>
        ) : null}

        {isEmpty ? (
          <div className="rm-heatmap-state text-muted small" role="status">
            Belum ada kamar aktif yang bisa ditampilkan untuk periode ini.
          </div>
        ) : null}

        {!query.isLoading && !query.isError && rooms.length > 0 ? (
          <div
            className="rm-heatmap-table"
            role="table"
            tabIndex={0}
            aria-label={`Ketersediaan ${rooms.length} kamar per hari`}
          >
            <div className="rm-heatmap-row is-head" role="row">
              <div className="rm-heatmap-axis-label" role="columnheader">Kamar</div>
              <div className="rm-heatmap-days" role="presentation">
                {dates.map((date, index) => (
                  <span
                    key={date}
                    className={`rm-heatmap-axis${index === 0 ? ' is-today' : ''}${index % 2 === 1 ? ' is-alt' : ''}`}
                    role="columnheader"
                    aria-label={shortDate(date)}
                    title={shortDate(date)}
                  >
                    {dayNumber(date)}
                  </span>
                ))}
              </div>
            </div>

            {estimates.map(({ room, estimate }) => {
              const today = room.days?.[todayKey] ?? 'HUNI';
              const tone = statusTone(room.status);
              const tenure = tenureLabel(room.checkInDate);
              return (
                <div key={room.id} className="rm-heatmap-row" role="row">
                  <div className="rm-heatmap-room" role="rowheader">
                    <button
                      type="button"
                      className="rm-heatmap-open"
                      onClick={() => navigate(`/rooms/${room.id}/detail`)}
                    >
                      {room.code}
                    </button>
                    <Badge bg={tone.bg} text={tone.text} className="rm-heatmap-badge">{tone.label}</Badge>
                    {today !== 'KOSONG' ? (
                      <span className={`rm-heatmap-vacancy is-${estimate.status.toLowerCase()}`} title={estimate.note}>
                        {estimate.label}
                      </span>
                    ) : (
                      <span className="rm-heatmap-vacancy is-kosong">Siap huni</span>
                    )}
                    {tenure ? <span className="rm-heatmap-tenure">{tenure}</span> : null}
                  </div>
                  <div className="rm-heatmap-days" role="presentation">
                    {dates.map((date) => {
                      const status = room.days?.[date] ?? 'HUNI';
                      return (
                        <span
                          key={date}
                          role="cell"
                          className={`rm-heatmap-day is-${status.toLowerCase()}`}
                          aria-label={`${room.code} ${shortDate(date)}: ${DAY_LABEL[status] ?? status}`}
                          title={`${shortDate(date)}: ${DAY_LABEL[status] ?? status}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <p className="text-muted small mb-0 mt-2">
          Semua pita “Kemungkinan kosong” adalah perkiraan dari tanggal kontrak dan lama tinggal
          (penghuni baru lebih sering pindah) — bukan janji, dan bukan angka pasti. Ketuk kode
          kamar untuk melihat detail kamar.
        </p>
      </Card.Body>
    </Card>
  );
}
