import { Alert, Badge, Card, Col, Row } from 'react-bootstrap';
import type { AccountingReadiness, AutoJournalEntry, BalanceSheetGuard, DepositPosition, DepositReconciliation, ProfitLossLite, ReversalWatch, TrialBalance, UnmappedTransactions } from '../../api/accounting';
import { formatRupiah } from '../../utils/formatCurrency';

type Props = {
  readiness?: AccountingReadiness;
  trial?: TrialBalance;
  balanceSheet?: BalanceSheetGuard;
  profitLoss?: ProfitLossLite;
  unmapped?: UnmappedTransactions;
  depositPosition?: DepositPosition;
  depositReconciliation?: DepositReconciliation;
  reversalWatch?: ReversalWatch;
  recentJournals: AutoJournalEntry[];
  autoJournalEnabled: boolean;
  isLoading?: boolean;
};

function totalUnmapped(unmapped?: UnmappedTransactions) {
  const summary = unmapped?.summary;
  if (!summary) return 0;
  return summary.invoiceSampleCount + summary.invoicePaymentSampleCount + summary.expenseSampleCount + summary.wifiSaleSampleCount;
}

export default function AccountingCommandCenterLite({ readiness, trial, balanceSheet, profitLoss, unmapped, depositPosition, depositReconciliation, reversalWatch, recentJournals, autoJournalEnabled, isLoading }: Props) {
  const unmappedCount = totalUnmapped(unmapped);
  const latest = recentJournals[0];
  const statementReady = Boolean(trial?.isBalanced && balanceSheet?.statement?.balanced);
  const depositDifference = depositPosition?.differenceRupiah ?? 0;
  const reversalMissing = reversalWatch?.summary.reversalMissingCount ?? 0;

  return (
    <Card className="content-card border-0 accounting-setup-card accounting-command-center-lite mb-3">
      <Card.Body>
        <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 mb-3">
          <div>
            <div className="section-kicker mb-2">Accounting Command Center · B3.3R</div>
            <h3 className="panel-title mb-1">Ledger cockpit dari transaksi operasional</h3>
            <p className="text-muted mb-0">Panel ini membaca JournalEntry POSTED, bukan angka dekoratif. Gunakan untuk membuktikan auto journal, Trial Balance, P&amp;L Lite, Balance Sheet Lite, deposit liability, dan reversal invoice cancel.</p>
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-start justify-content-xl-end">
            <Badge bg={readiness?.ready ? 'success' : 'warning'}>{readiness?.ready ? 'Readiness OK' : 'Setup belum lengkap'}</Badge>
            <Badge bg={autoJournalEnabled ? 'primary' : 'secondary'}>{autoJournalEnabled ? 'Auto Journal ON' : 'Auto Journal OFF'}</Badge>
            <Badge bg={trial?.isBalanced ? 'success' : 'danger'}>{trial?.isBalanced ? 'Trial Balance balanced' : 'Trial Balance belum balance'}</Badge>
            <Badge bg={statementReady ? 'success' : 'warning'}>{statementReady ? 'Statement Lite ready' : 'Statement guarded'}</Badge>
          </div>
        </div>

        <Row className="g-3">
          <Col md={6} xl={3}>
            <div className="accounting-proof-tile success">
              <span>Trial Balance</span>
              <strong>{trial?.isBalanced ? 'Balanced' : isLoading ? 'Memuat...' : 'Belum balance'}</strong>
              <small>{formatRupiah(trial?.totalDebitRupiah ?? 0)} debit · {formatRupiah(trial?.totalCreditRupiah ?? 0)} kredit</small>
            </div>
          </Col>
          <Col md={6} xl={3}>
            <div className="accounting-proof-tile info">
              <span>Recent Auto Journal</span>
              <strong>{recentJournals.length}</strong>
              <small>{latest ? `${latest.sourceType} · ${latest.entryNumber}` : 'Belum ada transaksi baru'}</small>
            </div>
          </Col>
          <Col md={6} xl={3}>
            <div className={`accounting-proof-tile ${unmappedCount ? 'warning' : 'success'}`}>
              <span>Unmapped Watch</span>
              <strong>{unmappedCount}</strong>
              <small>Invoice/payment/expense/WiFi belum terjurnal</small>
            </div>
          </Col>
          <Col md={6} xl={3}>
            <div className={`accounting-proof-tile ${(profitLoss?.totals.netProfitRupiah ?? 0) >= 0 ? 'success' : 'danger'}`}>
              <span>Net Profit Lite</span>
              <strong>{formatRupiah(profitLoss?.totals.netProfitRupiah ?? 0)}</strong>
              <small>P&amp;L dari posted ledger</small>
            </div>
          </Col>
        </Row>

        {!latest ? (
          <Alert variant="light" className="border mt-3 mb-0">
            Runtime proof belum lengkap karena recent journal masih kosong. Buat satu invoice/expense/WiFi sale baru, lalu cek panel ini untuk membuktikan auto journal B3.1 berjalan.
          </Alert>
        ) : null}


        <Row className="g-3 mt-1">
          <Col md={6}>
            <div className={`accounting-proof-tile ${depositDifference === 0 ? 'success' : 'warning'}`}>
              <span>Deposit Liability Watch</span>
              <strong>{formatRupiah(depositPosition?.ledger.liabilityRupiah ?? 0)}</strong>
              <small>Held {formatRupiah(depositPosition?.operational.depositHeldRupiah ?? 0)} · opening {formatRupiah(depositReconciliation?.summary.ledgerOpeningBalanceDepositRupiah ?? 0)}</small>
            </div>
          </Col>
          <Col md={6}>
            <div className={`accounting-proof-tile ${reversalMissing ? 'danger' : 'success'}`}>
              <span>Invoice Reversal Watch</span>
              <strong>{reversalMissing}</strong>
              <small>{reversalMissing ? 'Invoice cancelled belum punya reversal' : 'Tidak ada reversal missing'}</small>
            </div>
          </Col>
        </Row>

        {depositPosition?.note ? (
          <Alert variant={depositDifference === 0 ? 'light' : 'warning'} className="border mt-3 mb-0">
            {depositPosition.note}
          </Alert>
        ) : null}
        {depositReconciliation?.candidateActions?.length ? (
          <Alert variant="light" className="border mt-3 mb-0">
            <div className="fw-semibold mb-1">Deposit reconciliation: {depositReconciliation.summary.reconciliationStatus}</div>
            <div className="small text-muted">{depositReconciliation.explanation}</div>
            <ul className="small mb-0 mt-2">
              {depositReconciliation.candidateActions.slice(0, 2).map((action) => (
                <li key={action.key}><strong>{action.label}:</strong> {action.action}</li>
              ))}
            </ul>
          </Alert>
        ) : null}
        {reversalMissing ? (
          <Alert variant="danger" className="border mt-3 mb-0">
            Ada invoice cancelled yang sudah punya journal revenue/piutang tetapi belum punya reversal. Jalankan flow cancel terbaru atau backfill khusus reversal di fase berikutnya.
          </Alert>
        ) : null}
      </Card.Body>
    </Card>
  );
}
