import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../../api/accounting', () => ({ fetchBalanceSheetDetail: vi.fn() }));
import { fetchBalanceSheetDetail } from '../../api/accounting';
import BalanceSheetPage from '../../pages/reports/BalanceSheetPage';

function renderPage(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const DETAIL = {
  current: {
    statement: { assetsRupiah: 1_000_000, liabilitiesRupiah: 400_000, equityRupiah: 600_000, balanced: true },
    lines: { assets: [], liabilities: [], equity: [] },
  },
  change: { assetsChangePercent: 5, liabilitiesChangePercent: -2, equityChangePercent: 3 },
  note: 'Data neraca',
};

beforeEach(() => vi.clearAllMocks());

describe('Y-P6 — BalanceSheetPage (owner finance integration)', () => {
  it('merender judul Neraca', () => {
    (fetchBalanceSheetDetail as any).mockResolvedValue(DETAIL);
    renderPage(<BalanceSheetPage />);
    expect(screen.getByRole('heading', { name: 'Neraca' })).toBeInTheDocument();
  });

  it('menampilkan KPI setelah data termuat', async () => {
    (fetchBalanceSheetDetail as any).mockResolvedValue(DETAIL);
    renderPage(<BalanceSheetPage />);
    // "Total Aset"/"Kewajiban"/"Ekuitas" muncul di KPI + baris total tabel → getAllByText
    expect((await screen.findAllByText('Total Aset')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Kewajiban').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Ekuitas').length).toBeGreaterThanOrEqual(1);
  });

  it('menampilkan pesan error saat gagal', async () => {
    (fetchBalanceSheetDetail as any).mockRejectedValue(new Error('boom'));
    renderPage(<BalanceSheetPage />);
    // halaman override retry:1 → beri waktu lebih utk backoff retry sebelum isError
    expect(await screen.findByText(/Gagal memuat data/i, {}, { timeout: 6000 })).toBeInTheDocument();
  });
});
