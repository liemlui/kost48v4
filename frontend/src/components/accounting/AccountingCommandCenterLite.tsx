import { Alert, Badge, Card, Col, Row } from 'react-bootstrap';
import type { AccountingReadiness, AutoJournalEntry, BalanceSheetGuard, ProfitLossLite, TrialBalance, UnmappedTransactions } from '../../api/accounting';
import { formatRupiah } from '../../utils/formatCurrency';

type Props = {
  readiness?: AccountingReadiness;
  trial?: TrialBalance;
  balanceSheet?: BalanceSheetGuard;
  profitLoss?: ProfitLossLite;
  unmapped?: UnmappedTransactions;
  recentJournals: AutoJournalEntry[];
  autoJournalEnabled: boolean;
  isLoading?: boolean;
};

function totalUnmapped(unmapped?: UnmappedTransactions) {
  const summary = unmapped?.summary;
  if (!summary) return 0;
  return summary.invoiceSampleCount + summary.invoicePaymentSampleCount + summary.expenseSampleCount + summary.wifiSaleSampleCount;
}

export default function AccountingCommandCenterLite({ readiness, trial, balanceSheet, profitLoss, unmapped, recentJournals, autoJournalEnabled, isLoading }: Props) {
  const unmappedCount = totalUnmapped(unmapped);
  const latest = recentJournals[0];
  const statementReady = Boolean(trial?.isBalanced && balanceSheet?.statement?.balanced);

  return (
    <Card className="content-card border-0 accounting-setup-card accounting-command-center-lite mb-3">
      <Card.Body>
        <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 mb-3">
          <div>
            <div className="section-kicker mb-2">Accounting Command Center · B3.2</div>
            <h3 className="panel-title mb-1">Ledger cockpit dari transaksi operasional</h3>
            <p className="text-muted mb-0">Panel ini membaca JournalEntry POSTED, bukan angka dekoratif. Gunakan untuk membuktikan auto journal, Trial Balance, P&amp;L Lite, dan Balance Sheet Lite.</p>
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
      </Card.Body>
    </Card>
  );
}
