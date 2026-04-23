/**
 * Fungsi aman untuk memformat tanggal
 * Handle: string, Date object, null, undefined
 * Format: DD/MM/YYYY (Indonesia)
 */
export function formatDateSafe(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '-';
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    // Validasi tanggal
    if (isNaN(date.getTime())) return '-';
    
    // Format ke Indonesia: DD/MM/YYYY
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
}

/**
 * Format period range dari dua tanggal
 * Contoh: "01 Apr 2026 - 30 Apr 2026"
 */
export function formatPeriod(periodStart: string | Date | null | undefined, periodEnd: string | Date | null | undefined): string {
  const start = formatDateSafe(periodStart);
  const end = formatDateSafe(periodEnd);
  
  if (start === '-' && end === '-') return '-';
  if (start === '-') return `? - ${end}`;
  if (end === '-') return `${start} - ?`;
  return `${start} - ${end}`;
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
 * Normalisasi data untuk field type="date" sebelum dikirim ke backend
 * - Hanya ambil field yang ada di config.fields
 * - Konversi YYYY-MM-DD dari input ke string yang sama
 * - Empty string dihapus dari payload
 */
export function normalizeFormDataForSubmit(formState: Record<string, any>, fields: any[]): Record<string, any> {
  const payload: Record<string, any> = {};
  
  fields.forEach((field) => {
    const value = formState[field.name];
    
    // Skip field yang undefined atau null (biarkan backend handle default)
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
 * Fungsi untuk menghitung status countdown berdasarkan tanggal due/check-out
 * @param dueDate Tanggal due/check-out (string atau Date)
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
    acc[field.name] = field.type === 'checkbox' ? false : '';
    return acc;
  }, {} as Record<string, any>);
}
