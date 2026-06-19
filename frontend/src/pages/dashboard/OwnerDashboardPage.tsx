import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { StatCardSkeleton, TableSkeleton } from '../../components/common/SkeletonLoader';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchOwnerDashboard, type OwnerDashboardTrendMonth } from '../../api/finance';
import { fetchAccountingReadiness } from '../../api/accounting';
import { listStays } from '../../api/stays';
import { listResource } from '../../api/resources';
import type { MeterReading } from '../../types';
import { createBusinessNarrative, generateBrief, type BriefResult } from '../../api/ai';
import AiAssistButton from '../../components/ai/AiAssistButton';
import AiResultPanel from '../../components/ai/AiResultPanel';
import { AssistantPanel, sortAssistantItems, type AssistantItem } from '../../components/command-center';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Catatan: kepadatan ringkas/lengkap pakai key sendiri agar tidak bentrok dengan
// `kost48_owner_view_mode` (toggle Kokpit/Area Admin di AppLayout + header X-Owner-View-Mode).
const VIEW_MODE_KEY = 'kost48_owner_density';

/** Hook: kelola mode tampilan ringkas/lengkap dengan persist localStorage + default mobile. */
function useOwnerViewMode() {
  const [mode, setModeState] = useState<'compact' | 'full'>(() => {
    // Prioritaskan localStorage
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    if (saved === 'compact' || saved === 'full') return saved;
    // Default: compact untuk viewport ≤834px
    return window.innerWidth <= 834 ? 'compact' : 'full';
  });

  const setMode = (next: 'compact' | 'full') => {
    localStorage.setItem(VIEW_MODE_KEY, next);
    setModeState(next);
  };

  const toggle = () => setMode(mode === 'compact' ? 'full' : 'compact');

  return { mode, setMode, toggle };
}

function currentYearMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function isoDay(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

type MeterDueSummary = { occupied: number; recorded: number; due: number };

/**
 * OWN-STATUS-CARDS: hitung kamar terisi yang BELUM dicatat meter pada bulan terpilih.
 * Berbasis stay aktif (kamar terisi) vs reading bulan tsb (room unik). Best-effort:
 * dipakai sebagai sinyal kokpit, daftar lengkap tetap di /meter-readings.
 */
async function computeMeterDue(ym: { year: number; month: number }): Promise<MeterDueSummary> {
  const lastDay = new Date(ym.year, ym.month, 0).getDate();
  const from = isoDay(ym.year, ym.month, 1);
  const to = isoDay(ym.year, ym.month, lastDay);
  const [stays, readings] = await Promise.all([
    listStays({ status: 'ACTIVE', limit: 200 }),
    listResource<MeterReading>('/meter-readings', { from, to, limit: 1000 }),
  ]);
  const occupiedRoomIds = new Set(
    (stays.items ?? []).filter((stay) => stay.room && stay.room.id != null).map((stay) => stay.room!.id),
  );
  const recordedRoomIds = new Set((readings.items ?? []).map((reading) => reading.roomId));
  const recorded = [...recordedRoomIds].filter((roomId) => occupiedRoomIds.has(roomId)).length;
  return { occupied: occupiedRoomIds.size, recorded, due: Math.max(0, occupiedRoomIds.size - recorded) };
}

function monthLabel(ym: { year: number; month: number }) {
  return new Date(ym.year, ym.month - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value || 0);
}

function formatCompactRupiah(value: number): string {
  const safe = Math.abs(value || 0);
  const sign = value < 0 ? '-' : '';
  if (safe >= 1_000_000_000) return `${sign}Rp ${(safe / 1_000_000_000).toFixed(1)} M`;
  if (safe >= 1_000_000) return `${sign}Rp ${(safe / 1_000_000).toFixed(1)} jt`;
  if (safe >= 1_000) return `${sign}Rp ${(safe / 1_000).toFixed(0)} rb`;
  return `${sign}Rp ${formatRupiah(safe)}`;
}

type ChangeMeta = { label: string; color: string };

function changeLabel(value: number | null): ChangeMeta | null {
  if (value === null || value === undefined) return null;
  if (value > 0) return { label: `+${value}%`, color: '#15803d' };
  if (value < 0) return { label: `-${Math.abs(value)}%`, color: '#dc2626' };
  return { label: '0%', color: '#64748b' };
}

function gradeBadge(grade: string): { label: string; tone: string } {
  switch (grade) {
    case 'SEHAT': return { label: 'Sehat', tone: 'good' };
    case 'PERHATIAN': return { label: 'Perhatian', tone: 'watch' };
    case 'RISIKO': return { label: 'Risiko', tone: 'risk' };
    default: return { label: 'Kritis', tone: 'critical' };
  }
}

function computeBestFitLine(data: OwnerDashboardTrendMonth[]): { points: { x: number; y: number }[] } {
  const n = data.length;
  if (n < 2) return { points: data.map((d, i) => ({ x: i, y: d.revenue })) };

  const xs = data.map((_, i) => i);
  const ys = data.map((d) => d.revenue);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, _, i) => a + xs[i] * ys[i], 0);
  const sumX2 = xs.reduce((a, b) => a + b * b, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { points: xs.map((x) => ({ x, y: Math.round(slope * x + intercept) })) };
}

