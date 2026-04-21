import React, { useState, useEffect, useCallback } from 'react';

interface CurrencyInputProps {
  value?: number | null;
  onChange: (val: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = '0',
  disabled = false,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState('');

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

  // Initialize display value from prop
  useEffect(() => {
    if (value === null || value === undefined) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatToRupiah(value));
    }
  }, [value, formatToRupiah]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Allow only numbers and dots
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

  return (
    <input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={`form-control ${className}`}
      inputMode="numeric"
    />
  );
};

export default CurrencyInput;