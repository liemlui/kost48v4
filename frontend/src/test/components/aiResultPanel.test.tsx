import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import AiResultPanel from '../../components/ai/AiResultPanel';

function withClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('Y-O6 — AiResultPanel (AI component)', () => {
  it('merender judul & konten anak', () => {
    withClient(
      <AiResultPanel title="Skor Kesehatan: 80/100">
        <p>Ringkasan eksekutif AI</p>
      </AiResultPanel>,
    );
    expect(screen.getByText('Skor Kesehatan: 80/100')).toBeInTheDocument();
    expect(screen.getByText('Ringkasan eksekutif AI')).toBeInTheDocument();
  });

  it('menampilkan badge mode & fallback', () => {
    withClient(
      <AiResultPanel title="T" mode="pro" fallback>
        <div>isi</div>
      </AiResultPanel>,
    );
    // 'pro' & 'rule fallback' muncul di badge header sekaligus di body → pakai getAllByText
    expect(screen.getAllByText('pro').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/rule fallback/i).length).toBeGreaterThanOrEqual(1);
  });

  it('menampilkan daftar warning', () => {
    withClient(
      <AiResultPanel title="T" warnings={['Data kurang lengkap']}>
        <div>isi</div>
      </AiResultPanel>,
    );
    expect(screen.getByText(/Data kurang lengkap/)).toBeInTheDocument();
  });

  it('confidence ditampilkan sebagai persen', () => {
    withClient(
      <AiResultPanel title="T" confidence={0.75}>
        <div>isi</div>
      </AiResultPanel>,
    );
    expect(screen.getByText(/Keyakinan: 75%/)).toBeInTheDocument();
  });
});
