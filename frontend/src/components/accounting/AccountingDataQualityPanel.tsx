import { Alert, Badge, Card } from 'react-bootstrap';
import type { AccountingReadiness, AssetReadiness, BalanceSheetGuard, DepositPosition, DepositReconciliation, PeriodCloseReadiness, ReversalWatch, TrialBalance, UnmappedTransactions } from '../../api/accounting';
import { formatRupiah } from '../../utils/formatCurrency';

type Props = {
  readiness?: AccountingReadiness;
  trial?: TrialBalance;
  balanceSheet?: BalanceSheetGuard;
  periodClose?: PeriodCloseReadiness;
  unmapped?: UnmappedTransactions;
  assetReadiness?: AssetReadiness;
  depositPosition?: DepositPosition;
  depositReconciliation?: DepositReconciliation;
  reversalWatch?: ReversalWatch;
  isLoading?: boolean;
};

type QualityItem = {
  key: string;
  label: string;
  detail: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
  group: 'safe' | 'review' | 'blocker';
};

function totalUnmapped(unmapped?: UnmappedTransactions) {
  const summary = unmapped?.summary;
  if (!summary) return 0;
  return summary.invoiceSampleCount + summary.invoicePaymentSampleCount + summary.expenseSampleCount + summary.wifiSaleSampleCount + summary.depositSnapshotSampleCount;
}

function statusBadge(tone: QualityItem['tone']) {
  if (tone === 'success') return 'Aman';
  if (tone === 'danger') return 'Blokir';
  if (tone === 'info') return 'Info';
  return 'Cek';
}

