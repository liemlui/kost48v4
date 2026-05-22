import { Card } from 'react-bootstrap';
import type { StaffPerformanceSummary } from '../../api/staffPerformance';

type Props = { performance?: StaffPerformanceSummary | null; compact?: boolean };

function buildFocus(performance?: StaffPerformanceSummary | null) {
  if (!performance) return [];
  const kpi = performance.monthlyKpi;
  const score = performance.score;
  const items: { title: string; copy: string; tone: 'good' | 'warn' | 'danger' | 'info' }[] = [];
  if ((score.negativeValue ?? 0) > 0) items.push({ title: 'Lengkapi bukti kerja', copy: `${score.negativeValue} catatan perbaikan terdeteksi. Utamakan foto/catatan untuk pekerjaan yang perlu dicek.`, tone: 'warn' });
  if ((kpi.proofCompletionRate ?? 100) < 80) items.push({ title: 'Bukti foto belum kuat', copy: `Bukti foto lengkap baru ${kpi.proofCompletionRate}%. Foto membuat laporan kerja lebih dipercaya.`, tone: 'warn' });
  if ((kpi.meterCount ?? 0) === 0) items.push({ title: 'Catat meter listrik/air', copy: 'Belum ada catatan meter bulan ini. Catat meter saat jadwal cek kamar atau akhir bulan.', tone: 'info' });
  if ((performance.tenantReviews.count ?? 0) === 0) items.push({ title: 'Review tenant belum masuk', copy: 'Setelah tugas selesai, review tenant akan membantu membuktikan kualitas kerja.', tone: 'info' });
  if ((kpi.auditFailed ?? 0) > 0) items.unshift({ title: 'Ada audit perlu ulang', copy: 'Cek pekerjaan yang belum sesuai dan kerjakan ulang dengan bukti yang jelas.', tone: 'danger' });
  if (!items.length) items.push({ title: 'Pertahankan ritme kerja', copy: 'Data bulan ini stabil. Tetap kerjakan checklist satu per satu dan simpan bukti saat diperlukan.', tone: 'good' });
  return items.slice(0, 4);
}

export default function StaffIntelligencePanel({ performance, compact = false }: Props) {
  const focus = buildFocus(performance);
  const firstFocus = focus[0];

  if (compact) {
    return (
      <Card className="staff-coach-strip border-0">
        <Card.Body>
          <span className="staff-hero-pill">Asisten KOST48</span>
          <div>
            <strong>{performance?.assistant?.title ?? firstFocus?.title ?? 'Arahan hari ini'}</strong>
            <small>{performance?.assistant?.summary ?? firstFocus?.copy ?? 'Kerjakan tugas dari yang paling atas dan simpan bukti bila diminta.'}</small>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="content-card staff-intelligence-panel border-0">
      <Card.Body>
        <div className="smart-panel-header slim">
          <div>
            <span className="staff-hero-pill">Asisten KOST48</span>
            <h3>Catatan Bulanan</h3>
            <p>Ringkasan otomatis dari checklist, tugas, meter, stok, pengecekan admin, dan review tenant.</p>
          </div>
          <div className="smart-audit-scorebox small">
            <strong>{performance?.score.final ?? '-'}</strong>
            <small>/100</small>
          </div>
        </div>
        {performance?.assistant ? (
          <div className="smart-brief-box staff-coach-summary">
            <strong>{performance.assistant.title}</strong>
            <span>{performance.assistant.summary}</span>
          </div>
        ) : null}
        <div className="staff-coach-focus-grid">
          {focus.slice(0, 3).map((item) => (
            <article key={item.title} className={`staff-coach-focus tone-${item.tone}`}>
              <strong>{item.title}</strong>
              <span>{item.copy}</span>
            </article>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}
