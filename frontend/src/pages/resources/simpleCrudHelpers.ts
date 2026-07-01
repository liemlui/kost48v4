import { formatDateTimeWib } from '../../utils/dateTime';
import { buildReferenceOptions, type ReferenceOption } from './resourceRelations';

/**
 * Fungsi aman untuk memformat tanggal
 * Handle: string, Date object, null, undefined
 * Format: DD/MM/YYYY (Indonesia)
 */
export function formatDateSafe(dateValue: string | Date | null | undefined): string {
  return formatDateTimeWib(dateValue);
}

/**
 * Format period range. periodStart = mulai sewa, periodEnd = tanggal renew/keluar (exclusive).
 * Contoh: "01/09/2026 - sebelum 01/12/2026"
 */
export function formatPeriod(periodStart: string | Date | null | undefined, periodEnd: string | Date | null | undefined): string {
  const start = formatDateSafe(periodStart);
  const end = formatDateSafe(periodEnd);
  
  if (start === '-' && end === '-') return '-';
  if (start === '-') return `? - ${end}`;
  if (end === '-') return `${start} - ?`;
  return `${start} - sebelum ${end}`;
}

export function formatValue(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

/**
 * Format ISO date string ke YYYY-MM-DD untuk input type="date"
 */
export function formatDateForInput(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '';
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return '';
    
    // Format ke YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Normalisasi data untuk field type="date" sebelum dikirim ke sistem
 * - Hanya ambil field yang ada di config.fields
 * - Konversi YYYY-MM-DD dari input ke string yang sama
 * - Empty string dihapus dari payload
 */
export function normalizeFormDataForSubmit(formState: Record<string, any>, fields: any[]): Record<string, any> {
  const payload: Record<string, any> = {};
  
  fields.forEach((field) => {
    const value = formState[field.name];
    
    // Skip field yang undefined atau null (biarkan sistem mengisi default)
    if (value === undefined || value === null) {
      return;
    }
    
    // Untuk field type="date", kirim sebagai YYYY-MM-DD
    if (field.type === 'date' && value !== '') {
      // Validasi format YYYY-MM-DD sudah dari input
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        payload[field.name] = value;
      }
    }
    // Untuk field lain, hanya kirim jika bukan empty string
    else if (value !== '') {
      if (field.name === 'images') {
        if (Array.isArray(value)) {
          payload[field.name] = value.filter(Boolean);
        } else if (typeof value === 'string') {
          payload[field.name] = value
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        } else {
          payload[field.name] = value;
        }
      } else {
        payload[field.name] = value;
      }
    }
    // Empty string tidak dikirim (field dihapus dari payload)
  });
  
  return payload;
}

/**
 * Fungsi untuk menghitung status countdown berdasarkan tanggal due/renew-keluar
 * @param dueDate Tanggal due/renew-keluar (string atau Date)
 * @param checkInDate Tanggal check-in sebagai fallback (string atau Date)
 * @returns Object dengan status countdown dan label
 */
export function getCountdownStatus(dueDate: string | Date | null | undefined, checkInDate: string | Date | null | undefined) {
  // Jika tidak ada tanggal sama sekali
  if (!dueDate && !checkInDate) {
    return { status: 'COUNTDOWN_NODATE' as const, label: 'No date', days: null };
  }
  
  // Tentukan tanggal target: dueDate prioritas pertama, checkInDate + 30 hari sebagai fallback
  let targetDate: Date | null = null;
  
  if (dueDate) {
    targetDate = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  } else if (checkInDate) {
    const checkIn = typeof checkInDate === 'string' ? new Date(checkInDate) : checkInDate;
    targetDate = new Date(checkIn);
    targetDate.setDate(targetDate.getDate() + 30); // Default 30 hari dari check-in
  }
  
  // Validasi tanggal
  if (!targetDate || isNaN(targetDate.getTime())) {
    return { status: 'COUNTDOWN_NODATE' as const, label: 'Invalid date', days: null };
  }
  
  // Hitung selisih hari dari hari ini
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Tentukan status berdasarkan selisih hari
  if (diffDays > 7) {
    return { status: 'COUNTDOWN_7PLUS' as const, label: `${diffDays} days`, days: diffDays };
  } else if (diffDays >= 3 && diffDays <= 6) {
    return { status: 'COUNTDOWN_3_6' as const, label: `${diffDays} days`, days: diffDays };
  } else if (diffDays === 1 || diffDays === 2) {
    return { status: 'COUNTDOWN_1_2' as const, label: `${diffDays} days`, days: diffDays };
  } else if (diffDays === 0) {
    return { status: 'COUNTDOWN_0' as const, label: 'Due today', days: 0 };
  } else if (diffDays < 0) {
    return { status: 'COUNTDOWN_OVERDUE' as const, label: `${Math.abs(diffDays)} days overdue`, days: diffDays };
  }
  
  // Fallback
  return { status: 'COUNTDOWN_NODATE' as const, label: 'Unknown', days: diffDays };
}

export function buildInitialState(config: { fields: Array<{ name: string; type: string }> }) {
  return config.fields.reduce((acc: Record<string, any>, field) => {
    if (field.type === 'checkbox') {
      acc[field.name] = field.name === 'isActive' ? true : false;
    } else {
      acc[field.name] = field.name === 'images' ? [] : '';
    }
    return acc;
  }, {} as Record<string, any>);
}

export function asString(value: unknown) {
  return String(value ?? '').toUpperCase();
}

export function getNested(item: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, item);
}

