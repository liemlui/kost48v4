import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../../api/invoices', () => ({
  listInvoices: vi.fn(),
  getInvoiceById: vi.fn(),
  createInvoice: vi.fn(),
  createInvoiceWithLinesAndIssue: vi.fn(),
  addInvoiceLine: vi.fn(),
  issueInvoice: vi.fn(),
  cancelInvoice: vi.fn(),
}));

import { listInvoices, getInvoiceById } from '../../api/invoices';
import { useInvoices, useInvoice } from '../../hooks/useInvoices';

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Y-N2 — TanStack Query hooks (useInvoices)', () => {
  it('stayId valid → memanggil listInvoices dgn param benar', async () => {
    (listInvoices as any).mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const { result } = renderHook(() => useInvoices(7), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listInvoices).toHaveBeenCalledWith({ stayId: 7, limit: 100 });
    expect(result.current.data).toHaveLength(2);
  });

  it('stayId invalid ("undefined") → query disabled, tidak fetch', async () => {
    const { result } = renderHook(() => useInvoices('undefined'), { wrapper: wrapper() });
    // enabled=false → tetap idle, tidak memanggil api
    await new Promise((r) => setTimeout(r, 30));
    expect(listInvoices).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('mengekspos mutation objek', () => {
    const { result } = renderHook(() => useInvoices(3), { wrapper: wrapper() });
    expect(result.current.createMutation).toBeTruthy();
    expect(result.current.issueMutation).toBeTruthy();
    expect(result.current.cancelMutation).toBeTruthy();
  });
});

describe('Y-N2 — useInvoice (single, cache key)', () => {
  it('id ada → fetch by id', async () => {
    (getInvoiceById as any).mockResolvedValue({ id: 42 });
    const { result } = renderHook(() => useInvoice(42), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getInvoiceById).toHaveBeenCalledWith(42);
    expect(result.current.data).toEqual({ id: 42 });
  });

  it('id undefined → disabled, tidak fetch', async () => {
    const { result } = renderHook(() => useInvoice(undefined), { wrapper: wrapper() });
    await new Promise((r) => setTimeout(r, 30));
    expect(getInvoiceById).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});
