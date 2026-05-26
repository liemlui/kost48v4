import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import { StatusStrip } from '../../components/workspace';
import AccountingReadinessCard from '../../components/accounting/AccountingReadinessCard';
import CashAccountSetupPanel from '../../components/accounting/CashAccountSetupPanel';
import OpeningBalanceWizard from '../../components/accounting/OpeningBalanceWizard';
import TrialBalancePreview from '../../components/accounting/TrialBalancePreview';
import BalanceSheetGuardPanel from '../../components/accounting/BalanceSheetGuardPanel';
import AccountingCommandCenterLite from '../../components/accounting/AccountingCommandCenterLite';
import ProfitLossLitePanel from '../../components/accounting/ProfitLossLitePanel';
import AssetReadinessPanel from '../../components/accounting/AssetReadinessPanel';
import {
  createAccountingPeriod,
  createCashAccount,
  createOpeningBalanceDraft,
  fetchAccountingPeriods,
  fetchAccountingReadiness,
  fetchAssetReadiness,
  fetchAccounts,
  fetchBalanceSheetGuard,
  fetchCashAccounts,
  fetchDepositPosition,
  fetchDepositReconciliation,
  fetchOpeningBalances,
  fetchPostingBoundary,
  fetchProfitLossLite,
  fetchRecentAutoJournals,
  fetchReversalWatch,
  fetchTrialBalance,
  fetchUnmappedTransactions,
  postOpeningBalance,
  runAutoJournalBackfill,
  runDepositBackfillDryRun,
  seedDefaultCoa,
  voidOpeningBalance,
  type CreateCashAccountPayload,
  type CreateOpeningBalanceDraftPayload,
} from '../../api/accounting';

const financeMenu = [
  { id: 'invoices', icon: '🧾', label: 'Tagihan', helper: 'Invoice sewa, deposit, utility, dan blocker checkout.', to: '/invoices', active: false },
  { id: 'review', icon: '✅', label: 'Review Pembayaran', helper: 'Bukti bayar yang perlu diverifikasi.', to: '/payment-submissions/review', active: false },
  { id: 'wifi', icon: '📶', label: 'Voucher WiFi', helper: 'Rekap penjualan voucher WiFi.', to: '/wifi-sales', active: false },
  { id: 'ancillary', icon: '🛒', label: 'Pendapatan Tambahan', helper: 'Laundry, galon, cleaning, parkir, dan add-on lain.', to: '/ancillary-revenue', active: false },
  { id: 'expenses', icon: '💸', label: 'Pengeluaran', helper: 'Biaya operasional kos dan COGS layanan tambahan.', to: '/expenses', active: false },
  { id: 'history', icon: '📚', label: 'Riwayat Bayar', helper: 'Pembayaran invoice yang sudah tercatat.', to: '/invoice-payments', active: false },
  { id: 'accounting', icon: '📘', label: 'Setup Accounting', helper: 'Cash/bank, opening balance, readiness, dan trial balance.', to: '/finance/accounting-setup', active: true },
  { id: 'assets', icon: '🏗️', label: 'Asset Register', helper: 'Aset tetap, nilai buku, dan depresiasi bulanan.', to: '/finance/assets', active: false },
];

function currentAsOf() {
  return new Date().toISOString().slice(0, 10);
}

function getApiErrorMessage(error: unknown, fallback: string) {
  const maybe = error as { response?: { data?: { message?: string | string[] } }; message?: string };
  const message = maybe.response?.data?.message ?? maybe.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}


