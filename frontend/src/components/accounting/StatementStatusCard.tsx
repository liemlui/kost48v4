import { Button, Card } from 'react-bootstrap';

export type StatementTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

type Props = {
  title: string;
  value: string;
  helper: string;
  eyebrow?: string;
  tone?: StatementTone;
  actionLabel?: string;
  onAction?: () => void;
};

export default function StatementStatusCard({ title, value, helper, eyebrow, tone = 'neutral', actionLabel, onAction }: Props) {
  return (
    <Card className={`statement-status-card tone-${tone} h-100 border-0`}>
      <Card.Body className="d-flex flex-column gap-2">
        {eyebrow ? <div className="statement-status-eyebrow">{eyebrow}</div> : null}
        <div>
          <div className="statement-status-title">{title}</div>
          <div className="statement-status-value">{value}</div>
        </div>
        <p className="statement-status-helper mb-0">{helper}</p>
        {actionLabel && onAction ? (
          <Button size="sm" variant="outline-primary" className="align-self-start mt-auto" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </Card.Body>
    </Card>
  );
}
