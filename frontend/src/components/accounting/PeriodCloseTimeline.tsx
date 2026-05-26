import { Badge, Card } from 'react-bootstrap';
import type { AutoJournalEntry, PeriodCloseReadiness, ProfitLossLite } from '../../api/accounting';
import { formatRupiah } from '../../utils/formatCurrency';

type Props = {
  readiness?: PeriodCloseReadiness;
  profitLoss?: ProfitLossLite;
  recentJournals?: AutoJournalEntry[];
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function findJournal(journals: AutoJournalEntry[] | undefined, sourceType: string, id?: number | null) {
  if (!id) return undefined;
  return (journals ?? []).find((journal) => journal.id === id || journal.sourceType === sourceType);
}

export default function PeriodCloseTimeline({ readiness, profitLoss, recentJournals }: Props) {
  const period = readiness?.period;
  const closingJournal = findJournal(recentJournals, 'CLOSING_ENTRY', period?.closingJournalEntryId);
  const reopenJournal = findJournal(recentJournals, 'CLOSING_REVERSAL', period?.reopenJournalEntryId);
  const closed = period?.status === 'CLOSED';
  const reopened = Boolean(period?.reopenedAt || profitLoss?.closing?.reopenedAt);
  const closeVersion = period?.closeVersion ?? 1;

  const steps = [
    {
      key: 'open',
      title: 'Periode dibuka',
      status: period ? 'Aktif' : 'Belum ada',
      tone: period ? 'success' : 'warning',
      detail: period ? `${period.year}-${String(period.month).padStart(2, '0')} · ${period.status}` : 'Buat accounting period dulu.',
    },
    {
      key: 'close',
      title: closeVersion > 1 ? `Closing ulang V${closeVersion}` : 'Closing periode',
      status: closed ? 'Tercatat' : readiness?.canPost ? 'Siap' : 'Belum siap',
      tone: closed ? 'success' : readiness?.canPost ? 'info' : 'warning',
      detail: closed
        ? `${formatDateTime(period?.closedAt)} · ${closingJournal?.entryNumber ?? `Journal #${period?.closingJournalEntryId ?? '-'}`} · ${formatRupiah(profitLoss?.closing?.netIncomeClosedToRetainedEarnings ?? readiness?.profitLoss?.netIncomeRupiah ?? 0)}`
        : readiness?.blockedReasons?.[0] ?? 'Preview closing sebelum posting owner.',
    },
    {
      key: 'reopen',
      title: 'Reopen / reversal',
      status: reopened ? 'Pernah reopen' : 'Belum pernah',
      tone: reopened ? 'warning' : 'success',
      detail: reopened
        ? `${formatDateTime(period?.reopenedAt ?? profitLoss?.closing?.reopenedAt)} · ${reopenJournal?.entryNumber ?? `Journal #${period?.reopenJournalEntryId ?? profitLoss?.closing?.reopenJournalEntryId ?? '-'}`}`
        : 'Tidak ada koreksi reopen pada periode ini.',
    },
    {
      key: 'locked',
      title: 'Status laporan owner',
      status: closed ? 'Terkunci' : 'Masih terbuka',
      tone: closed ? 'success' : 'info',
      detail: closed
        ? 'Posting baru ke periode ini diblokir kecuali owner membuka ulang lewat governance.'
        : 'Periode masih bisa menerima jurnal; gunakan angka sebagai laporan berjalan.',
    },
  ];

  return (
    <Card className="content-card border-0 accounting-setup-card h-100" id="period-timeline">
      <Card.Body>
        <div className="section-kicker mb-2">Riwayat Closing / Reopen</div>
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h3 className="panel-title mb-1">Timeline periode</h3>
            <p className="text-muted mb-0">Close dan reopen harus terlihat sebagai jejak audit, bukan status yang berubah diam-diam.</p>
          </div>
          <Badge bg={closed ? 'success' : reopened ? 'warning' : 'info'}>{closed ? 'CLOSED' : reopened ? 'REOPENED' : 'OPEN'}</Badge>
        </div>
        <div className="period-close-timeline">
          {steps.map((step, index) => (
            <div key={step.key} className={`period-close-step tone-${step.tone}`}>
              <div className="period-close-marker">{index + 1}</div>
              <div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <strong>{step.title}</strong>
                  <Badge bg={step.tone === 'success' ? 'success' : step.tone === 'warning' ? 'warning' : 'info'}>{step.status}</Badge>
                </div>
                <small>{step.detail}</small>
              </div>
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}
