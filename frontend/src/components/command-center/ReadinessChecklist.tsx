import { Card } from 'react-bootstrap';
import StatusBadge from '../common/StatusBadge';

export type ReadinessItem = {
  id: string | number;
  label: string;
  description?: string;
  state: 'pass' | 'warn' | 'block' | 'info';
};

const stateMeta = {
  pass: { icon: '✅', status: 'SUCCESS', label: 'Siap' },
  warn: { icon: '⚠️', status: 'WARNING', label: 'Cek' },
  block: { icon: '⛔', status: 'DANGER', label: 'Block' },
  info: { icon: 'ℹ️', status: 'INFO', label: 'Info' },
};

export default function ReadinessChecklist({
  title = 'Readiness Checklist',
  subtitle = 'Checklist sederhana sebelum aksi final dijalankan.',
  items,
}: {
  title?: string;
  subtitle?: string;
  items: ReadinessItem[];
}) {
  return (
    <Card className="content-card readiness-card border-0 mb-4">
      <Card.Body>
        <div className="table-meta">
          <div>
            <div className="panel-title">{title}</div>
            <div className="panel-subtitle">{subtitle}</div>
          </div>
        </div>
        <div className="readiness-list">
          {items.map((item) => {
            const meta = stateMeta[item.state];
            return (
              <div className={`readiness-item readiness-${item.state}`} key={item.id}>
                <div className="readiness-icon">{meta.icon}</div>
                <div className="readiness-body">
                  <div className="fw-semibold">{item.label}</div>
                  {item.description ? <div className="text-muted small">{item.description}</div> : null}
                </div>
                <StatusBadge status={meta.status} customLabel={meta.label} />
              </div>
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
}
