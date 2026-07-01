import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../../api/surveys', () => ({ getAllSurveys: vi.fn(), getSurveySummary: vi.fn() }));
import { getAllSurveys, getSurveySummary } from '../../api/surveys';
import AdminSurveysPage from '../../pages/admin/AdminSurveysPage';

function renderPage(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => vi.clearAllMocks());

describe('Y-P5 — AdminSurveysPage (admin integration)', () => {
  it('merender judul halaman', () => {
    (getAllSurveys as any).mockResolvedValue([]);
    (getSurveySummary as any).mockResolvedValue(null);
    renderPage(<AdminSurveysPage />);
    expect(screen.getByRole('heading', { name: /Survei Kepuasan Penghuni/i })).toBeInTheDocument();
  });

  it('empty state saat tidak ada survei', async () => {
    (getAllSurveys as any).mockResolvedValue([]);
    (getSurveySummary as any).mockResolvedValue(null);
    renderPage(<AdminSurveysPage />);
    expect(await screen.findByText('Belum ada survei')).toBeInTheDocument();
  });

  it('menampilkan baris survei dari API', async () => {
    (getAllSurveys as any).mockResolvedValue([
      { id: 1, overallRating: 5, wouldRecommend: true, createdAt: '2026-01-01T00:00:00Z', comment: 'Kamar bagus dan bersih' },
    ]);
    (getSurveySummary as any).mockResolvedValue(null);
    renderPage(<AdminSurveysPage />);
    expect(await screen.findByText('Kamar bagus dan bersih')).toBeInTheDocument();
  });
});
