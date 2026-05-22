import { useState } from 'react';
import { Alert, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import StaffPerformanceCategoryCard from '../../components/staff/StaffPerformanceCategoryCard';
import StaffKpiBreakdown from '../../components/staff/StaffKpiBreakdown';
import StaffMonthlyEvidenceTable from '../../components/staff/StaffMonthlyEvidenceTable';
import StaffAuditResultBadge from '../../components/staff/StaffAuditResultBadge';
import StaffIntelligencePanel from '../../components/staff/StaffIntelligencePanel';
import StaffReportPrintView from '../../components/staff/StaffReportPrintView';
import StaffReportPrintButton from '../../components/staff/StaffReportPrintButton';
import { fetchMyStaffPerformanceEvidence } from '../../api/staffPerformance';

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function StaffMonthlyReportPage() {
  const [month, setMonth] = useState(currentMonth());
  const query = useQuery({
    queryKey: ['staff-performance-me-evidence', month],
    queryFn: () => fetchMyStaffPerformanceEvidence(month),
    staleTime: 60_000,
  });

  const performance = query.data;
  const audits = performance?.audits ?? [];
  const reviews = performance?.tenantReviews?.items ?? [];

  return (
    <div className="staff-report-page">
      <PageHeader
        eyebrow="Bukti Kerja"
        title="Laporan Saya"
        description="Bukti kerja bulanan. Halaman ini bukan untuk mulai tugas, hanya untuk melihat pekerjaan yang sudah tercatat."
        secondaryAction={
          <div className="staff-report-header-actions no-print">
            <Form.Control type="month" value={month} onChange={(event) => setMonth(event.currentTarget.value)} style={{ maxWidth: 190 }} />
            <StaffReportPrintButton disabled={!performance} />
          </div>
        }
      />

      {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
      {query.isError ? <Alert variant="danger">Laporan bulanan belum bisa dimuat. Coba muat ulang.</Alert> : null}

      {performance ? (
        <>
          <div className="print-only">
            <StaffReportPrintView performance={performance} />
          </div>

          <div className="staff-report-interactive no-print">
            <StaffPerformanceCategoryCard performance={performance} />
            <StaffKpiBreakdown performance={performance} />
            <StaffIntelligencePanel performance={performance} />

          <Row className="g-3 my-1">
            <Col lg={6}>
              <Card className="content-card border-0 h-100">
                <Card.Body>
                  <div className="panel-title mb-1">Review Tenant</div>
                  <div className="panel-subtitle mb-3">Tenant bisa memberi rating setelah pekerjaan terkait tiket selesai.</div>
                  <div className="staff-review-score"><strong>{performance.tenantReviews.averageRating ?? '-'}</strong><span>/5</span><small>{performance.tenantReviews.count} review bulan ini</small></div>
                  {!reviews.length ? <div className="staff-empty-box mt-3"><strong>Belum ada review tenant.</strong><span>Review akan muncul setelah tenant menilai pekerjaan selesai.</span></div> : null}
                  <div className="staff-mini-review-list">
                    {reviews.slice(0, 5).map((review: any) => (
                      <div key={review.id}>
                        <strong>{'⭐'.repeat(Number(review.rating || 0))}</strong>
                        <span>{review.comment || 'Tanpa komentar'}</span>
                        <small>{review.tenant?.fullName || 'Tenant'} · {formatDate(review.createdAt)}</small>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6}>
              <Card className="content-card border-0 h-100">
                <Card.Body>
                  <div className="panel-title mb-1">Audit Admin / Owner</div>
                  <div className="panel-subtitle mb-3">Jika ada pengecekan mendadak, hasilnya menjadi catatan kerja bulan ini.</div>
                  {!audits.length ? <div className="staff-empty-box"><strong>Belum ada audit bulan ini.</strong><span>Audit random akan muncul di sini.</span></div> : null}
                  <div className="staff-mini-audit-list">
                    {audits.slice(0, 6).map((audit: any) => (
                      <div key={audit.id}>
                        <StaffAuditResultBadge result={audit.result} />
                        <span>{audit.notes || 'Tidak ada catatan tambahan.'}</span>
                        <small>{formatDate(audit.createdAt)} · KPI {audit.scoreDelta > 0 ? '+' : ''}{audit.scoreDelta}</small>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

            <StaffMonthlyEvidenceTable performance={performance} />
          </div>
        </>
      ) : null}
    </div>
  );
}
