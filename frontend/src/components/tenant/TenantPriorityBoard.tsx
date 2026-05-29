import { Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import type { AssistantItem } from '../command-center';
import { compactText, compactTitle } from '../../utils/readabilityRules';
import { limitRepeatedActions } from '../../utils/actionDedup';

const severityMeta: Record<string, { tone: string; icon: string; label: string }> = {
  BLOCKER: { tone: 'danger', icon: '🚫', label: 'Harus diselesaikan' },
  HIGH: { tone: 'warning', icon: '⚠️', label: 'Prioritas tinggi' },
  WARNING: { tone: 'warning', icon: '⏳', label: 'Perlu perhatian' },
  MEDIUM: { tone: 'info', icon: '🔎', label: 'Sedang berjalan' },
  INFO: { tone: 'info', icon: 'ℹ️', label: 'Informasi' },
  SUCCESS: { tone: 'success', icon: '✅', label: 'Aman' },
  OPPORTUNITY: { tone: 'info', icon: '💡', label: 'Saran' },
};

function getMeta(severity?: string) {
  return severityMeta[(severity ?? '').toUpperCase()] ?? severityMeta.INFO;
}

export default function TenantPriorityBoard({
  title = 'Prioritas Kamu Sekarang',
  subtitle = 'Tiga hal paling penting hari ini.',
  items,
  maxItems = 3,
}: {
  title?: string;
  subtitle?: string;
  items: AssistantItem[];
  maxItems?: number;
}) {
  const navigate = useNavigate();
  const visibleItems = limitRepeatedActions(items.slice(0, maxItems), 2);

  if (!visibleItems.length) return null;

  return (
    <Card className="tenant-priority-board border-0 mb-4">
      <Card.Body>
        <div className="tenant-priority-board-head">
          <div>
            <div className="command-eyebrow">Asisten prioritas penghuni</div>
            <h5>{title}</h5>
            <p>{subtitle}</p>
          </div>
          <span className="tenant-priority-count">Top {visibleItems.length}</span>
        </div>
        <div className="tenant-priority-list">
          {visibleItems.map((item) => {
            const meta = getMeta(item.severity);
            const handleAction = () => {
              if (item.onAction) {
                item.onAction();
                return;
              }
              if (item.actionTo) navigate(item.actionTo);
            };
            return (
              <div key={item.id} className={`tenant-priority-item ${meta.tone}`}>
                <div className="tenant-priority-icon" aria-hidden="true">{meta.icon}</div>
                <div className="tenant-priority-copy">
                  <div className="tenant-priority-meta">
                    <span>{meta.label}</span>
                    {item.source ? <span>{item.source}</span> : null}
                    {item.count ? <span>{item.count} item</span> : null}
                  </div>
                  <strong>{compactTitle(item.title)}</strong>
                  <p>{compactText(item.message, 96)}</p>
                </div>
                {item.actionLabel && (item.onAction || item.actionTo) ? (
                  <Button
                    size="sm"
                    variant={meta.tone === 'danger' ? 'danger' : meta.tone === 'warning' ? 'warning' : 'outline-primary'}
                    onClick={handleAction}
                  >
                    {item.actionLabel}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
}
