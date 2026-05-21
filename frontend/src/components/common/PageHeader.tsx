import type { ReactNode } from 'react';
import { Button } from 'react-bootstrap';

type PageHeaderProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  eyebrow?: string;
  secondaryAction?: ReactNode;
};

export default function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
  eyebrow = 'Workspace',
  secondaryAction,
}: PageHeaderProps) {
  return (
    <div className="page-header page-header--command">
      <div className="page-header-copy">
        <div className="page-eyebrow"><span className="page-eyebrow-dot" /> {eyebrow}</div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        <div className="page-signal-strip" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      {(secondaryAction || (actionLabel && onAction)) ? (
        <div className="page-header-actions">
          {secondaryAction}
          {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
        </div>
      ) : null}
    </div>
  );
}
