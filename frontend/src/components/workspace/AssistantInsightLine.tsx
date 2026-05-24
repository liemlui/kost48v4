import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

type InsightTone = 'success' | 'info' | 'warning' | 'danger';

export default function AssistantInsightLine({
  title = 'Asisten Operasional',
  message,
  actionLabel,
  actionTo,
  onAction,
  tone = 'info',
}: {
  title?: string;
  message: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  tone?: InsightTone;
}) {
  const navigate = useNavigate();
  const hasAction = Boolean(actionLabel && (actionTo || onAction));
  return (
    <div className={`assistant-insight-line ${tone}`.trim()} role="status">
      <div className="assistant-insight-dot" aria-hidden="true" />
      <div className="assistant-insight-copy">
        <strong>{title}</strong>
        <span>{message}</span>
      </div>
      {hasAction ? (
        <Button
          variant={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'outline-primary'}
          size="sm"
          onClick={() => onAction ? onAction() : actionTo ? navigate(actionTo) : undefined}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
