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
    <div className="page-header">
      <div className="page-header-copy">
        <div className="page-eyebrow">✦ {eyebrow}</div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
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
