import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../../api/faqs', () => ({ fetchPublicFaqs: vi.fn() }));
vi.mock('../../api/settings', () => ({ fetchPublicConfig: vi.fn() }));
vi.mock('../../api/resources', () => ({ getResource: vi.fn(), listResource: vi.fn() }));
import { fetchPublicFaqs } from '../../api/faqs';
import { fetchPublicConfig } from '../../api/settings';
import { getResource } from '../../api/resources';
import MyManualPage from '../../pages/portal/MyManualPage';

function renderPage(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  (fetchPublicFaqs as any).mockResolvedValue([]);
  (fetchPublicConfig as any).mockResolvedValue({
    freeElectricityKwhPerMonth: 30,
    electricityTariffPerKwhRupiah: 2500,
    waterMeteringEnabled: false,
    wifiRupiah: 50000,
    galonRupiah: 20000,
    petDepositRupiah: 100000,
    extraOccupantFeePercent: 20,
    tenantLoyaltyEnabled: false,
    adminWhatsappNumber: '6285648887628',
  });
  (getResource as any).mockRejectedValue({ response: { status: 404 } });
});

describe('Y-P3 — MyManualPage (tenant portal integration)', () => {
  it('merender judul panduan', () => {
    renderPage(<MyManualPage />);
    expect(screen.getByRole('heading', { name: /Panduan & Aturan Kos/i })).toBeInTheDocument();
  });

  it('menampilkan tab Aturan Kos aktif saat FAQ kosong', () => {
    renderPage(<MyManualPage />);
    expect(screen.getByRole('button', { name: /📋 Aturan Kos/i })).toBeInTheDocument();
  });

  it('menampilkan 8 kategori aturan dari sumber tunggal', () => {
    renderPage(<MyManualPage />);
    for (const title of [
      'Hewan peliharaan',
      'Jumlah penghuni',
      'Bayar di muka',
      'Pembayaran & uang muka',
      'Lewat tanggal keluar',
      'Keluar (checkout)',
      'KTP & data pribadi',
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    // "Deposit jaminan" muncul di kartu deposit dan di judul kategori.
    expect(screen.getAllByText(/Deposit jaminan/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Aturan yang berlaku/i)).toBeInTheDocument();
  });

  it('kartu deposit memakai nominal kamar (bukan angka tetap) saat stay tersedia', async () => {
    (getResource as any).mockResolvedValue({
      id: 7,
      tenantId: 1,
      roomId: 3,
      status: 'ACTIVE',
      depositAmountRupiah: 650000,
      agreedRentAmountRupiah: 1000000,
      occupantCount: 2,
      room: { id: 3, code: 'A1', monthlyRateRupiah: 1000000, defaultDepositRupiah: 650000, roomSize: 'STANDARD' },
    });

    renderPage(<MyManualPage />);

    expect(await screen.findByText(/Deposit jaminan — kamar A1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/650\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Hitungan untukmu/i).length).toBeGreaterThan(0);
  });

  it('kartu deposit jujur saat tenant belum punya kamar', () => {
    renderPage(<MyManualPage />);
    expect(screen.getAllByText(/mengikuti kamar pilihanmu/i).length).toBeGreaterThan(0);
  });

  it('pencarian menyaring kategori', () => {
    renderPage(<MyManualPage />);
    const search = screen.getByLabelText(/Cari aturan/i);

    fireEvent.change(search, { target: { value: 'KTP' } });

    expect(screen.getByText('KTP & data pribadi')).toBeInTheDocument();
    expect(screen.queryByText('Hewan peliharaan')).not.toBeInTheDocument();
    expect(screen.getByText(/1 dari 8 kategori/i)).toBeInTheDocument();
  });

  it('tab Panduan Cepat membuka wizard 4 pertanyaan', () => {
    renderPage(<MyManualPage />);
    fireEvent.click(screen.getByText(/Panduan Cepat/i));

    const card = screen.getByText(/Pertanyaan 1 dari 4/i).closest('.card') as HTMLElement;
    expect(within(card).getByText(/Kamu sudah penghuni atau masih calon/i)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /Lewati, tampilkan semua aturan/i })).toBeInTheDocument();
  });

  it('menampilkan FAQ dari API saat tersedia', async () => {
    (fetchPublicFaqs as any).mockResolvedValue([
      { id: 1, category: 'Aturan', question: 'Jam malam berapa?', answer: 'Bebas, tetap sopan.', sortOrder: 1 },
    ]);
    renderPage(<MyManualPage />);
    expect(await screen.findByText('Jam malam berapa?')).toBeInTheDocument();
  });
});
