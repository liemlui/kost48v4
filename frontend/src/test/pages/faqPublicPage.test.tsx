import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

vi.mock('../../api/faqs', () => ({ fetchPublicFaqs: vi.fn() }));
import { fetchPublicFaqs } from '../../api/faqs';
import FaqPublicPage from '../../pages/public/FaqPublicPage';

function renderPage(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('Y-P1 — FaqPublicPage (public integration)', () => {
  it('merender heading panduan (konten statis selalu ada)', () => {
    (fetchPublicFaqs as any).mockResolvedValue([]);
    renderPage(<FaqPublicPage />);
    expect(screen.getByRole('heading', { name: /Panduan & FAQ KOST48/i })).toBeInTheDocument();
  });

  it('menampilkan FAQ dari API saat sukses', async () => {
    (fetchPublicFaqs as any).mockResolvedValue([
      { id: 1, category: 'Tarif', question: 'Berapa harga sewa?', answer: 'Mulai 1,5jt.', sortOrder: 1 },
    ]);
    renderPage(<FaqPublicPage />);
    expect(await screen.findByText('Berapa harga sewa?')).toBeInTheDocument();
  });

  it('fallback FAQ statis saat API error', async () => {
    (fetchPublicFaqs as any).mockRejectedValue(new Error('network'));
    renderPage(<FaqPublicPage />);
    expect(await screen.findByRole('heading', { name: /Pertanyaan Umum/i })).toBeInTheDocument();
  });
});