export default function AccountingDataQualityPanel({ readiness, trial, balanceSheet, periodClose, unmapped, assetReadiness, depositPosition, depositReconciliation, reversalWatch, isLoading }: Props) {
  const difference = balanceSheet?.statement?.differenceRupiah ?? 0;
  const unmappedCount = totalUnmapped(unmapped);
  const depositDifference = depositPosition?.differenceRupiah ?? depositReconciliation?.summary.differenceRupiah ?? 0;
  const reversalMissing = reversalWatch?.summary.reversalMissingCount ?? 0;
  const assetAligned = assetReadiness?.readyForAssetSchemaAct || balanceSheet?.assetRegisterDisclosure?.aligned;
  const blockedReasons = periodClose?.blockedReasons ?? [];

  const items: QualityItem[] = [
    {
      key: 'trial',
      label: 'Trial Balance',
      detail: trial?.isBalanced ? 'Debit dan kredit sudah seimbang.' : 'Debit dan kredit belum seimbang. Jangan gunakan laporan untuk keputusan owner sebelum dicek.',
      tone: trial?.isBalanced ? 'success' : 'danger',
      group: trial?.isBalanced ? 'safe' : 'blocker',
    },
    {
      key: 'balance-sheet',
      label: 'Neraca',
      detail: balanceSheet?.statement?.balanced ? 'Aset sudah sama dengan liabilitas + ekuitas.' : `Selisih neraca ${formatRupiah(difference)}. Perlu review ledger/akun.`,
      tone: balanceSheet?.statement?.balanced ? 'success' : 'danger',
      group: balanceSheet?.statement?.balanced ? 'safe' : 'blocker',
    },
    {
      key: 'period',
      label: 'Status periode',
      detail: periodClose?.period?.status === 'CLOSED'
        ? 'Periode sudah CLOSED dan posting baru ke bulan ini harus lewat governance reopen.'
        : periodClose?.canPost
          ? 'Periode OPEN dan sudah siap preview/posting closing.'
          : 'Periode OPEN tetapi masih ada readiness yang perlu dicek sebelum closing.',
      tone: blockedReasons.length ? 'warning' : periodClose?.period?.status === 'CLOSED' ? 'success' : 'info',
      group: blockedReasons.length ? 'review' : 'safe',
    },
    {
      key: 'unmapped',
      label: 'Unmapped operational data',
      detail: unmappedCount ? `${unmappedCount} sample operasional/deposit masih perlu dipetakan atau direview.` : 'Tidak ada sample unmapped aktif dari invoice, payment, expense, WiFi, atau deposit snapshot.',
      tone: unmappedCount ? 'warning' : 'success',
      group: unmappedCount ? 'review' : 'safe',
    },
    {
      key: 'asset',
      label: 'Asset register',
      detail: assetAligned ? 'Aset dan ledger sudah cukup selaras untuk disclosure owner.' : (balanceSheet?.assetRegisterDisclosure?.warning ?? 'Aset tetap atau depresiasi perlu dicek sebelum closing penuh.'),
      tone: assetAligned ? 'success' : 'warning',
      group: assetAligned ? 'safe' : 'review',
    },
    {
      key: 'deposit',
      label: 'Deposit liability',
      detail: depositDifference === 0 ? 'Deposit ledger dan snapshot operasional tidak menunjukkan selisih.' : `Ada selisih deposit ${formatRupiah(depositDifference)}. Review sebelum backfill agar liability tidak tergandakan.`,
      tone: depositDifference === 0 ? 'success' : 'warning',
      group: depositDifference === 0 ? 'safe' : 'review',
    },
    {
      key: 'reversal',
      label: 'Invoice reversal',
      detail: reversalMissing ? `${reversalMissing} invoice batal masih membutuhkan perhatian reversal.` : 'Tidak ada reversal invoice yang missing.',
      tone: reversalMissing ? 'danger' : 'success',
      group: reversalMissing ? 'blocker' : 'safe',
    },
  ];

  blockedReasons.forEach((reason, index) => {
    items.push({ key: `period-blocker-${index}`, label: 'Blocker tutup periode', detail: reason, tone: 'danger', group: 'blocker' });
  });

  (readiness?.warnings ?? []).slice(0, 2).forEach((warning, index) => {
    items.push({ key: `readiness-warning-${index}`, label: 'Warning readiness', detail: warning, tone: 'warning', group: 'review' });
  });

  const safeItems = items.filter((item) => item.group === 'safe');
  const reviewItems = items.filter((item) => item.group === 'review');
  const blockerItems = items.filter((item) => item.group === 'blocker');

  const renderItems = (list: QualityItem[], empty: string) => list.length ? (
    <div className="accounting-quality-list">
      {list.map((item) => (
        <div key={item.key} className={`accounting-quality-item tone-${item.tone}`}>
          <Badge bg={item.tone === 'success' ? 'success' : item.tone === 'danger' ? 'danger' : item.tone === 'info' ? 'info' : 'warning'}>{statusBadge(item.tone)}</Badge>
          <div>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </div>
        </div>
      ))}
    </div>
  ) : <div className="text-muted small">{empty}</div>;

  return (
    <Card className="content-card border-0 accounting-setup-card h-100" id="data-quality">
      <Card.Body>
        <div className="section-kicker mb-2">Data Perlu Dicek</div>
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h3 className="panel-title mb-1">Kualitas data laporan</h3>
            <p className="text-muted mb-0">Panel ini memisahkan data yang aman, perlu dicek, dan memblokir closing. Warning tidak disembunyikan agar angka owner tetap jujur.</p>
          </div>
          <Badge bg={isLoading ? 'secondary' : blockerItems.length ? 'danger' : reviewItems.length ? 'warning' : 'success'}>
            {isLoading ? 'Memuat...' : blockerItems.length ? `${blockerItems.length} blocker` : reviewItems.length ? `${reviewItems.length} review` : 'Aman'}
          </Badge>
        </div>

        {blockerItems.length ? <Alert variant="danger" className="small">Ada blocker yang harus diselesaikan sebelum laporan dipakai final atau periode ditutup ulang.</Alert> : null}

        <div className="accounting-quality-grid">
          <div>
            <div className="accounting-quality-heading success">Aman</div>
            {renderItems(safeItems, 'Belum ada data aman yang terdeteksi.')}
          </div>
          <div>
            <div className="accounting-quality-heading warning">Perlu dicek</div>
            {renderItems(reviewItems, 'Tidak ada item review.')}
          </div>
          <div>
            <div className="accounting-quality-heading danger">Memblokir</div>
            {renderItems(blockerItems, 'Tidak ada blocker.')}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
