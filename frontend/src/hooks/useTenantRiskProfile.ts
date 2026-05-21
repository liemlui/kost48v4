import { useMemo } from 'react';
import type { Invoice, Stay } from '../types';
import { tenantFriendlyStatus } from '../utils/smartCopy';

export type TenantRiskProfile = {
  label: 'aman' | 'perlu_bayar' | 'sedang_diperiksa' | 'risiko_keluar_terblokir';
  title: string;
  message: string;
  severity: 'SUCCESS' | 'INFO' | 'WARNING' | 'DANGER';
};

export function useTenantRiskProfile(input: { stay?: Stay | null; invoices?: Invoice[]; hasPendingPaymentReview?: boolean }): TenantRiskProfile {
  return useMemo(() => {
    const openInvoices = (input.invoices ?? []).filter((invoice) => !['PAID', 'CANCELLED'].includes(invoice.status));
    if (input.hasPendingPaymentReview) {
      return { label: 'sedang_diperiksa', title: 'Bukti pembayaran sedang diperiksa', message: 'Tidak perlu upload ulang. Admin akan memverifikasi bukti pembayaran kamu.', severity: 'INFO' };
    }
    if (openInvoices.length) {
      const first = openInvoices[0];
      return { label: 'perlu_bayar', title: 'Ada tagihan yang perlu dibayar', message: `${openInvoices.length} tagihan masih open. Status terdekat: ${tenantFriendlyStatus(first.status)}.`, severity: 'WARNING' };
    }
    if ((input.stay?.openInvoiceCount ?? 0) > 0) {
      return { label: 'risiko_keluar_terblokir', title: 'Proses keluar bisa tertahan', message: 'Masih ada tagihan open sehingga final keluar belum bisa diselesaikan.', severity: 'DANGER' };
    }
    return { label: 'aman', title: 'Status hunian aman', message: 'Tidak ada tagihan terbuka dari data yang dimuat.', severity: 'SUCCESS' };
  }, [input]);
}
