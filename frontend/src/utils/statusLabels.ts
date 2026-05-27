export type StatusLabelTone = 'admin' | 'tenant';
export type StatusLabelDomain = 'invoice' | 'payment' | 'stay' | 'room' | 'deposit' | 'ticket' | 'renew' | 'checkout' | 'default';

export function getStatusLabel(status?: string, customLabel?: string, options?: { tone?: StatusLabelTone; domain?: StatusLabelDomain }): string {
  if (customLabel) return customLabel;
  const normalized = String(status ?? '').toUpperCase();
  const tone = options?.tone ?? 'admin';
  const domain = options?.domain ?? 'default';

  const tenantInvoiceLabels: Record<string, string> = {
    DRAFT: 'Sedang disiapkan',
    ISSUED: 'Perlu Dibayar',
    PARTIAL: 'Dibayar Sebagian',
    PAID: 'Lunas',
    CANCELLED: 'Dibatalkan',
    OVERDUE: 'Lewat Jatuh Tempo',
  };

  const tenantPaymentLabels: Record<string, string> = {
    PENDING_REVIEW: 'Sedang Diperiksa',
    APPROVED: 'Diterima',
    REJECTED: 'Ditolak',
    EXPIRED: 'Kedaluwarsa',
  };

  const tenantStayLabels: Record<string, string> = {
    ACTIVE: 'Masa Sewa Aktif',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
    RESERVED: 'Dipesan',
  };

  if (tone === 'tenant') {
    if (domain === 'invoice' && tenantInvoiceLabels[normalized]) return tenantInvoiceLabels[normalized];
    if (domain === 'payment' && tenantPaymentLabels[normalized]) return tenantPaymentLabels[normalized];
    if (domain === 'stay' && tenantStayLabels[normalized]) return tenantStayLabels[normalized];
  }

  const labels: Record<string, string> = {
    ACTIVE: 'Aktif',
    INACTIVE: 'Tidak Aktif',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
    AVAILABLE: 'Tersedia',
    RESERVED: 'Dipesan',
    OCCUPIED: 'Terisi',
    MAINTENANCE: 'Perbaikan',
    INACTIVE_ROOM: 'Nonaktif',
    INACTIVE_ROOM_STATUS: 'Nonaktif',
    UNAVAILABLE: 'Tidak Tersedia',
    PAID: 'Lunas',
    ISSUED: domain === 'invoice' ? 'Terbit / Perlu Dibayar' : 'Tagihan',
    PARTIAL: 'Sebagian',
    DRAFT: 'Draft',
    OVERDUE: 'Jatuh Tempo',
    HELD: 'Deposit Ditahan',
    REFUNDED: 'Dikembalikan',
    PARTIALLY_REFUNDED: 'Sebagian Dikembalikan',
    FORFEITED: 'Hangus',
    SUCCESS: 'Aman',
    WARNING: 'Perhatian',
    DANGER: 'Bahaya',
    INFO: 'Info',
    SECONDARY: 'Info',
    GOOD: 'Baik',
    DAMAGED: 'Rusak',
    MISSING: 'Hilang',
    LOW_STOCK: 'Stok Menipis',
    OUT_OF_STOCK: 'Stok Habis',
    NEEDS_REPAIR: 'Perlu Diperbaiki',
    PENDING_CHECK: 'Menunggu Cek Admin',
    COUNTDOWN_7PLUS: 'H-7+',
    COUNTDOWN_3_6: 'H-3–6',
    COUNTDOWN_1_2: 'H-1–2',
    COUNTDOWN_0: 'Hari Ini',
    COUNTDOWN_OVERDUE: 'Terlambat',
    COUNTDOWN_NODATE: 'Tanpa Tanggal',
    MONTHLY: 'Bulanan',
    WEEKLY: 'Mingguan',
    BIWEEKLY: '2 Mingguan',
    DAILY: 'Harian',
    YEARLY: 'Tahunan',
    SEMESTERLY: 'Semesteran',
    SMESTERLY: 'Semesteran',
    RENT: 'Sewa',
    ELECTRICITY: 'Listrik',
    WATER: 'Air',
    WIFI: 'WiFi',
    PENALTY: 'Denda',
    DISCOUNT: 'Diskon',
    OTHER: 'Lainnya',
    CASH: 'Tunai',
    TRANSFER: 'Transfer',
    QRIS: 'QRIS',
    EWALLET: 'E-Wallet',
    OPEN: 'Baru',
    IN_PROGRESS: 'Sedang Dikerjakan',
    DONE: 'Selesai',
    CLOSED: 'Ditutup',
    RESOLVED: 'Selesai',
    WEBSITE: 'Website',
    WORK: 'Kerja',
    STUDY: 'Studi',
    TRANSIT: 'Transit',
    FAMILY: 'Keluarga',
    MEDICAL: 'Medis',
    PROJECT: 'Proyek',
    PENDING_REVIEW: domain === 'payment' ? 'Menunggu Dicek' : 'Menunggu Dicek',
    PENDING: 'Menunggu Dicek',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
    EXPIRED: 'Kedaluwarsa',
    BLOCKER: 'Terhalang',
    HIGH: 'Tinggi',
    MEDIUM: 'Sedang',
    OPPORTUNITY: 'Peluang',
  };

  if (normalized === 'INACTIVE') return labels.INACTIVE;
  if (normalized === 'INACTIVE_ROOM') return labels.INACTIVE_ROOM;
  return labels[normalized] ?? status ?? '-';
}

