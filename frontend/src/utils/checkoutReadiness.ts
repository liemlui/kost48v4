import type { ReadinessItem } from '../components/command-center';
import type { Invoice, Stay } from '../types';
import { formatDateTimeWib } from './dateTime';

export function isOpenInvoice(invoice: Pick<Invoice, 'status'>) {
  return invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
}

export function getOpenInvoices(invoices: Invoice[]) {
  return invoices.filter(isOpenInvoice);
}

export function getDraftInvoices(invoices: Invoice[]) {
  return invoices.filter((invoice) => invoice.status === 'DRAFT');
}

export function getOverdueOpenInvoices(invoices: Invoice[]) {
  const now = Date.now();
  return getOpenInvoices(invoices).filter((invoice) => invoice.dueDate && new Date(invoice.dueDate).getTime() < now);
}

export function getInvoiceBlockerCopy(invoices: Invoice[]) {
  const openInvoices = getOpenInvoices(invoices);
  const draftInvoices = getDraftInvoices(invoices);
  const overdueInvoices = getOverdueOpenInvoices(invoices);

  if (!openInvoices.length) {
    return 'Semua tagihan untuk masa sewa ini sudah lunas atau dibatalkan.';
  }

  const parts = [`${openInvoices.length} tagihan masih aktif`];
  if (draftInvoices.length) parts.push(`${draftInvoices.length} masih draft`);
  if (overdueInvoices.length) parts.push(`${overdueInvoices.length} terlambat`);
  return `${parts.join(', ')}. Final checkout tetap terblokir sampai statusnya lunas atau dibatalkan.`;
}

export function getCheckoutReadinessSummary(invoices: Invoice[], hasApprovedCheckoutRequest?: boolean) {
  const openInvoices = getOpenInvoices(invoices);
  if (openInvoices.length) {
    return {
      tone: 'danger' as const,
      title: 'Belum bisa final checkout',
      message: getInvoiceBlockerCopy(invoices),
    };
  }

  if (!hasApprovedCheckoutRequest) {
    return {
      tone: 'warning' as const,
      title: 'Tagihan clear, cek keputusan keluar',
      message: 'Tagihan sudah tidak memblokir. Pastikan rencana keluar tenant sudah disetujui atau alasan checkout sudah jelas sebelum final.',
    };
  }

  return {
    tone: 'success' as const,
    title: 'Bisa final checkout',
    message: 'Tagihan clear dan rencana keluar sudah disetujui. Finalkan hanya setelah cek kamar dan catatan meter akhir siap.',
  };
}

export function buildCheckoutReadinessItems({
  stay,
  invoices,
  hasApprovedCheckoutRequest = false,
  hasPendingCheckoutRequest = false,
  meterCount = 0,
  latestMeterReadingAt = null,
}: {
  stay: Stay;
  invoices: Invoice[];
  hasApprovedCheckoutRequest?: boolean;
  hasPendingCheckoutRequest?: boolean;
  meterCount?: number;
  latestMeterReadingAt?: string | null;
}): ReadinessItem[] {
  const openInvoices = getOpenInvoices(invoices);
  const draftInvoices = getDraftInvoices(invoices);
  const overdueInvoices = getOverdueOpenInvoices(invoices);
  const isFinished = stay.status === 'COMPLETED' || stay.status === 'CANCELLED';
  const depositHeld = stay.depositStatus === 'HELD';

  return [
    {
      id: 'invoice-clearance',
      label: openInvoices.length ? 'Tagihan belum clear' : 'Tagihan sudah clear',
      description: openInvoices.length
        ? getInvoiceBlockerCopy(invoices)
        : 'Tidak ada tagihan aktif. Final checkout tidak terblokir oleh tagihan.',
      state: openInvoices.length ? 'block' : 'pass',
    },
    {
      id: 'draft-invoices',
      label: draftInvoices.length ? 'Ada tagihan draft' : 'Tidak ada tagihan draft terbuka',
      description: draftInvoices.length
        ? 'DRAFT tetap dihitung sebagai tagihan aktif. Batalkan atau selesaikan dulu sebelum final checkout.'
        : 'Tidak ada draft yang menggantung untuk masa sewa ini.',
      state: draftInvoices.length ? 'block' : 'pass',
    },
    {
      id: 'overdue-invoices',
      label: overdueInvoices.length ? 'Ada tagihan terlambat' : 'Tidak ada tagihan terlambat aktif',
      description: overdueInvoices.length
        ? 'Selesaikan tagihan terlambat sebelum melepas kamar.'
        : 'Tidak ada tagihan overdue yang masih aktif.',
      state: overdueInvoices.length ? 'block' : 'pass',
    },
    {
      id: 'checkout-request',
      label: hasApprovedCheckoutRequest ? 'Rencana keluar sudah disetujui' : hasPendingCheckoutRequest ? 'Rencana keluar masih menunggu review' : 'Keputusan keluar perlu dicek',
      description: hasApprovedCheckoutRequest
        ? 'Approval rencana keluar hanya menyetujui jadwal. Kamar baru lepas setelah final checkout.'
        : hasPendingCheckoutRequest
          ? 'Review dulu pengajuan keluar tenant sebelum final checkout.'
          : 'Jika checkout manual tanpa request, pastikan alasan keluar dan tanggalnya benar.',
      state: hasApprovedCheckoutRequest ? 'pass' : hasPendingCheckoutRequest ? 'warn' : 'info',
    },
    {
      id: 'meter-final',
      label: meterCount > 0 ? 'Catatan meter tersedia' : 'Catatan meter perlu dicek',
      description: latestMeterReadingAt
        ? `Catatan meter terakhir: ${formatDateTimeWib(latestMeterReadingAt)}. Pastikan tidak ada pemakaian akhir yang belum ditagihkan.`
        : 'Jika listrik/air ditagihkan berdasarkan meter, catat meter akhir sebelum melepas kamar.',
      state: latestMeterReadingAt ? 'warn' : 'info',
    },
    {
      id: 'room-check',
      label: 'Cek kondisi kamar dan barang',
      description: 'Final checkout melepas kamar. Keputusan refund/potong deposit sebaiknya mengikuti hasil cek kondisi kamar.',
      state: 'warn',
    },
    {
      id: 'deposit-settlement',
      label: isFinished ? (depositHeld ? 'Deposit masih perlu diproses' : 'Deposit sudah selesai') : 'Deposit diproses setelah final checkout',
      description: isFinished
        ? depositHeld
          ? 'Masa sewa sudah selesai/cancelled tetapi deposit masih ditahan. Proses refund, potongan, atau hangus setelah cek kamar.'
          : 'Status deposit tidak lagi menggantung.'
        : 'Deposit adalah dana titipan. Jangan dianggap omzet; proses terpisah setelah tenant keluar dan kamar dicek.',
      state: isFinished ? (depositHeld ? 'warn' : 'pass') : 'info',
    },
  ];
}
