import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const mockStatus = vi.fn();
const mockBrief = vi.fn();

vi.mock('../../api/ai', () => ({
  getOwnerAiStatus: () => mockStatus(),
  generateBrief: () => mockBrief(),
}));

import CepatAiBrief from '../../components/cepat/CepatAiBrief';

function renderBrief() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CepatAiBrief />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AIDL-03 — panel AI Mode Cepat OWNER', () => {
  it('AI belum dikonfigurasi: tampil keterangan, tidak memanggil AI', async () => {
    mockStatus.mockResolvedValue({ configured: false, enabled: false, dailyRemaining: 0, dailyLimit: 20 });
    renderBrief();

    expect(await screen.findByText(/AI tidak aktif — API key belum diisi/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Minta rekomendasi AI/i })).not.toBeInTheDocument();
    expect(mockBrief).not.toHaveBeenCalled();
  });

  it('AI dimatikan di Pengaturan: kartu aturan tetap jadi jalur utama', async () => {
    mockStatus.mockResolvedValue({ configured: true, enabled: false, dailyRemaining: 20, dailyLimit: 20 });
    renderBrief();

    expect(await screen.findByText(/AI dimatikan di Pengaturan/i)).toBeInTheDocument();
    expect(mockBrief).not.toHaveBeenCalled();
  });

  it('AI aktif: tombol manual ada, tetapi membuka panel TIDAK memanggil AI', async () => {
    mockStatus.mockResolvedValue({ configured: true, enabled: true, dailyRemaining: 9, dailyLimit: 20 });
    renderBrief();

    expect(await screen.findByRole('button', { name: /Minta rekomendasi AI/i })).toBeInTheDocument();
    expect(screen.getByText(/Sisa kuota hari ini: 9\/20/)).toBeInTheDocument();
    expect(mockBrief).not.toHaveBeenCalled();
  });

  it('status AI gagal dibaca: tidak memblokir halaman dan tidak memanggil AI', async () => {
    mockStatus.mockRejectedValue(new Error('status tidak tersedia'));
    renderBrief();

    expect(await screen.findByText(/Status AI belum bisa dibaca/i, undefined, { timeout: 4000 })).toBeInTheDocument();
    expect(mockBrief).not.toHaveBeenCalled();
  });
});