export function getStatusVariant(status?: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'primary' | 'dark' {
  const normalized = String(status ?? '').toUpperCase();

  if (['ACTIVE', 'AVAILABLE', 'PAID', 'SUCCESS', 'GOOD', 'REFUNDED', 'RESOLVED', 'DONE', 'APPROVED', 'OPPORTUNITY'].includes(normalized)) return 'success';
  if (['OPEN', 'PARTIAL', 'WARNING', 'HELD', 'COUNTDOWN_7PLUS', 'COUNTDOWN_3_6', 'RESERVED', 'PENDING_REVIEW', 'PENDING', 'HIGH', 'MEDIUM', 'LOW_STOCK', 'PENDING_CHECK', 'NEEDS_REPAIR'].includes(normalized)) return 'warning';
  if (['CANCELLED', 'OVERDUE', 'DANGER', 'FORFEITED', 'COUNTDOWN_1_2', 'COUNTDOWN_0', 'COUNTDOWN_OVERDUE', 'REJECTED', 'BLOCKER', 'OUT_OF_STOCK', 'DAMAGED'].includes(normalized)) return 'danger';
  if (['COMPLETED', 'ISSUED', 'INFO', 'OCCUPIED', 'PARTIALLY_REFUNDED', 'IN_PROGRESS'].includes(normalized)) return 'info';
  if (['CLOSED', 'DRAFT', 'SECONDARY', 'INACTIVE', 'MAINTENANCE', 'UNAVAILABLE', 'COUNTDOWN_NODATE', 'EXPIRED'].includes(normalized)) return 'secondary';
  if (['MISSING'].includes(normalized)) return 'dark';
  return 'secondary';
}

export interface BookingStatusInput {
  isReserved: boolean;
  isExpired: boolean;
  hasInvoice: boolean;
  isCancelled: boolean;
  isCompleted: boolean;
  isActiveOccupied: boolean;
}

export function getBookingStatusLabel(input: BookingStatusInput): { label: string; variant: string } {
  if (input.isCancelled) return { label: 'Dibatalkan', variant: 'DANGER' };
  if (input.isCompleted) return { label: 'Selesai', variant: 'COMPLETED' };
  if (input.isActiveOccupied) return { label: 'Aktif', variant: 'ACTIVE' };
  if (input.isReserved && input.isExpired) return { label: 'Kedaluwarsa', variant: 'EXPIRED' };
  if (input.isReserved && !input.hasInvoice) return { label: 'Menunggu Approval', variant: 'WARNING' };
  if (input.isReserved && input.hasInvoice) return { label: 'Menunggu Pembayaran', variant: 'INFO' };
  return { label: 'Perlu Review', variant: 'WARNING' };
}
