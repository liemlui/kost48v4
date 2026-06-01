import { Card } from 'react-bootstrap';
import type { StaffPerformanceSummary } from '../../api/staffPerformance';
import DonutGauge from '../charts/DonutGauge';

type Props = {
  performance?: StaffPerformanceSummary | null;
  compact?: boolean;
};

function toneClass(tone?: string) {
  if (tone === 'danger') return 'danger';
  if (tone === 'warning') return 'warning';
  if (tone === 'success') return 'success';
  return 'primary';
}

function netKpi(score?: StaffPerformanceSummary['score']) {
  const explicit = Number((score as any)?.netKpi);
  if (Number.isFinite(explicit)) return explicit;
  return (score?.positiveValue ?? 0) - (score?.negativeValue ?? 0);
}

export default function StaffPerformanceCategoryCard({ performance, compact = false }: Props) {
  const category = performance?.category;
  const score = Math.min(100, Math.max(0, performance?.score.final ?? 0));
  const bonus = netKpi(performance?.score);
  const tone = toneClass(category?.tone);

  return (
    <Card className={`staff-performance-category-card border-0 tone-${tone}${compact ? ' compact mini' : ''}`}>
      <Card.Body>
        <div className="staff-performance-score-row">
          <div>
            <span className="staff-hero-pill">Kinerja Bulan Ini</span>
            <h3>{category?.label ?? 'Belum ada data'}</h3>
            {!compact ? <p>{category?.copy ?? 'Kinerja akan muncul setelah checklist, tugas, meter, atau audit tercatat.'}</p> : null}
            <div className="staff-score-meta-row">
              <span>Skor <strong>{score}/100</strong></span>
              <span>Nilai kerja <strong>{bonus >= 0 ? '+' : ''}{bonus}</strong></span>
            </div>
          </div>
          <DonutGauge
            value={score}
            center={<><strong>{score}</strong><small>/100</small></>}
            ariaLabel={`Skor ${score} dari 100`}
            size={86}
            innerRadius={29}
            outerRadius={41}
            className="staff-performance-score-circle"
          />
        </div>
      </Card.Body>
    </Card>
  );
}
