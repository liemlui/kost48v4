import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getAvailabilityCalendar } from '../../api/bookings';
import {
  VACANCY_CHANCE_LABEL,
  VACANCY_NOTE,
  estimateVacancyOnDate,
  type VacancyChance,
  type VacancyOnDateEstimate,
} from '../../utils/vacancyEstimate';

/**
 * Kalender heatmap ketersediaan kamar (W-OWN-019).
 *
 * Bentuk: KALENDER BULANAN 7 kolom hari (keputusan owner 23 Okt 2026 lewat
 * gambar rujukan) — menggantikan matriks 14 tanggal × 13 kamar. Tiap sel adalah
 * satu tanggal berisi chip per kamar; setiap chip punya DUA PITA:
 *   pita atas  = status huni (fakta: Kosong/Terisi/Booking DP/Perbaikan/Perpanjangan)
 *   pita bawah = peluang kosong (perkiraan: belum ada info/rendah/sedang/tinggi)
 * Peluang kosong TIDAK dibedakan lewat warna saja — pita bawah memakai pola
 * (solid, garis miring, outline). Nama penghuni tidak pernah tampil di sini.
 *
 * Rumus peluang kosong per tanggal hidup di `utils/vacancyEstimate.ts`
 * (`estimateVacancyOnDate`) — komponen ini tidak menghitung apa pun sendiri.
 */

type DayStatus = 'KOSONG' | 'HUNI' | 'BOOKING_DP' | 'MAINTENANCE' | 'PERPANJANG';

type CalendarRoom = {
  id: number;
  code: string;
  status: string;
  checkInDate?: string | null;
  plannedCheckOutDate?: string | null;
  remainingDays?: number | null;
  hasPendingRenew?: boolean | null;
  renewStatus?: string | null;
  checkoutRequest?: { status: 'PENDING' | 'APPROVED'; requestedCheckOutDate: string } | null;
  days: Record<string, DayStatus>;
};

type CalendarData = { from: string; to: string; dates: string[]; rooms: CalendarRoom[] };

const DAY_LABEL: Record<DayStatus, string> = {
  KOSONG: 'Kosong',
  HUNI: 'Terisi',
  BOOKING_DP: 'Booking DP',
  MAINTENANCE: 'Perbaikan',
  PERPANJANG: 'Perpanjangan',
};

const DAY_ORDER: DayStatus[] = ['KOSONG', 'HUNI', 'BOOKING_DP', 'MAINTENANCE', 'PERPANJANG'];
const CHANCE_ORDER: VacancyChance[] = ['TINGGI', 'SEDANG', 'RENDAH', 'BELUM_ADA_INFO'];
const CHANCE_WEIGHT: Record<VacancyChance, number> = {
  TINGGI: 0,
  SEDANG: 1,
  RENDAH: 2,
  BELUM_ADA_INFO: 3,
};

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

function chipLimitFor(width: number) {
  if (width >= 1024) return 7;
  if (width >= 640) return 5;
  return 3;
}

