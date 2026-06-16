import type { ReadinessItem } from '../components/command-center';
import type { Invoice, Stay } from '../types';
import { formatDateTimeWib } from './dateTime';
import { formatRupiah } from './formatCurrency';

export function isOpenInvoice(invoice: Pick<Invoice, 'status'>) {
  return invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
}

export function getOpenInvoices(invoices: Invoice[]) {
  return invoices.filter(isOpenInvoice);
}

// METER M-5: tagihan meter (listrik/air) PASCABAYAR. Sebuah tagihan = "tagihan
// meter" bila SELURUH barisnya ELECTRICITY/WATER (fallback: nomor diawali MTR-).
// Tagihan meter TIDAK memblokir checkout — dipotong dari deposit saat settlement.
export function isMeterInvoice(invoice: Invoice) {
  const lines = invoice.lines ?? [];
  if (lines.length > 0) {
    return lines.every((line) => line.lineType === 'ELECTRICITY' || line.lineType === 'WATER');
  }
  return Boolean(invoice.invoiceNumber && invoice.invoiceNumber.startsWith('MTR-'));
}

export function getOpenMeterInvoices(invoices: Invoice[]) {
  return getOpenInvoices(invoices).filter(isMeterInvoice);
}

// Tagihan yang BENAR-BENAR memblokir final keluar = open & BUKAN tagihan meter.
export function getBlockingOpenInvoices(invoices: Invoice[]) {
  return getOpenInvoices(invoices).filter((invoice) => !isMeterInvoice(invoice));
}

export function invoiceRemainingRupiah(invoice: Invoice) {
  const paid = Number(invoice.paidAmountRupiah ?? 0);
  return Math.max(0, Number(invoice.totalAmountRupiah ?? 0) - paid);
}

export function getMeterDueRupiah(invoices: Invoice[]) {
  return getOpenMeterInvoices(invoices).reduce((sum, invoice) => sum + invoiceRemainingRupiah(invoice), 0);
}

export function getDraftInvoices(invoices: Invoice[]) {
  return invoices.filter((invoice) => invoice.status === 'DRAFT');
}

export function getOverdueOpenInvoices(invoices: Invoice[]) {
  const now = Date.now();
  // Tagihan meter pascabayar tidak dihitung "terlambat" pemblokir checkout.
  return getBlockingOpenInvoices(invoices).filter((invoice) => invoice.dueDate && new Date(invoice.dueDate).getTime() < now);
}

export function getInvoiceBlockerCopy(invoices: Invoice[]) {
  const blockingInvoices = getBlockingOpenInvoices(invoices);
  const draftInvoices = getDraftInvoices(invoices).filter((invoice) => !isMeterInvoice(invoice));
  const overdueInvoices = getOverdueOpenInvoices(invoices);

  if (!blockingInvoices.length) {
    return 'Semua tagihan non-meter untuk masa sewa ini sudah lunas atau dibatalkan.';
  }

  const parts = [`${blockingInvoices.length} tagihan masih aktif`];
  if (draftInvoices.length) parts.push(`${draftInvoices.length} masih draft`);
  if (overdueInvoices.length) parts.push(`${overdueInvoices.length} terlambat`);
  return `${parts.join(', ')}. Final keluar tetap terblokir sampai statusnya lunas atau dibatalkan.`;
}