export function isLowStock(item: Record<string, unknown>) {
  const qty = Number(item.qtyOnHand ?? 0);
  const min = Number(item.minQty ?? 0);
  return min > 0 && qty <= min;
}

export function movementTypeLabel(value: unknown) {
  switch (String(value ?? '')) {
    case 'IN': return 'Barang Masuk';
    case 'OUT': return 'Barang Keluar';
    case 'ASSIGN_TO_ROOM': return 'Pasang ke Kamar';
    case 'RETURN_FROM_ROOM': return 'Kembali dari Kamar';
    default: return String(value ?? '-');
  }
}

export function movementEffectLabel(value: unknown) {
  switch (String(value ?? '')) {
    case 'IN':
    case 'RETURN_FROM_ROOM':
      return 'Stok gudang bertambah otomatis';
    case 'OUT':
      return 'Stok gudang berkurang otomatis';
    case 'ASSIGN_TO_ROOM':
      return 'Stok gudang berkurang dan barang kamar bertambah otomatis';
    default:
      return 'Stok resmi berubah otomatis';
  }
}

export function todayInputDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function automatedMovementNote(type: string) {
  switch (type) {
    case 'ASSIGN_TO_ROOM': return 'Pasang barang ke kamar dari stok gudang';
    case 'RETURN_FROM_ROOM': return 'Kembalikan barang dari kamar ke gudang';
    case 'OUT': return 'Barang keluar dari stok gudang';
    case 'IN': return 'Barang masuk ke stok gudang';
    default: return 'Mutasi stok otomatis dari konteks halaman';
  }
}

