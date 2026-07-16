// FILE: BreadcrumbContext.tsx — context untuk breadcrumb label dari halaman detail
import { createContext, useContext, useState, type ReactNode } from 'react';

type BreadcrumbContextValue = {
  breadcrumbLabel: string | null;
  setBreadcrumbLabel: (label: string | null) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  breadcrumbLabel: null,
  setBreadcrumbLabel: () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [breadcrumbLabel, setBreadcrumbLabel] = useState<string | null>(null);

  return (
    <BreadcrumbContext.Provider value={{ breadcrumbLabel, setBreadcrumbLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

/** Baca label breadcrumb dari halaman detail (jika disetel). */
export function useBreadcrumbLabel(): BreadcrumbContextValue {
  return useContext(BreadcrumbContext);
}
