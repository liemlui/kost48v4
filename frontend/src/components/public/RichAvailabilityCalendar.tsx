import { useMemo, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { getAvailabilityCalendar } from '../../api/bookings';
import { formatRupiah } from '../../utils/formatCurrency';

type CellStatus = 'KOSONG' | 'BOOKING_DP' | 'HUNI' | 'MAINTENANCE' | 'PERPANJANG';

interface RoomDay {
  id: number;
  code: string;
  name: string | null;
  status: string;
  category: string;
  roomType: string;
  hasAc: boolean;
  monthlyRateRupiah: number;
  currentTenantName: string | null;
  checkInDate: string | null;
  plannedCheckOutDate: string | null;
  remainingDays: number;
  hasPendingRenew: boolean;
  renewStatus: string | null;
  dpTenantName: string | null;
  dpCheckInDate: string | null;
  days: Record<string, string>;
}

interface CalendarData {
  from: string;
  to: string;
  dates: string[];
  rooms: RoomDay[];
}

/** Format Date lokal → "YYYY-MM-DD" */
function localYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtTanggal(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? iso : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date);
}
function fmtHari(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][new Date(y, m - 1, d).getDay()];
}
function getWeekDates(weekOffset: number): string[] {
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(todayLocal);
  start.setDate(start.getDate() + weekOffset * 7);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(localYMD(d));
  }
  return dates;
}

// ── Props ──
export interface CalendarFilter {
  cooling?: 'ac' | 'fan';
  roomType?: 'REGULAR' | 'MEZZANINE';
  status?: 'kosong' | 'huni' | 'booking' | 'maint' | 'renew';
  priceMin?: number;
  priceMax?: number;
}

export interface Props {
  filter?: CalendarFilter;
}

/** Helper: cocokkan filter */
function matchesFilter(room: RoomDay, filter?: CalendarFilter): boolean {
  if (!filter) return true;
  const { cooling, roomType, status, priceMin, priceMax } = filter;

  if (cooling) {
    if (cooling === 'ac' && !room.hasAc) return false;
    if (cooling === 'fan' && room.hasAc) return false;
  }

  if (roomType) {
    if (roomType !== room.roomType) return false;
  }

  if (status) {
    const todayStr = localYMD(new Date());
    const todayStatus = room.days?.[todayStr] || 'KOSONG';
    const statusMap: Record<string, string> = {
      kosong: 'KOSONG', huni: 'HUNI', booking: 'BOOKING_DP',
      maint: 'MAINTENANCE', renew: 'PERPANJANG',
    };
    if (statusMap[status] && todayStatus !== statusMap[status]) return false;
  }

  if (priceMin !== undefined && room.monthlyRateRupiah < priceMin) return false;
  if (priceMax !== undefined && room.monthlyRateRupiah > priceMax) return false;

  return true;
}

