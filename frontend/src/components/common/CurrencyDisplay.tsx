import React from 'react';
import { formatRupiah, formatRupiahWithoutSymbol } from '../../utils/formatCurrency';

interface CurrencyDisplayProps {
  amount: number | string | null | undefined;
  className?: string;
  showSymbol?: boolean;
  showZero?: boolean;
}

/**
 * Komponen untuk menampilkan nilai mata uang Rupiah dengan format yang konsisten
 * Contoh: Rp 1.500.000
 */
export default function CurrencyDisplay({ 
  amount, 
  className = '', 
  showSymbol = true,
  showZero = true 
}: CurrencyDisplayProps) {
  // Handle null/undefined
  if (amount === null || amount === undefined) {
    return <span className={className}>-</span>;
  }

  // Convert to number
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Handle NaN
  if (isNaN(num)) {
    return <span className={className}>-</span>;
  }

  // Handle zero
  if (num === 0 && !showZero) {
    return <span className={className}>-</span>;
  }

  // Use formatRupiah helper
  const display = showSymbol ? formatRupiah(num) : formatRupiahWithoutSymbol(num);
  
  return <span className={className}>{display}</span>;
}