export function getCheckoutReadinessSummary(invoices: Invoice[], hasApprovedCheckoutRequest?: boolean) {
  const blockingInvoices = getBlockingOpenInvoices(invoices);
  if (blockingInvoices.length) {
    return {
      tone: 'danger' as const,
      title: 'Belum bisa final keluar',
      message: getInvoiceBlockerCopy(invoices),
    };
  }

  if (!hasApprovedCheckoutRequest) {
    return {
      tone: 'warning' as const,
      title: 'Tagihan clear, cek keputusan keluar',
      message: 'Tagihan sudah tidak memblokir. Pastikan rencana keluar penghuni sudah disetujui atau alasan keluar sudah jelas sebelum final.',
    };
  }

  return {
    tone: 'success' as const,
    title: 'Bisa final keluar',
    message: 'Tagihan sudah aman dan rencana keluar sudah disetujui. Finalkan hanya setelah cek kamar dan catatan meter akhir siap.',
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
  const blockingInvoices = getBlockingOpenInvoices(invoices);
  const draftInvoices = getDraftInvoices(invoices).filter((invoice) => !isMeterInvoice(invoice));
  const overdueInvoices = getOverdueOpenInvoices(invoices);
  const meterDue = getMeterDueRupiah(invoices);
  const hasOpenMeter = getOpenMeterInvoices(invoices).length > 0;
  const isFinished = stay.status === 'COMPLETED' || stay.status === 'CANCELLED';
  const depositHeld = stay.depositStatus === 'HELD';

  return [
    {
      id: 'invoice-clearance',
      label: blockingInvoices.length ? 'Tagihan belum aman' : 'Tagihan sudah aman',
      description: blockingInvoices.length
        ? getInvoiceBlockerCopy(invoices)
        : 'Tidak ada tagihan non-meter aktif. Proses keluar final tidak terblokir oleh tagihan (tagihan meter dipotong dari deposit).',
      state: blockingInvoices.length ? 'block' : 'pass',
    },
    {
      id: 'draft-invoices',
      label: draftInvoices.length ? 'Ada tagihan draft' : 'Tidak ada tagihan draft terbuka',
      description: draftInvoices.length
        ? 'Draft tetap dihitung sebagai tagihan aktif. Batalkan atau selesaikan dulu sebelum keluar final.'
        : 'Tidak ada draft yang menggantung untuk masa sewa ini.',
      state: draftInvoices.length ? 'block' : 'pass',
    },
    {
      id: 'overdue-invoices',
      label: overdueInvoices.length ? 'Ada tagihan terlambat' : 'Tidak ada tagihan terlambat aktif',
      description: overdueInvoices.length
        ? 'Selesaikan tagihan terlambat sebelum melepas kamar.'
        : 'Tidak ada tagihan terlambat yang masih aktif.',
      state: overdueInvoices.length ? 'block' : 'pass',
    },
    {
      id: 'checkout-request',
      label: hasApprovedCheckoutRequest ? 'Rencana keluar sudah disetujui' : hasPendingCheckoutRequest ? 'Rencana keluar masih menunggu dicek' : 'Keputusan keluar perlu dicek',
      description: hasApprovedCheckoutRequest
        ? 'Persetujuan rencana keluar hanya menyetujui jadwal. Kamar baru lepas setelah keluar final.'
        : hasPendingCheckoutRequest
          ? 'Review dulu pengajuan keluar penghuni sebelum keluar final.'
          : 'Jika keluar manual tanpa pengajuan, pastikan alasan keluar dan tanggalnya benar.',
      state: hasApprovedCheckoutRequest ? 'pass' : hasPendingCheckoutRequest ? 'warn' : 'info',
    },
    {
      id: 'meter-final',
      label: hasOpenMeter
        ? 'Tagihan meter akhir terbit (dipotong dari deposit)'
        : meterCount > 0 ? 'Catat meter listrik final' : 'Catatan meter perlu dicek',
      description: hasOpenMeter
        ? `Listrik/air PASCABAYAR. Tagihan meter ${formatRupiah(meterDue)} akan dipotong dari deposit jaminan saat Proses Deposit; sisa deposit dikembalikan, kekurangan jadi piutang.`
        : latestMeterReadingAt
          ? `Catatan meter terakhir: ${formatDateTimeWib(latestMeterReadingAt)}. WAJIB catat meter listrik final (tanggal ≥ tanggal checkout) sebelum keluar final — bila tak ada pemakaian, catat angka yang sama (0 pemakaian).`
          : 'Listrik/air ditagih berdasarkan meter (pascabayar). Catat meter listrik final sebelum melepas kamar.',
      state: hasOpenMeter ? 'warn' : meterCount > 0 ? 'warn' : 'info',
    },
    {
      id: 'room-check',
      label: 'Cek kondisi kamar dan barang',
      description: 'Keluar final melepas kamar. Keputusan pengembalian/potongan dana titipan sebaiknya mengikuti hasil cek kondisi kamar.',
      state: 'warn',
    },
    {
      id: 'deposit-settlement',
      label: isFinished ? (depositHeld ? 'Dana titipan masih perlu diproses' : 'Dana titipan sudah selesai') : 'Dana titipan diproses setelah keluar final',
      description: isFinished
        ? depositHeld
          ? hasOpenMeter
            ? `Masih ada tagihan meter ${formatRupiah(meterDue)}. Saat Proses Deposit, deposit otomatis menutup tagihan meter dulu; sisanya dikembalikan, kekurangan jadi piutang.`
            : 'Masa sewa sudah selesai/dibatalkan tetapi dana titipan masih tersimpan. Proses pengembalian, potongan, atau hangus setelah cek kamar.'
          : 'Status deposit tidak lagi menggantung.'
        : 'Dana titipan adalah kewajiban kos. Jangan dianggap omzet; proses terpisah setelah penghuni keluar dan kamar dicek.',
      state: isFinished ? (depositHeld ? 'warn' : 'pass') : 'info',
    },
  ];
}