export function getResourceFilterDefinitions(configPath: string, items: Array<Record<string, unknown>>, totalItems?: number) {
  const count = (predicate: (item: Record<string, unknown>) => boolean) => items.filter(predicate).length;
  const statusCount = (status: string) => count((item) => asString(item.status) === status);
  const movementCount = (type: string) => count((item) => asString(item.movementType) === type);
  const publishedCount = (value: boolean) => count((item) => Boolean(item.isPublished) === value);
  const activeCount = (value: boolean) => count((item) => Boolean(item.isActive) === value);

  if (configPath === '/tenants') return [
    { id: 'ALL', label: 'Semua Tenant', count: totalItems ?? items.length, tone: 'info' as const },
    { id: 'ACTIVE', label: 'Aktif', count: activeCount(true), tone: 'success' as const },
    { id: 'WITH_STAY', label: 'Ada Masa Sewa', count: count((item) => Boolean(item.activeStayId || item.currentStay)), tone: 'success' as const },
    { id: 'NO_STAY', label: 'Belum Menempati', count: count((item) => !item.activeStayId && !item.currentStay), tone: 'warning' as const },
    { id: 'PORTAL_ACTIVE', label: 'Portal Aktif', count: count((item) => Boolean(getNested(item, 'portalUserSummary.portalIsActive'))), tone: 'info' as const },
  ];
  if (configPath === '/rooms') return [
    { id: 'ALL', label: 'Semua Kamar', count: totalItems ?? items.length, tone: 'info' as const },
    { id: 'AVAILABLE', label: 'Tersedia', count: statusCount('AVAILABLE'), tone: 'success' as const },
    { id: 'OCCUPIED', label: 'Terisi', count: statusCount('OCCUPIED'), tone: 'info' as const },
    { id: 'RESERVED', label: 'Dipesan', count: statusCount('RESERVED'), tone: 'warning' as const },
    { id: 'MAINTENANCE', label: 'Perlu Cek', count: count((item) => ['MAINTENANCE', 'INACTIVE'].includes(asString(item.status))), tone: 'danger' as const },
  ];
  if (configPath === '/room-items') return [
    { id: 'ALL', label: 'Semua Barang', count: totalItems ?? items.length, tone: 'info' as const },
    { id: 'GOOD', label: 'Baik', count: statusCount('GOOD'), tone: 'success' as const },
    { id: 'MAINTENANCE', label: 'Perlu Dicek', count: statusCount('MAINTENANCE'), tone: 'warning' as const },
    { id: 'DAMAGED', label: 'Rusak', count: statusCount('DAMAGED'), tone: 'danger' as const },
    { id: 'MISSING', label: 'Hilang', count: statusCount('MISSING'), tone: 'danger' as const },
  ];
  if (configPath === '/inventory-items') return [
    { id: 'ALL', label: 'Semua Stok', count: totalItems ?? items.length, tone: 'info' as const },
    { id: 'LOW_AUTO', label: 'Stok Menipis', count: count(isLowStock), tone: 'warning' as const },
    { id: 'OUT_OF_STOCK', label: 'Habis', count: count((item) => Number(item.qtyOnHand ?? 0) <= 0), tone: 'danger' as const },
    { id: 'GOOD', label: 'Aman', count: count((item) => asString(item.status) === 'GOOD' && !isLowStock(item)), tone: 'success' as const },
    { id: 'DAMAGED', label: 'Rusak', count: statusCount('DAMAGED'), tone: 'danger' as const },
  ];
  if (configPath === '/inventory-movements') return [
    { id: 'ALL', label: 'Semua Mutasi', count: totalItems ?? items.length, tone: 'info' as const },
    { id: 'IN', label: 'Masuk', count: movementCount('IN'), tone: 'success' as const },
    { id: 'OUT', label: 'Keluar', count: movementCount('OUT'), tone: 'warning' as const },
    { id: 'ASSIGN_TO_ROOM', label: 'Pasang ke Kamar', count: movementCount('ASSIGN_TO_ROOM'), tone: 'info' as const },
    { id: 'RETURN_FROM_ROOM', label: 'Kembali', count: movementCount('RETURN_FROM_ROOM'), tone: 'neutral' as const },
  ];
  if (configPath === '/announcements') return [
    { id: 'ALL', label: 'Semua', count: totalItems ?? items.length, tone: 'info' as const },
    { id: 'PUBLISHED', label: 'Published', count: publishedCount(true), tone: 'success' as const },
    { id: 'DRAFT', label: 'Draft', count: publishedCount(false), tone: 'warning' as const },
    { id: 'PINNED', label: 'Pinned', count: count((item) => Boolean(item.isPinned)), tone: 'info' as const },
  ];
  if (configPath === '/expenses') return [
    { id: 'ALL', label: 'Semua Biaya', count: totalItems ?? items.length, tone: 'info' as const },
    { id: 'DRAFT', label: 'Perlu Konfirmasi', count: count((item) => asString(item.status) === 'DRAFT'), tone: 'warning' as const },
    { id: 'CONFIRMED', label: 'Terkonfirmasi', count: count((item) => asString(item.status) === 'CONFIRMED'), tone: 'success' as const },
    { id: 'CANCELLED', label: 'Dibatalkan', count: count((item) => asString(item.status) === 'CANCELLED'), tone: 'neutral' as const },
    { id: 'FIXED', label: 'Tetap', count: count((item) => asString(item.type) === 'FIXED'), tone: 'info' as const },
    { id: 'VARIABLE', label: 'Variabel', count: count((item) => asString(item.type) === 'VARIABLE'), tone: 'warning' as const },
    { id: 'MAINTENANCE', label: 'Perawatan', count: count((item) => asString(item.category) === 'MAINTENANCE'), tone: 'warning' as const },
    { id: 'COGS_SERVICE', label: 'COGS Layanan', count: count((item) => ['INTERNET', 'CLEANING', 'SUPPLIES'].includes(asString(item.category))), tone: 'info' as const },
    { id: 'ADMIN_COST', label: 'Admin/Platform', count: count((item) => ['TAX', 'MARKETING', 'OTHER'].includes(asString(item.category))), tone: 'neutral' as const },
  ];
  if (configPath === '/wifi-sales') return [
    { id: 'ALL', label: 'Semua Voucher', count: totalItems ?? items.length, tone: 'info' as const },
    { id: 'DAILY', label: 'Harian', count: count((item) => String(item.packageName ?? '').toLowerCase().includes('hari')), tone: 'success' as const },
    { id: 'WEEKLY', label: 'Mingguan', count: count((item) => String(item.packageName ?? '').toLowerCase().includes('minggu')), tone: 'info' as const },
    { id: 'MONTHLY', label: 'Bulanan', count: count((item) => String(item.packageName ?? '').toLowerCase().includes('bulan')), tone: 'warning' as const },
  ];
  return [];
}

