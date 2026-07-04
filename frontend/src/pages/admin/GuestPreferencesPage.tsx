import { useState, useMemo } from 'react';
import { Alert, Badge, Card, Form, Pagination, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import {
  fetchGuestPreferences,
  fetchGuestPreferencesStats,
  type GuestPreferenceRow,
  type GuestPreferencesStats,
} from '../../api/guestPreferences';
import { formatDateOnly } from '../../utils/dateTime';

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

const PREF_LABELS: Record<string, Record<string, string>> = {
  bathroom:  { inside: 'KM Dalam', outside: 'KM Luar', any: 'Tidak masalah', '(kosong)': '—' },
  cooling:   { ac: 'AC', fan: 'Kipas Angin', any: 'Tidak masalah', '(kosong)': '—' },
  roomSize:  { standard: 'Standar (3×3)', large: 'Besar (3×4)', any: 'Tidak masalah', '(kosong)': '—' },
  roomType:  { regular: 'Biasa', mezzanine: 'Mezzanine', any: 'Tidak masalah', '(kosong)': '—' },
};

const PREF_ICONS: Record<string, string> = {
  bathroom: '🚿',
  cooling: '❄️',
  roomSize: '📐',
  roomType: '🛏️',
};

// ---------------------------------------------------------------------------
// COMPONENTS
// ---------------------------------------------------------------------------

function StatsPanel({ stats }: { stats: GuestPreferencesStats | undefined }) {
  if (!stats) return null;
  const completedPct = stats.total > 0 ? Math.round((stats.totalCompleted / stats.total) * 100) : 0;
  return (
    <div className="d-flex flex-wrap gap-3 mb-3">
      <Card className="border-0 flex-fill e3-minw-140">
        <Card.Body className="py-2 px-3 text-center">
          <div className="text-muted small">Total Survei</div>
          <div className="fw-bold fs-4">{stats.total}</div>
        </Card.Body>
      </Card>
      <Card className="border-0 flex-fill e3-minw-140">
        <Card.Body className="py-2 px-3 text-center">
          <div className="text-muted small">Bulan Ini</div>
          <div className="fw-bold fs-4">{stats.totalThisMonth}</div>
        </Card.Body>
      </Card>
      <Card className="border-0 flex-fill e3-minw-140">
        <Card.Body className="py-2 px-3 text-center">
          <div className="text-muted small">Selesai</div>
          <div className="fw-bold fs-4">{stats.totalCompleted} <small className="text-muted">({completedPct}%)</small></div>
        </Card.Body>
      </Card>
      <Card className="border-0 flex-fill e3-minw-140">
        <Card.Body className="py-2 px-3 text-center">
          <div className="text-muted small">Skip</div>
          <div className="fw-bold fs-4">{stats.totalSkipped}</div>
        </Card.Body>
      </Card>
      <Card className="border-0 flex-fill e3-minw-140">
        <Card.Body className="py-2 px-3 text-center">
          <div className="text-muted small">Rata Estimasi Sewa</div>
          <div className="fw-bold fs-4">
            {stats.avgEstimatedPrice !== null
              ? `Rp ${(stats.avgEstimatedPrice / 1000).toFixed(0)}rb`
              : '—'}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

function PreferencesBreakdown({ stats }: { stats: GuestPreferencesStats | undefined }) {
  if (!stats) return null;
  const categories = ['bathroom', 'cooling', 'roomSize', 'roomType'] as const;

  return (
    <Card className="content-card border-0 mb-3">
      <Card.Header className="bg-white"><strong>📊 Distribusi Preferensi</strong></Card.Header>
      <Card.Body className="p-3">
        <div className="row g-3">
          {categories.map((cat) => {
            const counts = stats.preferenceCounts[cat];
            const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const total = entries.reduce((sum, [, c]) => sum + c, 0);
            return (
              <div key={cat} className="col-md-3 col-sm-6">
                <div className="mb-1 fw-semibold small">
                  {PREF_ICONS[cat]} {cat === 'bathroom' ? 'Kamar Mandi' : cat === 'cooling' ? 'Pendingin' : cat === 'roomSize' ? 'Ukuran' : 'Tipe Kamar'}
                </div>
                {entries.map(([key, count]) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={key} className="d-flex justify-content-between align-items-center mb-1 small">
                      <span className="text-muted">{PREF_LABELS[cat]?.[key] ?? key}</span>
                      <span>
                        <span className="fw-medium">{count}</span>
                        <small className="text-muted ms-1">({pct}%)</small>
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
}

function formatPrefRow(row: GuestPreferenceRow): string {
  const parts: string[] = [];
  if (row.bathroom) parts.push(PREF_LABELS.bathroom[row.bathroom] ?? row.bathroom);
  if (row.cooling) parts.push(PREF_LABELS.cooling[row.cooling] ?? row.cooling);
  if (row.roomSize) parts.push(PREF_LABELS.roomSize[row.roomSize] ?? row.roomSize);
  if (row.roomType) parts.push(PREF_LABELS.roomType[row.roomType] ?? row.roomType);
  return parts.join(' · ') || '—';
}

// ---------------------------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------------------------

export default function GuestPreferencesPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [showSkipped, setShowSkipped] = useState<string>('all');

  const skippedFilter = showSkipped === 'all' ? undefined : showSkipped === 'yes' ? true : false;

  const listQuery = useQuery({
    queryKey: ['guest-preferences', page, pageSize, skippedFilter],
    queryFn: () => fetchGuestPreferences({ page, pageSize, skipped: skippedFilter }),
  });

  const statsQuery = useQuery({
    queryKey: ['guest-preferences-stats'],
    queryFn: fetchGuestPreferencesStats,
  });

  const data = listQuery.data;
  const stats = statsQuery.data;
  const rows: GuestPreferenceRow[] = data?.rows ?? [];
  const totalPages = data?.totalPages ?? 1;

  // Render pagination
  const paginationItems = useMemo(() => {
    const items: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) items.push(i);
    return items;
  }, [page, totalPages]);

  return (
    <div className="container py-4">
      <PageHeader
        eyebrow="Marketing · Preferensi Pengunjung"
        title="Survei Preferensi Tamu"
        description="Data preferensi kamar dari wizard publik — dikumpulkan secara anonim dari pengunjung website."
      />

      {/* Loading / Error */}
      {listQuery.isLoading && statsQuery.isLoading ? (
        <div className="py-5 text-center"><Spinner animation="border" /></div>
      ) : null}
      {listQuery.isError ? <Alert variant="danger">Gagal memuat data survei preferensi.</Alert> : null}

      {/* Stat panel */}
      <StatsPanel stats={stats} />

      {/* Preferensi breakdown */}
      <PreferencesBreakdown stats={stats} />

      {/* Tabel */}
      <Card className="content-card border-0">
        <Card.Header className="bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
          <strong>📋 Riwayat Survei</strong>
          <div className="d-flex gap-2">
            <Form.Select
              size="sm"
              value={showSkipped}
              onChange={(e) => { setShowSkipped(e.target.value); setPage(1); }}
              style={{ width: 'auto' }}
            >
              <option value="all">Semua ({data?.total ?? 0})</option>
              <option value="no">Selesai ({stats?.totalCompleted ?? 0})</option>
              <option value="yes">Skip ({stats?.totalSkipped ?? 0})</option>
            </Form.Select>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {listQuery.isLoading ? (
            <div className="py-5 text-center"><Spinner animation="border" /></div>
          ) : !rows.length ? (
            <div className="p-4">
              <EmptyState icon="📭" title="Belum ada data" description="Pengunjung belum mengisi wizard preferensi." />
            </div>
          ) : (
            <>
              <Table hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tanggal</th>
                    <th>Preferensi</th>
                    <th>Estimasi Sewa</th>
                    <th>Prioritas</th>
                    <th>Status</th>
                    <th>Sesi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="text-muted small">{((page - 1) * pageSize) + idx + 1}</td>
                      <td className="small text-nowrap">
                        {(() => {
                          return formatDateOnly(row.createdAt);
                        })()}
                      </td>
                      <td className="small">{row.skipped ? <span className="text-muted">—</span> : formatPrefRow(row)}</td>
                      <td className="small">
                        {row.estimatedPriceRupiah != null
                          ? `Rp ${(row.estimatedPriceRupiah / 1000).toFixed(0)}rb`
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="small text-muted e3-maxw-200 text-truncate" title={row.priorities ?? ''}>
                        {row.priorities ? (
                          (() => {
                            try {
                              const arr = JSON.parse(row.priorities) as string[];
                              return arr.map((p) => {
                                const labels: Record<string, string> = {
                                  cleanliness: 'Kebersihan',
                                  security: 'Keamanan',
                                  price: 'Harga',
                                  location: 'Lokasi',
                                  facilities: 'Fasilitas',
                                };
                                return labels[p] ?? p;
                              }).join(', ');
                            } catch { return row.priorities; }
                          })()
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        {row.skipped
                          ? <Badge bg="secondary">Skip</Badge>
                          : <Badge bg="success">Selesai</Badge>}
                      </td>
                      <td className="small text-muted">
                        {row.sessionId ? (
                          <span title={row.sessionId}>
                            {row.sessionId.length > 10 ? `${row.sessionId.slice(0, 10)}…` : row.sessionId}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-center p-3">
                  <Pagination size="sm">
                    <Pagination.Prev disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
                    {paginationItems[0] > 1 && <Pagination.Ellipsis disabled />}
                    {paginationItems.map((p) => (
                      <Pagination.Item key={p} active={p === page} onClick={() => setPage(p)}>
                        {p}
                      </Pagination.Item>
                    ))}
                    {paginationItems[paginationItems.length - 1] < totalPages && <Pagination.Ellipsis disabled />}
                    <Pagination.Next disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
