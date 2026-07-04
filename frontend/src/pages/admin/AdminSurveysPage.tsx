import { useMemo, useState } from 'react';
import { Alert, Badge, Card, Form, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { getAllSurveys, getSurveySummary, type SurveyItem, type SurveySummary } from '../../api/surveys';

function Stars({ value }: { value: number }) {
  return (
    <span className="e3-text-amber" style={{ letterSpacing: 1 }}>
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </span>
  );
}

function SummaryPanel({ summary }: { summary: SurveySummary | undefined }) {
  if (!summary) return null;
  return (
    <div className="d-flex flex-wrap gap-3 mb-3">
      <Card className="border-0 flex-fill e3-minw-140">
        <Card.Body className="py-2 px-3 text-center">
          <div className="text-muted small">Total Survei</div>
          <div className="fw-bold fs-4">{summary.count}</div>
        </Card.Body>
      </Card>
      <Card className="border-0 flex-fill e3-minw-140">
        <Card.Body className="py-2 px-3 text-center">
          <div className="text-muted small">Rata-rata Keseluruhan</div>
          <div className="fw-bold fs-4">{summary.avgOverall ?? '—'} <span className="e3-text-amber">★</span></div>
        </Card.Body>
      </Card>
      <Card className="border-0 flex-fill e3-minw-140">
        <Card.Body className="py-2 px-3 text-center">
          <div className="text-muted small">Rekomendasi</div>
          <div className="fw-bold fs-4">{summary.recommendRate ?? '—'}%</div>
        </Card.Body>
      </Card>
      <Card className="border-0 flex-fill e3-minw-140">
        <Card.Body className="py-2 px-3 text-center">
          <div className="text-muted small">Kebersihan</div>
          <div className="fw-bold fs-4">{summary.avgCleanliness ?? '—'} ★</div>
        </Card.Body>
      </Card>
      <Card className="border-0 flex-fill e3-minw-140">
        <Card.Body className="py-2 px-3 text-center">
          <div className="text-muted small">Pelayanan Staf</div>
          <div className="fw-bold fs-4">{summary.avgStaffService ?? '—'} ★</div>
        </Card.Body>
      </Card>
      <Card className="border-0 flex-fill e3-minw-140">
        <Card.Body className="py-2 px-3 text-center">
          <div className="text-muted small">Fasilitas</div>
          <div className="fw-bold fs-4">{summary.avgFacility ?? '—'} ★</div>
        </Card.Body>
      </Card>
      <Card className="border-0 flex-fill e3-minw-140">
        <Card.Body className="py-2 px-3 text-center">
          <div className="text-muted small">Harga Sepadan</div>
          <div className="fw-bold fs-4">{summary.avgValueForMoney ?? '—'} ★</div>
        </Card.Body>
      </Card>
    </div>
  );
}

function RecentComments({ summary }: { summary: SurveySummary | undefined }) {
  if (!summary?.recentComments?.length) return null;
  return (
    <Card className="content-card border-0 mb-3">
      <Card.Header className="bg-white"><strong>💬 Komentar Terbaru</strong></Card.Header>
      <Card.Body className="p-0">
        {summary.recentComments.map((c) => (
          <div key={c.id} className="border-bottom p-3">
            <div className="d-flex align-items-center gap-2 mb-1">
              <Stars value={c.overallRating} />
              <small className="text-muted">{(() => { const d = new Date(c.createdAt); return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); })()}</small>
            </div>
            <p className="mb-0 small">{c.comment || '(tanpa komentar)'}</p>
          </div>
        ))}
      </Card.Body>
    </Card>
  );
}

