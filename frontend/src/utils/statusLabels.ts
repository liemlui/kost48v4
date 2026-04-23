export function getStatusLabel(status?: string, customLabel?: string): string {
  if (customLabel) return customLabel;
  const normalized = String(status ?? '').toUpperCase();

  const labels: Record<string, string> = {
    ACTIVE: 'Aktif',
    INACTIVE: 'Tidak Aktif',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
    AVAILABLE: 'Tersedia',
    RESERVED: 'Dipesan',
    OCCUPIED: 'Terisi',
    MAINTENANCE: 'Maintenance',
    INACTIVE_ROOM: 'Nonaktif',
    INACTIVE_ROOM_STATUS: 'Nonaktif',
    UNAVAILABLE: 'Tidak Tersedia',
    PAID: 'Lunas',
    ISSUED: 'Tagihan',
    PARTIAL: 'Sebagian',
    DRAFT: 'Draft',
    OVERDUE: 'Jatuh Tempo',
    HELD: 'Ditahan',
    REFUNDED: 'Dikembalikan',
    PARTIALLY_REFUNDED: 'Sebagian Dikembalikan',
    FORFEITED: 'Hangus',
    SUCCESS: 'Sukses',
    WARNING: 'Perhatian',
    DANGER: 'Bahaya',
    INFO: 'Info',
    SECONDARY: 'Info',
    GOOD: 'Baik',
    DAMAGED: 'Rusak',
    MISSING: 'Hilang',
    COUNTDOWN_7PLUS: 'H-7+',
    COUNTDOWN_3_6: 'H-3–6',
    COUNTDOWN_1_2: 'H-1–2',
    COUNTDOWN_0: 'Hari Ini',
    COUNTDOWN_OVERDUE: 'Terlambat',
    COUNTDOWN_NODATE: 'Tanpa Tanggal',
    MONTHLY: 'Bulanan',
    WEEKLY: 'Mingguan',
    BIWEEKLY: 'Dua Mingguan',
    DAILY: 'Harian',
    YEARLY: 'Tahunan',
    SEMESTERLY: 'Semester',
    SMESTERLY: 'Semester',
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
    OPEN: 'Dibuka',
    IN_PROGRESS: 'Dalam Proses',
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
    PENDING_REVIEW: 'Menunggu Review',
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
    EXPIRED: 'Kadaluarsa',
  };

  if (normalized === 'INACTIVE') return labels.INACTIVE;
  if (normalized === 'INACTIVE_ROOM') return labels.INACTIVE_ROOM;
  return labels[normalized] ?? status ?? '-';
}

export function getStatusVariant(status?: string): 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'primary' | 'dark' {
  const normalized = String(status ?? '').toUpperCase();

  if (['ACTIVE', 'AVAILABLE', 'PAID', 'SUCCESS', 'GOOD', 'REFUNDED', 'RESOLVED', 'DONE', 'APPROVED'].includes(normalized)) return 'success';
  if (['PARTIAL', 'WARNING', 'HELD', 'COUNTDOWN_7PLUS', 'COUNTDOWN_3_6', 'RESERVED', 'PENDING_REVIEW'].includes(normalized)) return 'warning';
  if (['CANCELLED', 'OVERDUE', 'DANGER', 'FORFEITED', 'COUNTDOWN_1_2', 'COUNTDOWN_0', 'COUNTDOWN_OVERDUE', 'REJECTED'].includes(normalized)) return 'danger';
  if (['COMPLETED', 'ISSUED', 'INFO', 'OCCUPIED', 'PARTIALLY_REFUNDED', 'IN_PROGRESS'].includes(normalized)) return 'info';
  if (['DRAFT', 'SECONDARY', 'INACTIVE', 'MAINTENANCE', 'UNAVAILABLE', 'COUNTDOWN_NODATE', 'EXPIRED'].includes(normalized)) return 'secondary';
  if (['MISSING'].includes(normalized)) return 'dark';
  return 'secondary';
}
