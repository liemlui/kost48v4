import type { AccountingReadiness, AssetReadiness, AutoJournalEntry, BalanceSheetGuard, DepositPosition, DepositReconciliation, PeriodCloseReadiness, ProfitLossLite, ReversalWatch, TrialBalance, UnmappedTransactions } from '../../api/accounting';
import StatementCommandCenterPanel from './StatementCommandCenterPanel';

type Props = {
  readiness?: AccountingReadiness;
  trial?: TrialBalance;
  balanceSheet?: BalanceSheetGuard;
  profitLoss?: ProfitLossLite;
  periodClose?: PeriodCloseReadiness;
  assetReadiness?: AssetReadiness;
  unmapped?: UnmappedTransactions;
  depositPosition?: DepositPosition;
  depositReconciliation?: DepositReconciliation;
  reversalWatch?: ReversalWatch;
  recentJournals: AutoJournalEntry[];
  autoJournalEnabled: boolean;
  isLoading?: boolean;
  onFocusSection?: (sectionId: string) => void;
};

/**
 * Compatibility wrapper kept so older page imports stay stable.
 * The user-facing UI is now a statement command center, not a B3/B4 proof panel.
 */
export default function AccountingCommandCenterLite({ readiness, trial, balanceSheet, profitLoss, periodClose, assetReadiness, unmapped, autoJournalEnabled, isLoading, onFocusSection }: Props) {
  return (
    <StatementCommandCenterPanel
      readiness={readiness}
      trial={trial}
      balanceSheet={balanceSheet}
      profitLoss={profitLoss}
      periodClose={periodClose}
      assetReadiness={assetReadiness}
      unmapped={unmapped}
      autoJournalEnabled={autoJournalEnabled}
      isLoading={isLoading}
      onFocusSection={onFocusSection}
    />
  );
}
