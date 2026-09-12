import type { ReactNode } from 'react';
import { Button } from 'react-bootstrap';

type PageHeaderProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  eyebrow?: string;
  secondaryAction?: ReactNode;
  /**
   * T-08 (audit 12 Sep 2026): `as="h2"` dipakai bila halaman sudah memiliki `<h1>` dari shell
   * induk (mis. `/inventory/*` yang membungkus `SimpleCrudPage`). Wajib agar tidak ada dua
   * `<h1>` pada satu halaman; gaya visual tetap sama karena hanya level semantiknya berubah.
   */
  as?: 'h1' | 'h2';
};

export default function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
  eyebrow = 'Workspace',
  secondaryAction,
  as: Heading = 'h1',
}: PageHeaderProps) {
  return (
    <div className="page-header page-header--command">
      <div className="page-header-copy">
        <div className="page-eyebrow"><span className="page-eyebrow-dot" /> {eyebrow}</div>
        <Heading>{title}</Heading>
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
