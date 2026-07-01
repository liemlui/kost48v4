import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../../api/resources', () => ({ listResource: vi.fn() }));
import { listResource } from '../../api/resources';
import StaffWarehousePage from '../../pages/staff/StaffWarehousePage';

function renderPage(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => vi.clearAllMocks());

describe('Y-P4 — StaffWarehousePage (staff integration)', () => {
  it('merender hero gudang staff', () => {
    (listResource as any).mockResolvedValue({ items: [], total: 0 });
    renderPage(<StaffWarehousePage />);
    expect(screen.getByRole('heading', { name: /Barang Umum & Gudang/i })).toBeInTheDocument();
  });

  it('tetap merender walau data inventaris gagal dimuat', async () => {
    (listResource as any).mockRejectedValue(new Error('network'));
    renderPage(<StaffWarehousePage />);
    // hero statis tetap tampil meski section inventaris error
    expect(await screen.findByText('Gudang')).toBeInTheDocument();
  });
});
