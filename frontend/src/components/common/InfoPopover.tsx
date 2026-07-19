import { type ReactNode, useState, useRef, useCallback } from 'react';

type InfoPopoverProps = {
  /** Trigger element */
  children: ReactNode;
  /** Popover content */
  content: ReactNode;
  /** Optional title shown at top of popover */
  title?: string;
  /** Placement relative to trigger */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Max width of popover */
  maxWidth?: number;
};

/**
 * Lightweight hover popover for dashboard metrics and StatCards.
 * Shows contextual detail/trend without navigating away.
 * 
 * Uses pure CSS positioning — no dependency on react-bootstrap Popover.
 * Appears on hover, disappears on mouse leave.
 */
export default function InfoPopover({
  children,
  content,
  title,
  placement = 'top',
  maxWidth = 260,
}: InfoPopoverProps) {
  const [show, setShow] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShow(true);
  }, []);

  const handleLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setShow(false), 150);
  }, []);

  return (
    <div
      ref={triggerRef}
      className="info-popover-trigger"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      style={{ display: 'inline-block', cursor: 'help' }}
    >
      {children}
      {show ? (
        <div
          className={`info-popover info-popover--${placement}`}
          style={{ maxWidth }}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          {title ? <div className="info-popover-title">{title}</div> : null}
          <div className="info-popover-body">{content}</div>
          <div className="info-popover-arrow" />
        </div>
      ) : null}
    </div>
  );
}
