import { useState } from 'react';
import { Button, Card, Collapse, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../common/EmptyState';
import StatusBadge from '../common/StatusBadge';
import type { AssistantSeverity } from './AssistantPanel';

export type ActionQueueItem = {
  id: string | number;
  priority: AssistantSeverity;
  type: string;
  subject: string;
  issue: string;
  age?: string;
  receivedAtLabel?: string;
  deadlineLabel?: string;
  deadlineIso?: string;
  timeStatusLabel?: string;
  timeStatusTone?: 'danger' | 'warning' | 'info' | 'success';
  recommendedAction: string;
  actionTo?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionTo?: string;
  onSecondaryAction?: () => void;
  dedupKey?: string;
  ruleId?: string;
  entityType?: string;
  entityId?: string | number | null;
};

const priorityLabel: Record<AssistantSeverity, { label: string; status: string }> = {
  BLOCKER: { label: 'Blocker', status: 'DANGER' },
  HIGH: { label: 'Tinggi', status: 'WARNING' },
  MEDIUM: { label: 'Sedang', status: 'INFO' },
  WARNING: { label: 'Perhatian', status: 'WARNING' },
  OPPORTUNITY: { label: 'Peluang', status: 'SUCCESS' },
  INFO: { label: 'Info', status: 'INFO' },
  SUCCESS: { label: 'Aman', status: 'SUCCESS' },
};

const priorityRank: Record<AssistantSeverity, number> = {
  BLOCKER: 0,
  HIGH: 1,
  MEDIUM: 2,
  WARNING: 3,
  OPPORTUNITY: 4,
  INFO: 5,
  SUCCESS: 6,
};

const ADMIN_WHATSAPP_NUMBER = (import.meta.env.VITE_PUBLIC_ADMIN_WHATSAPP ?? '6285648887628').replace(/\D/g, '');

function openActionTarget(target: string, navigate: (to: string) => void) {
  if (/^https?:\/\//i.test(target)) {
    window.open(target, '_blank', 'noopener,noreferrer');
    return;
  }
  navigate(target);
}

function buildStaffUnavailableUrl(item: ActionQueueItem) {
  const message = `Admin KOST48: staff sedang libur/tidak tersedia untuk ${item.subject}. Mohon koordinasi via WhatsApp. Target penanganan mengikuti kesepakatan chat ini.`;
  return `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export default function ActionQueueTable({
  title = 'Antrean Aksi',
  subtitle = 'Urutan kerja harian berdasarkan prioritas bisnis.',
  items,
  emptyTitle = 'Tidak ada antrean mendesak',
  emptyDescription = 'Semua proses utama sedang aman. Tetap cek aktivitas terbaru dan data detail bila diperlukan.',
  maxItems = 8,
  collapsible = true,
  compact = true,
  hideActions = false,
}: {
  title?: string;
  subtitle?: string;
  items: ActionQueueItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  maxItems?: number;
  collapsible?: boolean;
  compact?: boolean;
  hideActions?: boolean;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const sortedItems = [...items].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]).slice(0, maxItems);
  const hiddenCount = Math.max(0, items.length - sortedItems.length);

  return (
    <Card className={`content-card action-queue-card border-0 h-100 ${compact ? 'action-queue-compact' : ''}`.trim()}>
      <Card.Body>
        <div className="table-meta">
          <div>
            <div className="panel-title">{title}</div>
            <div className="panel-subtitle">{subtitle}</div>
          </div>
          <div className="queue-header-actions">
            {hiddenCount ? <span className="surface-pill">+{hiddenCount}</span> : null}
            <span className="surface-pill">{sortedItems.length} item</span>
            {collapsible ? <Button variant="outline-secondary" size="sm" onClick={() => setOpen((value) => !value)}>{open ? 'Sembunyikan' : 'Tampilkan'}</Button> : null}
          </div>
        </div>

        <Collapse in={open}>
          <div>
            {!sortedItems.length ? (
              <EmptyState icon="✅" title={emptyTitle} description={emptyDescription} />
            ) : (
              <Table responsive hover className="mt-3 align-middle action-queue-table responsive-data-table">
                <thead>
                  <tr>
                    <th>Prioritas</th>
                    <th>Alur</th>
                    <th>Subjek & masalah</th>
                    <th>Masuk</th>
                    <th>Deadline</th>
                    <th>Status waktu</th>
                    {!hideActions ? <th>Aksi</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => {
                    const meta = priorityLabel[item.priority];
                    const isActionable = Boolean(item.actionTo || item.onAction);
                    const runPrimaryAction = () => item.onAction ? item.onAction() : item.actionTo ? openActionTarget(item.actionTo, navigate) : undefined;
                    return (
                      <tr
                        key={item.id}
                        className={isActionable ? 'clickable-row' : undefined}
                        role={isActionable ? 'button' : undefined}
                        tabIndex={isActionable ? 0 : undefined}
                        aria-label={isActionable ? `${item.recommendedAction}: ${item.subject}` : undefined}
                        onKeyDown={(event) => {
                          if (!isActionable) return;
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            runPrimaryAction();
                          }
                        }}
                        onClick={isActionable ? runPrimaryAction : undefined}
                      >
                        <td data-label="Prioritas"><StatusBadge status={meta.status} customLabel={meta.label} /></td>
                        <td data-label="Alur"><span className="fw-semibold">{item.type}</span>{item.age ? <div className="small text-muted">{item.age}</div> : null}</td>
                        <td data-label="Subjek" className="action-queue-subject-cell"><strong>{item.subject}</strong><small>{item.issue}</small></td>
                        <td data-label="Masuk" className="small action-queue-time-mini">{item.receivedAtLabel ? <strong>{item.receivedAtLabel}</strong> : <span className="text-muted">-</span>}</td>
                        <td data-label="Deadline" className="small action-queue-deadline-mini">{item.deadlineLabel ? <strong>{item.deadlineLabel}</strong> : <span className="text-muted">-</span>}</td>
                        <td data-label="Status waktu" className="small">{item.timeStatusLabel ? <span className={`queue-time-status ${item.timeStatusTone ?? 'info'}`}>{item.timeStatusLabel}</span> : <span className="text-muted">-</span>}</td>
                        {!hideActions ? (
                          <td data-label="Aksi">
                            {(item.actionTo || item.onAction) ? (
                              <div className="queue-action-stack">
                                <Button variant="outline-primary" size="sm" onClick={(event) => {
                                  event.stopPropagation();
                                  runPrimaryAction();
                                }}>
                                  {item.recommendedAction}
                                </Button>
                                {item.entityType === 'ticket' ? (
                                  <Button variant="outline-secondary" size="sm" onClick={(event) => {
                                    event.stopPropagation();
                                    window.open(buildStaffUnavailableUrl(item), '_blank', 'noopener,noreferrer');
                                  }}>
                                    Staff libur
                                  </Button>
                                ) : null}
                                {(item.secondaryActionTo || item.onSecondaryAction) ? (
                                  <Button variant="outline-secondary" size="sm" onClick={(event) => {
                                    event.stopPropagation();
                                    item.onSecondaryAction ? item.onSecondaryAction() : item.secondaryActionTo ? openActionTarget(item.secondaryActionTo, navigate) : undefined;
                                  }}>
                                    {item.secondaryActionLabel ?? 'Aksi lain'}
                                  </Button>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-muted small">{item.recommendedAction}</span>
                            )}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </div>
        </Collapse>
      </Card.Body>
    </Card>
  );
}