// ── Component ──
export default function RichAvailabilityCalendar({ filter }: Props) {
  // Keep the lengthy seven-day grid out of the way by default on phones.
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767.98px)')?.matches === true,
  );
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const todayStr = localYMD(new Date());
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const fromDate = weekDates[0];
  const toDate = weekDates[6];

  const query = useQuery({
    queryKey: ['availability-calendar', fromDate, toDate],
    queryFn: () => getAvailabilityCalendar({ from: fromDate, to: toDate }),
    staleTime: 60_000,
  });

  const data = query.data as CalendarData | undefined;
  const rooms = (data?.rooms ?? []).filter((r) => matchesFilter(r, filter));

  // ── Stats ──
  const stats = useMemo(() => {
    const counts = { total: rooms.length, kosong: 0, huni: 0, booking: 0, maint: 0, renew: 0 };
    const todayKey = localYMD(new Date());
    for (const r of rooms) {
      const s = r.days?.[todayKey] || 'KOSONG';
      if (s === 'PERPANJANG') counts.renew++;
      else if (s === 'HUNI') counts.huni++;
      else if (s === 'BOOKING_DP') counts.booking++;
      else if (s === 'MAINTENANCE') counts.maint++;
      else counts.kosong++;
    }
    return counts;
  }, [rooms]);

  // ── Guards ──
  if (query.isLoading) {
    return (
      <div className="wcal-shell">
        <div className="wcal-loading"><Spinner animation="border" size="sm" /> Memuat kalender…</div>
      </div>
    );
  }
  if (query.isError || !data) return null;

  return (
    <div className="wcal-shell">
      {/* ═══ HEADER ═══ */}
      <div className="wcal-header">
        <div className="wcal-h-left">
          <span className="wcal-icon">📅</span>
          <div>
            <h2 className="wcal-title">Ketersediaan Kamar</h2>
            <span className="wcal-sub">{data.rooms.length} kamar · {fmtTanggal(weekDates[0])} — {fmtTanggal(weekDates[6])}</span>
          </div>
        </div>
        <div className="wcal-h-right">
          <div className="wcal-nav">
            <button type="button" className="wcal-nav-btn" aria-label="Minggu sebelumnya" disabled={weekOffset === 0} onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}>‹</button>
            <span className="wcal-nav-label">{weekOffset === 0 ? 'Minggu Ini' : `Minggu ${weekOffset === 1 ? 'Depan' : `+${weekOffset}`}`}</span>
            <button type="button" className="wcal-nav-btn" aria-label="Minggu berikutnya" onClick={() => setWeekOffset((w) => w + 1)}>›</button>
          </div>
          <button type="button" className="wcal-collapse" aria-expanded={!collapsed} onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? 'Tampilkan jadwal 7 hari' : 'Sembunyikan jadwal'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* ═══ STATS ═══ */}
          <div className="wcal-toolbar">
            <div className="wcal-stats">
              <span className="wcal-stat">🔴 <strong>{stats.huni}</strong> Terisi</span>
              <span className="wcal-stat">🟢 <strong>{stats.kosong}</strong> Kosong</span>
              <span className="wcal-stat">🟡 <strong>{stats.booking}</strong> Booking</span>
              <span className="wcal-stat">⚙️ <strong>{stats.maint}</strong> Perbaikan</span>
              {stats.renew > 0 && <span className="wcal-stat" style={{ color: '#7c3aed' }}>🔄 <strong>{stats.renew}</strong> Perpanjang</span>}
              <span className="wcal-stat" style={{ marginLeft: 'auto', color: '#475569', fontSize: '0.7rem' }}>
                {rooms.length} kamar
              </span>
            </div>
          </div>

          {/* ═══ TABLE ═══ */}
          <div className="wcal-table-wrap">
            <table className="wcal-table keep-wide-table" data-keep-wide="true">
              <thead>
                <tr>
                  <th className="wcal-th-room">Kamar</th>
                  {weekDates.map((d) => {
                    const hari = fmtHari(d);
                    const isToday = d === todayStr;
                    return (
                      <th key={d} className={`wcal-th-day${isToday ? ' today' : ''}${hari === 'Min' || hari === 'Sab' ? ' end' : ''}`}>
                        <span className="wcal-dn">{hari}</span>
                        <span className="wcal-dt">{d.slice(8, 10)}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr><td className="wcal-empty" colSpan={8}>Tidak ada kamar dengan filter ini.</td></tr>
                ) : (
                  rooms.map((room) => {
                    const todayKey = localYMD(new Date());
                    const todayStatus = room.days?.[todayKey] || 'KOSONG';
                    const statusLabel =
                      todayStatus === 'PERPANJANG' ? { key: 'renew', label: 'Perpanjang' } :
                      todayStatus === 'HUNI' ? { key: 'huni', label: 'Terisi' } :
                      todayStatus === 'BOOKING_DP' ? { key: 'booking', label: 'Booking' } :
                      todayStatus === 'MAINTENANCE' ? { key: 'maint', label: 'Perbaikan' } :
                      { key: 'kosong', label: 'Kosong' };
                    const warna =
                      statusLabel.key === 'huni' ? '#b91c1c' :
                      statusLabel.key === 'booking' ? '#92400e' :
                      statusLabel.key === 'maint' ? '#475569' :
                      statusLabel.key === 'renew' ? '#6d28d9' : '#166534';
                    const isExpanded = expandedId === room.id;

                    return (
                      <tr key={room.id} className={`wcal-row${isExpanded ? ' exp' : ''}`}>
                        <td className="wcal-td-room" data-label="Kamar" onClick={() => setExpandedId(isExpanded ? null : room.id)} style={{ borderLeftColor: warna }}>
                          <div className="wcal-r-top">
                            <span className="wcal-r-code">{room.code}</span>
                            <span className="wcal-r-badge" style={{ background: warna + '18', color: warna }}>{statusLabel.label}</span>
                            {room.hasPendingRenew && <span className="wcal-r-badge wcal-rb-renew">↻ Perpanjang</span>}
                          </div>
                          <div className="wcal-r-meta">
                            {statusLabel.key === 'huni' && room.plannedCheckOutDate && (
                              <span className="wcal-r-end" style={{ color: room.remainingDays <= 14 ? '#b91c1c' : room.remainingDays <= 30 ? '#92400e' : '#166534' }}>
                                sd {fmtTanggal(room.plannedCheckOutDate)}
                              </span>
                            )}
                            {statusLabel.key === 'renew' && (
                              <span className="wcal-r-end" style={{ color: '#7c3aed' }}>
                                Perpanjangan{room.plannedCheckOutDate ? ` (sd ${fmtTanggal(room.plannedCheckOutDate)})` : ''}
                                <span className="wcal-renew-note"> — bisa kosong jika batal</span>
                              </span>
                            )}
                            {statusLabel.key === 'booking' && room.dpCheckInDate && (
                              <span className="wcal-r-end" style={{ color: '#d97706' }}>DP · {fmtTanggal(room.dpCheckInDate)}</span>
                            )}
                            {statusLabel.key === 'kosong' && <span className="wcal-r-end" style={{ color: '#16a34a' }}>✓ Siap huni</span>}
                            {statusLabel.key === 'maint' && <span className="wcal-r-end" style={{ color: '#6b7280' }}>Perbaikan</span>}
                          </div>

                          {isExpanded && (
                            <div className="wcal-detail">
                              {/* C01-02: nama penghuni dihapus — jangan bocorkan PII */}
                              {room.checkInDate && room.plannedCheckOutDate && (
                                <div className="wcal-det-l">
                                  📅 {fmtTanggal(room.checkInDate)} → <strong>{fmtTanggal(room.plannedCheckOutDate)}</strong>
                                  {room.remainingDays > 0 && <span style={{ color: room.remainingDays <= 14 ? '#dc2626' : '#64748b', marginLeft: 4 }}>({room.remainingDays} hr)</span>}
                                </div>
                              )}
                              {room.hasPendingRenew && (
                                <div className="wcal-det-l" style={{ color: '#7c3aed', fontWeight: 600 }}>
                                  🔄 Perpanjangan {room.renewStatus === 'APPROVED' ? 'disetujui' : 'diajukan'}
                                  <span className="wcal-renew-note"> — kamar akan kosong jika batal</span>
                                </div>
                              )}
                              <div className="wcal-det-l wcal-det-pr">{room.monthlyRateRupiah != null ? formatRupiah(room.monthlyRateRupiah) : '—'}/bln</div>
                              {statusLabel.key === 'huni' && room.checkInDate && room.plannedCheckOutDate && (
                                <div className="wcal-prog">
                                  <div className="wcal-prog-bar">
                                    <div className="wcal-prog-fill" style={{
                                      width: `${(() => {
                                        const s = new Date(room.checkInDate + 'T00:00:00');
                                        const e = new Date(room.plannedCheckOutDate + 'T00:00:00');
                                        const total = Math.round((e.getTime() - s.getTime()) / 86400000);
                                        const elapsed = Math.round((Date.now() - s.getTime()) / 86400000);
                                        return total > 0 ? Math.min(100, Math.round(elapsed / total * 100)) : 0;
                                      })()}%`,
                                      background: room.remainingDays <= 14 ? '#dc2626' : room.remainingDays <= 30 ? '#d97706' : '#16a34a',
                                    }} />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {weekDates.map((d) => {
                          const raw = room.days[d] || 'KOSONG';
                          const isToday = d === todayStr;
                          let dotColor = '#22c55e', cellBg = '#f0fdf4';
                          if (raw === 'HUNI') { dotColor = '#ef4444'; cellBg = '#fef2f2'; }
                          else if (raw === 'BOOKING_DP') { dotColor = '#f59e0b'; cellBg = '#fffbeb'; }
                          else if (raw === 'MAINTENANCE') { dotColor = '#9ca3af'; cellBg = '#f9fafb'; }
                          else if (raw === 'PERPANJANG') { dotColor = '#7c3aed'; cellBg = '#f5f3ff'; }
                          return (
                            <td key={d} className={`wcal-cell${isToday ? ' today' : ''}`} data-label={`${fmtHari(d)} ${d.slice(8, 10)}`} style={{ background: cellBg }}
                              title={`${room.code} ${d}: ${raw === 'KOSONG' ? 'Kosong' : raw === 'HUNI' ? 'Terisi' : raw === 'BOOKING_DP' ? 'Booking DP' : raw === 'PERPANJANG' ? 'Perpanjangan' : 'Perbaikan'}`}>
                              <span className="wcal-cell-dot" style={{ background: dotColor }} />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ═══ LEGEND ═══ */}
          <div className="wcal-legend">
            <span><span className="wcal-ld" style={{ background: '#22c55e' }} /> Kosong</span>
            <span><span className="wcal-ld" style={{ background: '#ef4444' }} /> Terisi</span>
            <span><span className="wcal-ld" style={{ background: '#f59e0b' }} /> Booking DP</span>
            <span><span className="wcal-ld" style={{ background: '#9ca3af' }} /> Perbaikan</span>
            <span><span className="wcal-ld" style={{ background: '#7c3aed' }} /> Perpanjangan</span>
            <span className="wcal-legend-r">{rooms.length}/{data.rooms.length} kamar</span>
          </div>
        </>
      )}
    </div>
  );
}
