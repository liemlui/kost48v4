import { Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';

export default function BlockedReasonCard({
  title = 'Aksi belum bisa dilanjutkan',
  reason,
  actionLabel,
  actionTo,
  variant = 'DANGER',
}: {
  title?: string;
  reason: string;
  actionLabel?: string;
  actionTo?: string;
  variant?: string;
}) {
  const navigate = useNavigate();
  return (
    <Card className="blocked-reason-card border-0 mb-4">
      <Card.Body>
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
          <div>
            <StatusBadge status={variant} customLabel="Blocked" />
            <h5 className="mt-3 mb-2">{title}</h5>
            <p className="mb-0 text-muted">{reason}</p>
          </div>
          {actionLabel && actionTo ? (
            <Button variant="outline-primary" onClick={() => navigate(actionTo)}>{actionLabel}</Button>
          ) : null}
        </div>
      </Card.Body>
    </Card>
  );
}
