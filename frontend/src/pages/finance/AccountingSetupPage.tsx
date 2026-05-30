import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
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
import PeriodClosePanel from '../../components/accounting/PeriodClosePanel';
import AccountingPeriodsPanel from '../../components/accounting/AccountingPeriodsPanel';
import AccountingDataQualityPanel from '../../components/accounting/AccountingDataQualityPanel';
import PeriodCloseTimeline from '../../components/accounting/PeriodCloseTimeline';
import { DepositOperationsPanel } from '../../components/deposit';
import JournalAuditTrailPanel from '../../components/accounting/JournalAuditTrailPanel';
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
  fetchPeriodAutoClosePolicy,
  fetchPeriodCloseReadiness,
  fetchPostingBoundary,
  fetchProfitLossLite,
  fetchRecentAutoJournals,
  fetchReversalWatch,
  fetchTrialBalance,
  fetchUnmappedTransactions,
  postOpeningBalance,
  postPeriodClose,
  postPeriodReopen,
  reopenAccountingPeriod,
  previewPeriodClose,
  previewPeriodReopen,
  runAutoJournalBackfill,
  runDepositBackfillDryRun,
  runPeriodAutoClose,
  seedDefaultCoa,
  voidOpeningBalance,
  type CreateCashAccountPayload,
  type CreateOpeningBalanceDraftPayload,
} from '../../api/accounting';
import { fetchDepositLedgerReconciliationLite, fetchDepositLedgerSummary } from '../../api/depositLedger';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';

const financeMenu = [
  { id: 'invoices', icon: '🧾', label: 'Tagihan', helper: 'Invoice sewa, deposit, utility, dan blocker checkout.', to: '/invoices', active: false },
  { id: 'review', icon: '✅', label: 'Review Pembayaran', helper: 'Bukti bayar yang perlu diverifikasi.', to: '/payment-submissions/review', active: false },
  { id: 'wifi', icon: '📶', label: 'Voucher WiFi', helper: 'Rekap penjualan voucher WiFi.', to: '/wifi-sales', active: false },
  { id: 'ancillary', icon: '🛒', label: 'Pendapatan Tambahan', helper: 'Laundry, galon, cleaning, parkir, dan add-on lain.', to: '/ancillary-revenue', active: false },
  { id: 'expenses', icon: '💸', label: 'Pengeluaran', helper: 'Biaya operasional kos dan COGS layanan tambahan.', to: '/expenses', active: false },
  { id: 'history', icon: '📚', label: 'Riwayat Bayar', helper: 'Pembayaran invoice yang sudah tercatat.', to: '/invoice-payments', active: false },
  { id: 'accounting', icon: '📘', label: 'Laporan Keuangan', helper: 'Neraca, laba rugi, trial balance, aset, dan tutup periode.', to: '/finance/accounting-setup', active: true },
  { id: 'assets', icon: '🏗️', label: 'Asset Register', helper: 'Aset tetap, nilai buku, dan depresiasi bulanan.', to: '/finance/assets', active: false },
];

function currentAsOf() {
  return new Date().toISOString().slice(0, 10);
}

function formatRupiah(value?: number | null) {
  return `Rp ${Number(value ?? 0).toLocaleString('id-ID')}`;
}