export default function AdminSurveysPage() {
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');

  const listQuery = useQuery({ queryKey: ['admin-surveys'], queryFn: getAllSurveys });
  const summaryQuery = useQuery({ queryKey: ['survey-summary'], queryFn: getSurveySummary });

  const items: SurveyItem[] = listQuery.data ?? [];

  const filtered = useMemo(() => {
    let result = [...items];
    if (filterRating !== 'all') {
      result = result.filter((s) => s.overallRating === filterRating);
    }
    switch (sortBy) {
      case 'highest':
        result.sort((a, b) => {
          const ratingDiff = b.overallRating - a.overallRating;
          if (ratingDiff !== 0) return ratingDiff;
          const da = new Date(a.createdAt).getTime();
          const db = new Date(b.createdAt).getTime();
          if (isNaN(da) || isNaN(db)) return 0;
          return db - da;
        });
        break;
      case 'lowest':
        result.sort((a, b) => {
          const ratingDiff = a.overallRating - b.overallRating;
          if (ratingDiff !== 0) return ratingDiff;
          const da = new Date(a.createdAt).getTime();
          const db = new Date(b.createdAt).getTime();
          if (isNaN(da) || isNaN(db)) return 0;
          return db - da;
        });
        break;
      default:
        result.sort((a, b) => {
          const da = new Date(a.createdAt).getTime();
          const db = new Date(b.createdAt).getTime();
          if (isNaN(da) || isNaN(db)) return 0;
          return db - da;
        });
    }
    return result;
  }, [items, filterRating, sortBy]);

  const recommendCount = items.filter((s) => s.wouldRecommend === true).length;
  const notRecommendCount = items.filter((s) => s.wouldRecommend === false).length;

  return (
    <div className="container py-4">
      <PageHeader
        eyebrow="Ulasan & Kepuasan"
        title="Survei Kepuasan Penghuni"
        description={`${items.length} survei terkumpul · 👍 ${recommendCount} rekomendasi · 👎 ${notRecommendCount} belum merekomendasikan`}
      />

      {listQuery.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
      {listQuery.isError ? <Alert variant="danger">Gagal memuat data survei.</Alert> : null}

      {/* Ringkasan agregat */}
      {summaryQuery.data ? <SummaryPanel summary={summaryQuery.data} /> : null}

      {/* Komentar terbaru */}
      <RecentComments summary={summaryQuery.data} />

      {/* Tabel daftar survei */}
      <Card className="content-card border-0">
        <Card.Header className="bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
          <strong>📋 Daftar Survei</strong>
          <div className="d-flex gap-2">
            <Form.Select size="sm" value={filterRating} onChange={(e) => setFilterRating(e.target.value === 'all' ? 'all' : Number(e.target.value))} style={{ width: 'auto' }}>
              <option value="all">Semua Rating</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{'★'.repeat(n)} ({items.filter((s) => s.overallRating === n).length})</option>
              ))}
            </Form.Select>
            <Form.Select size="sm" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} style={{ width: 'auto' }}>
              <option value="newest">Terbaru</option>
              <option value="highest">Rating Tertinggi</option>
              <option value="lowest">Rating Terendah</option>
            </Form.Select>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {!filtered.length && !listQuery.isLoading ? (
            <div className="p-4">
              <EmptyState icon="📭" title="Belum ada survei" description="Penghuni belum mengisi survei kepuasan." />
            </div>
          ) : (
            <Table hover responsive className="mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Rating</th>
                  <th>Aspek</th>
                  <th>Rekomendasi</th>
                  <th>Komentar</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr key={s.id}>
                    <td className="text-muted small">{idx + 1}</td>
                    <td><Stars value={s.overallRating} /></td>
                    <td className="small">
                      {s.cleanliness ? <div>Kebersihan: <Stars value={s.cleanliness} /></div> : null}
                      {s.staffService ? <div>Staf: <Stars value={s.staffService} /></div> : null}
                      {s.facility ? <div>Fasilitas: <Stars value={s.facility} /></div> : null}
                      {s.valueForMoney ? <div>Harga: <Stars value={s.valueForMoney} /></div> : null}
                      {!s.cleanliness && !s.staffService && !s.facility && !s.valueForMoney ? <span className="text-muted">—</span> : null}
                    </td>
                    <td>
                      {s.wouldRecommend === true ? <Badge bg="success">👍 Ya</Badge> : s.wouldRecommend === false ? <Badge bg="secondary">👎 Belum</Badge> : <span className="text-muted">—</span>}
                    </td>
                    <td className="small e3-maxw-320">
                      {s.comment ? <span>{s.comment.length > 120 ? `${s.comment.slice(0, 120)}…` : s.comment}</span> : <span className="text-muted">—</span>}
                    </td>
                    <td className="small text-muted text-nowrap">{(() => { const d = new Date(s.createdAt); return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); })()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
