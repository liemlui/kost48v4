import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { StatusStrip } from '../../components/workspace';
import AccountingReadinessCard from '../../components/accounting/AccountingReadinessCard';
import CashAccountSetupPanel from '../../components/accounting/CashAccountSetupPanel';
import OpeningBalanceWizard from '../../components/accounting/OpeningBalanceWizard';
import TrialBalancePreview from '../../components/accounting/TrialBalancePreview';
import BalanceSheetGuardPanel from '../../components/accounting/BalanceSheetGuardPanel';
import {
  createAccountingPeriod,
  createCashAccount,
  createOpeningBalanceDraft,
  fetchAccountingPeriods,
  fetchAccountingReadiness,
  fetchAccounts,
  fetchBalanceSheetGuard,
  fetchCashAccounts,
  fetchOpeningBalances,
  fetchTrialBalance,
  postOpeningBalance,
  seedDefaultCoa,
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
];

function currentAsOf() {
  return new Date().toISOString().slice(0, 10);
}

export default function AccountingSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const accounts = accountsQuery.data ?? [];
  const cashAccounts = cashAccountsQuery.data ?? [];
  const periods = periodsQuery.data ?? [];
  const openingBalances = openingBalancesQuery.data ?? [];
  const isInitialLoading = readinessQuery.isLoading || accountsQuery.isLoading;

  const postedOpeningBalance = useMemo(() => openingBalances.find((batch) => batch.status === 'POSTED'), [openingBalances]);
  const draftOpeningBalance = useMemo(() => openingBalances.find((batch) => batch.status === 'DRAFT'), [openingBalances]);

  async function refreshAccounting() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['accounting-readiness'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-cash-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-periods'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-opening-balances'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-trial-balance'] }),
      queryClient.invalidateQueries({ queryKey: ['accounting-balance-sheet'] }),
    ]);
  }

  const seedMutation = useMutation({
    mutationFn: seedDefaultCoa,
    onSuccess: async (result) => {
      setActionError(null);
      setActionMessage(`Default COA siap: ${result.seededCount} akun.`);
      await refreshAccounting();
    },
    onError: (error: any) => setActionError(error?.response?.data?.message ?? 'Gagal seed default COA.'),
  });

  const createCashMutation = useMutation({
    mutationFn: (payload: CreateCashAccountPayload) => createCashAccount(payload),
    onSuccess: async () => {
      setActionError(null);
      setActionMessage('Cash/bank account berhasil disimpan.');
      await refreshAccounting();
    },
    onError: (error: any) => setActionError(error?.response?.data?.message ?? 'Gagal menyimpan cash account.'),
  });

  const createPeriodMutation = useMutation({
    mutationFn: createAccountingPeriod,
    onSuccess: async () => {
      setActionError(null);
      setActionMessage('Accounting period berhasil dibuat.');
      await refreshAccounting();
    },
    onError: (error: any) => setActionError(error?.response?.data?.message ?? 'Gagal membuat accounting period.'),
  });

  const createOpeningDraftMutation = useMutation({
    mutationFn: (payload: CreateOpeningBalanceDraftPayload) => createOpeningBalanceDraft(payload),
    onSuccess: async () => {
      setActionError(null);
      setActionMessage('Draft opening balance berhasil dibuat. Review total debit/kredit sebelum posting.');
      await refreshAccounting();
    },
    onError: (error: any) => setActionError(error?.response?.data?.message ?? 'Gagal membuat draft opening balance.'),
  });

  const postOpeningMutation = useMutation({
    mutationFn: postOpeningBalance,
    onSuccess: async () => {
      setActionError(null);
      setActionMessage('Opening balance berhasil diposting sebagai jurnal pembuka. Trial Balance sekarang membaca saldo awal.');
      await refreshAccounting();
    },
    onError: (error: any) => setActionError(error?.response?.data?.message ?? 'Gagal posting opening balance.'),
  });

  return (
    <div className="accounting-setup-page">
      <PageHeader
        eyebrow="Finance · Accounting Setup"
        title="Setup Accounting Owner"
        description="B2 membuat foundation accounting mulai berguna: cash/bank account, accounting period, opening balance, trial balance, dan Balance Sheet guard yang tetap jujur."
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

      {isInitialLoading ? (
        <Card className="content-card border-0"><Card.Body><Spinner animation="border" size="sm" className="me-2" /> Memuat setup accounting...</Card.Body></Card>
      ) : null}

      <StatusStrip
        items={[
          { id: 'coa', label: 'COA aktif', value: accounts.length, helper: 'Default COA kos', tone: accounts.length >= 30 ? 'success' : 'warning' },
          { id: 'cash', label: 'Cash/Bank', value: cashAccounts.length, helper: 'Minimal 1 akun', tone: cashAccounts.length ? 'success' : 'warning' },
          { id: 'period', label: 'Period', value: periods.length, helper: 'Periode cutover', tone: periods.length ? 'success' : 'warning' },
          { id: 'opening', label: 'Opening Balance', value: postedOpeningBalance ? 'POSTED' : draftOpeningBalance ? 'DRAFT' : 'Belum', helper: 'Starting point Balance Sheet', tone: postedOpeningBalance ? 'success' : draftOpeningBalance ? 'warning' : 'danger' },
        ]}
      />

      <Row className="g-3 mb-3">
        <Col xl={6}><AccountingReadinessCard readiness={readinessQuery.data} /></Col>
        <Col xl={6}><BalanceSheetGuardPanel guard={balanceSheetQuery.data} /></Col>
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
            isCreatingDraft={createOpeningDraftMutation.isPending}
            isPosting={postOpeningMutation.isPending}
          />
        </Col>
      </Row>

      <TrialBalancePreview trial={trialBalanceQuery.data} />
    </div>
  );
}