export default function AccountingSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [periodCloseNotes, setPeriodCloseNotes] = useState('');
  const [periodReopenReason, setPeriodReopenReason] = useState('');
  const [periodClosePreview, setPeriodClosePreview] = useState<Awaited<ReturnType<typeof previewPeriodClose>> | undefined>(undefined);
  const [periodReopenPreview, setPeriodReopenPreview] = useState<Awaited<ReturnType<typeof previewPeriodReopen>> | undefined>(undefined);
  const asOf = currentAsOf();
  const asOfDate = new Date(`${asOf}T00:00:00Z`);
  const closeYear = asOfDate.getUTCFullYear();
  const closeMonth = asOfDate.getUTCMonth() + 1;

  const readinessQuery = useQuery({ queryKey: ['accounting-readiness'], queryFn: fetchAccountingReadiness, staleTime: 30_000 });
  const accountsQuery = useQuery({ queryKey: ['accounting-accounts'], queryFn: () => fetchAccounts({ isActive: true }), staleTime: 60_000 });
  const cashAccountsQuery = useQuery({ queryKey: ['accounting-cash-accounts'], queryFn: () => fetchCashAccounts({ isActive: true }), staleTime: 30_000 });
  const periodsQuery = useQuery({ queryKey: ['accounting-periods'], queryFn: () => fetchAccountingPeriods(), staleTime: 30_000 });
  const openingBalancesQuery = useQuery({ queryKey: ['accounting-opening-balances'], queryFn: () => fetchOpeningBalances(), staleTime: 30_000 });
  const trialBalanceQuery = useQuery({ queryKey: ['accounting-trial-balance', asOf], queryFn: () => fetchTrialBalance({ asOf }), staleTime: 30_000 });
  const balanceSheetQuery = useQuery({ queryKey: ['accounting-balance-sheet', asOf], queryFn: () => fetchBalanceSheetGuard({ asOf }), staleTime: 30_000 });
  const assetReadinessQuery = useQuery({ queryKey: ['accounting-asset-readiness'], queryFn: fetchAssetReadiness, staleTime: 30_000 });
  const profitLossQuery = useQuery({ queryKey: ['accounting-profit-loss-lite', closeYear, closeMonth], queryFn: () => fetchProfitLossLite({ year: closeYear, month: closeMonth }), staleTime: 30_000 });
  const periodCloseReadinessQuery = useQuery({ queryKey: ['accounting-period-close-readiness', closeYear, closeMonth], queryFn: () => fetchPeriodCloseReadiness({ year: closeYear, month: closeMonth }), staleTime: 20_000 });
  const autoClosePolicyQuery = useQuery({ queryKey: ['accounting-period-auto-close-policy'], queryFn: fetchPeriodAutoClosePolicy, staleTime: 30_000 });
  const postingBoundaryQuery = useQuery({ queryKey: ['accounting-posting-boundary'], queryFn: fetchPostingBoundary, staleTime: 30_000 });
  const unmappedQuery = useQuery({ queryKey: ['accounting-unmapped-transactions'], queryFn: fetchUnmappedTransactions, staleTime: 30_000 });
  const recentJournalsQuery = useQuery({
    queryKey: ['accounting-recent-auto-journals'],
    queryFn: () => fetchRecentAutoJournals({ sourceTypes: ['OPENING_BALANCE', 'INVOICE', 'INVOICE_PAYMENT', 'EXPENSE', 'WIFI_SALE', 'DEPOSIT', 'ADJUSTMENT', 'DEPRECIATION', 'CLOSING_ENTRY', 'CLOSING_REVERSAL'], limit: 12 }),
    staleTime: 20_000,
  });

  const depositPositionQuery = useQuery({ queryKey: ['accounting-deposit-position'], queryFn: fetchDepositPosition, staleTime: 30_000 });
  const depositReconciliationQuery = useQuery({ queryKey: ['accounting-deposit-reconciliation'], queryFn: fetchDepositReconciliation, staleTime: 30_000 });
  const depositLedgerSummaryQuery = useQuery({ queryKey: ['deposit-ledger', 'summary'], queryFn: () => fetchDepositLedgerSummary({ limit: 25 }), staleTime: 30_000, retry: false });
  const depositLedgerReconciliationQuery = useQuery({ queryKey: ['deposit-ledger', 'reconciliation-lite'], queryFn: () => fetchDepositLedgerReconciliationLite({ limit: 200 }), staleTime: 30_000, retry: false });
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

  const postedOpeningBalance = useMemo(() => openingBalances.find((batch) => batch.status === 'POSTED'), [openingBalances]);
  const draftOpeningBalance = useMemo(() => openingBalances.find((batch) => batch.status === 'DRAFT'), [openingBalances]);
  const canManageOpeningBalance = user?.role === 'OWNER';


  function focusAccountingSection(sectionId: string) {
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

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
      queryClient.invalidateQueries({ queryKey: ['accounting-period-close-readiness'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-period-auto-close-policy'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-posting-boundary'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-unmapped-transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-recent-auto-journals'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-deposit-position'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-deposit-reconciliation'] }),
      queryClient.invalidateQueries({ queryKey: ['deposit-ledger', 'summary'] }),
      queryClient.invalidateQueries({ queryKey: ['deposit-ledger', 'reconciliation-lite'] }),
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
      setActionMessage(`Auto journal diproses: ${result.createdCount} dibuat, ${result.skippedCount} diskip, ${result.failedCount} gagal.`);
      await refreshAccounting();
    },
    onError: (error: unknown) => { setActionMessage(null); setActionError(getApiErrorMessage(error, 'Gagal menjalankan backfill auto journal.')); },
  });



  const autoCloseMutation = useMutation({
    mutationFn: () => runPeriodAutoClose(),
    onMutate: () => { setActionError(null); setActionMessage(null); },
    onSuccess: async (result) => {
      setActionError(null);
      setActionMessage(result.closed
        ? `Auto-close berhasil menutup periode ${result.targetPeriodKey}.`
        : `Auto-close dicek: ${result.skippedReason ?? 'periode belum memenuhi syarat close otomatis'}.`);
      await refreshAccounting();
    },
    onError: (error: unknown) => { setActionMessage(null); setActionError(getApiErrorMessage(error, 'Gagal menjalankan auto-close periode.')); },
  });

  const previewCloseMutation = useMutation({
    mutationFn: () => previewPeriodClose({ year: closeYear, month: closeMonth, notes: periodCloseNotes || undefined }),
    onMutate: () => { setActionError(null); setActionMessage(null); },
    onSuccess: async (result) => {
      setPeriodClosePreview(result);
      setActionError(null);
      setActionMessage(result.canPost ? 'Preview closing siap dan balance.' : 'Preview closing dibuat, tetapi masih ada blocker sebelum posting.');
      await queryClient.invalidateQueries({ queryKey: ['accounting-period-close-readiness'] });
    },
    onError: (error: unknown) => { setActionMessage(null); setActionError(getApiErrorMessage(error, 'Gagal membuat preview tutup periode.')); },
  });

  const postCloseMutation = useMutation({
    mutationFn: () => postPeriodClose({ year: closeYear, month: closeMonth, notes: periodCloseNotes || undefined }),
    onMutate: () => { setActionError(null); setActionMessage(null); },
    onSuccess: async (result) => {
      setActionError(null);
      setPeriodClosePreview(result.preview);
      setActionMessage(`Periode berhasil ditutup. Closing journal: ${result.journalEntry.entryNumber}.`);
      await refreshAccounting();
    },
    onError: (error: unknown) => { setActionMessage(null); setActionError(getApiErrorMessage(error, 'Gagal posting tutup periode.')); },
  });

  const previewReopenMutation = useMutation({
    mutationFn: () => previewPeriodReopen({ year: closeYear, month: closeMonth, reason: periodReopenReason }),
    onMutate: () => { setActionError(null); setActionMessage(null); },
    onSuccess: async (result) => {
      setPeriodReopenPreview(result);
      setActionError(null);
      setActionMessage(result.canReopen ? 'Preview buka ulang siap dan reversal balanced.' : 'Preview buka ulang dibuat, tetapi masih ada blocker.');
      await queryClient.invalidateQueries({ queryKey: ['accounting-period-close-readiness'] });
    },
    onError: (error: unknown) => { setActionMessage(null); setActionError(getApiErrorMessage(error, 'Gagal membuat preview buka ulang periode.')); },
  });

  const postReopenMutation = useMutation({
    mutationFn: () => postPeriodReopen({ year: closeYear, month: closeMonth, reason: periodReopenReason }),
    onMutate: () => { setActionError(null); setActionMessage(null); },
    onSuccess: async (result) => {
      setActionError(null);
      setPeriodReopenPreview(result.preview);
      setPeriodClosePreview(undefined);
      setActionMessage(`Periode berhasil dibuka ulang. Reversal journal: ${result.journalEntry.entryNumber}.`);
      await refreshAccounting();
    },
    onError: (error: unknown) => { setActionMessage(null); setActionError(getApiErrorMessage(error, 'Gagal membuka ulang periode.')); },
  });

  const reopenCurrentPostingPeriodMutation = useMutation({
    mutationFn: () => {
      const periodId = readinessQuery.data?.postingPeriod?.id ?? periods.find((period) => period.isCurrentPostingPeriod)?.id;
      if (!periodId) throw new Error('Periode posting berjalan belum ditemukan.');
      return reopenAccountingPeriod(periodId, { reason: periodReopenReason });
    },
    onMutate: () => { setActionError(null); setActionMessage(null); },
    onSuccess: async (result) => {
      setActionError(null);
      setPeriodReopenPreview(result.preview);
      setPeriodClosePreview(undefined);
      setActionMessage(`Periode posting berhasil dibuka ulang. Reversal journal: ${result.journalEntry.entryNumber}.`);
      await refreshAccounting();
    },
    onError: (error: unknown) => { setActionMessage(null); setActionError(getApiErrorMessage(error, 'Gagal membuka ulang periode posting.')); },
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
        eyebrow="Finance · Laporan Keuangan"
        title="Laporan Keuangan & Kesehatan Ledger"
        description="Cockpit owner untuk membaca Trial Balance, Neraca, Laba Rugi, aset, kualitas data, dan status tutup periode tanpa jargon fase teknis."
        secondaryAction={<Button variant="outline-primary" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>Siapkan COA Default</Button>}
      />

      <div className="admin-area-internal-menu finance-inline-menu" aria-label="Sub-menu Finance">
        <div className="admin-area-internal-menu-head">
          <span>Menu Finance</span>
          <small>Laporan keuangan, tutup periode, aset, dan audit ledger berada di satu pintu Finance.</small>
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
          Laporan keuangan bisa dipantau oleh Admin, tetapi pembuatan draft, posting saldo awal, tutup periode, dan buka ulang periode hanya boleh dilakukan Owner karena menjadi dasar neraca dan audit ledger.
        </Alert>
      ) : null}

      {isInitialLoading ? (
        <Card className="content-card border-0"><Card.Body><Spinner animation="border" size="sm" className="me-2" /> Memuat laporan keuangan...</Card.Body></Card>
      ) : null}

      <StatusStrip
        items={[
          { id: 'coa', label: 'COA aktif', value: accounts.length, helper: 'Default COA kos', tone: accounts.length >= 30 ? 'success' : 'warning' },
          { id: 'cash', label: 'Cash/Bank', value: cashAccounts.length, helper: 'Minimal 1 akun', tone: cashAccounts.length ? 'success' : 'warning' },
          { id: 'period', label: 'Periode', value: periods.length, helper: 'Bulan accounting', tone: periods.length ? 'success' : 'warning' },
          { id: 'opening', label: 'Saldo Awal', value: postedOpeningBalance ? 'POSTED' : draftOpeningBalance ? 'DRAFT' : 'Belum', helper: 'Titik mulai neraca', tone: postedOpeningBalance ? 'success' : draftOpeningBalance ? 'warning' : 'danger' },
          { id: 'auto-journal', label: 'Auto Journal', value: autoJournalEnabled ? 'ON' : 'OFF', helper: 'Posting operasional', tone: autoJournalEnabled ? 'success' : 'warning' },
          { id: 'asset-b4', label: 'Aset', value: assetReadinessQuery.isLoading ? '...' : assetReadinessQuery.data?.readyForAssetSchemaAct ? 'Ready' : 'Review', helper: 'Register aset', tone: assetReadinessQuery.data?.readyForAssetSchemaAct ? 'success' : 'warning' },
          { id: 'period-close', label: 'Tutup Periode', value: periodCloseReadinessQuery.isLoading ? '...' : periodCloseReadinessQuery.data?.period?.status ?? 'Belum', helper: 'Close/reopen audit', tone: periodCloseReadinessQuery.data?.canPost || periodCloseReadinessQuery.data?.period?.status === 'CLOSED' ? 'success' : 'warning' },
          { id: 'auto-close', label: 'Auto-Close', value: autoClosePolicyQuery.isLoading ? '...' : autoClosePolicyQuery.data?.enabled ? 'ON' : 'OFF', helper: autoClosePolicyQuery.data?.targetPeriodKey ?? 'Bulan lalu', tone: autoClosePolicyQuery.data?.enabled ? 'success' : 'warning' },
          { id: 'deposit-ledger', label: 'Deposit Ops', value: depositLedgerSummaryQuery.isLoading ? '...' : formatRupiah(depositLedgerSummaryQuery.data?.totals.ledgerHeldBalanceRupiah ?? 0), helper: `${depositLedgerReconciliationQuery.data?.mismatchCount ?? 0} perlu review`, tone: (depositLedgerReconciliationQuery.data?.mismatchCount ?? 0) ? 'warning' : 'success' },
          { id: 'unmapped', label: 'Belum Terjurnal', value: unmappedQuery.isLoading ? '...' : unmappedOperationalCount, helper: 'Sample operasional', tone: unmappedOperationalCount ? 'warning' : 'success' },
        ]}
      />

      <AccountingCommandCenterLite
        readiness={readinessQuery.data}
        trial={trialBalanceQuery.data}
        balanceSheet={balanceSheetQuery.data}
        profitLoss={profitLossQuery.data}
        periodClose={periodCloseReadinessQuery.data}
        assetReadiness={assetReadinessQuery.data}
        unmapped={unmappedQuery.data}
        depositPosition={depositPositionQuery.data}
        depositReconciliation={depositReconciliationQuery.data}
        reversalWatch={reversalWatchQuery.data}
        recentJournals={recentJournals}
        autoJournalEnabled={autoJournalEnabled}
        isLoading={readinessQuery.isLoading || trialBalanceQuery.isLoading || profitLossQuery.isLoading}
        onFocusSection={focusAccountingSection}
      />

      <Row className="g-3 mb-3">
        <Col xl={7}>
          <AccountingDataQualityPanel
            readiness={readinessQuery.data}
            trial={trialBalanceQuery.data}
            balanceSheet={balanceSheetQuery.data}
            periodClose={periodCloseReadinessQuery.data}
            unmapped={unmappedQuery.data}
            assetReadiness={assetReadinessQuery.data}
            depositPosition={depositPositionQuery.data}
            depositReconciliation={depositReconciliationQuery.data}
            reversalWatch={reversalWatchQuery.data}
            isLoading={readinessQuery.isLoading || trialBalanceQuery.isLoading || balanceSheetQuery.isLoading}
          />
        </Col>
        <Col xl={5}>
          <PeriodCloseTimeline
            readiness={periodCloseReadinessQuery.data}
            profitLoss={profitLossQuery.data}
            recentJournals={recentJournals}
          />
        </Col>
      </Row>

      <Row className="g-3 mb-3">
        <Col xl={6}><AccountingReadinessCard readiness={readinessQuery.data} /></Col>
        <Col xl={6} id="balance-sheet"><BalanceSheetGuardPanel guard={balanceSheetQuery.data} /></Col>
      </Row>

      <div id="asset-readiness">
        <AssetReadinessPanel readiness={assetReadinessQuery.data} isLoading={assetReadinessQuery.isLoading} />
      </div>


      <Card className="content-card border-0 mb-3 accounting-setup-card">
        <Card.Body className="d-flex flex-column flex-xl-row gap-3 justify-content-between align-items-xl-center">
          <div>
            <div className="section-kicker mb-2">Auto-Close Bulanan</div>
            <h3 className="h5 mb-1">Tutup periode otomatis, tetapi tetap blocker-aware</h3>
            <p className="text-muted mb-2">
              Sistem menargetkan bulan yang sudah lewat ({autoClosePolicyQuery.data?.targetPeriodKey ?? 'bulan lalu'}), bukan bulan berjalan. Auto-close hanya berjalan jika semua readiness aman dan preview jurnal closing balanced.
            </p>
            <div className="d-flex flex-wrap gap-2 small">
              <Badge bg={autoClosePolicyQuery.data?.enabled ? 'success' : 'warning'}>{autoClosePolicyQuery.data?.enabled ? 'Auto-close ON' : 'Auto-close OFF'}</Badge>
              <Badge bg="info">Monthly controlled close</Badge>
              <span className="text-muted">Buka ulang tetap Owner-only + alasan audit.</span>
            </div>
            {autoClosePolicyQuery.data?.note ? <small className="text-muted d-block mt-2">{autoClosePolicyQuery.data.note}</small> : null}
          </div>
          <div className="d-flex flex-column flex-sm-row gap-2 align-items-sm-center">
            <Button
              variant="outline-primary"
              disabled={!canManageOpeningBalance || autoCloseMutation.isPending || !autoClosePolicyQuery.data?.enabled}
              onClick={() => autoCloseMutation.mutate()}
            >
              {autoCloseMutation.isPending ? 'Mengecek...' : 'Jalankan Auto-Close Sekarang'}
            </Button>
          </div>
        </Card.Body>
      </Card>

      <AccountingPeriodsPanel
        periods={periods}
        readiness={readinessQuery.data}
        isLoading={periodsQuery.isLoading || readinessQuery.isLoading}
        canManage={user?.role === 'OWNER'}
        reopenReason={periodReopenReason}
        isReopening={reopenCurrentPostingPeriodMutation.isPending}
        onReopenReasonChange={setPeriodReopenReason}
        onReopenCurrentPeriod={() => reopenCurrentPostingPeriodMutation.mutate()}
        onFocusPeriodClose={() => focusAccountingSection('period-close')}
      />

      <div id="period-close">
        <PeriodClosePanel
          year={closeYear}
          month={closeMonth}
          readiness={periodCloseReadinessQuery.data}
          preview={periodClosePreview}
          reopenPreview={periodReopenPreview}
          isLoading={periodCloseReadinessQuery.isLoading}
          isPreviewing={previewCloseMutation.isPending}
          isPosting={postCloseMutation.isPending}
          isReopenPreviewing={previewReopenMutation.isPending}
          isReopening={postReopenMutation.isPending}
          canPost={user?.role === 'OWNER'}
          notes={periodCloseNotes}
          reopenReason={periodReopenReason}
          onNotesChange={setPeriodCloseNotes}
          onReopenReasonChange={setPeriodReopenReason}
          onPreview={() => previewCloseMutation.mutate()}
          onPost={() => postCloseMutation.mutate()}
          onPreviewReopen={() => previewReopenMutation.mutate()}
          onReopen={() => postReopenMutation.mutate()}
        />
      </div>

      <JournalAuditTrailPanel
        journals={recentJournals}
        isLoading={recentJournalsQuery.isLoading}
        note={recentJournalsQuery.data?.note}
      />

      <Card className="content-card border-0 mb-3">
        <Card.Body className="d-flex flex-column flex-lg-row gap-3 justify-content-between align-items-lg-center">
          <div>
            <div className="section-kicker mb-2">Posting Operasional</div>
            <h3 className="h5 mb-1">{autoJournalEnabled ? 'Auto journal operasional aktif' : 'Auto journal operasional belum aktif'}</h3>
            <p className="text-muted mb-0">
              Tagihan, pembayaran, pengeluaran, dan voucher WiFi dicatat sebagai JournalEntry POSTED secara idempotent. Gunakan backfill hanya untuk data operasional lama yang memang perlu dipetakan ke ledger.
            </p>
            {postingBoundaryQuery.data?.note ? <small className="text-muted d-block mt-2">{postingBoundaryQuery.data.note}</small> : null}
          </div>
          <div className="d-flex flex-column flex-sm-row gap-2 align-items-sm-center">
            <div className="text-sm-end">
              <div className="fw-semibold">{unmappedQuery.isLoading ? 'Memuat...' : `${unmappedOperationalCount} sample belum terjurnal`}</div>
              <small className="text-muted">Tagihan, pembayaran, pengeluaran, WiFi</small>
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
            <div className="section-kicker mb-2">Review Deposit Liability</div>
            <h3 className="h5 mb-1">Dry-run sebelum backfill deposit</h3>
            <p className="text-muted mb-2">
              Selisih deposit tidak otomatis berarti harus membuat jurnal baru. Jika berasal dari saldo awal, backfill deposit bisa menggandakan liability. Dry-run hanya membaca kandidat dan tidak membuat JournalEntry.
            </p>
            {depositReconciliationQuery.data?.summary ? (
              <div className="d-flex flex-wrap gap-2 small">
                <Badge bg={depositReconciliationQuery.data.summary.reconciliationStatus === 'MATCHED' ? 'success' : 'warning'}>{depositReconciliationQuery.data.summary.reconciliationStatus}</Badge>
                <span className="text-muted">Saldo awal: {formatRupiah(depositReconciliationQuery.data.summary.ledgerOpeningBalanceDepositRupiah)}</span>
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

      <DepositOperationsPanel
        summary={depositLedgerSummaryQuery.data}
        reconciliation={depositLedgerReconciliationQuery.data}
        isLoading={depositLedgerSummaryQuery.isLoading || depositLedgerReconciliationQuery.isLoading}
        isError={depositLedgerSummaryQuery.isError || depositLedgerReconciliationQuery.isError}
        onRefresh={() => void Promise.all([
          queryClient.invalidateQueries({ queryKey: ['deposit-ledger', 'summary'] }),
          queryClient.invalidateQueries({ queryKey: ['deposit-ledger', 'reconciliation-lite'] }),
        ])}
      />

      <Row className="g-3 mb-3">
        <Col xl={6} id="profit-loss">
          <ProfitLossLitePanel profitLoss={profitLossQuery.data} />
        </Col>
        <Col xl={6} id="trial-balance">
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
