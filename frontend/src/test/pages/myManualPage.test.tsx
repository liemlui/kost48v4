import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../../api/faqs', () => ({ fetchPublicFaqs: vi.fn() }));
import { fetchPublicFaqs } from '../../api/faqs';
import MyManualPage from '../../pages/portal/MyManualPage';

function renderPage(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => vi.clearAllMocks());

describe('Y-P3 — MyManualPage (tenant portal integration)', () => {
  it('merender judul panduan', () => {
    (fetchPublicFaqs as any).mockResolvedValue([]);
    renderPage(<MyManualPage />);
    expect(screen.getByRole('heading', { name: /Panduan & Aturan Kos/i })).toBeInTheDocument();
  });

  it('menampilkan tab Aturan Kos aktif saat FAQ kosong', async () => {
    (fetchPublicFaqs as any).mockResolvedValue([]);
    renderPage(<MyManualPage />);
    expect(screen.getByRole('button', { name: /📋 Aturan Kos/i })).toBeInTheDocument();
  });

  it('menampilkan FAQ dari API saat tersedia', async () => {
    (fetchPublicFaqs as any).mockResolvedValue([
      { id: 1, category: 'Aturan', question: 'Jam malam berapa?', answer: 'Bebas, tetap sopan.', sortOrder: 1 },
    ]);
    renderPage(<MyManualPage />);
    expect(await screen.findByText('Jam malam berapa?')).toBeInTheDocument();
  });
});
