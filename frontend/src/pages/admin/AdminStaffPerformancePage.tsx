import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '../../components/common/PageHeader';
import PaginationControls from '../../components/common/PaginationControls';
import StaffAuditModal from '../../components/admin/StaffAuditModal';
import AdminSmartAuditPanel from '../../components/admin/AdminSmartAuditPanel';
import DonutGauge from '../../components/charts/DonutGauge';
import { fetchAdminStaffAuditSuggestions, fetchAdminStaffPerformance, type StaffPerformanceSummary } from '../../api/staffPerformance';

const CATEGORY_COLORS: Record<string, string> = {
  'Sangat Baik': '#16a34a',
  'Baik': '#2563eb',
  'Cukup': '#0ea5e9',
  'Perlu Dibantu': '#f59e0b',
  'Perlu Diawasi': '#ef4444',
};

function StaffAnalyticsPanel({ items, summary }: { items: StaffPerformanceSummary[]; summary: { totalStaff: number; veryGood: number; needWatch: number; negativeValue: number } }) {
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const label = item.category.label;
      counts[label] = (counts[label] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value, color: CATEGORY_COLORS[label] ?? '#94a3b8' }))
      .sort((a, b) => b.value - a.value);
  }, [items]);

  const kpiData = useMemo(() => {
    const totals = { routineDone: 0, ticketsDone: 0, meterCount: 0, stockReports: 0, roomChecks: 0 };
    items.forEach((item) => {
      totals.routineDone += item.monthlyKpi.routineDone ?? 0;
      totals.ticketsDone += item.monthlyKpi.ticketsDone ?? 0;
      totals.meterCount += item.monthlyKpi.meterCount ?? 0;
      totals.stockReports += item.monthlyKpi.stockReports ?? 0;
      totals.roomChecks += item.monthlyKpi.roomChecks ?? 0;
    });
    return [
      { label: 'Checklist', value: totals.routineDone, color: '#2563eb' },
      { label: 'Tugas', value: totals.ticketsDone, color: '#16a34a' },
      { label: 'Meter', value: totals.meterCount, color: '#0ea5e9' },
      { label: 'Stok', value: totals.stockReports, color: '#7c3aed' },
      { label: 'Cek Kamar', value: totals.roomChecks, color: '#f59e0b' },
    ];
  }, [items]);

  const auditData = useMemo(() => {
    let pass = 0, needsFix = 0, failed = 0;
    items.forEach((item) => {
      pass += item.monthlyKpi.auditPass ?? 0;
      needsFix += item.monthlyKpi.auditNeedsFix ?? 0;
      failed += item.monthlyKpi.auditFailed ?? 0;
    });
    return [
      { name: 'Lulus', value: pass, color: '#16a34a' },
      { name: 'Perlu Perbaikan', value: needsFix, color: '#f59e0b' },
      { name: 'Gagal', value: failed, color: '#ef4444' },
    ].filter((d) => d.value > 0);
  }, [items]);

  const avgScore = items.length ? Math.round(items.reduce((s, i) => s + (i.score.final ?? 0), 0) / items.length) : 0;
  const auditTotal = auditData.reduce((s, d) => s + d.value, 0);
  const auditPassRate = auditTotal ? Math.round((auditData[0]?.value ?? 0) / auditTotal * 100) : 0;

  if (items.length === 0) return null;

  return (
    <Row className="g-3 mb-3 staff-analytics-row">
      <Col md={4}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Distribusi Kategori</div>
            <div className="panel-subtitle mb-2">Komposisi kinerja tim bulan ini</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart layout="vertical" data={categoryData} margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
                <CartesianGrid horizontal={false} stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={110} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`${Number(value ?? 0)} staff`, '']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} background={{ fill: 'rgba(148,163,184,0.10)' }}>
                  {categoryData.map((d) => <Cell key={d.label} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Aktivitas Tim</div>
            <div className="panel-subtitle mb-2">Total pekerjaan terdokumentasi bulan ini</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart layout="vertical" data={kpiData} margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
                <CartesianGrid horizontal={false} stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={72} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`${Number(value ?? 0)} kegiatan`, '']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} background={{ fill: 'rgba(148,163,184,0.10)' }}>
                  {kpiData.map((d) => <Cell key={d.label} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Skor & Audit</div>
            <div className="panel-subtitle mb-2">Rata-rata skor dan hasil audit tim</div>
            <div className="staff-score-audit-grid">
              <DonutGauge
                value={avgScore}
                center={<><strong>{avgScore}</strong><small>/100</small></>}
                ariaLabel={`Rata-rata skor tim: ${avgScore}/100`}
                size={90}
                innerRadius={30}
                outerRadius={43}
                color="#2563eb"
                trackColor="rgba(37,99,235,0.10)"
                className="staff-score-gauge-mini"
              />
              <div className="staff-audit-mini-legend">
                <span className="staff-audit-label-head">Audit bulan ini</span>
                {auditData.length > 0 ? auditData.map((d) => (
                  <span key={d.name} className="staff-audit-legend-item">
                    <i style={{ background: d.color }} />
                    {d.name}: <strong>{d.value}</strong>
                  </span>
                )) : <span className="text-muted small">Belum ada audit</span>}
                {auditTotal > 0 && <span className="staff-audit-pass-rate">Pass rate: <strong>{auditPassRate}%</strong></span>}
              </div>
            </div>
            {auditData.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <ResponsiveContainer width="100%" height={48}>
                  <PieChart>
                    <Pie data={auditData} dataKey="value" cx="50%" cy="50%" innerRadius={14} outerRadius={22} startAngle={90} endAngle={-270} stroke="none">
                      {auditData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function AdminStaffPerformancePage() {
  const [month, setMonth] = useState(currentMonth());
  const [selected, setSelected] = useState<StaffPerformanceSummary | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const query = useQuery({ queryKey: ['admin-staff-performance', month], queryFn: () => fetchAdminStaffPerformance(month), staleTime: 60_000 });
  const suggestionsQuery = useQuery({ queryKey: ['admin-staff-audit-suggestions', month], queryFn: () => fetchAdminStaffAuditSuggestions(month), staleTime: 60_000 });
  const items = query.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const visibleItems = useMemo(() => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [items, page]);

  useEffect(() => {
    setPage(1);
  }, [month]);

  return (
    <div>
      <PageHeader
        eyebrow="Akuntabilitas Staff"
        title="Kinerja Staff"
        description="Monitoring kinerja staff dari checklist, tugas, meter listrik/air, laporan stok, audit random, dan ulasan penghuni."
        secondaryAction={<Form.Control type="month" value={month} onChange={(event) => setMonth(event.currentTarget.value)} style={{ maxWidth: 190 }} />}
      />

      {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
      {query.isError ? <Alert variant="danger">Data kinerja staff belum bisa dimuat.</Alert> : null}

      {query.data ? (
        <div className="staff-admin-summary-grid">
          <Card className="border-0"><Card.Body><span>Total staff</span><strong>{query.data.summary.totalStaff}</strong><small>Staff aktif</small></Card.Body></Card>
          <Card className="border-0"><Card.Body><span>Sangat baik</span><strong>{query.data.summary.veryGood}</strong><small>Kinerja kuat</small></Card.Body></Card>
          <Card className="border-0"><Card.Body><span>Perlu dibantu/diawasi</span><strong>{query.data.summary.needWatch}</strong><small>Butuh follow-up</small></Card.Body></Card>
          <Card className="border-0"><Card.Body><span>Sinyal negatif</span><strong>{query.data.summary.negativeValue}</strong><small>Audit gagal/bukti kurang</small></Card.Body></Card>
        </div>
      ) : null}

      {query.data && items.length > 0 && (
        <StaffAnalyticsPanel items={items} summary={query.data.summary} />
      )}

      {/* Complaint Alert Panel */}
      {items.length > 0 && (() => {
        const lowRatingStaff = items.filter((item) => {
          const avg = item.tenantReviews?.averageRating;
          return avg !== null && avg !== undefined && Number(avg) > 0 && Number(avg) < 3;
        });
        const noProofStaff = items.filter((item) => (item.monthlyKpi?.proofCompletionRate ?? 0) < 50 && (item.monthlyKpi?.routineDone ?? 0) > 0);
        const hasAlerts = lowRatingStaff.length > 0 || noProofStaff.length > 0;
        if (!hasAlerts) return null;
        return (
          <Card className="content-card border-0 mb-3 staff-complaint-alert-card">
            <Card.Body>
              <div className="table-meta mb-3">
                <div>
                  <div className="panel-title text-danger">⚠️ Perlu Perhatian Admin</div>
                  <div className="panel-subtitle">Staff dengan rating rendah atau bukti kerja kurang lengkap bulan ini.</div>
                </div>
              </div>
              {lowRatingStaff.length > 0 && (
                <div className="staff-alert-section mb-3">
                  <div className="staff-alert-section-head">
                    <span className="staff-alert-badge danger">Rating Rendah (&lt;3⭐)</span>
                    <small>{lowRatingStaff.length} staff</small>
                  </div>
                  <div className="staff-alert-grid">
                    {lowRatingStaff.map((item) => (
                      <div key={item.staff.id} className="staff-alert-chip danger">
                        <strong>{item.staff.fullName}</strong>
                        <span>Avg: {Number(item.tenantReviews?.averageRating ?? 0).toFixed(1)}/5 · {item.tenantReviews?.count ?? 0} review</span>
                        <button type="button" onClick={() => setSelected(item)}>Audit →</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {noProofStaff.length > 0 && (
                <div className="staff-alert-section">
                  <div className="staff-alert-section-head">
                    <span className="staff-alert-badge warning">Bukti Kerja &lt;50%</span>
                    <small>{noProofStaff.length} staff</small>
                  </div>
                  <div className="staff-alert-grid">
                    {noProofStaff.map((item) => (
                      <div key={item.staff.id} className="staff-alert-chip warning">
                        <strong>{item.staff.fullName}</strong>
                        <span>Bukti: {item.monthlyKpi?.proofCompletionRate ?? 0}% · {item.monthlyKpi?.routineDone ?? 0} checklist</span>
                        <button type="button" onClick={() => setSelected(item)}>Audit →</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        );
      })()}

      <AdminSmartAuditPanel data={suggestionsQuery.data} isLoading={suggestionsQuery.isLoading} isError={suggestionsQuery.isError} staffItems={items} onAudit={setSelected} />

      <Card className="content-card border-0 my-3">
        <Card.Body>
          <div className="table-meta">
            <div>
              <div className="panel-title">Daftar Kinerja Staff</div>
              <div className="panel-subtitle">Klik audit untuk mencatat hasil pengecekan mendadak.</div>
            </div>
            <span className="table-meta-count">{items.length} staff</span>
          </div>
          {!items.length && !query.isLoading ? <div className="staff-empty-box mt-3"><strong>Belum ada data staff.</strong><span>Data akan muncul setelah user staff aktif tersedia.</span></div> : null}
          {items.length ? (
            <Table responsive hover className="mt-3 staff-performance-table">
              <thead><tr><th>Staff</th><th>Kategori</th><th>Skor</th><th>Checklist</th><th>Tugas</th><th>Meter</th><th>Rating Penghuni</th><th>Sinyal</th><th>Aksi</th></tr></thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.staff.id}>
                    <td><div className="fw-semibold">{item.staff.fullName}</div><div className="small text-muted">{item.staff.email}</div></td>
                    <td><span className={`staff-audit-badge audit-${item.category.tone}`}>{item.category.label}</span></td>
                    <td><strong>{item.score.final}</strong></td>
                    <td>{item.monthlyKpi.routineDone}</td>
                    <td>{item.monthlyKpi.ticketsDone}</td>
                    <td>{item.monthlyKpi.meterCount}</td>
                    <td>
                      {item.tenantReviews.averageRating !== null && item.tenantReviews.averageRating !== undefined ? (
                        <span className={Number(item.tenantReviews.averageRating) < 3 ? 'text-danger fw-bold' : ''}>
                          {Number(item.tenantReviews.averageRating) < 3 ? '⚠️ ' : ''}
                          {Number(item.tenantReviews.averageRating).toFixed(1)}
                        </span>
                      ) : '-'}
                      <span className="small text-muted ms-1">({item.tenantReviews.count})</span>
                    </td>
                    <td>
                      <span className={item.score.negativeValue > 0 ? 'text-danger fw-semibold' : 'text-muted'}>
                        {item.score.negativeValue > 0 ? `⛔ ${item.score.negativeValue}` : item.score.negativeValue}
                      </span>
                    </td>
                    <td><Button size="sm" variant="outline-primary" onClick={() => setSelected(item)}>Audit</Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : null}
          {items.length > PAGE_SIZE ? (
            <div className="mt-3">
              <PaginationControls currentPage={page} totalPages={totalPages} totalItems={items.length} pageSize={PAGE_SIZE} onPageChange={setPage} isLoading={query.isLoading} />
            </div>
          ) : null}
        </Card.Body>
      </Card>

      <StaffAuditModal show={Boolean(selected)} staff={selected} onHide={() => setSelected(null)} />
    </div>
  );
}
