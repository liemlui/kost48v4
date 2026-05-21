import { Card } from 'react-bootstrap';
import StatusBadge from '../common/StatusBadge';

export type TimelineStep = {
  id: string | number;
  label: string;
  description?: string;
  status: 'done' | 'active' | 'pending' | 'blocked';
};

const statusMeta = {
  done: { status: 'SUCCESS', label: 'Selesai' },
  active: { status: 'INFO', label: 'Aktif' },
  pending: { status: 'WARNING', label: 'Menunggu' },
  blocked: { status: 'DANGER', label: 'Block' },
};

export default function LifecycleTimeline({ title = 'Timeline Proses', subtitle, steps }: { title?: string; subtitle?: string; steps: TimelineStep[] }) {
  return (
    <Card className="content-card lifecycle-card border-0 mb-4">
      <Card.Body>
        <div className="table-meta">
          <div>
            <div className="panel-title">{title}</div>
            {subtitle ? <div className="panel-subtitle">{subtitle}</div> : null}
          </div>
        </div>
        <div className="lifecycle-timeline">
          {steps.map((step) => {
            const meta = statusMeta[step.status];
            return (
              <div className={`timeline-step timeline-${step.status}`} key={step.id}>
                <div className="timeline-dot" />
                <div className="timeline-content">
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                    <div className="fw-semibold">{step.label}</div>
                    <StatusBadge status={meta.status} customLabel={meta.label} />
                  </div>
                  {step.description ? <div className="text-muted small">{step.description}</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
}
