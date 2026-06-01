import { useState, type ReactNode } from 'react';
import { Alert, Button, Card, Col, Collapse, Row, Tab, Table, Tabs } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import PaginationControls from '../../components/common/PaginationControls';
import StatusBadge from '../../components/common/StatusBadge';
import { AssistantPanel, ActionQueueTable, CompactMetrics, type ActionQueueItem, type MetricChip } from '../../components/command-center';
import AutoOpsControlPanel from '../../components/auto-ops/AutoOpsControlPanel';
import SmartChartPanel from '../../components/charts/SmartChartPanel';
import { listAdminRenewRequests } from '../../api/renewRequests';
import { listAdminCheckoutRequests } from '../../api/checkoutRequests';
import { listPaymentReviewQueue } from '../../api/paymentSubmissions';
import { fetchBusinessHealth } from '../../api/finance';
import { fetchAccountingReadiness, type AccountingReadiness } from '../../api/accounting';
import { fetchAssetReadinessV2, type AssetReadinessV2 } from '../../api/assets';
import { fetchDepositLedgerReconciliationLite, fetchDepositLedgerSummary, type DepositLedgerReconciliationLite, type DepositLedgerSummary } from '../../api/depositLedger';
import { fetchAutoOpsStatus } from '../../api/autoOps';
import { useBusinessHealthScore } from '../../hooks/useBusinessHealthScore';
import { useCashflowForecast } from '../../hooks/useCashflowForecast';
import { useClientPagination } from '../../hooks/useClientPagination';
import { dedupeCommandItems } from '../../utils/commandCenterDedup';
import { addHoursToDate } from '../../utils/dateTime';
import { listResource } from '../../api/resources';
import { getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import type { Invoice, PaymentSubmission, RenewRequest, Room, Stay } from '../../types';
import { useQuery } from '@tanstack/react-query';
import {
  type AutoOpsStatusLike,
  type DashboardListSummary,
  ACTION_QUERY_OPTIONS,
  MEDIUM_FRESH_QUERY_OPTIONS,
  ADMIN_SLA_HOURS,
  fetchAllPagesForDashboard,
  formatDateSafe,
  formatNumber,
  formatCurrencyCompact,
  formatCurrencyFull,
  getCurrentMonthWindow,
  isDateInsideWindow,
  getInvoiceOutstandingAmount,
  getInvoicePaidThisMonthAmount,
  getExpenseAmount,
  getExpenseDate,
  getPaymentReviewSubject,
  isOpenInvoice,
  isTerlambat,
  makePaymentCount,
  makeRoomPoints,
  makeClock,
  makeQueueTime,
  LoadingDashboard,
} from './dashboardShared';

function CompactDisclosure({ title, subtitle, children, defaultOpen = false }: { title: string; subtitle?: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="content-card compact-disclosure border-0">
      <Card.Body>
        <div className="table-meta">
          <div>
            <div className="panel-title">{title}</div>
            {subtitle ? <div className="panel-subtitle">{subtitle}</div> : null}
          </div>
          <Button variant="outline-secondary" size="sm" onClick={() => setOpen((value) => !value)}>{open ? 'Sembunyikan' : 'Tampilkan'}</Button>
        </div>
        <Collapse in={open}><div className="pt-3">{children}</div></Collapse>
      </Card.Body>
    </Card>
  );
}

function RecentTerlambatTable({ overdue }: { overdue: Invoice[] }) {
  const navigate = useNavigate();
  const overduePagination = useClientPagination(overdue, [overdue.length], 10);
  return (
    <Card className="content-card border-0 h-100">
      <Card.Body>
        <div className="table-meta">
          <div>
            <div className="panel-title">Tagihan Bermasalah</div>
            <div className="panel-subtitle">Maksimal 10 data per halaman. Klik baris untuk buka tagihan.</div>
          </div>
          <Button variant="outline-primary" size="sm" onClick={() => navigate('/invoices')}>Buka daftar tagihan</Button>
        </div>
        {!overdue.length ? (
          <EmptyState icon="✅" title="Tidak ada overdue" description="Belum ada tagihan overdue dari data yang dimuat." />
        ) : (
          <>
            <Table responsive hover className="mt-3 compact-data-table responsive-data-table">
              <thead><tr><th>Tagihan</th><th>Tenant</th><th>Jatuh Tempo</th><th>Status</th></tr></thead>
              <tbody>
                {overduePagination.pagedItems.map((invoice) => (
                  <tr key={invoice.id} className="clickable-row" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                    <td data-label="Tagihan"><div className="fw-semibold">{invoice.invoiceNumber || `INV-${invoice.id}`}</div><div className="small text-muted">Rp {formatNumber(getInvoiceTotalAmount(invoice))}</div></td>
                    <td data-label="Tenant">{invoice.stay?.tenant?.fullName || `Masa sewa #${invoice.stayId}`}</td>
                    <td data-label="Jatuh Tempo">{formatDateSafe(invoice.dueDate)}</td>
                    <td data-label="Status"><StatusBadge status={invoice.status} domain="invoice" /></td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {overduePagination.hasPagination ? (
              <div className="table-pagination-shell mt-3">
                <PaginationControls
                  currentPage={overduePagination.page}
                  totalPages={overduePagination.totalPages}
                  totalItems={overduePagination.totalItems}
                  pageSize={overduePagination.pageSize}
                  onPageChange={overduePagination.setPage}
                />
              </div>
            ) : null}
          </>
        )}
      </Card.Body>
    </Card>
  );
}

function AutoOpsUrgencyCard({ status, role }: { status?: AutoOpsStatusLike | null; role: 'OWNER' | 'ADMIN' }) {
  const expired = Number(status?.expiredCandidates ?? 0);
  const held = Number(status?.heldForPaymentReview ?? 0);
  const orphan = Number(status?.orphanReservedRooms ?? 0);
  const hasUrgent = expired + held + orphan > 0;
  const reviewHours = Number(status?.deadlines?.BOOKING_REVIEW_DEADLINE_HOURS ?? ADMIN_SLA_HOURS.bookingReview);
  const tenantPaymentHours = Number(status?.deadlines?.APPROVED_BOOKING_PAYMENT_DEADLINE_HOURS ?? ADMIN_SLA_HOURS.tenantPayment);
  const paymentUrgentHours = Number(status?.deadlines?.PAYMENT_REVIEW_URGENT_HOURS ?? ADMIN_SLA_HOURS.paymentReviewUrgent);
  const paymentEscalateHours = Number(status?.deadlines?.PAYMENT_REVIEW_ESCALATE_HOURS ?? ADMIN_SLA_HOURS.paymentReviewEscalate);
  const paymentMaxHours = Number(status?.deadlines?.PAYMENT_REVIEW_MAX_HOURS ?? ADMIN_SLA_HOURS.paymentReviewMax);

  if (role === 'ADMIN') {
    return (
      <Card className={`content-card border-0 autoops-policy-strip ${hasUrgent ? 'danger' : 'calm'}`.trim()}>
        <Card.Body>
          <div className="autoops-policy-main">
            <div>
              <div className="admin-section-label">AutoOps SLA</div>
              <strong>AutoOps aktif. Booking lewat batas akan direset otomatis.</strong>
              <small>Booking baru harus direview maksimal {reviewHours} jam. Tenant bayar maksimal {tenantPaymentHours} jam setelah tagihan dibuka. Bukti pembayaran urgent setelah {paymentUrgentHours} jam.</small>
            </div>
            <div className="autoops-policy-pills">
              <span>Escalate bukti setelah {paymentEscalateHours} jam</span>
              <span>Batas review bukti {paymentMaxHours} jam</span>
              {hasUrgent ? <span className="danger">{expired + held + orphan} perlu dicek</span> : <span>Aman</span>}
            </div>
          </div>
          {hasUrgent ? (
            <div className="autoops-policy-counts mt-2">
              <span>{expired} siap reset/cancel</span>
              <span>{held} bukti urgent</span>
              <span>{orphan} reserved orphan</span>
            </div>
          ) : null}
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className={`content-card border-0 autoops-urgency-card autoops-sla-compact ${hasUrgent ? 'danger' : 'calm'}`.trim()}>
      <Card.Body>
        <div className="autoops-sla-row">
          <div>
            <div className="page-eyebrow mb-1">AutoOps SLA aktif</div>
            <h3 className="mb-1">Booking review {reviewHours} jam · bayar tenant {tenantPaymentHours} jam · review bukti urgent {paymentUrgentHours} jam</h3>
            <p className="mb-0">
              Admin review booking dulu, baru tagihan awal dibuka. Jika review booking lewat deadline, pemesanan direset dan tenant harus ajukan ulang.
            </p>
          </div>
          <div className="autoops-sla-stack" aria-label="SLA AutoOps">
            <span>Booking review <strong>{reviewHours} jam</strong></span>
            <span>Tenant bayar <strong>{tenantPaymentHours} jam</strong></span>
            <span>Review bukti <strong>{paymentUrgentHours}/{paymentEscalateHours} jam</strong></span>
          </div>
        </div>
        <div className="autoops-mini-grid mt-3">
          <div><strong>{expired}</strong><span>siap reset/cancel</span></div>
          <div><strong>{held}</strong><span>bukti bayar urgent</span></div>
          <div><strong>{orphan}</strong><span>reserved orphan</span></div>
        </div>
        <Alert variant={hasUrgent ? 'danger' : 'info'} className="mt-3 mb-0 small">
          {hasUrgent
            ? 'Ada flow melewati SLA. Booking yang tidak direview/dibayar tepat waktu dapat direset agar kamar tidak tertahan.'
            : 'First-paid aktif: kamar aman setelah pembayaran disetujui.'}
        </Alert>
      </Card.Body>
    </Card>
  );
}

function FinanceReadinessCard() {
  return (
    <Card className="content-card finance-readiness-card border-0 h-100">
      <Card.Body>
        <div className="panel-title mb-1">Balance Sheet Readiness</div>
        <div className="panel-subtitle mb-3">Formal ratio dikunci sampai data akuntansi dasar reliable.</div>
        <div className="readiness-mini-list">
          <div><span>✅</span><strong>Piutang tagihan</strong><small>Tagihan aktif bisa menjadi kandidat piutang.</small></div>
          <div><span>✅</span><strong>Deposit liability</strong><small>Deposit held harus dibaca sebagai kewajiban.</small></div>
          <div><span>🔒</span><strong>Kas / bank aktual</strong><small>Belum ada account model formal.</small></div>
          <div><span>🔒</span><strong>Equity & capital employed</strong><small>Belum ada balance sheet-grade source.</small></div>
        </div>
        <Button variant="outline-primary" size="sm" className="mt-3" onClick={() => window.location.assign('/reports?tab=formal')}>Buka readiness</Button>
      </Card.Body>
    </Card>
  );
}

function OwnerContinuityStrip({ pendingPaymentReviewCount, pendingRenewCount, approvedCheckoutRequestCount, overdueCount, openInvoiceCount, onNavigate }: { pendingPaymentReviewCount: number; pendingRenewCount: number; approvedCheckoutRequestCount: number; overdueCount: number; openInvoiceCount: number; onNavigate: (to: string) => void }) {
  const cards = [
    { title: 'Cashflow tertahan', value: pendingPaymentReviewCount, helper: 'Bukti bayar yang perlu keputusan owner/admin.', action: 'Review pembayaran', to: '/payment-submissions/review', tone: pendingPaymentReviewCount ? 'warning' : 'success' },
    { title: 'Cek meter perpanjangan', value: pendingRenewCount, helper: 'Perpanjangan wajib catat meter sebelum tagihan perpanjangan.', action: 'Review Perpanjangan', to: '/renew-requests', tone: pendingRenewCount ? 'warning' : 'success' },
    { title: 'Keluar siap final', value: approvedCheckoutRequestCount, helper: 'Pengajuan keluar yang sudah disetujui tetap perlu proses final setelah semua tagihan selesai.', action: 'Cek keluar', to: '/stays?status=BOOKINGS', tone: approvedCheckoutRequestCount ? 'info' : 'success' },
    { title: 'Tagihan aktif', value: openInvoiceCount, helper: overdueCount ? `${overdueCount} terlambat perlu follow-up.` : 'Tagihan aktif bisa menahan perpanjangan/keluar.', action: 'Lihat tagihan', to: '/invoices', tone: overdueCount ? 'danger' : openInvoiceCount ? 'warning' : 'success' },
  ];
  return (
    <Row className="g-3 mb-4 command-continuity-grid">
      {cards.map((card) => (
        <Col md={6} xl={3} key={card.title}>
          <button type="button" className={`continuity-card ${card.tone}`} onClick={() => onNavigate(card.to)}>
            <span>{card.title}</span>
            <strong>{card.value}</strong>
            <small>{card.helper}</small>
            <em>{card.action}</em>
          </button>
        </Col>
      ))}
    </Row>
  );
}

type OwnerFinancialHealthCockpitProps = {
  invoices: Invoice[];
  expenses: unknown[];
  paymentReviewItems: PaymentSubmission[];
  pendingRenewCount: number;
  approvedCheckoutRequestCount: number;
  depositSummary?: DepositLedgerSummary;
  depositReconciliation?: DepositLedgerReconciliationLite;
  depositLoading?: boolean;
  depositError?: boolean;
  accountingReadiness?: AccountingReadiness;
  accountingReadinessLoading?: boolean;
  accountingReadinessError?: boolean;
  assetReadiness?: AssetReadinessV2;
  assetReadinessLoading?: boolean;
  assetReadinessError?: boolean;
  onNavigate: (to: string) => void;
};

function OwnerFinancialHealthCockpit({
  invoices,
  expenses,
  paymentReviewItems,
  pendingRenewCount,
  approvedCheckoutRequestCount,
  depositSummary,
  depositReconciliation,
  depositLoading,
  depositError,
  accountingReadiness,
  accountingReadinessLoading,
  accountingReadinessError,
  assetReadiness,
  assetReadinessLoading,
  assetReadinessError,
  onNavigate,
}: OwnerFinancialHealthCockpitProps) {
  const month = getCurrentMonthWindow();
  const paidInThisMonthRupiah = invoices.reduce((sum, invoice) => sum + getInvoicePaidThisMonthAmount(invoice, month.start, month.end), 0);
  const openInvoiceRupiah = invoices.filter(isOpenInvoice).reduce((sum, invoice) => sum + getInvoiceOutstandingAmount(invoice), 0);
  const overdueInvoiceRupiah = invoices.filter(isTerlambat).reduce((sum, invoice) => sum + getInvoiceOutstandingAmount(invoice), 0);
  const expenseThisMonthRupiah = expenses
    .filter((expense) => isDateInsideWindow(getExpenseDate(expense), month.start, month.end))
    .reduce<number>((sum, expense) => sum + getExpenseAmount(expense), 0);
  const pendingReviewRupiah = paymentReviewItems.reduce((sum, submission) => sum + Number(submission.amountRupiah ?? 0), 0);
  const depositHeldRupiah = Number(depositSummary?.totals?.ledgerHeldBalanceRupiah ?? 0);
  const depositReceivedRupiah = Number(depositSummary?.totals?.increaseRupiah ?? 0);
  const depositReleasedRupiah = Number(depositSummary?.totals?.decreaseRupiah ?? 0);
  const netOperatingCashRupiah = paidInThisMonthRupiah - expenseThisMonthRupiah;
  const mismatchCount = Number(depositReconciliation?.mismatchCount ?? 0);
  const historicalLedgerEmptyCount = (depositReconciliation?.items ?? []).filter((item) => Number(item.depositAmountRupiah ?? 0) > 0 && Number(item.ledgerEntryCount ?? 0) === 0).length;
  const overdueInvoices = invoices.filter(isTerlambat).slice(0, 4);
  const draftInvoices = invoices.filter((invoice) => invoice.status === 'DRAFT').slice(0, 3);

  const metrics: MetricChip[] = [
    { id: 'paid-in-month', label: `Uang masuk ${month.label}`, value: formatCurrencyFull(paidInThisMonthRupiah), helper: 'Dihitung dari pembayaran invoice bulan ini. Deposit tidak dihitung sebagai omzet.', status: paidInThisMonthRupiah > 0 ? 'SUCCESS' : 'INFO', icon: '💰', to: '/invoice-payments' },
    { id: 'open-receivable', label: 'Tagihan terbuka', value: formatCurrencyFull(openInvoiceRupiah), helper: `${invoices.filter(isOpenInvoice).length} tagihan belum lunas/dibatalkan`, status: openInvoiceRupiah > 0 ? 'WARNING' : 'SUCCESS', icon: '🧾', to: '/invoices' },
    { id: 'pending-review-money', label: 'Bukti bayar pending', value: formatCurrencyFull(pendingReviewRupiah), helper: `${paymentReviewItems.length} bukti menunggu admin/owner`, status: pendingReviewRupiah > 0 ? 'WARNING' : 'SUCCESS', icon: '✅', to: '/payment-submissions/review' },
    { id: 'deposit-held', label: 'Deposit ditahan', value: formatCurrencyFull(depositHeldRupiah), helper: 'Liability operasional tenant, bukan pendapatan kos.', status: mismatchCount > 0 ? 'DANGER' : depositHeldRupiah > 0 ? 'INFO' : 'SUCCESS', icon: '🛡️', to: '/finance/accounting-setup' },
    { id: 'expense-month', label: `Pengeluaran ${month.label}`, value: formatCurrencyFull(expenseThisMonthRupiah), helper: 'Dari expense yang punya tanggal bulan ini.', status: expenseThisMonthRupiah > 0 ? 'INFO' : 'SUCCESS', icon: '💸', to: '/expenses' },
    { id: 'net-cash-month', label: 'Estimasi net cash', value: formatCurrencyFull(netOperatingCashRupiah), helper: 'Uang masuk invoice bulan ini dikurangi expense bulan ini.', status: netOperatingCashRupiah >= 0 ? 'SUCCESS' : 'DANGER', icon: '📊', to: '/reports?tab=finance' },
  ];

  const queueItems: ActionQueueItem[] = dedupeCommandItems([
    ...paymentReviewItems.slice(0, 5).map((submission) => {
      const receivedAt = submission.createdAt ?? submission.paidAt;
      const deadline = addHoursToDate(receivedAt, ADMIN_SLA_HOURS.paymentReviewMax);
      const time = makeQueueTime(deadline);
      return {
        id: `owner-fin-payment-${submission.id}`,
        priority: time.timeStatusTone === 'danger' ? 'BLOCKER' : 'HIGH',
        type: 'Review pembayaran',
        subject: getPaymentReviewSubject(submission),
        issue: `${formatCurrencyFull(Number(submission.amountRupiah ?? 0))} menunggu verifikasi. Status kamar/tagihan bisa tertahan sampai bukti diputuskan.`,
        receivedAtLabel: receivedAt ? makeClock(receivedAt) : undefined,
        ...time,
        recommendedAction: 'Verifikasi Pembayaran',
        actionTo: '/payment-submissions/review',
        dedupKey: `payment-review-${submission.id}`,
      } satisfies ActionQueueItem;
    }),
    ...overdueInvoices.map((invoice) => ({
      id: `owner-fin-overdue-${invoice.id}`,
      priority: 'HIGH' as const,
      type: 'Tagihan overdue',
      subject: invoice.stay?.tenant?.fullName || `Masa sewa #${invoice.stayId}`,
      issue: `${invoice.invoiceNumber ?? `Tagihan #${invoice.id}`} masih terbuka sebesar ${formatCurrencyFull(getInvoiceOutstandingAmount(invoice))}.`,
      deadlineLabel: invoice.dueDate ? formatDateSafe(invoice.dueDate) : undefined,
      timeStatusLabel: 'Lewat jatuh tempo',
      timeStatusTone: 'danger' as const,
      recommendedAction: 'Lihat Tagihan',
      actionTo: `/invoices/${invoice.id}`,
      dedupKey: `overdue-invoice-${invoice.id}`,
    })),
    ...draftInvoices.map((invoice) => ({
      id: `owner-fin-draft-${invoice.id}`,
      priority: 'MEDIUM' as const,
      type: 'Belum Terbit invoice',
      subject: invoice.stay?.tenant?.fullName || `Masa sewa #${invoice.stayId}`,
      issue: `${invoice.invoiceNumber ?? `Tagihan #${invoice.id}`} masih draft. Pastikan memang belum perlu diterbitkan ke tenant.`,
      recommendedAction: 'Cek Belum Terbit',
      actionTo: `/invoices/${invoice.id}`,
      dedupKey: `draft-invoice-${invoice.id}`,
    })),
    mismatchCount > 0 ? {
      id: 'owner-fin-deposit-mismatch',
      priority: 'BLOCKER' as const,
      type: 'Rekonsiliasi deposit',
      subject: `${mismatchCount} stay perlu review`,
      issue: 'Saldo deposit snapshot dan ledger berbeda. Jangan proses refund/forfeit sebelum dicek.',
      recommendedAction: 'Buka Deposit',
      actionTo: '/finance/accounting-setup',
      dedupKey: 'deposit-mismatch',
    } : null,
    approvedCheckoutRequestCount > 0 && depositHeldRupiah > 0 ? {
      id: 'owner-fin-checkout-deposit-followup',
      priority: 'WARNING' as const,
      type: 'Keluar + deposit',
      subject: `${approvedCheckoutRequestCount} pengajuan keluar disetujui`,
      issue: 'Ada pengajuan keluar disetujui dan deposit masih ditahan. Pastikan proses keluar dan penyelesaian dana titipan tidak tertunda.',
      recommendedAction: 'Cek Checkout',
      actionTo: '/stays?status=BOOKINGS',
      dedupKey: 'checkout-deposit-followup',
    } : null,
    pendingRenewCount > 0 ? {
      id: 'owner-fin-renew-meter',
      priority: 'WARNING' as const,
      type: 'Perpanjangan',
      subject: `${pendingRenewCount} perpanjangan pending`,
      issue: 'Perpanjangan harus melewati cek meter dan tagihan perpanjangan sebelum penghuni lanjut masa sewa.',
      recommendedAction: 'Review Renew',
      actionTo: '/renew-requests',
      dedupKey: 'renew-pending-owner-finance',
    } : null,
  ].filter(Boolean) as ActionQueueItem[]);

  const productionGateItems = [
    { id: 'finance-readiness', label: 'Accounting readiness', ready: Boolean(accountingReadiness?.ready && accountingReadiness?.formalStatementReady), value: accountingReadinessLoading ? 'Memuat' : accountingReadinessError ? 'Tidak terbaca' : `${Math.round(Number(accountingReadiness?.score ?? 0))}%`, note: accountingReadinessError ? 'Cek koneksi endpoint accounting readiness.' : accountingReadiness?.formalStatementReady ? 'Laporan formal siap dibaca owner.' : 'Masih ada setup accounting yang perlu dicek.', to: '/finance/accounting-setup' },
    { id: 'deposit-reconcile', label: 'Deposit ledger', ready: !depositError && mismatchCount === 0, value: depositLoading ? 'Memuat' : depositError ? 'Tidak terbaca' : mismatchCount === 0 ? 'Match' : `${mismatchCount} mismatch`, note: depositError ? 'Deposit ledger belum bisa dimuat.' : mismatchCount === 0 ? 'Saldo ledger dan snapshot tidak beda dari data yang dimuat.' : 'Tahan refund/forfeit sampai mismatch dibereskan.', to: '/finance/accounting-setup' },
    { id: 'asset-readiness', label: 'Asset register', ready: Boolean(assetReadiness?.formalStatementReady || assetReadiness?.ledgerBacked), value: assetReadinessLoading ? 'Memuat' : assetReadinessError ? 'Tidak terbaca' : `${Number(assetReadiness?.counts?.activeCount ?? 0)} aktif`, note: assetReadinessError ? 'Cek endpoint asset readiness.' : assetReadiness?.warnings?.length ? assetReadiness.warnings[0] : 'Asset register siap sebagai sinyal neraca owner.', to: '/finance/assets' },
    { id: 'cash-decision', label: 'Cash decision', ready: pendingReviewRupiah === 0 && overdueInvoiceRupiah === 0, value: pendingReviewRupiah > 0 ? 'Review bayar' : overdueInvoiceRupiah > 0 ? 'Tagih dulu' : 'Aman', note: pendingReviewRupiah > 0 ? 'Bukti bayar perlu diputuskan sebelum dianggap cash selesai.' : overdueInvoiceRupiah > 0 ? 'Tagihan aktif/terlambat harus jadi follow-up owner/admin.' : 'Tidak ada blocker cash besar dari data yang dimuat.', to: pendingReviewRupiah > 0 ? '/payment-submissions/review' : '/invoices' },
  ];
  const productionReadyCount = productionGateItems.filter((item) => item.ready).length;
  const productionGateTone = productionReadyCount === productionGateItems.length ? 'success' : productionReadyCount >= 2 ? 'warning' : 'danger';
  const recentDepositEntries = depositSummary?.recentEntries ?? [];

  return (
    <Card className="content-card border-0 mb-4 owner-financial-health-cockpit">
      <Card.Body>
        <div className="table-meta align-items-start">
          <div>
            <div className="panel-title">Financial Health Cockpit</div>
            <div className="panel-subtitle">Ringkasan bisnis owner: cash masuk, tagihan tertahan, deposit liability, dan aksi finance paling penting.</div>
          </div>
          <div className="d-flex gap-2 flex-wrap justify-content-end">
            <Button variant="outline-primary" size="sm" onClick={() => onNavigate('/invoices')}>Tagihan</Button>
            <Button variant="outline-primary" size="sm" onClick={() => onNavigate('/payment-submissions/review')}>Review Bayar</Button>
            <Button variant="outline-secondary" size="sm" onClick={() => onNavigate('/finance/accounting-setup')}>Laporan Keuangan</Button>
          </div>
        </div>
        <Alert variant={mismatchCount > 0 ? 'danger' : openInvoiceRupiah > 0 || pendingReviewRupiah > 0 ? 'warning' : 'success'} className="owner-financial-health-headline py-2">
          <strong>{mismatchCount > 0 ? 'Deposit perlu review sebelum settlement.' : pendingReviewRupiah > 0 ? 'Uang sudah dikirim tenant, tetapi belum boleh dianggap selesai sampai diverifikasi.' : openInvoiceRupiah > 0 ? 'Masih ada tagihan aktif yang perlu ditagih.' : 'Finance operasional terlihat aman.'}</strong>
          <span>{' '}Deposit ditahan {formatCurrencyFull(depositHeldRupiah)} tidak dihitung sebagai omzet.</span>
        </Alert>
        <CompactMetrics metrics={metrics} />
        <Card className="owner-production-gate-card border-0 mb-4">
          <Card.Body>
            <div className="table-meta align-items-start mb-3">
              <div>
                <div className="panel-title">Production Finance Gate</div>
                <div className="panel-subtitle">Cek cepat sebelum owner mengambil keputusan uang: accounting, deposit, aset, dan cash blocker.</div>
              </div>
              <StatusBadge status={productionGateTone === 'success' ? 'SUCCESS' : productionGateTone === 'warning' ? 'WARNING' : 'DANGER'} customLabel={`${productionReadyCount}/${productionGateItems.length} siap`} />
            </div>
            <div className="owner-production-gate-grid">
              {productionGateItems.map((item) => (
                <button type="button" key={item.id} className={`owner-production-gate-item ${item.ready ? 'is-ready' : 'needs-review'}`} onClick={() => onNavigate(item.to)}>
                  <span className="owner-production-gate-icon">{item.ready ? '✓' : '!'}</span>
                  <span className="owner-production-gate-content"><strong>{item.label}</strong><small>{item.note}</small></span>
                  <span className="owner-production-gate-value">{item.value}</span>
                </button>
              ))}
            </div>
          </Card.Body>
        </Card>
        <Row className="g-4">
          <Col xl={8}>
            <ActionQueueTable title="Finance Antrean Aksi" subtitle="Urutan follow-up finance yang langsung berdampak ke kamar, tenant, dan cashflow." items={queueItems} emptyTitle="Tidak ada follow-up finance besar" emptyDescription="Bukti bayar, tagihan terlambat, draft, perpanjangan, keluar, dan rekonsiliasi deposit sedang aman dari data yang dimuat." maxItems={8} />
          </Col>
          <Col xl={4}>
            <div className="owner-finance-side-stack">
              <Card className="border-0 owner-finance-side-card">
                <Card.Body>
                  <div className="panel-title mb-1">Deposit liability</div>
                  <div className="panel-subtitle mb-3">Deposit adalah kewajiban ke tenant, bukan revenue.</div>
                  <div className="kpi-list compact">
                    <div className="kpi-item"><span>Diterima</span><strong>{formatCurrencyFull(depositReceivedRupiah)}</strong></div>
                    <div className="kpi-item"><span>Dikembalikan/dipotong</span><strong>{formatCurrencyFull(depositReleasedRupiah)}</strong></div>
                    <div className="kpi-item"><span>Saldo ditahan</span><strong>{formatCurrencyFull(depositHeldRupiah)}</strong></div>
                    <div className="kpi-item"><span>Mismatch</span><strong>{mismatchCount}</strong></div>
                  </div>
                  {depositLoading ? <p className="small text-muted mt-3 mb-0">Memuat ringkasan deposit...</p> : null}
                  {depositError ? <Alert variant="warning" className="py-2 small mt-3 mb-0">Ledger deposit belum bisa dimuat. Cockpit tetap memakai tagihan/pengeluaran.</Alert> : null}
                  {!depositError && historicalLedgerEmptyCount > 0 ? (
                    <Alert variant="light" className="py-2 small mt-3 mb-0">{historicalLedgerEmptyCount} stay punya data deposit lama tanpa event ledger. Ini normal untuk data lama sebelum ledger deposit aktif.</Alert>
                  ) : null}
                </Card.Body>
              </Card>
              <Card className="border-0 owner-finance-side-card">
                <Card.Body>
                  <div className="panel-title mb-1">Recent deposit events</div>
                  <div className="panel-subtitle mb-3">Aktivitas deposit terbaru.</div>
                  {!recentDepositEntries.length ? (
                    <EmptyState icon="🛡️" title="Belum ada event baru" description="Data historical lama bisa match walau ledger event kosong. Event baru muncul setelah payment/refund/deduction fresh." />
                  ) : (
                    <div className="owner-deposit-mini-list">
                      {recentDepositEntries.slice(0, 5).map((entry) => (
                        <button type="button" key={entry.id} className="owner-deposit-mini-row" onClick={() => onNavigate(`/stays/${entry.stayId}?tab=finance`)}>
                          <span><strong>{entry.tenantName || `Tenant #${entry.tenantId}`}</strong><small>{entry.roomCode || `Kamar #${entry.roomId}`} · {formatDateSafe(entry.occurredAt)}</small></span>
                          <strong>{formatCurrencyFull(Number(entry.amountRupiah ?? 0))}</strong>
                        </button>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('priorities');
  const roomsQuery = useQuery({ queryKey: ['dashboard-owner', 'rooms'], queryFn: () => listResource<Room>('/rooms', { limit: 500 }) });
  const activeStaysQuery = useQuery({ queryKey: ['dashboard-owner', 'stays-active'], queryFn: () => listResource<Stay>('/stays', { status: 'ACTIVE', limit: 300 }) });
  const invoicesQuery = useQuery({ queryKey: ['dashboard-owner', 'invoices-summary'], queryFn: () => fetchAllPagesForDashboard<Invoice>('/invoices') });
  const expensesQuery = useQuery({ queryKey: ['dashboard-owner', 'expenses-summary'], queryFn: () => fetchAllPagesForDashboard<any>('/expenses') });
  const renewRequestsQuery = useQuery({ queryKey: ['dashboard-owner', 'renew-requests'], queryFn: () => listAdminRenewRequests({ status: 'PENDING' }), ...MEDIUM_FRESH_QUERY_OPTIONS });
  const checkoutRequestsPendingQuery = useQuery({ queryKey: ['dashboard-owner', 'checkout-requests-pending'], queryFn: () => listAdminCheckoutRequests({ status: 'PENDING' }), ...ACTION_QUERY_OPTIONS });
  const checkoutRequestsApprovedQuery = useQuery({ queryKey: ['dashboard-owner', 'checkout-requests-approved'], queryFn: () => listAdminCheckoutRequests({ status: 'APPROVED' }), ...ACTION_QUERY_OPTIONS });
  const paymentReviewQuery = useQuery({ queryKey: ['dashboard-owner', 'payment-review'], queryFn: () => listPaymentReviewQueue({ limit: 25 }), ...ACTION_QUERY_OPTIONS });
  const backendBusinessHealthQuery = useQuery({ queryKey: ['dashboard-owner', 'finance-business-health'], queryFn: () => fetchBusinessHealth(), staleTime: 60_000, retry: 1 });
  const autoOpsQuery = useQuery({ queryKey: ['dashboard-owner', 'auto-ops-status'], queryFn: fetchAutoOpsStatus, ...ACTION_QUERY_OPTIONS });
  const depositSummaryQuery = useQuery({ queryKey: ['dashboard-owner', 'deposit-ledger-summary'], queryFn: () => fetchDepositLedgerSummary({ limit: 8 }), ...MEDIUM_FRESH_QUERY_OPTIONS, retry: 1 });
  const depositReconciliationQuery = useQuery({ queryKey: ['dashboard-owner', 'deposit-ledger-reconciliation-lite'], queryFn: () => fetchDepositLedgerReconciliationLite({ limit: 50 }), ...MEDIUM_FRESH_QUERY_OPTIONS, retry: 1 });
  const accountingReadinessQuery = useQuery({ queryKey: ['dashboard-owner', 'accounting-readiness'], queryFn: fetchAccountingReadiness, ...MEDIUM_FRESH_QUERY_OPTIONS, retry: 1 });
  const assetReadinessQuery = useQuery({ queryKey: ['dashboard-owner', 'asset-readiness'], queryFn: fetchAssetReadinessV2, ...MEDIUM_FRESH_QUERY_OPTIONS, retry: 1 });

  const rooms = roomsQuery.data?.items ?? [];
  const activeStays = activeStaysQuery.data?.items ?? [];
  const invoices = invoicesQuery.data?.items ?? [];
  const expenses = expensesQuery.data?.items ?? [];
  const totalExpense = expenses.reduce((sum: number, expense: any) => sum + Number(expense.amountRupiah ?? 0), 0);
  const pendingRenewCount = renewRequestsQuery.data?.items?.filter((rr: RenewRequest) => rr.status === 'PENDING').length ?? 0;
  const pendingCheckoutRequestCount = checkoutRequestsPendingQuery.data?.items?.length ?? 0;
  const approvedCheckoutRequestCount = checkoutRequestsApprovedQuery.data?.items?.length ?? 0;
  const paymentReviewItems = (paymentReviewQuery.data?.items ?? []).filter((submission: PaymentSubmission) => submission.status === 'PENDING_REVIEW');
  const pendingPaymentReviewCount = makePaymentCount(paymentReviewItems, paymentReviewQuery.data?.meta?.totalItems);
  const overdue = invoices.filter(isTerlambat);
  const cashflowForecast = useCashflowForecast(invoices);
  const businessHealth = useBusinessHealthScore({ invoices, rooms, pendingPaymentReviewCount, pendingRenewCount, pendingCheckoutRequestCount, approvedCheckoutRequestCount, totalExpenseRupiah: totalExpense });
  const backendBusinessHealth = backendBusinessHealthQuery.data;

  const refreshDashboard = () => {
    void Promise.all([
      roomsQuery.refetch(), activeStaysQuery.refetch(), invoicesQuery.refetch(), expensesQuery.refetch(),
      renewRequestsQuery.refetch(), checkoutRequestsPendingQuery.refetch(), checkoutRequestsApprovedQuery.refetch(), paymentReviewQuery.refetch(), autoOpsQuery.refetch(),
      depositSummaryQuery.refetch(), depositReconciliationQuery.refetch(), accountingReadinessQuery.refetch(), assetReadinessQuery.refetch(),
    ]);
  };

  if (roomsQuery.isLoading || activeStaysQuery.isLoading || invoicesQuery.isLoading || expensesQuery.isLoading || renewRequestsQuery.isLoading || checkoutRequestsPendingQuery.isLoading || checkoutRequestsApprovedQuery.isLoading || paymentReviewQuery.isLoading) return <LoadingDashboard />;
  if (roomsQuery.isError || activeStaysQuery.isError || invoicesQuery.isError || expensesQuery.isError || renewRequestsQuery.isError || checkoutRequestsPendingQuery.isError || checkoutRequestsApprovedQuery.isError || paymentReviewQuery.isError) return <Alert variant="danger">Gagal memuat command center owner.</Alert>;

  return (
    <div>
      <PageHeader
        eyebrow="Owner Command Center"
        title="Business Health Cockpit"
        description="Owner melihat kesehatan bisnis sebagai rangkaian flow: cashflow tertahan, cek meter perpanjangan, keluar, tagihan aktif, dan readiness finance."
        secondaryAction={<><Button variant="outline-secondary" onClick={refreshDashboard}>Refresh</Button><Button variant="outline-primary" onClick={() => navigate('/reports?tab=command')}>Buka Reports</Button></>}
      />
      <AutoOpsUrgencyCard status={autoOpsQuery.data} role="OWNER" />
      <AutoOpsControlPanel status={autoOpsQuery.data} role="OWNER" onCompleted={refreshDashboard} />
      <OwnerContinuityStrip pendingPaymentReviewCount={pendingPaymentReviewCount} pendingRenewCount={pendingRenewCount} approvedCheckoutRequestCount={approvedCheckoutRequestCount} overdueCount={overdue.length} openInvoiceCount={cashflowForecast.openInvoiceCount} onNavigate={navigate} />
      {invoicesQuery.data?.isTruncated ? <Alert variant="warning" className="py-2 small">Ringkasan tagihan dihitung dari {invoices.length} dari total {invoicesQuery.data.totalItems} tagihan.</Alert> : null}
      <AssistantPanel title="Asisten Kesehatan Bisnis" subtitle="Ringkasan prioritas bisnis; detail pekerjaan ada di antrean." items={businessHealth.assistantItems} maxItems={3} emptyTitle="Bisnis terlihat stabil" emptyMessage="Tidak ada pembayaran tertahan atau tagihan overdue dari data yang dimuat." />
      <CompactMetrics metrics={businessHealth.metrics} />
      <OwnerFinancialHealthCockpit
        invoices={invoices}
        expenses={expenses}
        paymentReviewItems={paymentReviewItems}
        pendingRenewCount={pendingRenewCount}
        approvedCheckoutRequestCount={approvedCheckoutRequestCount}
        depositSummary={depositSummaryQuery.data}
        depositReconciliation={depositReconciliationQuery.data}
        depositLoading={depositSummaryQuery.isLoading || depositReconciliationQuery.isLoading}
        depositError={depositSummaryQuery.isError || depositReconciliationQuery.isError}
        accountingReadiness={accountingReadinessQuery.data}
        accountingReadinessLoading={accountingReadinessQuery.isLoading}
        accountingReadinessError={accountingReadinessQuery.isError}
        assetReadiness={assetReadinessQuery.data}
        assetReadinessLoading={assetReadinessQuery.isLoading}
        assetReadinessError={assetReadinessQuery.isError}
        onNavigate={navigate}
      />
      {backendBusinessHealth ? (
        <Alert variant="info" className="py-2 small">
          Analisis kesehatan keuangan aktif: {backendBusinessHealth.grade} · {backendBusinessHealth.headline} · {formatDateSafe(backendBusinessHealth.generatedAt)}.
        </Alert>
      ) : backendBusinessHealthQuery.isError ? (
        <Alert variant="light" className="py-2 small text-muted">Analisis kesehatan keuangan dihitung dari data transaksi lokal.</Alert>
      ) : null}
      <Tabs activeKey={activeTab} onSelect={(key) => setActiveTab(key ?? 'priorities')} className="command-tabs mb-3">
        <Tab eventKey="priorities" title="Prioritas">
          <Row className="g-4">
            <Col xl={8}><ActionQueueTable title="Prioritas Owner" subtitle="Hanya pekerjaan konkret; tidak mengulang semua isi asisten." items={businessHealth.queueItems} maxItems={8} /></Col>
            <Col xl={4}>
              <Card className="content-card border-0 h-100"><Card.Body><div className="panel-title mb-1">Skor kesehatan bisnis</div><div className="business-health-score"><strong>{Math.round(backendBusinessHealth?.score ?? businessHealth.score)}</strong><span>{backendBusinessHealth?.grade ?? businessHealth.grade}</span></div><div className="panel-subtitle mt-2">{backendBusinessHealth?.headline ?? businessHealth.headline}</div><div className="mt-3 d-flex gap-2 flex-wrap">{businessHealth.drivers.map((driver) => <span className="surface-pill" key={driver}>{driver}</span>)}</div></Card.Body></Card>
            </Col>
          </Row>
        </Tab>
        <Tab eventKey="rooms" title="Kamar">
          <SmartChartPanel title="Kondisi Kamar" subtitle="Chart bisa diganti mode dan menjadi pintu ke occupancy report." points={makeRoomPoints(rooms)} defaultMode="summary" ctaLabel="Occupancy report" ctaTo="/reports?tab=operations" totalLabel="Kamar" />
        </Tab>
        <Tab eventKey="finance" title="Keuangan">
          <Row className="g-4">
            <Col xl={6}>
              <Card className="content-card border-0 h-100"><Card.Body><div className="panel-title mb-1">Cashflow Forecast Ringan</div><div className="panel-subtitle mb-3">Proyeksi dari tagihan aktif yang belum lunas.</div><div className="kpi-list"><div className="kpi-item"><span>Expected inflow</span><strong>Rp {formatCurrencyCompact(cashflowForecast.expectedInflowRupiah)}</strong></div><div className="kpi-item"><span>Terlambat</span><strong>Rp {formatCurrencyCompact(cashflowForecast.overdueRupiah)}</strong></div><div className="kpi-item"><span>Due ≤7 hari</span><strong>Rp {formatCurrencyCompact(cashflowForecast.dueSoonRupiah)}</strong></div></div><p className="small text-muted mt-3 mb-0">{cashflowForecast.assumption}</p></Card.Body></Card>
            </Col>
            <Col xl={6}><FinanceReadinessCard /></Col>
          </Row>
          <div className="mt-4"><CompactDisclosure title="Detail tagihan bermasalah" subtitle="Dibuka hanya saat owner/admin perlu follow-up." defaultOpen={false}><RecentTerlambatTable overdue={overdue} /></CompactDisclosure></div>
        </Tab>
        <Tab eventKey="activity" title="Aktivitas">
          <Row className="g-3">
            <Col md={4}><Card className="content-card border-0"><Card.Body><span className="surface-pill">Masa sewa aktif</span><h3 className="mt-3 mb-0">{activeStays.length}</h3><p className="text-muted small mb-0">Penghuni dengan masa sewa berjalan.</p></Card.Body></Card></Col>
            <Col md={4}><Card className="content-card border-0"><Card.Body><span className="surface-pill">Tagihan aktif</span><h3 className="mt-3 mb-0">{cashflowForecast.openInvoiceCount}</h3><p className="text-muted small mb-0">Tagihan belum lunas/dibatalkan.</p></Card.Body></Card></Col>
            <Col md={4}><Card className="content-card border-0"><Card.Body><span className="surface-pill">Reports</span><h3 className="mt-3 mb-0">Drill-down</h3><p className="text-muted small mb-0">Laporan tetap ada, tetapi tidak memenuhi sidebar.</p></Card.Body></Card></Col>
          </Row>
        </Tab>
      </Tabs>
    </div>
  );
}
