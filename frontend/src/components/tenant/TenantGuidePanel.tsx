import type { ReactNode } from 'react';
import { Button, Card } from 'react-bootstrap';

export type TenantGuideTone = 'safe' | 'info' | 'warning' | 'danger';

export type TenantGuideAction = {
  label: string;
  onClick: () => void;
  variant?: string;
  disabled?: boolean;
  helper?: string;
};

const toneIcon: Record<TenantGuideTone, string> = {
  safe: '✅',
  info: 'ℹ️',
  warning: '⏳',
  danger: '⚠️',
};

export default function TenantGuidePanel({
  eyebrow = 'Panduan Kos Saya',
  title,
  message,
  tone = 'info',
  actions = [],
  children,
}: {
  eyebrow?: string;
  title: string;
  message: string;
  tone?: TenantGuideTone;
  actions?: TenantGuideAction[];
  children?: ReactNode;
}) {
  return (
    <Card className={`tenant-guide-panel tenant-guide-panel-${tone} border-0 mb-4`}>
      <Card.Body>
        <div className="tenant-guide-layout">
          <div className="tenant-guide-icon" aria-hidden="true">{toneIcon[tone]}</div>
          <div className="tenant-guide-main">
            <div className="command-eyebrow">{eyebrow}</div>
            <h3>{title}</h3>
            <p>{message}</p>
            {children ? <div className="tenant-guide-extra">{children}</div> : null}
          </div>
          {actions.length ? (
            <div className="tenant-guide-actions">
              {actions.map((action) => (
                <div key={action.label} className="tenant-guide-action-wrap">
                  <Button variant={action.variant ?? 'primary'} onClick={action.onClick} disabled={action.disabled}>
                    {action.label}
                  </Button>
                  {action.helper ? <div className="tenant-guide-action-helper">{action.helper}</div> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Card.Body>
    </Card>
  );
}