export default function AvailabilityHeatmap() {
  const navigate = useNavigate();
  const [monthOffset, setMonthOffset] = useState(0);
  const month = useMemo(() => buildMonth(monthOffset), [monthOffset]);
  const [chipLimit, setChipLimit] = useState(() =>
    typeof window === 'undefined' ? 3 : chipLimitFor(window.innerWidth),
  );
  const [focusIso, setFocusIso] = useState<string | null>(null);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const panelRef = useRef<HTMLDivElement | null>(null);
  const returnFocusTo = useRef<string | null>(null);

  useEffect(() => {
    const onResize = () => setChipLimit(chipLimitFor(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  /** Satu kumpulan data per tanggal: status huni + peluang kosong tiap kamar. */
  const byDate = useMemo(() => {
    const map = new Map<
      string,
      Array<{ room: CalendarRoom; status: DayStatus; vacancy: VacancyOnDateEstimate }>
    >();
    for (const iso of month.dates) {
      const items = rooms.map((room) => ({
        room,
        status: (room.days?.[iso] ?? 'HUNI') as DayStatus,
        vacancy: estimateVacancyOnDate({ ...room }, iso),
      }));
      // Yang paling mungkin kosong muncul lebih dulu — jawaban langsung pertanyaan owner.
      items.sort(
        (a, b) =>
          CHANCE_WEIGHT[a.vacancy.chance] - CHANCE_WEIGHT[b.vacancy.chance] ||
          String(a.room.code).localeCompare(String(b.room.code), 'id', { numeric: true }),
      );
      map.set(iso, items);
    }
    return map;
  }, [rooms, month.dates]);

  const statusesPresent = useMemo(() => {
    const seen = new Set<DayStatus>();
    for (const items of byDate.values()) for (const item of items) seen.add(item.status);
    return DAY_ORDER.filter((status) => seen.has(status));
  }, [byDate]);

  const chancesPresent = useMemo(() => {
    const seen = new Set<VacancyChance>();
    for (const items of byDate.values()) for (const item of items) seen.add(item.vacancy.chance);
    return CHANCE_ORDER.filter((chance) => seen.has(chance));
  }, [byDate]);

  const todayItems = byDate.get(month.today) ?? [];
  const todayCounts = todayItems.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    },
    {} as Partial<Record<DayStatus, number>>,
  );
  const isLikely = (chance: VacancyChance) => chance === 'TINGGI' || chance === 'SEDANG';

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
    if (!items.length) return longDate(iso);
    const likely = items.filter((item) => isLikely(item.vacancy.chance)).length;
    const counts = DAY_ORDER.filter((status) => items.some((item) => item.status === status))
      .map((status) => `${DAY_LABEL[status]} ${items.filter((item) => item.status === status).length} kamar`)
      .join(', ');
    return `${longDate(iso)}. ${likely} dari ${items.length} kamar berpeluang kosong. Status huni: ${counts}. Tekan Enter untuk rincian per kamar.`;
  };

  const selectedItems = selectedIso ? byDate.get(selectedIso) ?? [] : [];
  const selectedLikely = selectedItems.filter((item) => isLikely(item.vacancy.chance)).length;
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
              {todayItems.length > 0 ? (
                <>
                  {' · hari ini '}
                  {shortDate(month.today)}: {todayCounts.KOSONG ?? 0} kosong ·{' '}
                  {todayCounts.HUNI ?? 0} terisi
                  {todayCounts.BOOKING_DP ? ` · ${todayCounts.BOOKING_DP} booking` : ''}
                  {todayCounts.MAINTENANCE ? ` · ${todayCounts.MAINTENANCE} perbaikan` : ''}
                  {` · ${todayItems.filter((item) => isLikely(item.vacancy.chance)).length} kamar berpeluang kosong`}
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

        <div className="rm-heatmap-legend-groups">
          <fieldset className="rm-heatmap-legend">
            <legend className="rm-heatmap-legend-title">Status huni</legend>
            <div className="rm-heatmap-legend-items">
              {statusesPresent.map((status) => (
                <span key={status} className={`rm-heatmap-legend-item is-${status.toLowerCase()}`}>
                  <i aria-hidden="true" /> {DAY_LABEL[status]}
                </span>
              ))}
            </div>
          </fieldset>
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

        <p className="rm-heatmap-note">{VACANCY_NOTE}</p>

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
                    const visible = items.slice(0, chipLimit);
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
                        <span className="rm-heatmap-chips" aria-hidden="true">
                          {visible.map((item) => {
                            const chance = item.vacancy.chance;
                            const hint = `${item.room.code} · ${DAY_LABEL[item.status]} · peluang kosong ${VACANCY_CHANCE_LABEL[chance]} — ${item.vacancy.reason}`;
                            return (
                              <span className="rm-heatmap-chip" key={item.room.id} title={hint}>
                                <span className="rm-heatmap-chip-code">{item.room.code}</span>
                                <span className="rm-heatmap-chip-bars">
                                  <i className={`band band-1 is-${item.status.toLowerCase()}`} />
                                  <i className={`band band-2 is-${chance.toLowerCase()}`} />
                                </span>
                              </span>
                            );
                          })}
                          {hidden > 0 ? <span className="rm-heatmap-more">+{hidden}</span> : null}
                        </span>
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
                <p className="rm-heatmap-summary mb-2">
                  {selectedLikely} dari {selectedItems.length} kamar berpeluang kosong pada{' '}
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
              </div>
            ) : null}
          </>
        ) : null}
      </Card.Body>
    </Card>
  );
}
