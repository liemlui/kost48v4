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
  { value: 'DAMAGED', backendStatus: 'DAMAGED', label: 'Barang rusak fisik', helper: 'Contoh: alat patah, kabel terkelupas, barang tidak aman dipakai.' },
  { value: 'MISSING', backendStatus: 'MISSING', label: 'Barang hilang / tidak ditemukan', helper: 'Barang tercatat ada, tetapi tidak ditemukan di lokasi gudang.' },
  { value: 'COUNT_MISMATCH', backendStatus: 'PENDING_CHECK', label: 'Jumlah fisik tidak sesuai sistem', helper: 'Staff melihat selisih jumlah. Admin/owner yang memutuskan koreksi stok resmi.' },
  { value: 'RESTOCK_REQUEST', backendStatus: 'PENDING_CHECK', label: 'Minta restock / pembelian', helper: 'Gunakan untuk catatan kebutuhan. Status habis/menipis tetap dihitung otomatis dari qty dan minimal stok.' },
  { value: 'NEEDS_REPAIR', backendStatus: 'NEEDS_REPAIR', label: 'Perlu diperbaiki', helper: 'Alat gudang masih ada, tetapi perlu perbaikan sebelum dipakai lagi.' },
  { value: 'PENDING_CHECK', backendStatus: 'PENDING_CHECK', label: 'Catatan gudang lain', helper: 'Ada kondisi yang perlu dilihat admin, tetapi bukan status stok habis/menipis.' },
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
  GOOD: 'Terlihat normal',
  MAINTENANCE: 'Perlu perbaikan / cek admin',
  DAMAGED: 'Rusak / tidak berfungsi',
  MISSING: 'Tidak ada / hilang',
  NEEDS_REPAIR: 'Perlu diperbaiki',
  NEEDS_REPLACEMENT: 'Perlu diganti baru',
  NEEDS_CLEANING: 'Perlu dibersihkan',
  LOW_STOCK: 'Stok menipis (otomatis)',
  OUT_OF_STOCK: 'Stok habis (otomatis)',
  COUNT_MISMATCH: 'Jumlah fisik tidak sesuai sistem',
  RESTOCK_REQUEST: 'Minta restock / pembelian',
  PENDING_CHECK: 'Perlu cek admin',
};

export const roomItemFinalStatusOptions: SelectOption<'GOOD' | 'MAINTENANCE' | 'DAMAGED' | 'MISSING'>[] = [
  { value: 'GOOD', label: 'Baik / sudah diperbaiki' },
  { value: 'MAINTENANCE', label: 'Dalam perbaikan / perlu cek lanjutan' },
  { value: 'DAMAGED', label: 'Masih rusak' },
  { value: 'MISSING', label: 'Hilang' },
];

export const inventoryItemFinalStatusOptions: SelectOption<'GOOD' | 'DAMAGED' | 'MISSING' | 'NEEDS_REPAIR' | 'PENDING_CHECK'>[] = [
  { value: 'GOOD', label: 'Aman / sudah dicek' },
  { value: 'DAMAGED', label: 'Rusak fisik' },
  { value: 'MISSING', label: 'Hilang / tidak ditemukan' },
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