function formatRupiah(value?: number | null) {
  return `Rp ${Number(value ?? 0).toLocaleString('id-ID')}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function sourceLabel(sourceType?: string | null) {
  const labels: Record<string, string> = {
    INVOICE: 'Invoice',
    INVOICE_PAYMENT: 'Pembayaran',
    EXPENSE: 'Expense',
    WIFI_SALE: 'WiFi',
    OPENING_BALANCE: 'Opening',
    DEPOSIT: 'Deposit',
    ADJUSTMENT: 'Adjustment/Reversal',
  };
  return labels[String(sourceType ?? '')] ?? sourceType ?? '-';
}

export default function AccountingSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const asOf = currentAsOf();

  const readinessQuery = useQuery({ queryKey: ['accounting-readiness'], queryFn: fetchAccountingReadiness, staleTime: 30_000 });
  const accountsQuery = useQuery({ queryKey: ['accounting-accounts'], queryFn: () => fetchAccounts({ isActive: true }), staleTime: 60_000 });
  const cashAccountsQuery = useQuery({ queryKey: ['accounting-cash-accounts'], queryFn: () => fetchCashAccounts({ isActive: true }), staleTime: 30_000 });
  const periodsQuery = useQuery({ queryKey: ['accounting-periods'], queryFn: () => fetchAccountingPeriods(), staleTime: 30_000 });
  const openingBalancesQuery = useQuery({ queryKey: ['accounting-opening-balances'], queryFn: () => fetchOpeningBalances(), staleTime: 30_000 });
  const trialBalanceQuery = useQuery({ queryKey: ['accounting-trial-balance', asOf], queryFn: () => fetchTrialBalance({ asOf }), staleTime: 30_000 });
  const balanceSheetQuery = useQuery({ queryKey: ['accounting-balance-sheet', asOf], queryFn: () => fetchBalanceSheetGuard({ asOf }), staleTime: 30_000 });
  const assetReadinessQuery = useQuery({ queryKey: ['accounting-asset-readiness'], queryFn: fetchAssetReadiness, staleTime: 30_000 });
  const profitLossQuery = useQuery({ queryKey: ['accounting-profit-loss-lite', asOf], queryFn: () => fetchProfitLossLite({ asOf }), staleTime: 30_000 });
  const postingBoundaryQuery = useQuery({ queryKey: ['accounting-posting-boundary'], queryFn: fetchPostingBoundary, staleTime: 30_000 });
  const unmappedQuery = useQuery({ queryKey: ['accounting-unmapped-transactions'], queryFn: fetchUnmappedTransactions, staleTime: 30_000 });
  const recentJournalsQuery = useQuery({
    queryKey: ['accounting-recent-auto-journals'],
    queryFn: () => fetchRecentAutoJournals({ sourceTypes: ['INVOICE', 'INVOICE_PAYMENT', 'EXPENSE', 'WIFI_SALE', 'DEPOSIT', 'ADJUSTMENT', 'DEPRECIATION'], limit: 8 }),
    staleTime: 20_000,
  });

  const depositPositionQuery = useQuery({ queryKey: ['accounting-deposit-position'], queryFn: fetchDepositPosition, staleTime: 30_000 });
  const depositReconciliationQuery = useQuery({ queryKey: ['accounting-deposit-reconciliation'], queryFn: fetchDepositReconciliation, staleTime: 30_000 });
  const reversalWatchQuery = useQuery({ queryKey: ['accounting-reversal-watch'], queryFn: fetchReversalWatch, staleTime: 30_000 });

  const accounts = accountsQuery.data ?? [];
  const cashAccounts = cashAccountsQuery.data ?? [];
  const periods = periodsQuery.data ?? [];
  const openingBalances = openingBalancesQuery.data ?? [];
  const isInitialLoading = readinessQuery.isLoading || accountsQuery.isLoading;
  const autoJournalEnabled = Boolean(postingBoundaryQuery.data?.autoPostingEnabled);
  const unmappedSummary = unmappedQuery.data?.summary;
  const unmappedOperationalCount = unmappedSummary
    ? unmappedSummary.invoiceSampleCount + unmappedSummary.invoicePaymentSampleCount + unmappedSummary.expenseSampleCount + unmappedSummary.wifiSaleSampleCount
    : 0;
  const recentJournals = recentJournalsQuery.data?.items ?? [];
  const latestAutoJournal = recentJournals[0];

  const postedOpeningBalance = useMemo(() => openingBalances.find((batch) => batch.status === 'POSTED'), [openingBalances]);
  const draftOpeningBalance = useMemo(() => openingBalances.find((batch) => batch.status === 'DRAFT'), [openingBalances]);
  const canManageOpeningBalance = user?.role === 'OWNER';

  async function refreshAccounting() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['accounting-readiness'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-cash-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-periods'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-opening-balances'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-trial-balance'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-balance-sheet'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-asset-readiness'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-profit-loss-lite'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-posting-boundary'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-unmapped-transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-recent-auto-journals'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-deposit-position'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-deposit-reconciliation'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-reversal-watch'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-journal-entries'] }),
    ]);
  }

  const seedMutation = useMutation({
    mutationFn: seedDefaultCoa,
    onMutate: () => { setActionError(null); setActionMessage(null); },
    onSuccess: async (result) => {
      setActionError(null);
      setActionMessage(`Default COA siap: ${result.seededCount} akun.`);
      await refreshAccounting();
    },
    onError: (error: unknown) => { setActionMessage(null); setActionError(getApiErrorMessage(error, 'Gagal seed default COA.')); },
  });

  const createCashMutation = useMutation({
    mutationFn: (payload: CreateCashAccountPayload) => createCashAccount(payload),
    onMutate: () => { setActionError(null); setActionMessage(null); },
    onSuccess: async () => {
      setActionError(null);
      setActionMessage('Cash/bank account berhasil disimpan.');
      await refreshAccounting();
    },
    onError: (error: unknown) => { setActionMessage(null); setActionError(getApiErrorMessage(error, 'Gagal menyimpan cash account.')); },
  });

  const createPeriodMutation = useMutation({
    mutationFn: createAccountingPeriod,
    onMutate: () => { setActionError(null); setActionMessage(null); },
    onSuccess: async () => {
      setActionError(null);
      setActionMessage('Accounting period berhasil dibuat.');
      await refreshAccounting();
    },
    onError: (error: unknown) => { setActionMessage(null); setActionError(getApiErrorMessage(error, 'Gagal membuat accounting period.')); },
  });

  const createOpeningDraftMutation = useMutation({
    mutationFn: (payload: CreateOpeningBalanceDraftPayload) => createOpeningBalanceDraft(payload),
    onMutate: () => { setActionError(null); setActionMessage(null); },
    onSuccess: async () => {
      setActionError(null);
      setActionMessage('Draft opening balance berhasil dibuat. Review total debit/kredit sebelum posting.');
      await refreshAccounting();
    },
    onError: (error: unknown) => { setActionMessage(null); setActionError(getApiErrorMessage(error, 'Gagal membuat draft opening balance.')); },
  });

  const postOpeningMutation = useMutation({
    mutationFn: postOpeningBalance,
    onMutate: () => { setActionError(null); setActionMessage(null); },
    onSuccess: async () => {
      setActionError(null);
      setActionMessage('Opening balance berhasil diposting sebagai jurnal pembuka. Trial Balance sekarang membaca saldo awal.');
      await refreshAccounting();
    },
    onError: (error: unknown) => { setActionMessage(null); setActionError(getApiErrorMessage(error, 'Gagal posting opening balance.')); },
  });

  const voidOpeningMutation = useMutation({
    mutationFn: voidOpeningBalance,
    onMutate: () => { setActionError(null); setActionMessage(null); },
    onSuccess: async () => {
      setActionError(null);
      setActionMessage('Draft opening balance berhasil dibatalkan. Draft ini tidak lagi dipakai untuk setup accounting.');
      await refreshAccounting();
    },
    onError: (error: unknown) => { setActionMessage(null); setActionError(getApiErrorMessage(error, 'Gagal membatalkan draft opening balance.')); },
  });


  const backfillMutation = useMutation({
    mutationFn: () => runAutoJournalBackfill({ sourceTypes: ['INVOICE', 'INVOICE_PAYMENT', 'EXPENSE', 'WIFI_SALE'], limit: 25 }),
    onMutate: () => { setActionError(null); setActionMessage(null); },
    onSuccess: async (result) => {
      setActionError(null);
      setActionMessage(`Auto Journal Lite diproses: ${result.createdCount} dibuat, ${result.skippedCount} diskip, ${result.failedCount} gagal.`);
      await refreshAccounting();
    },
    onError: (error: unknown) => { setActionMessage(null); setActionError(getApiErrorMessage(error, 'Gagal menjalankan backfill auto journal.')); },
  });

  const depositDryRunMutation = useMutation({
    mutationFn: () => runDepositBackfillDryRun({ limit: 25 }),
    onMutate: () => { setActionError(null); setActionMessage(null); },
    onSuccess: async (result) => {
      setActionError(null);
      setActionMessage(`Dry-run deposit selesai: ${result.createdWouldBe} kandidat, ${result.skipped} skip, ${result.blocked} blocked. Tidak ada journal dibuat.`);
      await refreshAccounting();
    },
    onError: (error: unknown) => { setActionMessage(null); setActionError(getApiErrorMessage(error, 'Gagal menjalankan dry-run backfill deposit.')); },
  });

  return (
    <div className="accounting-setup-page">
      <PageHeader
        eyebrow="Finance · Accounting Setup"
        title="Accounting Command Center"
        description="B3.3R membaca ledger POSTED, memisahkan saldo awal deposit dari deposit operasional, dan menyiapkan dry-run backfill agar liability tidak tergandakan."
        secondaryAction={<Button variant="outline-primary" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>Seed Default COA</Button>}
      />

      <div className="admin-area-internal-menu finance-inline-menu" aria-label="Sub-menu Finance">
        <div className="admin-area-internal-menu-head">
          <span>Menu Finance</span>
          <small>Accounting setup masuk Finance, bukan Reports sidebar standalone.</small>
        </div>
        <div className="admin-area-internal-menu-scroll">
          {financeMenu.map((item) => (
            <button key={item.id} type="button" className={`admin-area-internal-chip info ${item.active ? 'is-active' : ''}`.trim()} onClick={() => navigate(item.to)} title={item.helper}>
              <span className="admin-area-internal-chip-main"><span className="admin-area-internal-icon" aria-hidden="true">{item.icon}</span><span className="admin-area-internal-label">{item.label}</span></span>
              <small>{item.helper}</small>
            </button>
          ))}
        </div>
      </div>

      {actionError ? <Alert variant="danger">{actionError}</Alert> : null}
      {actionMessage ? <Alert variant="success" onClose={() => setActionMessage(null)} dismissible>{actionMessage}</Alert> : null}
      {!canManageOpeningBalance ? (
        <Alert variant="info" className="mb-3">
          Setup accounting bisa dipantau oleh Admin, tetapi pembuatan draft, posting, dan pembatalan saldo awal hanya boleh dilakukan Owner karena menjadi dasar neraca.
        </Alert>
      ) : null}

      {isInitialLoading ? (
        <Card className="content-card border-0"><Card.Body><Spinner animation="border" size="sm" className="me-2" /> Memuat setup accounting...</Card.Body></Card>
      ) : null}

      <StatusStrip
        items={[
          { id: 'coa', label: 'COA aktif', value: accounts.length, helper: 'Default COA kos', tone: accounts.length >= 30 ? 'success' : 'warning' },
          { id: 'cash', label: 'Cash/Bank', value: cashAccounts.length, helper: 'Minimal 1 akun', tone: cashAccounts.length ? 'success' : 'warning' },
          { id: 'period', label: 'Period', value: periods.length, helper: 'Periode cutover', tone: periods.length ? 'success' : 'warning' },
          { id: 'opening', label: 'Opening Balance', value: postedOpeningBalance ? 'POSTED' : draftOpeningBalance ? 'DRAFT' : 'Belum', helper: 'Starting point Balance Sheet', tone: postedOpeningBalance ? 'success' : draftOpeningBalance ? 'warning' : 'danger' },
          { id: 'auto-journal', label: 'Auto Journal', value: autoJournalEnabled ? 'ON' : 'OFF', helper: 'B3 Lite', tone: autoJournalEnabled ? 'success' : 'warning' },
          { id: 'asset-b4', label: 'Aset B4', value: assetReadinessQuery.isLoading ? '...' : assetReadinessQuery.data?.readyForAssetSchemaAct ? 'Ready' : 'Proof', helper: 'Readiness aset', tone: assetReadinessQuery.data?.readyForAssetSchemaAct ? 'success' : 'warning' },
          { id: 'unmapped', label: 'Belum Terjurnal', value: unmappedQuery.isLoading ? '...' : unmappedOperationalCount, helper: 'Sample operasional', tone: unmappedOperationalCount ? 'warning' : 'success' },
        ]}
      />

      <AccountingCommandCenterLite
        readiness={readinessQuery.data}
        trial={trialBalanceQuery.data}
        balanceSheet={balanceSheetQuery.data}
        profitLoss={profitLossQuery.data}
        unmapped={unmappedQuery.data}
        depositPosition={depositPositionQuery.data}
        depositReconciliation={depositReconciliationQuery.data}
        reversalWatch={reversalWatchQuery.data}
        recentJournals={recentJournals}
        autoJournalEnabled={autoJournalEnabled}
        isLoading={readinessQuery.isLoading || trialBalanceQuery.isLoading || profitLossQuery.isLoading}
      />

      <Row className="g-3 mb-3">
        <Col xl={6}><AccountingReadinessCard readiness={readinessQuery.data} /></Col>
        <Col xl={6}><BalanceSheetGuardPanel guard={balanceSheetQuery.data} /></Col>
      </Row>

      <AssetReadinessPanel readiness={assetReadinessQuery.data} isLoading={assetReadinessQuery.isLoading} />

      <Card className="content-card border-0 mb-3">
        <Card.Body className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center">
          <div>
            <div className="small text-uppercase text-muted fw-semibold mb-1">Auto Journal Lite · B3.1</div>
            <h3 className="h5 mb-1">{autoJournalEnabled ? 'Auto-posting operasional aktif' : 'Auto-posting belum aktif'}</h3>
            <p className="text-muted mb-0">
              Invoice issued, pembayaran invoice, expense, dan penjualan WiFi akan dicatat sebagai JournalEntry POSTED secara idempotent. Deposit liability dan reversal invoice cancel sudah diawasi di B3.3; depreciation/inventory/payment reversal masih deferred.
            </p>
            {postingBoundaryQuery.data?.note ? <small className="text-muted d-block mt-2">{postingBoundaryQuery.data.note}</small> : null}
          </div>
          <div className="d-flex flex-column flex-sm-row gap-2 align-items-sm-center">
            <div className="text-sm-end">
              <div className="fw-semibold">{unmappedQuery.isLoading ? 'Memuat...' : `${unmappedOperationalCount} sample belum terjurnal`}</div>
              <small className="text-muted">Invoice, payment, expense, WiFi</small>
            </div>
            <Button
              variant="outline-primary"
              disabled={!canManageOpeningBalance || backfillMutation.isPending}
              onClick={() => backfillMutation.mutate()}
            >
              {backfillMutation.isPending ? 'Backfill...' : 'Backfill 25 Transaksi'}
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Card className="content-card border-0 mb-3">
        <Card.Body className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center">
          <div>
            <div className="small text-uppercase text-muted fw-semibold mb-1">Deposit Reconciliation · B3.3R</div>
            <h3 className="h5 mb-1">Dry-run sebelum backfill deposit</h3>
            <p className="text-muted mb-2">
              Selisih deposit tidak otomatis berarti harus membuat journal baru. Jika berasal dari opening balance, backfill deposit bisa menggandakan liability. Dry-run hanya membaca kandidat dan tidak membuat JournalEntry.
            </p>
            {depositReconciliationQuery.data?.summary ? (
              <div className="d-flex flex-wrap gap-2 small">
                <Badge bg={depositReconciliationQuery.data.summary.reconciliationStatus === 'MATCHED' ? 'success' : 'warning'}>{depositReconciliationQuery.data.summary.reconciliationStatus}</Badge>
                <span className="text-muted">Opening: {formatRupiah(depositReconciliationQuery.data.summary.ledgerOpeningBalanceDepositRupiah)}</span>
                <span className="text-muted">Auto deposit: {formatRupiah(depositReconciliationQuery.data.summary.ledgerAutoJournalDepositRupiah)}</span>
                <span className="text-muted">Selisih: {formatRupiah(depositReconciliationQuery.data.summary.differenceRupiah)}</span>
              </div>
            ) : null}
          </div>
          <Button
            variant="outline-warning"
            disabled={!canManageOpeningBalance || depositDryRunMutation.isPending}
            onClick={() => depositDryRunMutation.mutate()}
          >
            {depositDryRunMutation.isPending ? 'Dry-run...' : 'Dry-run Deposit Backfill'}
          </Button>
        </Card.Body>
      </Card>

      <Card className="content-card border-0 mb-3">
        <Card.Body>
          <div className="d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-start mb-3">
            <div>
              <div className="small text-uppercase text-muted fw-semibold mb-1">Auto Journal Activity · B3.1B</div>
              <h3 className="h5 mb-1">Jurnal otomatis terbaru</h3>
              <p className="text-muted mb-0">Gunakan ini untuk membuktikan invoice, pembayaran, expense, dan WiFi sale baru benar-benar membuat JournalEntry POSTED.</p>
            </div>
            <div className="text-lg-end">
              <Badge bg={latestAutoJournal?.isBalanced ? 'success' : recentJournals.length ? 'warning' : 'secondary'}>
                {recentJournalsQuery.isLoading ? 'Memuat...' : `${recentJournals.length} jurnal`}
              </Badge>
              <div className="small text-muted mt-1">Terbaru: {latestAutoJournal ? formatDateTime(latestAutoJournal.postedAt ?? latestAutoJournal.createdAt) : '-'}</div>
            </div>
          </div>

          {recentJournalsQuery.isLoading ? (
            <div className="text-muted"><Spinner animation="border" size="sm" className="me-2" /> Memuat aktivitas auto journal...</div>
          ) : recentJournals.length ? (
            <div className="table-responsive">
              <Table hover size="sm" className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Jurnal</th>
                    <th>Source</th>
                    <th>Debit</th>
                    <th>Kredit</th>
                    <th>Status</th>
                    <th>Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {recentJournals.map((journal) => (
                    <tr key={journal.id}>
                      <td>
                        <div className="fw-semibold">{journal.entryNumber}</div>
                        <small className="text-muted">{journal.memo || 'Auto journal'}</small>
                      </td>
                      <td>
                        <Badge bg="light" text="dark" className="border">{sourceLabel(journal.sourceType)}</Badge>
                        <div className="small text-muted">ID {journal.sourceId || '-'}</div>
                      </td>
                      <td>{formatRupiah(journal.totalDebitRupiah)}</td>
                      <td>{formatRupiah(journal.totalCreditRupiah)}</td>
                      <td><Badge bg={journal.isBalanced ? 'success' : 'danger'}>{journal.isBalanced ? 'Balanced' : 'Tidak balance'}</Badge></td>
                      <td><small>{formatDateTime(journal.postedAt ?? journal.createdAt)}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <Alert variant="light" className="border mb-0">
              Belum ada auto journal untuk source B3.1/B3.3. Ini normal jika belum ada invoice/payment/expense/WiFi/deposit/reversal baru sejak auto journal aktif.
            </Alert>
          )}

          {recentJournalsQuery.data?.note ? <small className="text-muted d-block mt-3">{recentJournalsQuery.data.note}</small> : null}
        </Card.Body>
      </Card>

      <Row className="g-3 mb-3">
        <Col xl={6}>
          <ProfitLossLitePanel profitLoss={profitLossQuery.data} />
        </Col>
        <Col xl={6}>
          <TrialBalancePreview trial={trialBalanceQuery.data} />
        </Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col xl={5}>
          <CashAccountSetupPanel
            accounts={accounts}
            cashAccounts={cashAccounts}
            onSubmit={(payload) => createCashMutation.mutate(payload)}
            isSubmitting={createCashMutation.isPending}
          />
        </Col>
        <Col xl={7}>
          <OpeningBalanceWizard
            accounts={accounts}
            periods={periods}
            batches={openingBalances}
            onCreatePeriod={(payload) => createPeriodMutation.mutate(payload)}
            onCreateDraft={(payload) => createOpeningDraftMutation.mutate(payload)}
            onPost={(id) => postOpeningMutation.mutate(id)}
            onVoid={(id) => voidOpeningMutation.mutate(id)}
            canManageOpeningBalance={canManageOpeningBalance}
            isCreatingDraft={createOpeningDraftMutation.isPending}
            isPosting={postOpeningMutation.isPending}
            isVoiding={voidOpeningMutation.isPending}
          />
        </Col>
      </Row>

    </div>
  );
}
