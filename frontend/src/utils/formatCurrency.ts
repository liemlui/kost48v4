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