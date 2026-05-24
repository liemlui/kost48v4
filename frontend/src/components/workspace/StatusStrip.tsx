import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export type StatusStripItem = {
  id: string | number;
  label: string;
  value: ReactNode;
  helper?: string;
  tone?: 'success' | 'info' | 'warning' | 'danger' | 'neutral';
  to?: string;
  onClick?: () => void;
};

export default function StatusStrip({ items }: { items: StatusStripItem[] }) {
  const navigate = useNavigate();
  return (
    <div className="status-strip-v2" aria-label="Ringkasan status">
      {items.map((item) => {
        const clickable = Boolean(item.to || item.onClick);
        const content = (
          <>
            <span className="status-strip-label">{item.label}</span>
            <strong>{item.value}</strong>
            {item.helper ? <small>{item.helper}</small> : null}
          </>
        );
        return clickable ? (
          <button
            type="button"
            key={item.id}
            className={`status-strip-item ${item.tone ?? 'neutral'}`.trim()}
            onClick={() => item.onClick ? item.onClick() : item.to ? navigate(item.to) : undefined}
          >
            {content}
          </button>
        ) : (
          <div key={item.id} className={`status-strip-item ${item.tone ?? 'neutral'}`.trim()}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
