import React, { useState, useEffect, useCallback } from 'react';

/**
 * Input angka bertampilan pemisah ribuan Indonesia (1.700.000).
 * Owner-request 2026-07-04: SEMUA isian angka penting tampil jelas xxx.xxx.xxx,
 * dan bug "nol depan tidak bisa dihapus → 02000000" tidak boleh terjadi.
 *
 * Catatan perilaku:
 * - Nol di depan otomatis dibuang saat mengetik (parseInt + reformat).
 * - Field boleh dikosongkan; `onChange(undefined)` dikirim. Sinkronisasi dari
 *   prop `value` HANYA saat field tidak fokus — sehingga pemanggil yang
 *   memetakan `undefined → 0` tidak memaksa "0" kembali di tengah ketikan.
 */

interface CurrencyInputProps {
  value?: number | null;
  onChange: (val: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'lg';
  id?: string;
  name?: string;
  required?: boolean;
  isInvalid?: boolean;
  'aria-label'?: string;
  autoFocus?: boolean;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = '0',
  disabled = false,
  className = '',
  size,
  id,
  name,
  required = false,
  isInvalid = false,
  'aria-label': ariaLabel,
  autoFocus = false,
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [focused, setFocused] = useState(false);

  // Format number to Indonesian Rupiah
  const formatToRupiah = useCallback((num: number): string => {
    return new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }, []);

  // Parse Rupiah string to number
  const parseFromRupiah = useCallback((str: string): number | undefined => {
    const cleaned = str.replace(/\./g, '').replace(/,/g, '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : Math.round(num);
  }, []);

  // Sinkron display dari prop — hanya saat tidak sedang diketik (lihat catatan atas).
  useEffect(() => {
    if (focused) return;
    if (value === null || value === undefined || Number.isNaN(value)) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatToRupiah(value));
    }
  }, [value, focused, formatToRupiah]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    // Allow only numbers (leading zeros dibuang oleh parseInt + reformat)
    const cleaned = rawValue.replace(/[^\d]/g, '');

    if (cleaned === '') {
      setDisplayValue('');
      onChange(undefined);
      return;
    }

    // Parse to number
    const num = parseInt(cleaned, 10);
    if (isNaN(num)) {
      setDisplayValue('');
      onChange(undefined);
      return;
    }

    // Format for display
    const formatted = formatToRupiah(num);
    setDisplayValue(formatted);

    // Call onChange with numeric value
    onChange(num);
  };

  const handleBlur = () => {
    setFocused(false);
    if (displayValue === '') {
      onChange(undefined);
      return;
    }

    const parsed = parseFromRupiah(displayValue);
    if (parsed === undefined) {
      setDisplayValue('');
      onChange(undefined);
    } else {
      // Reformat to ensure consistency
      setDisplayValue(formatToRupiah(parsed));
    }
  };

  const sizeClass = size === 'sm' ? ' form-control-sm' : size === 'lg' ? ' form-control-lg' : '';
  const invalidClass = isInvalid ? ' is-invalid' : '';

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={`form-control${sizeClass}${invalidClass} ${className}`.trimEnd()}
      inputMode="numeric"
      id={id}
      name={name}
      required={required}
      aria-label={ariaLabel}
      autoFocus={autoFocus}
    />
  );
};

export default CurrencyInput;
