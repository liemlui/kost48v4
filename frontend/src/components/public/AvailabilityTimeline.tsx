import { useMemo, useRef, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { getAvailabilityCalendar } from '../../api/bookings';

type CellStatus = 'KOSONG' | 'BOOKING_DP' | 'HUNI' | 'MAINTENANCE';

interface CalendarRoom {
  id: number;
  code: string;
  name: string | null;
  floor: string | null;
  status: string;
  days: Record<string, string>;
}

interface CalendarData {
  from: string;
  to: string;
  dates: string[];
  rooms: CalendarRoom[];
}

const STATUS_LABELS: Record<CellStatus, string> = {
  KOSONG: 'Kosong — bisa dipesan',
  BOOKING_DP: 'Sudah dipesan (DP) — menunggu pelunasan',
  HUNI: 'Terisi — ada penghuni',
  MAINTENANCE: 'Sedang dicek / maintenance',
};

function formatHeaderDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  return `${d.getDate()}\n${days[d.getDay()]}`;
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

export default function AvailabilityTimeline() {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ['availability-calendar'],
    queryFn: () => getAvailabilityCalendar(),
    staleTime: 60_000,
  });

  const data = query.data as CalendarData | undefined;

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  };
  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
  };

  // Group rooms by floor
  const floors = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, CalendarRoom[]>();
    for (const room of data.rooms) {
      const key = room.floor || '-';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(room);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  if (query.isLoading) {
    return (
      <div className="avcal-shell">
        <div className="avcal-loading"><Spinner animation="border" size="sm" /> Memuat kalender...</div>
      </div>
    );
  }

  if (query.isError || !data || data.rooms.length === 0) {
    return null; // Kalender tidak muncul bila error/kosong
  }

  const dateCount = data.dates.length;

  return (
    <div className="avcal-shell">
      <div className="avcal-header">
        <h3 className="avcal-title">
          📅 Kalender Ketersediaan
          <span className="avcal-range">{data.from} — {data.to}</span>
        </h3>
        <button
          type="button"
          className="avcal-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
        >
          {collapsed ? 'Tampilkan' : 'Sembunyikan'}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Legend */}
          <div className="avcal-legend">
            <span className="avcal-legend-item"><span className="avcal-cell cell-kosong" /> Kosong</span>
            <span className="avcal-legend-item"><span className="avcal-cell cell-booking-dp" /> Dipesan (DP)</span>
            <span className="avcal-legend-item"><span className="avcal-cell cell-huni" /> Terisi</span>
            <span className="avcal-legend-item"><span className="avcal-cell cell-maintenance" /> Maintenance</span>
          </div>

          {/* Scroll controls */}
          <div className="avcal-scroll-controls">
            <button type="button" className="avcal-scroll-btn" onClick={scrollLeft} aria-label="Gulir kiri">‹</button>
            <span className="avcal-scroll-hint">{dateCount} hari • geser untuk lihat lebih banyak</span>
            <button type="button" className="avcal-scroll-btn" onClick={scrollRight} aria-label="Gulir kanan">›</button>
          </div>

          {/* Timeline table */}
          <div className="avcal-table-wrap" ref={scrollRef}>
            <table className="avcal-table">
              <thead>
                <tr>
                  <th className="avcal-th-room">Kamar</th>
                  {data.dates.map((d) => (
                    <th
                      key={d}
                      className={`avcal-th-date${isWeekend(d) ? ' avcal-weekend' : ''}`}
                    >
                      {formatHeaderDate(d).split('\n').map((line, i) => (
                        <span key={i} className="avcal-date-line">{line}</span>
                      ))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {floors.map(([floor, rooms]) => (
                  <>
                    <tr className="avcal-floor-row" key={`floor-${floor}`}>
                      <td className="avcal-td-floor" colSpan={dateCount + 1}>
                        Lantai {floor}
                      </td>
                    </tr>
                    {rooms.map((room) => (
                      <tr key={room.id}>
                        <td className="avcal-td-room">
                          <span className="avcal-room-code">{room.code}</span>
                          {room.name && <span className="avcal-room-name">{room.name}</span>}
                        </td>
                        {data.dates.map((d) => {
                          const raw = room.days[d] || 'KOSONG';
                          const status = raw as CellStatus;
                          return (
                            <td
                              key={d}
                              className={`avcal-cell cell-${status.toLowerCase()}`}
                              title={`${room.code} — ${d}: ${STATUS_LABELS[status]}`}
                            >
                              <span className="avcal-cell-text">
                                {status === 'KOSONG' ? '✓' : status === 'BOOKING_DP' ? '◷' : status === 'HUNI' ? '●' : '▲'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
