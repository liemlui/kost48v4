import { useMemo, useRef } from 'react';
import AsyncSelect from 'react-select/async';

export type SelectOption<T = number | string> = {
  value: T;
  label: string;
  data?: unknown;
};

type Props<T = number | string> = {
  value: SelectOption<T> | null;
  onChange: (option: SelectOption<T> | null) => void;
  loadOptions: (inputValue: string) => Promise<SelectOption<T>[]>;
  placeholder?: string;
  isDisabled?: boolean;
  noOptionsMessage?: string;
  defaultOptions?: boolean | SelectOption<T>[];
};

export default function SearchableSelect<T = number | string>({
  value,
  onChange,
  loadOptions,
  placeholder,
  isDisabled,
  noOptionsMessage,
  defaultOptions,
}: Props<T>) {
  const timeoutRef = useRef<number | null>(null);

  const debouncedLoadOptions = useMemo(() => {
    return (inputValue: string) =>
      new Promise<SelectOption<T>[]>((resolve) => {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(async () => {
          const result = await loadOptions(inputValue);
          resolve(result);
        }, 300);
      });
  }, [loadOptions]);

  return (
    <AsyncSelect
      cacheOptions={false}
      defaultOptions={defaultOptions !== undefined ? defaultOptions : true}
      value={value as any}
      loadOptions={debouncedLoadOptions as any}
      onChange={(option) => onChange((option as SelectOption<T>) ?? null)}
      isDisabled={isDisabled}
      placeholder={placeholder ?? 'Cari data...'}
      noOptionsMessage={() => noOptionsMessage ?? 'Tidak ada pilihan'}
      classNamePrefix="react-select"
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      styles={{
        control: (base) => ({ ...base, minHeight: 38, borderColor: '#dee2e6', boxShadow: 'none' }),
        valueContainer: (base) => ({ ...base, paddingTop: 0, paddingBottom: 0 }),
        indicatorSeparator: (base) => ({ ...base, display: 'none' }),
        menu: (base) => ({ ...base, zIndex: 9999 }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
      }}
    />
  );
}
