import type { CSSProperties, ReactNode } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import type { StaffPerformanceSummary } from '../../api/staffPerformance';

type Props = { performance?: StaffPerformanceSummary | null };

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function CircleInfo({ label, value, helper, percent, tone = 'blue' }: { label: string; value: string; helper: string; percent: number; tone?: 'blue' | 'green' | 'amber' | 'red' }) {
  const style = { '--staff-progress': `${clampPercent(percent)}%` } as CSSProperties;
  return (
    <div className={`staff-report-circle-card tone-${tone}`}>
      <div className="staff-report-circle" style={style}><strong>{value}</strong></div>
      <div>
        <span>{label}</span>
        <small>{helper}</small>
      </div>
    </div>
  );
}

function NeedItem({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null;
  return <li>{children}</li>;
}

export default function StaffKpiBreakdown({ performance }: Props) {
  const kpi = performance?.monthlyKpi;
  const score = performance?.score;
  const proofRate = kpi?.proofCompletionRate ?? 0;
  const totalWork = (kpi?.routineDone ?? 0) + (kpi?.ticketsDone ?? 0) + (kpi?.meterCount ?? 0) + (kpi?.stockReports ?? 0) + (kpi?.roomChecks ?? 0);
  const fixNotes = (score?.negativeValue ?? 0) + (kpi?.auditNeedsFix ?? 0) + (kpi?.auditFailed ?? 0);
  const reviewText = performance?.tenantReviews?.averageRating ? `${performance.tenantReviews.averageRating}/5` : '-/5';
  const reviewPercent = performance?.tenantReviews?.averageRating ? (performance.tenantReviews.averageRating / 5) * 100 : 0;
  const auditTotal = (kpi?.auditPass ?? 0) + (kpi?.auditNeedsFix ?? 0) + (kpi?.auditFailed ?? 0);
  const auditPercent = auditTotal ? ((kpi?.auditPass ?? 0) / auditTotal) * 100 : 0;
  const hasNeeds = fixNotes > 0 || proofRate < 80 || !performance?.tenantReviews?.count || auditTotal === 0 || (kpi?.meterCount ?? 0) === 0;

  const chips = [
    { label: 'Pekerjaan rutin', value: kpi?.routineDone ?? 0 },
    { label: 'Tugas lapangan', value: kpi?.ticketsDone ?? 0 },
    { label: 'Catatan meter', value: kpi?.meterCount ?? 0 },
    { label: 'Stok/gudang', value: kpi?.stockReports ?? 0 },
    { label: 'Cek kamar', value: kpi?.roomChecks ?? 0 },
  ];

  return (
    <Card className="staff-report-summary-card border-0">
      <Card.Body>
        <div className="staff-section-head with-action">
          <div>
            <strong>Bukti Kerja Bulanan</strong>
            <small>Ringkasannya dibuat untuk bukti kerja. Detail catatan ada di tabel bawah.</small>
          </div>
          <span className={`staff-repair-pill${fixNotes > 0 ? ' warning' : ''}`}>{fixNotes > 0 ? `${fixNotes} catatan perbaikan` : 'Aman'}</span>
        </div>

        <Row className="g-3 staff-report-circle-grid">
          <Col md={4}><CircleInfo label="Bukti foto lengkap" value={`${proofRate}%`} helper="Untuk pekerjaan yang wajib bukti" percent={proofRate} tone={proofRate >= 80 ? 'green' : proofRate > 0 ? 'amber' : 'red'} /></Col>
          <Col md={4}><CircleInfo label="Review tenant" value={reviewText} helper={`${performance?.tenantReviews?.count ?? 0} review bulan ini`} percent={reviewPercent} tone="blue" /></Col>
          <Col md={4}><CircleInfo label="Pengecekan admin" value={`${kpi?.auditPass ?? 0}/${auditTotal}`} helper={auditTotal ? 'Hasil pengecekan bulan ini' : 'Belum ada pengecekan'} percent={auditPercent} tone={auditTotal > 0 && auditPercent >= 80 ? 'green' : 'amber'} /></Col>
        </Row>

        <div className="staff-report-needs">
          <strong>Hal yang perlu dilengkapi</strong>
          {hasNeeds ? (
            <ul>
              <NeedItem show={proofRate < 80}>Bukti foto belum kuat untuk pekerjaan yang perlu dibuktikan.</NeedItem>
              <NeedItem show={fixNotes > 0}>Ada {fixNotes} catatan perbaikan yang perlu diperhatikan.</NeedItem>
              <NeedItem show={!performance?.tenantReviews?.count}>Belum ada review tenant bulan ini.</NeedItem>
              <NeedItem show={auditTotal === 0}>Belum ada pengecekan bulan ini.</NeedItem>
              <NeedItem show={(kpi?.meterCount ?? 0) === 0}>Belum ada catatan meter listrik/air bulan ini.</NeedItem>
            </ul>
          ) : <span>Semua bukti utama sudah terlihat rapi bulan ini.</span>}
        </div>

        <div className="staff-proof-chip-row" aria-label="Jenis bukti kerja bulan ini">
          <span className="staff-proof-total"><strong>{totalWork}</strong> bukti kerja tercatat</span>
          {chips.map((item) => <span key={item.label}><strong>{item.value}</strong>{item.label}</span>)}
        </div>
      </Card.Body>
    </Card>
  );
}