export function applyResourceFilter(configPath: string, item: Record<string, unknown>, filter: string) {
  if (filter === 'ALL') return true;
  if (configPath === '/tenants') {
    if (filter === 'ACTIVE') return item.isActive !== false;
    if (filter === 'WITH_STAY') return Boolean(item.activeStayId || item.currentStay);
    if (filter === 'NO_STAY') return !item.activeStayId && !item.currentStay;
    if (filter === 'PORTAL_ACTIVE') return Boolean(getNested(item, 'portalUserSummary.portalIsActive'));
  }
  if (configPath === '/rooms') {
    if (filter === 'MAINTENANCE') return ['MAINTENANCE', 'INACTIVE'].includes(asString(item.status));
    return asString(item.status) === filter;
  }
  if (configPath === '/room-items') return asString(item.status) === filter;
  if (configPath === '/inventory-items') {
    if (filter === 'LOW_AUTO') return isLowStock(item);
    if (filter === 'GOOD') return asString(item.status) === 'GOOD' && !isLowStock(item);
    if (filter === 'OUT_OF_STOCK') return Number(item.qtyOnHand ?? 0) <= 0;
    return asString(item.status) === filter;
  }
  if (configPath === '/inventory-movements') return asString(item.movementType) === filter;
  if (configPath === '/announcements') {
    if (filter === 'PUBLISHED') return Boolean(item.isPublished);
    if (filter === 'DRAFT') return !item.isPublished;
    if (filter === 'PINNED') return Boolean(item.isPinned);
  }
  if (configPath === '/expenses') {
    if (['DRAFT', 'CONFIRMED', 'CANCELLED'].includes(filter)) return asString(item.status) === filter;
    if (filter === 'MAINTENANCE') return asString(item.category) === 'MAINTENANCE';
    if (filter === 'COGS_SERVICE') return ['INTERNET', 'CLEANING', 'SUPPLIES'].includes(asString(item.category));
    if (filter === 'ADMIN_COST') return ['TAX', 'MARKETING', 'OTHER'].includes(asString(item.category));
    return asString(item.type) === filter;
  }
  if (configPath === '/wifi-sales') {
    const packageName = String(item.packageName ?? '').toLowerCase();
    if (filter === 'DAILY') return packageName.includes('hari');
    if (filter === 'WEEKLY') return packageName.includes('minggu');
    if (filter === 'MONTHLY') return packageName.includes('bulan');
  }
  return true;
}

export function mapReferenceData(items: Array<Record<string, unknown>> = [], sourcePath: string) {
  const options = buildReferenceOptions(items, sourcePath);
  const map = new Map<string, ReferenceOption>();
  options.forEach((option) => { map.set(String(option.value), option); });
  return { options, map };
}
