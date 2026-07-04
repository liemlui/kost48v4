/**
 * Format angka ke format Rupiah Indonesia
 * Contoh: Rp 1.500.000
 */
export function formatRupiah(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '-';
  if (num === 0) return 'Rp 0';
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Format angka ke format Rupiah tanpa simbol
 * Contoh: 1.500.000
 */
export function formatRupiahWithoutSymbol(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '-';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '-';
  if (num === 0) return '0';
  
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Format angka ke notasi kompak (ribuan/jutaan/milyaran) dengan prefix Rp
 * Contoh: Rp 1,5 jt  |  Rp 750 rb  |  Rp 1,2 M
 * Untuk 0/null/undefined → '-'
 */
export function formatCompactRupiah(value: number | null | undefined): string {
  if (value == null) return '-';
  const safe = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (safe >= 1_000_000_000) return `${sign}Rp ${(safe / 1_000_000_000).toFixed(1)} M`;
  if (safe >= 1_000_000) return `${sign}Rp ${(safe / 1_000_000).toFixed(1)} jt`;
  if (safe >= 1_000) return `${sign}Rp ${(safe / 1_000).toFixed(0)} rb`;
  return `${sign}Rp ${safe.toLocaleString('id-ID')}`;
}