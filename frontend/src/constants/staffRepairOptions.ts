export type SelectOption<TValue extends string = string> = {
  value: TValue;
  label: string;
  helper?: string;
};

export type StaffRepairConditionOption = SelectOption & {
  backendStatus: string;
  defaultRequestsReplacement?: boolean;
  allowReplacementRequest?: boolean;
};

export const roomConditionOptions: StaffRepairConditionOption[] = [
  {
    value: 'DAMAGED',
    backendStatus: 'DAMAGED',
    label: 'Rusak / tidak berfungsi',
    helper: 'Contoh: lampu mati, kran bocor, kunci macet.',
    allowReplacementRequest: true,
  },
  {
    value: 'NEEDS_REPAIR',
    backendStatus: 'MAINTENANCE',
    label: 'Perlu diperbaiki ringan',
    helper: 'Barang masih ada, tetapi perlu diperbaiki atau disetel ulang.',
    allowReplacementRequest: true,
  },
  {
    value: 'NEEDS_REPLACEMENT',
    backendStatus: 'MAINTENANCE',
    label: 'Perlu diganti baru',
    helper: 'Pakai ini kalau staff butuh barang pengganti dari gudang.',
    defaultRequestsReplacement: true,
    allowReplacementRequest: true,
  },
  {
    value: 'MISSING',
    backendStatus: 'MISSING',
    label: 'Tidak ada / hilang',
    helper: 'Barang tidak ditemukan di kamar dan perlu keputusan admin.',
  },
  {
    value: 'PENDING_CHECK',
    backendStatus: 'MAINTENANCE',
    label: 'Perlu cek admin',
    helper: 'Kondisi belum pasti, minta admin mengecek sebelum keputusan final.',
    allowReplacementRequest: true,
  },
];

export const warehouseConditionOptions: StaffRepairConditionOption[] = [
  { value: 'OUT_OF_STOCK', backendStatus: 'OUT_OF_STOCK', label: 'Stok habis', helper: 'Barang di gudang sudah habis.' },
  { value: 'LOW_STOCK', backendStatus: 'LOW_STOCK', label: 'Stok menipis', helper: 'Stok tinggal sedikit dan perlu dicek admin.' },
  { value: 'DAMAGED', backendStatus: 'DAMAGED', label: 'Alat/barang rusak', helper: 'Barang gudang rusak dan perlu keputusan admin.' },
  { value: 'MISSING', backendStatus: 'MISSING', label: 'Tidak ditemukan / hilang', helper: 'Barang gudang tidak ada di tempat.' },
  { value: 'NEEDS_REPAIR', backendStatus: 'NEEDS_REPAIR', label: 'Perlu diperbaiki', helper: 'Alat gudang perlu diperbaiki sebelum dipakai lagi.' },
  { value: 'PENDING_CHECK', backendStatus: 'PENDING_CHECK', label: 'Perlu cek admin', helper: 'Kondisi stok/barang belum pasti.' },
];

export const adminDecisionOptions: SelectOption<'APPROVE' | 'NEEDS_MORE_INFO' | 'REJECT'>[] = [
  { value: 'APPROVE', label: 'Setujui diagnosis', helper: 'Admin setuju dengan laporan staff.' },
  { value: 'NEEDS_MORE_INFO', label: 'Minta info tambahan', helper: 'Staff perlu tambah catatan/foto sebelum diputuskan.' },
  { value: 'REJECT', label: 'Tolak / tidak sesuai', helper: 'Diagnosis staff tidak sesuai dengan keputusan admin.' },
];

export const fieldReportStatusLabels: Record<string, string> = {
  REPORTED: 'Menunggu cek admin',
  UNDER_REVIEW: 'Admin meminta info tambahan',
  APPROVED: 'Disetujui admin',
  REJECTED: 'Ditolak admin',
  IN_REPAIR: 'Barang disiapkan / proses perbaikan',
  DONE: 'Selesai oleh staff',
  CLOSED: 'Dikonfirmasi admin',
};

export const ticketStatusLabels: Record<string, string> = {
  OPEN: 'Belum mulai',
  IN_PROGRESS: 'Sedang dikerjakan',
  DONE: 'Selesai, menunggu cek admin',
  CLOSED: 'Selesai final',
  CANCELLED: 'Dibatalkan admin',
};

export function getTicketStatusLabel(value?: string | null, fallback = 'Perlu dicek') {
  if (!value) return fallback;
  return ticketStatusLabels[String(value).toUpperCase()] || fallback;
}

export const reportedConditionLabels: Record<string, string> = {
  DAMAGED: 'Rusak / tidak berfungsi',
  MISSING: 'Tidak ada / hilang',
  NEEDS_REPAIR: 'Perlu diperbaiki',
  NEEDS_REPLACEMENT: 'Perlu diganti baru',
  NEEDS_CLEANING: 'Perlu dibersihkan',
  LOW_STOCK: 'Stok menipis',
  OUT_OF_STOCK: 'Stok habis',
  PENDING_CHECK: 'Perlu cek admin',
};

export const roomItemFinalStatusOptions: SelectOption<'GOOD' | 'MAINTENANCE' | 'DAMAGED' | 'MISSING'>[] = [
  { value: 'GOOD', label: 'Baik / sudah diperbaiki' },
  { value: 'MAINTENANCE', label: 'Dalam perbaikan / perlu cek lanjutan' },
  { value: 'DAMAGED', label: 'Masih rusak' },
  { value: 'MISSING', label: 'Hilang' },
];

export const inventoryItemFinalStatusOptions: SelectOption<'GOOD' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DAMAGED' | 'MISSING' | 'NEEDS_REPAIR' | 'PENDING_CHECK'>[] = [
  { value: 'GOOD', label: 'Aman / sudah dicek' },
  { value: 'LOW_STOCK', label: 'Stok menipis' },
  { value: 'OUT_OF_STOCK', label: 'Stok habis' },
  { value: 'DAMAGED', label: 'Rusak' },
  { value: 'MISSING', label: 'Hilang' },
  { value: 'NEEDS_REPAIR', label: 'Perlu diperbaiki' },
  { value: 'PENDING_CHECK', label: 'Perlu cek lanjutan' },
];

export const inventoryMovementTypeOptions: SelectOption<'ASSIGN_TO_ROOM' | 'OUT'>[] = [
  { value: 'ASSIGN_TO_ROOM', label: 'Ambil dari gudang untuk kamar' },
  { value: 'OUT', label: 'Keluar dari gudang / terpakai' },
];

export function getStaffRepairLabel(value?: string | null, fallback = '-') {
  if (!value) return fallback;
  return reportedConditionLabels[value] || fieldReportStatusLabels[value] || value;
}

export function getOptionLabel(options: SelectOption[], value?: string | null, fallback = '-') {
  if (!value) return fallback;
  return options.find((option) => option.value === value)?.label || value;
}
