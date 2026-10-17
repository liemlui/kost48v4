import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiRecommendationList from '../../components/cepat/AiRecommendationList';
import { toSafeAiPriorityActions } from '../../utils/aiRecommendationLinks';

function renderList(actions: Parameters<typeof toSafeAiPriorityActions>[0]) {
  return render(
    <MemoryRouter>
      <AiRecommendationList items={toSafeAiPriorityActions(actions)} />
    </MemoryRouter>,
  );
}

describe('AIDL-03 — daftar tautan rekomendasi AI', () => {
  it('rute yang lolos allowlist dirender sebagai tautan yang benar', () => {
    renderList([
      { title: 'Tagihan lewat tenggat', reason: '4 tagihan perlu follow-up.', severity: 'HIGH', route: '/invoices?status=PAID' },
    ]);

    const link = screen.getByRole('link', { name: /Buka halaman terkait/i });
    expect(link).toHaveAttribute('href', '/invoices?status=PAID');
  });

  it('rute asing tidak pernah menjadi tautan', () => {
    renderList([
      { title: 'Rute asing', reason: 'Tidak boleh diklik.', severity: 'CRITICAL', route: '/admin/rahasia' },
      { title: 'Skrip', reason: 'Tidak boleh diklik.', severity: 'CRITICAL', route: 'javascript:alert(1)' },
    ]);

    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.getAllByText('Tautan tidak tersedia')).toHaveLength(2);
  });

  it('daftar kosong menampilkan keterangan, bukan tautan', () => {
    renderList([]);

    expect(screen.getByText(/Tidak ada rekomendasi prioritas dari AI/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
