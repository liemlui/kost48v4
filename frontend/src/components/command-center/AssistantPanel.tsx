import { useState } from 'react';
import { Button, Card, Collapse } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';

export type AssistantSeverity = 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'WARNING' | 'OPPORTUNITY' | 'INFO' | 'SUCCESS';

export type AssistantItem = {
  id: string | number;
  severity: AssistantSeverity;
  title: string;
  message: string;
  source?: string;
  count?: number;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  dedupKey?: string;
  ruleId?: string;
  entityType?: string;
  entityId?: string | number | null;
};

const severityRank: Record<AssistantSeverity, number> = {
  BLOCKER: 0,
  HIGH: 1,
  MEDIUM: 2,
  WARNING: 3,
  OPPORTUNITY: 4,
  INFO: 5,
  SUCCESS: 6,
};

const severityMeta: Record<AssistantSeverity, { label: string; icon: string; status: string; className: string }> = {
  BLOCKER: { label: 'Blocker', icon: '⛔', status: 'DANGER', className: 'assistant-item-blocker' },
  HIGH: { label: 'Prioritas tinggi', icon: '🔥', status: 'WARNING', className: 'assistant-item-high' },
  MEDIUM: { label: 'Menunggu aksi', icon: '⏳', status: 'INFO', className: 'assistant-item-medium' },
  WARNING: { label: 'Perhatian', icon: '⚠️', status: 'WARNING', className: 'assistant-item-warning' },
  OPPORTUNITY: { label: 'Peluang', icon: '💡', status: 'SUCCESS', className: 'assistant-item-opportunity' },
  INFO: { label: 'Info', icon: 'ℹ️', status: 'INFO', className: 'assistant-item-info' },
  SUCCESS: { label: 'Aman', icon: '✅', status: 'SUCCESS', className: 'assistant-item-success' },
};

export function sortAssistantItems(items: AssistantItem[]) {
  return [...items].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

export default function AssistantPanel({
  title = 'Asisten Operasional',
  subtitle = 'Prioritas otomatis dari data yang tersedia sekarang.',
  items,
  emptyTitle = 'Tidak ada blocker besar',
  emptyMessage = 'Flow utama sedang aman. Lanjutkan monitoring dari antrean dan tabel di bawah.',
  maxItems = 4,
  compact = true,
  collapsible = true,
}: {
  title?: string;
  subtitle?: string;
  items: AssistantItem[];
  emptyTitle?: string;
  emptyMessage?: string;
  maxItems?: number;
  compact?: boolean;
  collapsible?: boolean;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const sortedItems = sortAssistantItems(items).slice(0, maxItems);
  const hiddenCount = Math.max(0, items.length - sortedItems.length);

  return (
    <Card className={`command-card assistant-panel border-0 mb-4 ${compact ? 'assistant-panel-compact' : ''}`.trim()}>
      <Card.Body>
        <div className="command-card-header">
          <div>
            <div className="command-eyebrow">Command Center</div>
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
          <div className="assistant-header-actions">
            {hiddenCount ? <span className="surface-pill">+{hiddenCount} disembunyikan</span> : null}
            {collapsible ? <Button variant="outline-secondary" size="sm" onClick={() => setOpen((value) => !value)}>{open ? 'Sembunyikan' : 'Tampilkan'}</Button> : null}
            <div className="assistant-pulse" aria-hidden="true">Rule</div>
          </div>
        </div>

        <Collapse in={open}>
          <div>
            {!sortedItems.length ? (
              <div className="assistant-empty">
                <div className="assistant-empty-icon">✅</div>
                <div>
                  <div className="fw-bold">{emptyTitle}</div>
                  <div className="text-muted small">{emptyMessage}</div>
                </div>
              </div>
            ) : (
              <div className="assistant-list">
                {sortedItems.map((item) => {
                  const meta = severityMeta[item.severity];
                  return (
                    <div key={item.id} className={`assistant-item ${meta.className}`}>
                      <div className="assistant-item-icon">{meta.icon}</div>
                      <div className="assistant-item-body">
                        <div className="assistant-item-topline">
                          <StatusBadge status={meta.status} customLabel={meta.label} />
                          {item.count !== undefined ? <span className="assistant-count">{item.count}</span> : null}
                          {item.source ? <span className="assistant-source">{item.source}</span> : null}
                        </div>
                        <div className="assistant-item-title">{item.title}</div>
                        <div className="assistant-item-message">{item.message}</div>
                      </div>
                      {(item.actionLabel && (item.actionTo || item.onAction)) ? (
                        <Button
                          variant={item.severity === 'BLOCKER' || item.severity === 'HIGH' ? 'primary' : 'outline-primary'}
                          size="sm"
                          onClick={() => item.onAction ? item.onAction() : item.actionTo ? navigate(item.actionTo) : undefined}
                        >
                          {item.actionLabel}
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Collapse>
      </Card.Body>
    </Card>
  );
}
