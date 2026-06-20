import type { ReactNode, KeyboardEvent } from 'react';

interface ClickableRowProps {
  onClick: () => void;
  children: ReactNode;
  label: string;
  className?: string;
}

export default function ClickableRow({ onClick, children, label, className }: ClickableRowProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <tr
      className={`clickable-row${className ? ` ${className}` : ''}`}
      onClick={onClick}
      tabIndex={0}
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {children}
    </tr>
  );
}
