import { formatDateTimeWib } from '../../utils/dateTime';
import type { TenantDepositLedgerEntry, TenantDepositLedgerEntryType } from '../../api/depositLedger';

export function getDepositLedgerTypeLabel(type?: TenantDepositLedgerEntryType, tenantView = false) {
  const normalized = String(type ?? '').toUpperCase();
  if (tenantView) {
    const tenantLabels: Record<string, string> = {
      PAYMENT_RECEIVED: 'Deposit kamu sudah diterima',
      REFUND: 'Deposit dikembalikan',
      DEDUCTION: 'Deposit dipotong',
      FORFEIT: 'Deposit hangus',
      MIGRATION_SNAPSHOT: 'Riwayat deposit lama tercatat',
    };
    return tenantLabels[normalized] ?? 'Update deposit';
  }

  const adminLabels: Record<string, string> = {
    PAYMENT_RECEIVED: 'Deposit diterima',
    REFUND: 'Deposit dikembalikan',
    DEDUCTION: 'Deposit dipotong',
    FORFEIT: 'Deposit hangus',
    MIGRATION_SNAPSHOT: 'Snapshot migrasi',
  };
  return adminLabels[normalized] ?? type ?? 'Update deposit';
}

export function getDepositLedgerDirectionLabel(direction?: string, tenantView = false) {
  const normalized = String(direction ?? '').toUpperCase();
  if (tenantView) {
    const tenantLabels: Record<string, string> = {
      INCREASE_LIABILITY: 'Masuk ke deposit kamu',
      DECREASE_LIABILITY: 'Keluar dari saldo deposit',
      INFO: 'Catatan deposit',
    };
    return tenantLabels[normalized] ?? 'Update deposit';
  }

  const adminLabels: Record<string, string> = {
    INCREASE_LIABILITY: 'Deposit masuk / kewajiban bertambah',
    DECREASE_LIABILITY: 'Deposit keluar / kewajiban berkurang',
    INFO: 'Catatan',
  };
  return adminLabels[normalized] ?? direction ?? '-';
}

export function getDepositLedgerTone(entry: Pick<TenantDepositLedgerEntry, 'type' | 'direction'>) {
  const type = String(entry.type ?? '').toUpperCase();
  const direction = String(entry.direction ?? '').toUpperCase();
  if (type === 'PAYMENT_RECEIVED' || direction === 'INCREASE_LIABILITY') return 'success';
  if (type === 'DEDUCTION' || type === 'FORFEIT') return 'warning';
  if (type === 'REFUND') return 'info';
  return 'secondary';
}

export function getDepositLedgerNarrative(entry: TenantDepositLedgerEntry, tenantView = false) {
  const type = String(entry.type ?? '').toUpperCase();
  if (tenantView) {
    const copy: Record<string, string> = {
      PAYMENT_RECEIVED: 'Deposit kamu sudah diterima dan sedang ditahan selama masa sewa.',
      REFUND: 'Deposit kamu sudah diproses untuk dikembalikan.',
      DEDUCTION: 'Sebagian deposit dipotong sesuai catatan admin.',
      FORFEIT: 'Deposit dinyatakan hangus sesuai proses akhir masa sewa.',
      MIGRATION_SNAPSHOT: 'Riwayat deposit lama ditampilkan sebagai catatan awal.',
    };
    return copy[type] ?? 'Ada update pada deposit kamu.';
  }

  const copy: Record<string, string> = {
    PAYMENT_RECEIVED: 'Deposit masuk dari pembayaran booking/awal tenant.',
    REFUND: 'Deposit keluar karena proses refund.',
    DEDUCTION: 'Deposit keluar sebagai potongan biaya/kerusakan/penyesuaian.',
    FORFEIT: 'Deposit keluar karena keputusan hangus.',
    MIGRATION_SNAPSHOT: 'Catatan awal untuk data historis setelah review.',
  };
  return copy[type] ?? 'Update operasional deposit.';
}

export function formatDepositLedgerDate(value?: string | null) {
  return formatDateTimeWib(value);
}