type TrendChartMode = 'line' | 'bar';

function TrendChart({
  data,
  mode,
  showBestFit,
}: {
  data: OwnerDashboardTrendMonth[];
  mode: TrendChartMode;
  showBestFit: boolean;
}) {
  const bestFit = useMemo(() => computeBestFitLine(data), [data]);
  const chartData = useMemo(
    () => data.map((d, i) => ({
      name: `${MONTH_NAMES[d.month - 1]} ${String(d.year).slice(2)}`,
      revenue: d.revenue,
      expense: d.expense,
      netProfit: d.netProfit,
      bestFit: bestFit.points[i]?.y ?? d.revenue,
    })),
    [bestFit, data],
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="owner-chart-tooltip">
        <strong>{label}</strong>
        {payload.map((entry: any, idx: number) => (
          <span key={`${entry.name}-${idx}`} style={{ color: entry.color }}>
            {entry.name}: {formatCompactRupiah(Number(entry.value) || 0)}
          </span>
        ))}
      </div>
    );
  };

  // Audit U-10: bidang chart kosong tanpa pesan terlihat seperti halaman rusak.
  const hasAnyValue = chartData.some(
    (d) => (d.revenue || 0) !== 0 || (d.expense || 0) !== 0 || (d.netProfit || 0) !== 0,
  );
  if (chartData.length === 0 || !hasAnyValue) {
    return (
      <div
        className="text-center text-muted"
        style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        Belum ada data pendapatan/biaya untuk rentang ini.
      </div>
    );
  }

  if (mode === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis width={76} tick={{ fontSize: 11 }} tickFormatter={(value: number) => formatCompactRupiah(value)} />
          <RechartsTooltip content={<CustomTooltip />} />
          <Bar dataKey="revenue" fill="#2563eb" radius={[3, 3, 0, 0]} name="Pendapatan" />
          <Bar dataKey="expense" fill="#f97316" radius={[3, 3, 0, 0]} name="Pengeluaran" />
          <Bar dataKey="netProfit" fill="#16a34a" radius={[3, 3, 0, 0]} name="Laba Bersih" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis width={76} tick={{ fontSize: 11 }} tickFormatter={(value: number) => formatCompactRupiah(value)} />
        <RechartsTooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="Pendapatan" />
        <Line type="monotone" dataKey="expense" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="Pengeluaran" />
        <Line type="monotone" dataKey="netProfit" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} name="Laba Bersih" />
        {showBestFit ? (
          <Line type="monotone" dataKey="bestFit" stroke="#7c3aed" strokeWidth={2} strokeDasharray="6 3" dot={false} name="Tren Pendapatan" />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}

function OwnerKpiCard({
  label,
  value,
  change,
  detail,
  tone,
}: {
  label: string;
  value: string;
  change: ChangeMeta | null;
  detail?: ReactNode;
  tone: string;
}) {
  return (
    <Card className={`owner-kpi-card owner-kpi-${tone} h-100`}>
      <Card.Body>
        <div className="owner-kpi-label">{label}</div>
        <div className="owner-kpi-value">{value}</div>
        <div className="owner-kpi-footer">
          {change ? <span style={{ color: change.color }}>{change.label} dari bulan lalu</span> : <span>Belum ada pembanding</span>}
          {detail ? <small>{detail}</small> : null}
        </div>
      </Card.Body>
    </Card>
  );
}

type StatusCard = { key: string; label: string; value: string; helper: string; route: string; tone: string };

/** OWN-STATUS-CARDS: kartu status kokpit owner — okupansi, tunggakan, meter due, go-live readiness. */
function OwnerStatusStrip({ cards, onNavigate }: { cards: StatusCard[]; onNavigate: (route: string) => void }) {
  return (
    <section className="owner-cockpit-status mb-3" aria-label="Status kokpit owner">
      <span className="owner-section-kicker">Status kokpit</span>
      <div className="owner-action-strip mt-1">
        {cards.map((card) => (
          <button key={card.key} type="button" className={`owner-action-item owner-action-${card.tone}`} onClick={() => onNavigate(card.route)}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.helper}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function OwnerActionStrip({
  signals,
  onNavigate,
}: {
  signals: { type: string; count: number; route: string }[];
  onNavigate: (route: string) => void;
}) {
  const signalByType = (type: string) => signals.find((signal) => signal.type === type);
  const overdue = signalByType('overdue');
  const pendingPayment = signalByType('pending_payment');
  const outstanding = signalByType('outstanding');
  const actions = [
    { label: 'Review pembayaran', value: pendingPayment?.count ?? 0, helper: 'Bukti bayar menunggu keputusan', route: pendingPayment?.route ?? '/payment-submissions/review', tone: pendingPayment?.count ? 'watch' : 'good' },
    { label: 'Tagihan overdue', value: overdue?.count ?? 0, helper: 'Piutang perlu ditindaklanjuti', route: overdue?.route ?? '/invoices', tone: overdue?.count ? 'risk' : 'good' },
    { label: 'Tagihan outstanding', value: outstanding?.count ?? 0, helper: 'Pantau tagihan yang masih terbuka', route: outstanding?.route ?? '/invoices', tone: outstanding?.count ? 'watch' : 'good' },
    { label: 'Masa sewa', value: 'Buka', helper: 'Booking, perpanjangan, dan keluar', route: '/stays', tone: 'info' },
  ];

  return (
    <section className="owner-action-strip mb-3" aria-label="Aksi cepat owner">
      {actions.map((action) => (
        <button key={action.label} type="button" className={`owner-action-item owner-action-${action.tone}`} onClick={() => onNavigate(action.route)}>
          <span>{action.label}</span>
          <strong>{action.value}</strong>
          <small>{action.helper}</small>
        </button>
      ))}
    </section>
  );
}

export default function OwnerDashboardPage() {
  const navigate = useNavigate();
  const { mode: viewMode, toggle: toggleViewMode } = useOwnerViewMode();
  const [ym, setYm] = useState<{ year: number; month: number }>(currentYearMonth());
  const [trendMonths, setTrendMonths] = useState<number>(6);
  const [chartMode, setChartMode] = useState<TrendChartMode>('line');
  const [showBestFit, setShowBestFit] = useState<boolean>(true);

  const dashboard = useQuery({
    queryKey: ['owner-dashboard', ym, trendMonths],
    queryFn: () => fetchOwnerDashboard(ym.year, ym.month, trendMonths),
    staleTime: 60_000,
    retry: 1,
  });

  // OWN-STATUS-CARDS: sumber data tambahan untuk kartu status kokpit (best-effort, tak memblok dashboard utama).
  const readinessQuery = useQuery({
    queryKey: ['accounting-readiness'],
    queryFn: fetchAccountingReadiness,
    staleTime: 300_000,
    retry: 1,
  });
  const meterDueQuery = useQuery({
    queryKey: ['owner-meter-due', ym],
    queryFn: () => computeMeterDue(ym),
    staleTime: 120_000,
    retry: 1,
  });

  const data = dashboard.data;
  const trendData = data?.trendMonths ?? data?.trend6Months ?? [];
  const grade = data ? gradeBadge(data.grade) : null;
  const selectedPeriodLabel = monthLabel(ym);

  const statusCards: StatusCard[] = useMemo(() => {
    if (!data) return [];
    const overdue = data.signals.find((signal) => signal.type === 'overdue');
    const outstanding = data.signals.find((signal) => signal.type === 'outstanding');
    const arrearsCount = (overdue?.count ?? 0) + (outstanding?.count ?? 0);
    const arrearsRupiah = (overdue?.totalRupiah ?? 0) + (outstanding?.totalRupiah ?? 0);
    const occupancy = data.kpi.occupancyRatePercent;
    const meter = meterDueQuery.data;
    const readiness = readinessQuery.data;
    return [
      {
        key: 'occupancy',
        label: 'Okupansi',
        value: `${occupancy}%`,
        helper: 'Kamar terisi periode ini',
        route: '/reports',
        tone: occupancy >= 70 ? 'good' : occupancy >= 40 ? 'watch' : 'risk',
      },
      {
        key: 'arrears',
        label: 'Tunggakan',
        value: `${arrearsCount}`,
        helper: arrearsCount ? `Rp ${formatRupiah(arrearsRupiah)} belum lunas` : 'Tidak ada tagihan tertunggak',
        route: '/invoices',
        tone: overdue?.count ? 'risk' : arrearsCount ? 'watch' : 'good',
      },
      {
        key: 'meter-due',
        label: 'Meter belum dicatat',
        value: meterDueQuery.isLoading ? '…' : meterDueQuery.isError ? '—' : `${meter?.due ?? 0}`,
        helper: meter ? `${meter.recorded}/${meter.occupied} kamar tercatat` : 'Catat siklus meter bulan ini',
        route: '/meter-readings',
        tone: (meter?.due ?? 0) > 0 ? 'watch' : 'good',
      },
      {
        key: 'readiness',
        label: 'Kesiapan Go-Live',
        value: readinessQuery.isLoading ? '…' : readinessQuery.isError ? '—' : `${readiness?.score ?? 0}%`,
        helper: readiness ? (readiness.ready ? 'Akuntansi siap' : `${readiness.missing.length} gate tersisa`) : 'Kesiapan akuntansi',
        route: '/finance/accounting-setup',
        tone: readiness?.ready ? 'good' : (readiness?.score ?? 0) >= 60 ? 'watch' : 'risk',
      },
    ];
  }, [data, meterDueQuery.data, meterDueQuery.isLoading, meterDueQuery.isError, readinessQuery.data, readinessQuery.isLoading, readinessQuery.isError]);

  // H4: item urgent dari signals untuk AssistantPanel di bawah KPI cards.
  const ownerAssistantItems: AssistantItem[] = useMemo(() => {
    if (!data) return [];
    const items: AssistantItem[] = [];
    const overdue = data.signals.find((s) => s.type === 'overdue');
    const pending = data.signals.find((s) => s.type === 'pending_payment');
    const outstanding = data.signals.find((s) => s.type === 'outstanding');
    if (overdue?.count) items.push({ id: 'owner-overdue', severity: 'HIGH', title: 'Tagihan overdue', message: `${overdue.count} tagihan melewati jatuh tempo (Rp ${formatRupiah(overdue.totalRupiah ?? 0)}).`, count: overdue.count, actionLabel: 'Lihat Tagihan', actionTo: '/invoices', dedupKey: 'owner-overdue' });
    if (pending?.count) items.push({ id: 'owner-pending', severity: 'MEDIUM', title: 'Pembayaran pending review', message: `${pending.count} bukti bayar tenant perlu diputuskan admin.`, count: pending.count, actionLabel: 'Review Pembayaran', actionTo: '/payment-submissions/review', dedupKey: 'owner-pending' });
    if (outstanding?.count) items.push({ id: 'owner-outstanding', severity: 'INFO', title: 'Tagihan outstanding', message: `${outstanding.count} tagihan masih terbuka dan perlu dipantau.`, count: outstanding.count, actionLabel: 'Pantau Tagihan', actionTo: '/invoices', dedupKey: 'owner-outstanding' });
    return sortAssistantItems(items);
  }, [data]);

  const handleChange = (field: 'year' | 'month', val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num)) setYm((prev) => ({ ...prev, [field]: num }));
  };

  return (
    <Container fluid className={`owner-dashboard owner-view-${viewMode} px-2 py-3`}>
      <section className="owner-workspace-head mb-3">
        <div>
          <span className="owner-section-kicker">Kokpit bisnis</span>
          <h1>Dashboard Owner</h1>
          <p>Ringkasan kesehatan bisnis untuk {selectedPeriodLabel}.</p>
        </div>
        <div className="owner-toolbar">
          <div className="owner-period-field">
            <Form.Label htmlFor="owner-year">Tahun</Form.Label>
            <Form.Control id="owner-year" type="number" value={ym.year} min={2020} max={2100} onChange={(e) => handleChange('year', e.target.value)} />
          </div>
          <div className="owner-period-field">
            <Form.Label htmlFor="owner-month">Bulan</Form.Label>
            <Form.Select id="owner-month" value={ym.month} onChange={(e) => handleChange('month', e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
              ))}
            </Form.Select>
          </div>
          <Button size="sm" className="owner-report-button" onClick={() => navigate('/reports')}>Buka laporan</Button>
          <div className="owner-view-toggle" role="radiogroup" aria-label="Tampilan dashboard">
            <button type="button" role="radio" aria-checked={viewMode === 'compact'} className={viewMode === 'compact' ? 'active' : ''} onClick={() => toggleViewMode()}>
              📋 Ringkas
            </button>
            <button type="button" role="radio" aria-checked={viewMode === 'full'} className={viewMode === 'full' ? 'active' : ''} onClick={() => toggleViewMode()}>
              📊 Lengkap
            </button>
          </div>
        </div>
      </section>

      {dashboard.isLoading ? (
        <div role="status" aria-label="Memuat dashboard" aria-busy="true">
          <Row className="g-3 mb-3">
            {Array.from({ length: 4 }).map((_, i) => <Col xl={3} md={6} key={i}><StatCardSkeleton /></Col>)}
          </Row>
          <Card className="owner-feedback-card mb-3"><Card.Body><TableSkeleton rows={5} cols={3} /></Card.Body></Card>
          <span className="visually-hidden">Memuat dashboard…</span>
        </div>
      ) : null}

      {dashboard.isError ? (
        <Alert variant="warning" className="mb-3">
          Dashboard gagal dimuat. Pastikan backend API berjalan dan data transaksi tersedia.
          {dashboard.error ? <div className="small mt-1">{(dashboard.error as any)?.message ?? ''}</div> : null}
        </Alert>
      ) : null}

      {data ? (
        <>
          {grade ? (
            <section className={`owner-status-strip owner-status-${grade.tone} mb-3`}>
              <span className="owner-grade-badge">{grade.label}</span>
              <div className="owner-status-copy">
                <span>Kondisi bulan ini</span>
                <strong>{data.headline}</strong>
              </div>
              <div className="owner-status-meta">
                <span>Periode</span>
                <strong>{selectedPeriodLabel}</strong>
              </div>
            </section>
          ) : null}

          {statusCards.length ? <OwnerStatusStrip cards={statusCards} onNavigate={navigate} /> : null}

          <OwnerActionStrip signals={data.signals} onNavigate={navigate} />

          <Row className="g-3 mb-3">
            <Col xs={12} sm={6} xl={3}>
              <OwnerKpiCard label="Pendapatan" value={formatCompactRupiah(data.kpi.totalRevenueRupiah)} change={changeLabel(data.kpi.totalRevenueChangePercent)} tone="revenue" />
            </Col>
            <Col xs={12} sm={6} xl={3}>
              <OwnerKpiCard label="Laba Bersih" value={formatCompactRupiah(data.kpi.netProfitRupiah)} change={changeLabel(data.kpi.netProfitChangePercent)} detail={`Margin ${data.kpi.netProfitMarginPercent}%`} tone="profit" />
            </Col>
            <Col xs={12} sm={6} xl={3}>
              <OwnerKpiCard label="Okupansi" value={`${data.kpi.occupancyRatePercent}%`} change={changeLabel(data.kpi.occupancyRateChangePercent)} tone="occupancy" />
            </Col>
            <Col xs={12} sm={6} xl={3}>
              <OwnerKpiCard label="Kas Bersih" value={formatCompactRupiah(data.kpi.netCashFlowRupiah)} change={changeLabel(data.kpi.netCashFlowChangePercent)} tone="cash" />
            </Col>
          </Row>

          {/* H4: AssistantPanel sinyal urgent — hanya tampil bila ada item */}
          {ownerAssistantItems.length > 0 ? (
            <AssistantPanel
              title="Sinyal Operasional"
              subtitle="Aksi prioritas dari data keuangan dan operasional bisnis."
              items={ownerAssistantItems}
              emptyTitle="Tidak ada sinyal urgent"
              emptyMessage="Semua flow keuangan dan operasional aman."
              maxItems={4}
              collapsible={false}
            />
          ) : null}

          <Row className="g-3 mb-3">
            <Col lg={7}>
              <section className="owner-panel h-100">
                <div className="owner-panel-heading">
                  <div>
                    <span className="owner-section-kicker">Prioritas</span>
                    <h2>Butuh perhatian</h2>
                  </div>
                  <Badge bg={data.signals.length === 0 ? 'success' : 'warning'}>{data.signals.length === 0 ? 'Aman' : `${data.signals.length} sinyal`}</Badge>
                </div>
                <div className="owner-panel-body">
                  {data.signals.length === 0 ? (
                    <p className="owner-empty-state mb-0">Tidak ada tindak lanjut mendesak pada periode ini.</p>
                  ) : (
                    <div className="owner-signal-list">
                      {data.signals.map((signal, index) => (
                        <button key={`${signal.type}-${index}`} type="button" className="owner-signal-item" onClick={() => navigate(signal.route)}>
                          <span className={`owner-signal-dot owner-signal-${signal.type}`} aria-hidden="true" />
                          <span className="owner-signal-content">
                            <strong>{signal.type === 'overdue' ? 'Tagihan overdue' : signal.type === 'pending_payment' ? 'Pembayaran pending' : 'Tagihan outstanding'}</strong>
                            <small>{signal.count} item{signal.totalRupiah ? ` - Rp ${formatRupiah(signal.totalRupiah)}` : ''}</small>
                          </span>
                          <span className="owner-signal-arrow" aria-hidden="true">&rsaquo;</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </Col>

            <Col lg={5}>
              <section className="owner-panel owner-ai-panel h-100">
                <div className="owner-panel-heading">
                  <div>
                    <span className="owner-section-kicker">Ringkasan otomatis</span>
                    <h2>Analisis AI</h2>
                  </div>
                </div>
                <div className="owner-panel-body owner-ai-body">
                  <div className="owner-ai-context">
                    <span>Skor bisnis<strong>{data.score}</strong></span>
                    <span>Periode<strong>{selectedPeriodLabel}</strong></span>
                  </div>
                  <AiAssistButton
                    label="Buat analisis"
                    loadingLabel="Menganalisis..."
                    run={() => createBusinessNarrative({
                      period: selectedPeriodLabel,
                      metrics: {
                        score: data.score,
                        overdueRupiah: data.signals.find((signal) => signal.type === 'overdue')?.totalRupiah ?? 0,
                        pendingPaymentCount: data.signals.find((signal) => signal.type === 'pending_payment')?.count ?? 0,
                        occupancyRatePercent: data.kpi.occupancyRatePercent,
                      },
                    })}
                    renderResult={(result) => (
                      <Alert variant="light" className="owner-ai-result mb-0 small">
                        <div className="fw-semibold">{result.title}</div>
                        <div>{result.summary}</div>
                        {result.recommendations?.length > 0 ? (
                          <ul className="mb-0 mt-2 ps-3">
                            {result.recommendations.map((item, idx) => <li key={idx}>{item}</li>)}
                          </ul>
                        ) : null}
                      </Alert>
                    )}
                  />
                </div>
              </section>
            </Col>
          </Row>

          {/* H5: Quick-action buttons — tampil di semua mode (compact & full) */}
          <div className="d-flex gap-2 flex-wrap mb-3">
            <Button size="sm" variant="outline-primary" onClick={() => navigate('/reports')}>📊 Buka Laporan</Button>
            <Button size="sm" variant="outline-secondary" onClick={() => navigate('/admin-dashboard')}>🛠️ Buka Area Admin</Button>
            <Button size="sm" variant="outline-info" onClick={() => navigate('/market-analysis')}>🧭 Analisa Pasar</Button>
          </div>

          {/* G1: Owner Executive Brief AI */}
          <Row className="mb-3">
            <Col xs={12}>
              <section className="owner-panel owner-ai-panel">
                <div className="owner-panel-heading">
                  <h2>Ringkasan Bisnis AI</h2>
                </div>
                <div className="owner-panel-body p-3">
                  <AiAssistButton<BriefResult>
                    label="Buat Brief AI"
                    loadingLabel="Menganalisa dengan DeepSeek..."
                    variant="primary"
                    run={generateBrief}
                    renderResult={(result) => (
                      <AiResultPanel
                        title="Ringkasan Bisnis"
                        mode={result.mode}
                        fallback={result.fallback}
                        warnings={result.warnings}
                        missingData={result.missingData}
                        usage={result.usage}
                        model={result.model}
                      >
                        <p className="fw-medium mb-2">{result.result?.summary}</p>

                        {result.result?.priorityActions?.length > 0 ? (
                          <div className="mb-2">
                            <div className="small fw-semibold text-muted mb-1">Aksi Prioritas</div>
                            {result.result.priorityActions.map((a, i) => (
                              <div key={i} className="d-flex align-items-center gap-2 mb-1 small">
                                <span className={`badge bg-${a.severity === 'CRITICAL' ? 'danger' : a.severity === 'HIGH' ? 'warning' : a.severity === 'MEDIUM' ? 'info' : 'secondary'}`}>
                                  {a.severity}
                                </span>
                                <span>{a.title}</span>
                                <span className="text-muted">— {a.reason}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {result.result?.risks?.length > 0 ? (
                          <div className="mb-2">
                            <div className="small fw-semibold text-muted mb-1">Risiko</div>
                            {result.result.risks.map((r, i) => (
                              <div key={i} className="small mb-1">⚠️ <strong>{r.title}</strong> — {r.impact}. <em>Mitigasi: {r.mitigation}</em></div>
                            ))}
                          </div>
                        ) : null}

                        {result.result?.numbersToWatch?.length > 0 ? (
                          <div className="mb-2">
                            <div className="small fw-semibold text-muted mb-1">Angka Penting</div>
                            {result.result.numbersToWatch.map((n, i) => (
                              <div key={i} className="small mb-1">📊 <strong>{n.label}:</strong> {n.value} — {n.why}</div>
                            ))}
                          </div>
                        ) : null}
                      </AiResultPanel>
                    )}
                  />
                </div>
              </section>
            </Col>
          </Row>

          {/* H5: tren chart hanya tampil di mode Lengkap — compact mode menyembunyikan ini */}
          {viewMode === 'full' ? (
          <section className="owner-panel owner-trend-panel mb-3">
            <div className="owner-panel-heading owner-trend-heading">
              <div>
                <span className="owner-section-kicker">Analisis periode</span>
                <h2>Tren pendapatan dan biaya</h2>
              </div>
              <div className="owner-chart-controls">
                <div className="owner-segmented" aria-label="Rentang tren">
                  {[1, 3, 6, 12].map((months) => (
                    <button key={months} type="button" className={trendMonths === months ? 'active' : ''} aria-pressed={trendMonths === months} onClick={() => setTrendMonths(months)}>
                      {months === 12 ? '1 thn' : `${months} bln`}
                    </button>
                  ))}
                </div>
                <div className="owner-segmented" aria-label="Tampilan grafik">
                  <button type="button" className={chartMode === 'line' ? 'active' : ''} aria-pressed={chartMode === 'line'} onClick={() => setChartMode('line')}>Garis</button>
                  <button type="button" className={chartMode === 'bar' ? 'active' : ''} aria-pressed={chartMode === 'bar'} onClick={() => setChartMode('bar')}>Batang</button>
                </div>
                <Form.Check type="switch" id="owner-best-fit" label="Garis tren" checked={showBestFit} onChange={() => setShowBestFit((current) => !current)} />
              </div>
            </div>
            <div className="owner-panel-body">
              {trendData.length === 0 ? (
                <div className="owner-empty-state text-center py-4">Data tren tidak tersedia.</div>
              ) : (
                <div className="owner-chart-stage">
                  <TrendChart data={trendData} mode={chartMode} showBestFit={showBestFit} />
                </div>
              )}
              <div className="owner-chart-legend">
                <span><i className="owner-swatch owner-swatch-revenue" />Pendapatan</span>
                <span><i className="owner-swatch owner-swatch-expense" />Pengeluaran</span>
                <span><i className="owner-swatch owner-swatch-profit" />Laba Bersih</span>
                {showBestFit ? <span><i className="owner-swatch owner-swatch-trend" />Tren Pendapatan</span> : null}
              </div>
            </div>
          </section>
          ) : null}
        </>
      ) : null}
    </Container>
  );
}
