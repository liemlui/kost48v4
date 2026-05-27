import { Alert, Badge, Card, Col, Row } from 'react-bootstrap';
import type { AccountingReadiness, AssetReadiness, BalanceSheetGuard, PeriodCloseReadiness, ProfitLossLite, TrialBalance, UnmappedTransactions } from '../../api/accounting';
import { formatRupiah } from '../../utils/formatCurrency';
import StatementStatusCard from './StatementStatusCard';

type Props = {
  readiness?: AccountingReadiness;
  trial?: TrialBalance;
  balanceSheet?: BalanceSheetGuard;
  profitLoss?: ProfitLossLite;
  periodClose?: PeriodCloseReadiness;
  assetReadiness?: AssetReadiness;
  unmapped?: UnmappedTransactions;
  autoJournalEnabled: boolean;
  isLoading?: boolean;
  onFocusSection?: (sectionId: string) => void;
};

function totalUnmapped(unmapped?: UnmappedTransactions) {
  const summary = unmapped?.summary;
  if (!summary) return 0;
  return summary.invoiceSampleCount + summary.invoicePaymentSampleCount + summary.expenseSampleCount + summary.wifiSaleSampleCount + summary.depositSnapshotSampleCount;
}

function periodLabel(readiness?: PeriodCloseReadiness) {
  const period = readiness?.period;
  if (!period) return 'Periode belum dibuat';
  const version = period.closeVersion && period.closeVersion > 1 ? ` · closing V${period.closeVersion}` : '';
  if (period.status === 'CLOSED') return `CLOSED${version}`;
  if (period.reopenedAt) return `OPEN · pernah reopen`;
  return period.status;
}

function periodNarrative(readiness?: PeriodCloseReadiness, profitLoss?: ProfitLossLite, balanceSheet?: BalanceSheetGuard) {
  const period = readiness?.period;
  if (!period) return 'Buat periode accounting dulu agar laporan bisa dikunci dan diaudit per bulan.';
  if (period.status === 'CLOSED') {
    return 'Periode sudah ditutup. Laba/rugi sudah dipindahkan ke Laba Ditahan, sementara P&L tetap menampilkan performa operasional karena jurnal closing/reversal dikecualikan dari laporan operasional.';
  }
  if (period.reopenedAt) {
    return 'Periode pernah dibuka ulang melalui jurnal reversal. Review koreksi, lalu tutup ulang agar angka owner kembali terkunci.';
  }
  if (readiness?.canPost) {
    return 'Periode masih terbuka dan siap ditutup setelah owner memastikan invoice, pembayaran, expense, depresiasi, dan aset sudah benar.';
  }
  if (profitLoss?.closing?.periodClosed || balanceSheet?.closing?.retainedEarningsActive) {
    return 'Laporan sudah membaca informasi closing. Cek data quality untuk memastikan tidak ada blocker sebelum keputusan bisnis.';
  }
  return 'Ledger aktif, tetapi masih ada data yang perlu dicek sebelum laporan dipakai sebagai dasar keputusan owner.';
}

