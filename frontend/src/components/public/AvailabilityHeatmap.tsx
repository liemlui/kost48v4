import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getAvailabilityCalendar } from '../../api/bookings';
import {
  VACANCY_CHANCE_LABEL,
  VACANCY_NOTE,
  VACANCY_WEIGHT_TABLE,
  estimateVacancyOnDate,
  type VacancyChance,
  type VacancyOnDateEstimate,
} from '../../utils/vacancyEstimate';
import { isVacancyStart } from '../../utils/vacancyCalendar';

/**
 * Kalender ketersediaan kamar (W-OWN-019, dirapikan 23 Okt 2026).
 *
 * Bentuk: KALENDER BULANAN 7 kolom hari. Tiap sel = satu tanggal dan HANYA
 * memuat kamar yang MULAI kosong di tanggal itu (keputusan owner: peristiwa,
 * bukan semua kamar yang kebetulan kosong pada tanggal itu — aturannya di
 * `utils/vacancyCalendar.ts`). Kamar yang sudah kosong sejak sebelumnya tidak
 * diulang tiap hari, jadi sel berisi 0–3 kode kamar, bukan 13 pita warna.
 *
 * Klaim (target `status`.chip_health): sel tanggal hanya memuat kamar yang
 * mulai kosong di tanggal itu — tidak ada pita ganda status huni + peluang.
 *
 * Rumus peluang kosong hidup di `utils/vacancyEstimate.ts`
 * (`estimateVacancyOnDate`) — komponen ini tidak menghitung apa pun sendiri.
 * Nama penghuni tidak pernah tampil di sini.
 */

type DayStatus = 'KOSONG' | 'HUNI' | 'BOOKING_DP' | 'MAINTENANCE' | 'PERPANJANG';

type CalendarRoom = {
  id: number;
  code: string;
  status: string;
  checkInDate?: string | null;
  plannedCheckOutDate?: string | null;
  /** Masa sewa stay aktif (DAILY…YEARLY) — dikirim backend sejak S3. */
  pricingTerm?: string | null;
  remainingDays?: number | null;
  hasPendingRenew?: boolean | null;
  renewStatus?: string | null;
  checkoutRequest?: { status: 'PENDING' | 'APPROVED'; requestedCheckOutDate: string } | null;
  days: Record<string, DayStatus>;
};

type CalendarData = { from: string; to: string; dates: string[]; rooms: CalendarRoom[] };

/** Satu kamar pada satu tanggal. */
type DayItem = { room: CalendarRoom; status: DayStatus; vacancy: VacancyOnDateEstimate };

const DAY_LABEL: Record<DayStatus, string> = {
  KOSONG: 'Kosong',
  HUNI: 'Terisi',
  BOOKING_DP: 'Booking DP',
  MAINTENANCE: 'Perbaikan',
  PERPANJANG: 'Perpanjangan',
};

/** Maksimal kode kamar yang dicetak di satu sel; sisanya "+N". */
const CHIP_LIMIT = 3;

