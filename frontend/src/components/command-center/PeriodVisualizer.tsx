import { Card, Col, Row } from 'react-bootstrap';
import StatusBadge from '../common/StatusBadge';

export type PeriodPoint = {
  id: string | number;
  label: string;
  value?: string | null;
  helper?: string;
  status?: string;
  statusLabel?: string;
};

export default function PeriodVisualizer({
  title = 'Visual Masa Sewa',
  subtitle = 'Bandingkan periode lama, pengajuan, dan keputusan admin sebelum approval.',
  points,
}: {
  title?: string;
  subtitle?: string;
  points: PeriodPoint[];
}) {
  return (
    <Card className="content-card period-visualizer-card border-0 mb-4">
      <Card.Body>
        <div className="table-meta mb-3">
          <div>
            <div className="panel-title">{title}</div>
            <div className="panel-subtitle">{subtitle}</div>
          </div>
        </div>
        <Row className="g-3 period-flow">
          {points.map((point, index) => (
            <Col md={4} key={point.id}>
              <div className="period-point">
                <div className="period-step-number">{index + 1}</div>
                <div className="period-point-body">
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                    <div className="fw-semibold">{point.label}</div>
                    {point.status ? <StatusBadge status={point.status} customLabel={point.statusLabel} /> : null}
                  </div>
                  <div className="period-point-value">{point.value || '-'}</div>
                  {point.helper ? <div className="text-muted small mt-1">{point.helper}</div> : null}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card.Body>
    </Card>
  );
}