export default function StatementCommandCenterPanel({ readiness, trial, balanceSheet, profitLoss, periodClose, assetReadiness, unmapped, autoJournalEnabled, isLoading, onFocusSection }: Props) {
  const statement = balanceSheet?.statement;
  const unmappedCount = totalUnmapped(unmapped);
  const trialBalanced = Boolean(trial?.isBalanced);
  const balanceSheetBalanced = Boolean(statement?.balanced);
  const assetAligned = assetReadiness?.readyForAssetSchemaAct || balanceSheet?.assetRegisterDisclosure?.aligned;
  const blockedCount = periodClose?.blockedReasons?.length ?? 0;
  const postingPeriod = readiness?.postingPeriod;
  const postingPeriodBlocked = Boolean(postingPeriod && !postingPeriod.ready);
  const warningsCount = (readiness?.warnings?.length ?? 0) + (periodClose?.warnings?.length ?? 0) + unmappedCount + (assetAligned ? 0 : 1) + (postingPeriodBlocked ? 1 : 0);
  const ownerTone = postingPeriodBlocked || blockedCount || !trialBalanced ? 'danger' : trialBalanced && balanceSheetBalanced ? 'success' : 'warning';

  return (
    <Card className="content-card border-0 accounting-setup-card accounting-command-center-lite statement-command-center mb-3">
      <Card.Body>
        <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 mb-3">
          <div>
            <div className="section-kicker mb-2">Laporan Keuangan</div>
            <h3 className="panel-title mb-1">Kesehatan ledger & statement cockpit</h3>
            <p className="text-muted mb-0">
              Ringkasan owner untuk melihat apakah Trial Balance, Neraca, Laba Rugi, aset, dan tutup periode aman dibaca. Fokusnya bukan setup teknis, tetapi angka yang bisa dipakai untuk keputusan bisnis.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-start justify-content-xl-end">
            <Badge bg={readiness?.ready ? 'success' : 'warning'}>{readiness?.ready ? 'Ledger siap' : 'Setup perlu dicek'}</Badge>
            {postingPeriod ? (
              <Badge bg={postingPeriod.ready ? 'success' : 'danger'}>
                Posting {postingPeriod.key ?? '-'} {postingPeriod.ready ? 'OPEN' : postingPeriod.status ?? 'belum siap'}
              </Badge>
            ) : null}
            <Badge bg={autoJournalEnabled ? 'primary' : 'secondary'}>{autoJournalEnabled ? 'Auto journal aktif' : 'Auto journal nonaktif'}</Badge>
            <Badge bg={ownerTone}>{isLoading ? 'Memuat...' : blockedCount ? `${blockedCount} blocker` : warningsCount ? `${warningsCount} perlu dicek` : 'Aman dibaca'}</Badge>
          </div>
        </div>

        <Alert variant={ownerTone === 'success' ? 'success' : ownerTone === 'danger' ? 'danger' : 'warning'} className="statement-owner-summary mb-3">
          <strong>Status owner:</strong> {periodNarrative(periodClose, profitLoss, balanceSheet)}
        </Alert>

        {postingPeriodBlocked && postingPeriod?.warning ? (
          <Alert variant="danger" className="mb-3">
            <strong>Posting tagihan terblokir:</strong> {postingPeriod.warning}
          </Alert>
        ) : null}

        <Row className="g-3">
          <Col md={6} xl={2}>
            <StatementStatusCard
              eyebrow="Trial Balance"
              title="Debit = Kredit"
              value={trialBalanced ? 'Seimbang' : isLoading ? 'Memuat...' : 'Perlu cek'}
              helper={`${formatRupiah(trial?.totalDebitRupiah ?? 0)} debit · ${formatRupiah(trial?.totalCreditRupiah ?? 0)} kredit`}
              tone={trialBalanced ? 'success' : 'danger'}
              actionLabel="Lihat detail"
              onAction={() => onFocusSection?.('trial-balance')}
            />
          </Col>
          <Col md={6} xl={2}>
            <StatementStatusCard
              eyebrow="Neraca"
              title="Aset = Liabilitas + Ekuitas"
              value={balanceSheetBalanced ? 'Seimbang' : isLoading ? 'Memuat...' : 'Perlu cek'}
              helper={`${formatRupiah(statement?.assetsRupiah ?? 0)} aset · selisih ${formatRupiah(statement?.differenceRupiah ?? 0)}`}
              tone={balanceSheetBalanced ? 'success' : 'warning'}
              actionLabel="Lihat neraca"
              onAction={() => onFocusSection?.('balance-sheet')}
            />
          </Col>
          <Col md={6} xl={2}>
            <StatementStatusCard
              eyebrow="Laba Rugi"
              title={(profitLoss?.totals.netProfitRupiah ?? 0) >= 0 ? 'Laba berjalan' : 'Rugi berjalan'}
              value={formatRupiah(profitLoss?.totals.netProfitRupiah ?? 0)}
              helper={`Revenue ${formatRupiah(profitLoss?.totals.revenueRupiah ?? 0)} · expense ${formatRupiah((profitLoss?.totals.expenseRupiah ?? 0) + (profitLoss?.totals.cogsRupiah ?? 0))}`}
              tone={(profitLoss?.totals.netProfitRupiah ?? 0) >= 0 ? 'success' : 'danger'}
              actionLabel="Lihat P&L"
              onAction={() => onFocusSection?.('profit-loss')}
            />
          </Col>
          <Col md={6} xl={2}>
            <StatementStatusCard
              eyebrow="Aset"
              title={assetAligned ? 'Aset aligned' : 'Perlu review aset'}
              value={formatRupiah(balanceSheet?.assetRegisterDisclosure?.registerNetBookValueRupiah ?? 0)}
              helper={balanceSheet?.assetRegisterDisclosure?.warning ?? `${assetReadiness?.score ?? 0}/100 readiness aset`}
              tone={assetAligned ? 'success' : 'warning'}
              actionLabel="Lihat aset"
              onAction={() => onFocusSection?.('asset-readiness')}
            />
          </Col>
          <Col md={6} xl={2}>
            <StatementStatusCard
              eyebrow="Periode"
              title="Tutup periode"
              value={periodLabel(periodClose)}
              helper={periodClose?.ready ? 'Siap closing/review owner.' : (periodClose?.blockedReasons?.[0] ?? 'Cek readiness sebelum closing.')}
              tone={periodClose?.period?.status === 'CLOSED' ? 'success' : periodClose?.canPost ? 'info' : blockedCount ? 'danger' : 'warning'}
              actionLabel="Kelola periode"
              onAction={() => onFocusSection?.('period-close')}
            />
          </Col>
          <Col md={6} xl={2}>
            <StatementStatusCard
              eyebrow="Data Quality"
              title={unmappedCount ? 'Perlu dicek' : 'Tidak ada sample blocker'}
              value={`${unmappedCount}`}
              helper={unmappedCount ? 'Sample operasional/deposit belum sepenuhnya mapped.' : 'Unmapped watch tidak menemukan sample aktif.'}
              tone={unmappedCount ? 'warning' : 'success'}
              actionLabel="Lihat warning"
              onAction={() => onFocusSection?.('data-quality')}
            />
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}