const CHANCE_ORDER: VacancyChance[] = ['TINGGI', 'SEDANG', 'RENDAH', 'BELUM_ADA_INFO'];

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const WEEKDAY_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function localYMD(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseYMD(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

function shortDate(iso: string) {
  const [, month, day] = iso.split('-').map(Number);
  return `${day}/${month}`;
}

/** "Kamis, 23 Oktober 2026" — dipakai aria-label + judul panel. */
function longDate(iso: string) {
  const date = parseYMD(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${WEEKDAY_LONG[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function buildMonth(offset: number) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const dates: string[] = [];
  for (let day = 1; day <= lastDay; day += 1) {
    dates.push(localYMD(new Date(first.getFullYear(), first.getMonth(), day)));
  }
  return {
    from: dates[0],
    to: dates[dates.length - 1],
    dates,
    today: localYMD(now),
    /** 0 = Minggu, mengikuti tampilan kalender Indonesia (Min–Sab). */
    leadingBlanks: first.getDay(),
    label: `${MONTHS[first.getMonth()]} ${first.getFullYear()}`,
  };
}

function statusTone(status: string): { bg: string; text?: string; label: string } {
  const key = String(status).toUpperCase();
  if (key === 'AVAILABLE') return { bg: 'success', label: 'Kosong' };
  if (key === 'MAINTENANCE') return { bg: 'warning', text: 'dark', label: 'Perbaikan' };
  if (key === 'RESERVED') return { bg: 'info', text: 'dark', label: 'Booking' };
  return { bg: 'secondary', label: 'Terisi' };
}

/** Urutkan: peluang terbesar dulu (jawaban langsung pertanyaan owner), lalu kode kamar. */
function sortByChanceThenCode(items: DayItem[]) {
  const rank: Record<VacancyChance, number> = { TINGGI: 0, SEDANG: 1, RENDAH: 2, BELUM_ADA_INFO: 3 };
  return items.sort(
    (a, b) =>
      rank[a.vacancy.chance] - rank[b.vacancy.chance] ||
      String(a.room.code).localeCompare(String(b.room.code), 'id', { numeric: true }),
  );
}

export default function AvailabilityHeatmap() {
  const navigate = useNavigate();
  const [monthOffset, setMonthOffset] = useState(0);
  const month = useMemo(() => buildMonth(monthOffset), [monthOffset]);
  const [focusIso, setFocusIso] = useState<string | null>(null);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const panelRef = useRef<HTMLDivElement | null>(null);
  const returnFocusTo = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ['availability-calendar', month.from, month.to],
    queryFn: () => getAvailabilityCalendar({ from: month.from, to: month.to }),
    staleTime: 60_000,
  });

  const rooms = useMemo(
    () =>
      ((query.data as CalendarData | undefined)?.rooms ?? [])
        .slice()
        .sort((a, b) => String(a.code).localeCompare(String(b.code), 'id', { numeric: true })),
    [query.data],
  );

  /**
   * Satu kumpulan PERISTIWA per tanggal: hanya kamar yang MULAI kosong di tanggal
   * itu (lihat `utils/vacancyCalendar.ts`). Status huni tetap dihitung untuk
   * ringkasan hari ini dan panel rincian.
   */
  const byDate = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    for (const iso of month.dates) {
      const all: DayItem[] = rooms.map((room) => ({
        room,
        status: (room.days?.[iso] ?? 'HUNI') as DayStatus,
        vacancy: estimateVacancyOnDate({ ...room }, iso),
      }));
      map.set(iso, sortByChanceThenCode(all.filter((item) => isVacancyStart(item.vacancy, iso))));
    }
    return map;
  }, [rooms, month.dates]);

  /** Urutan legenda = peluang yang benar-benar muncul di sel bulan ini. */
  const chancesPresent = useMemo(() => {
    const seen = new Set<VacancyChance>();
    for (const items of byDate.values()) for (const item of items) seen.add(item.vacancy.chance);
    return CHANCE_ORDER.filter((chance) => seen.has(chance));
  }, [byDate]);

  /** Status huni hari ini dihitung dari SEMUA kamar (bukan hanya yang mulai kosong). */
  const todayStatusCounts = useMemo(() => {
    const counts: Partial<Record<DayStatus, number>> = {};
    for (const room of rooms) {
      const status = (room.days?.[month.today] ?? 'HUNI') as DayStatus;
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
  }, [rooms, month.today]);

  const todayStarts = byDate.get(month.today) ?? [];

  const cells = useMemo(() => {
    const leading = Array.from({ length: month.leadingBlanks }, () => null) as Array<string | null>;
    const all: Array<string | null> = [...leading, ...month.dates];
    while (all.length % 7 !== 0) all.push(null);
    const weeks: Array<Array<string | null>> = [];
    for (let index = 0; index < all.length; index += 7) weeks.push(all.slice(index, index + 7));
    return weeks;
  }, [month]);

  /** Tanggal yang menerima Tab pertama: hari ini bila ada di bulan ini. */
  const activeIso = useMemo(() => {
    if (focusIso && month.dates.includes(focusIso)) return focusIso;
    if (month.dates.includes(month.today)) return month.today;
    return month.dates[0];
  }, [focusIso, month.dates, month.today]);

  const closePanel = useCallback(() => {
    returnFocusTo.current = selectedIso;
    setSelectedIso(null);
  }, [selectedIso]);

  useEffect(() => {
    if (selectedIso) {
      panelRef.current?.focus();
      return;
    }
    const target = returnFocusTo.current;
    if (target) {
      returnFocusTo.current = null;
      cellRefs.current.get(target)?.focus();
    }
  }, [selectedIso]);

  const moveFocus = (event: React.KeyboardEvent<HTMLButtonElement>, iso: string) => {
    const index = month.dates.indexOf(iso);
    let next = -1;
    if (event.key === 'ArrowRight') next = index + 1;
    else if (event.key === 'ArrowLeft') next = index - 1;
    else if (event.key === 'ArrowDown') next = index + 7;
    else if (event.key === 'ArrowUp') next = index - 7;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = month.dates.length - 1;
    else if (event.key === 'Escape' && selectedIso) {
      event.preventDefault();
      closePanel();
      return;
    }
    if (next < 0 || next >= month.dates.length) return;
    event.preventDefault();
    const target = month.dates[next];
    setFocusIso(target);
    cellRefs.current.get(target)?.focus();
  };

  const describeCell = (iso: string) => {
    const items = byDate.get(iso) ?? [];
    if (!items.length) {
      return `${longDate(iso)}. Tidak ada kamar yang diperkirakan mulai kosong di tanggal ini. Tekan Enter untuk rincian.`;
    }
    const codes = items.map((item) => item.room.code);
    return `${longDate(iso)}. ${codes.length} kamar diperkirakan mulai kosong: ${codes.join(', ')}. Tekan Enter untuk rincian.`;
  };

  const selectedItems = selectedIso ? byDate.get(selectedIso) ?? [] : [];
  const isLoading = query.isLoading;
  const isEmpty = !isLoading && !query.isError && rooms.length === 0;

  return (
    <Card className="rm-heatmap border-0 mb-3">
      <Card.Body>
        <div className="rm-heatmap-head">
          <div>
            <h2 className="rm-heatmap-title">Ketersediaan kamar</h2>
            <div className="rm-heatmap-summary">
              <span className="rm-heatmap-month">{month.label}</span>
              {rooms.length > 0 ? (
                <>
                  {' · hari ini '}
                  {shortDate(month.today)}: {todayStatusCounts.KOSONG ?? 0} kosong ·{' '}
                  {todayStatusCounts.HUNI ?? 0} terisi
                  {todayStatusCounts.BOOKING_DP ? ` · ${todayStatusCounts.BOOKING_DP} booking` : ''}
                  {todayStatusCounts.MAINTENANCE ? ` · ${todayStatusCounts.MAINTENANCE} perbaikan` : ''}
                  {` · ${todayStarts.length} kamar mulai kosong`}
                </>
              ) : null}
            </div>
          </div>
          <div className="rm-heatmap-nav">
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => setMonthOffset((value) => value - 1)}
              aria-label="Bulan sebelumnya"
            >
              ‹
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => setMonthOffset(0)}
              disabled={monthOffset === 0}
            >
              Hari ini
            </Button>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => setMonthOffset((value) => value + 1)}
              aria-label="Bulan berikutnya"
            >
              ›
            </Button>
          </div>
        </div>

        {chancesPresent.length > 0 ? (
          <div className="rm-heatmap-legend-groups">
            <fieldset className="rm-heatmap-legend">
              <legend className="rm-heatmap-legend-title">Peluang kosong</legend>
              <div className="rm-heatmap-legend-items">
                {chancesPresent.map((chance) => (
                  <span key={chance} className={`rm-heatmap-legend-item is-${chance.toLowerCase()}`}>
                    <i aria-hidden="true" /> {VACANCY_CHANCE_LABEL[chance]}
                  </span>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        <p className="rm-heatmap-note">{VACANCY_NOTE}</p>

        {/* Tabel bobot = VACANCY_WEIGHT_TABLE, sumber angka yang sama dengan rumus
            di `utils/vacancyEstimate.ts`. Dibuka lewat <details> supaya kalender
            tetap dekat di layar 390 px, tetapi labelnya selalu terlihat. */}
        <details className="rm-heatmap-weights">
          <summary>Bobot masa sewa pada perkiraan peluang kosong</summary>
          <table>
            <caption>
              Semakin pendek masa sewa, semakin sering kontraknya berakhir — jadi semakin
              tinggi peluang kamar kosong. Angka ini perkiraan, bukan janji.
            </caption>
            <thead>
              <tr>
                <th scope="col">Masa sewa</th>
                <th scope="col">Kelas</th>
                <th scope="col">Bobot</th>
                <th scope="col">Alasan</th>
              </tr>
            </thead>
            <tbody>
              {VACANCY_WEIGHT_TABLE.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.kelas}</td>
                  <td>{row.weight > 0 ? `+${row.weight}` : '0'}</td>
                  <td>{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>

        {isLoading ? (
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
            Belum ada kamar aktif untuk {month.label}. Kalender akan terisi setelah kamar
            diaktifkan di dashboard.
          </div>
        ) : null}

        {!isLoading && !query.isError && rooms.length > 0 ? (
          <>
            <div
              className="rm-heatmap-calendar"
              role="group"
              aria-label={`Kalender ketersediaan kamar ${month.label}`}
            >
              <div className="rm-heatmap-weekdays" aria-hidden="true">
                {WEEKDAYS.map((day, index) => (
                  <div key={day} className={`rm-heatmap-weekday${index === 0 ? ' is-sun' : ''}`}>
                    {day}
                  </div>
                ))}
              </div>
              {cells.map((week, weekIndex) => (
                <div className="rm-heatmap-week" key={`week-${weekIndex}`}>
                  {week.map((iso, dayIndex) => {
                    if (!iso) {
                      return (
                        <div
                          key={`blank-${weekIndex}-${dayIndex}`}
                          className="rm-heatmap-cell is-outside"
                          aria-hidden="true"
                        />
                      );
                    }
                    const items = byDate.get(iso) ?? [];
                    const visible = items.slice(0, CHIP_LIMIT);
                    const hidden = items.length - visible.length;
                    const isToday = iso === month.today;
                    return (
                      <button
                        type="button"
                        key={iso}
                        ref={(node) => {
                          if (node) cellRefs.current.set(iso, node);
                          else cellRefs.current.delete(iso);
                        }}
                        className={[
                          'rm-heatmap-cell',
                          isToday ? 'is-today' : '',
                          selectedIso === iso ? 'is-selected' : '',
                          items.length === 0 ? 'is-quiet' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        tabIndex={iso === activeIso ? 0 : -1}
                        onFocus={() => setFocusIso(iso)}
                        onKeyDown={(event) => moveFocus(event, iso)}
                        onClick={() => setSelectedIso(iso)}
                        aria-label={describeCell(iso)}
                        title={describeCell(iso)}
                      >
                        <span className="rm-heatmap-date" aria-hidden="true">
                          {Number(iso.slice(8, 10))}
                        </span>
                        {items.length > 0 ? (
                          <span className="rm-heatmap-chips" aria-hidden="true">
                            {visible.map((item) => {
                              const hint = `${item.room.code} · peluang kosong ${VACANCY_CHANCE_LABEL[item.vacancy.chance]} — ${item.vacancy.reason}`;
                              return (
                                <span
                                  key={item.room.id}
                                  className={`rm-heatmap-chip is-${item.vacancy.chance.toLowerCase()}`}
                                  title={hint}
                                >
                                  {item.room.code}
                                </span>
                              );
                            })}
                            {hidden > 0 ? <span className="rm-heatmap-more">+{hidden}</span> : null}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {selectedIso ? (
              <div
                className="rm-heatmap-panel"
                role="region"
                aria-label={`Rincian ${longDate(selectedIso)}`}
                tabIndex={-1}
                ref={panelRef}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    closePanel();
                  }
                }}
              >
                <div className="rm-heatmap-panel-head">
                  <h3>{longDate(selectedIso)}</h3>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={closePanel}
                    aria-label="Tutup rincian tanggal"
                  >
                    Tutup
                  </Button>
                </div>
                {selectedItems.length > 0 ? (
                  <>
                    <p className="rm-heatmap-summary mb-2">
                      {selectedItems.length} kamar diperkirakan mulai kosong pada{' '}
                      {shortDate(selectedIso)}.
                    </p>
                    <ul className="rm-heatmap-panel-list">
                      {selectedItems.map((item) => {
                        const tone = statusTone(item.room.status);
                        return (
                          <li className="rm-heatmap-panel-item" key={item.room.id}>
                            <button
                              type="button"
                              className="rm-heatmap-panel-code"
                              onClick={() => navigate(`/rooms/${item.room.id}/detail`)}
                              aria-label={`Buka detail kamar ${item.room.code}`}
                            >
                              {item.room.code}
                            </button>
                            <Badge bg={tone.bg} text={tone.text}>
                              {DAY_LABEL[item.status]}
                            </Badge>
                            <span className="rm-heatmap-panel-chance">
                              Peluang kosong: {VACANCY_CHANCE_LABEL[item.vacancy.chance]}
                            </span>
                            <span className="rm-heatmap-panel-basis">{item.vacancy.reason}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : (
                  <p className="rm-heatmap-summary mb-0">
                    Tidak ada kamar yang diperkirakan mulai kosong pada {shortDate(selectedIso)}.
                    Kamar yang sudah kosong sebelum tanggal ini tidak diulang di sini.
                  </p>
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </Card.Body>
    </Card>
  );
}
