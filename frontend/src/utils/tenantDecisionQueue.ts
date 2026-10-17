/**
 * Produsen kartu keputusan untuk role TENANT (AIDL-01b).
 *
 * Aturannya adalah keputusan owner 11 Okt 2026 (P11, pilihan `a`):
 *   1. tagihan jatuh tempo -> kartu dengan aksi ke detail tagihan;
 *   2. perpanjangan menunggu keputusan -> kartu informasi, karena keputusannya
 *      diambil di halaman yang sama (bukan navigasi ke rute lain);
 *   3. pengajuan keluar berjalan (PENDING/APPROVED) -> kartu informasi, karena
 *      keputusan ada di pengelola dan penghuni hanya memantau.
 *
 * Batas yang disengaja:
 * - BUKAN mesin aturan kedua. Fungsi ini murni memetakan data yang sudah dimuat
 *   ke kontrak `ActionQueueItem` yang sama dengan OWNER/ADMIN/STAFF.
 * - TIDAK ada ambang hari baru: kartu tagihan hanya muncul bila tenggat SUDAH
 *   lewat (`isTenantInvoiceOverdue`, helper yang juga dipakai layar). "Segera
 *   jatuh tempo" sengaja tidak dijadikan kartu karena ambangnya keputusan bisnis
 *   baru, bukan keputusan teknis.
 * - Angka yang tampil hanya berasal dari data (nominal + tanggal). Tidak ada
 *   angka karangan: `sourceRefs` menunjuk ke asalnya.
 */
import type { ActionQueueItem } from '../components/command-center/ActionQueueTable';
import type { CheckoutRequest, Invoice, RenewRequest } from '../types';
import { formatDateOnly } from './dateTime';
import { formatRupiah } from './formatCurrency';
import { getInvoiceTotalAmount } from './invoiceTotals';
import { getTenantDateDiffInDays } from './tenantDates';

export const TENANT_DECISION_RULE = {
  invoiceOverdue: 'tenant-invoice-overdue',
  renewPendingDecision: 'tenant-renew-pending-decision',
  checkoutInProgress: 'tenant-checkout-in-progress',
} as const;

export const TENANT_STAY_PATH = '/portal/stay';

export function tenantInvoicePath(invoiceId: number): string {
  return `/portal/invoices/${invoiceId}`;
}

export function buildTenantDecisionQueue(input: {
  overdueInvoice?: Invoice | null;
  pendingDecisionRequest?: RenewRequest | null;
  inProgressCheckoutRequest?: CheckoutRequest | null;
}): ActionQueueItem[] {
  const items: ActionQueueItem[] = [];

  const invoice = input.overdueInvoice ?? null;
  if (invoice) {
    const daysLeft = getTenantDateDiffInDays(invoice.dueDate);
    const lateDays = daysLeft !== null ? Math.max(0, -daysLeft) : 0;
    const nominal = formatRupiah(getInvoiceTotalAmount(invoice));
    const tenggat = formatDateOnly(invoice.dueDate);
    items.push({
      id: `tenant-invoice-${invoice.id}`,
      priority: 'HIGH',
      type: 'Tagihan',
      subject: invoice.invoiceNumber ? `Tagihan ${invoice.invoiceNumber}` : `Tagihan #${invoice.id}`,
      issue: `${nominal} · tenggat ${tenggat}${lateDays > 0 ? ` (terlambat ${lateDays} hari)` : ''}`,
      deadlineLabel: tenggat,
      timeStatusLabel: lateDays > 0 ? `Terlambat ${lateDays} hari` : 'Lewat tenggat',
      timeStatusTone: 'danger',
      recommendedAction: 'Bayar & kirim bukti',
      actionTo: tenantInvoicePath(invoice.id),
      dedupKey: `invoice:${invoice.id}`,
      ruleId: TENANT_DECISION_RULE.invoiceOverdue,
      entityType: 'invoice',
      entityId: invoice.id,
      sebab: 'Status tagihan masih terbuka dan tenggatnya sudah lewat.',
      dampak: 'Selama tagihan terbuka, pengajuan perpanjangan dan keluar tertahan.',
      sourceRefs: [{ label: 'Tagihan', ref: tenantInvoicePath(invoice.id) }],
      expiresAt: null,
    });
  }

  const renew = input.pendingDecisionRequest ?? null;
  if (renew) {
    items.push({
      id: `tenant-renew-${renew.id}`,
      priority: 'MEDIUM',
      type: 'Perpanjangan',
      subject: 'Perpanjangan menunggu keputusan',
      issue: 'Admin sudah meninjau pengajuan perpanjanganmu. Pilih lanjut atau tidak.',
      recommendedAction: 'Tentukan: lanjut atau tidak',
      dedupKey: `renew-request:${renew.id}`,
      ruleId: TENANT_DECISION_RULE.renewPendingDecision,
      entityType: 'renew_request',
      entityId: renew.id,
      sebab: 'Pengajuan perpanjangan berhenti di titik keputusan penghuni.',
      dampak: 'Masa sewa tidak diperpanjang sampai keputusan diberikan.',
      sourceRefs: [{ label: 'Perpanjangan', ref: TENANT_STAY_PATH }],
      expiresAt: null,
    });
  }

  const checkout = input.inProgressCheckoutRequest ?? null;
  if (checkout) {
    const statusCopy = checkout.status === 'APPROVED'
      ? 'disetujui; menunggu finalisasi pengelola'
      : 'menunggu review pengelola';
    items.push({
      id: `tenant-checkout-${checkout.id}`,
      priority: 'MEDIUM',
      type: 'Pengajuan keluar',
      subject: 'Pengajuan keluar sedang berjalan',
      issue: `Diajukan untuk ${formatDateOnly(checkout.requestedCheckOutDate)} · ${statusCopy}.`,
      recommendedAction: 'Pantau status di halaman ini',
      dedupKey: `checkout-request:${checkout.id}`,
      ruleId: TENANT_DECISION_RULE.checkoutInProgress,
      entityType: 'checkout_request',
      entityId: checkout.id,
      sebab: 'Pengajuan keluar sudah dikirim dan sedang diproses.',
      dampak: 'Tanggal keluar dan pengembalian deposit mengikuti keputusan pengelola.',
      sourceRefs: [{ label: 'Pengajuan keluar', ref: TENANT_STAY_PATH }],
      expiresAt: null,
    });
  }

  return items;
}
