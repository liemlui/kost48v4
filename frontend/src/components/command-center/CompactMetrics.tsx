import { Card, Col, Row } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';

export type MetricChip = {
  id: string | number;
  label: string;
  value: string | number;
  helper?: string;
  status?: string;
  statusLabel?: string;
  icon?: string;
  to?: string;
  onClick?: () => void;
};

function MetricChipCard({ metric }: { metric: MetricChip }) {
  const navigate = useNavigate();
  const clickable = Boolean(metric.to || metric.onClick);

  return (
    <Card
      className={`compact-metric-card border-0 ${clickable ? 'clickable-row' : ''}`.trim()}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={() => metric.onClick ? metric.onClick() : metric.to ? navigate(metric.to) : undefined}
      onKeyDown={(event) => {
        if (!clickable) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          metric.onClick ? metric.onClick() : metric.to ? navigate(metric.to) : undefined;
        }
      }}
    >
      <Card.Body>
        <div className="compact-metric-topline">
          <span className="compact-metric-icon">{metric.icon ?? '•'}</span>
          {metric.status ? <StatusBadge status={metric.status} customLabel={metric.statusLabel} /> : null}
        </div>
        <div className="compact-metric-label">{metric.label}</div>
        <div className="compact-metric-value">{metric.value}</div>
        {metric.helper ? <div className="compact-metric-helper">{metric.helper}</div> : null}
      </Card.Body>
    </Card>
  );
}

export default function CompactMetrics({ metrics }: { metrics: MetricChip[] }) {
  return (
    <Row className="g-3 mb-4 compact-metrics-row">
      {metrics.slice(0, 6).map((metric) => (
        <Col sm={6} xl={metrics.length > 4 ? 2 : 3} key={metric.id}>
          <MetricChipCard metric={metric} />
        </Col>
      ))}
    </Row>
  );
}
