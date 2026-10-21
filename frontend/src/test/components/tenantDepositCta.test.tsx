import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import DepositRulesCard from '../../components/tenant/DepositRulesCard';
import TenantCheckoutCta from '../../components/tenant/TenantCheckoutCta';
import CheckoutRequestModal from '../../components/checkout-requests/CheckoutRequestModal';
import type { Stay } from '../../types';

vi.mock('../../api/settings', () => ({
  fetchPublicConfig: vi.fn().mockResolvedValue({ petDepositRupiah: 150000 }),
}));

const stay = {
  id: 7,
  tenantId: 1,
  roomId: 3,
  status: 'ACTIVE',
  depositAmountRupiah: 650000,
  room: { id: 3, code: 'A1', monthlyRateRupiah: 1000000, defaultDepositRupiah: 650000 },
} as unknown as Stay;

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Kartu deposit & CTA checkout (W-TNT-001)', () => {
  it('kartu deposit memakai nominal kamar + deposit hewan dari konteks', () => {
    renderWithRouter(
      <DepositRulesCard roomCode="A1" roomDepositRupiah={650000} petDepositRupiah={150000} />,
    );

    expect(screen.getByText(/Deposit jaminan — kamar A1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/650\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/150\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Refundable/i)).toBeInTheDocument();
    expect(screen.getByText(/termasuk sewa dan utilitas/i)).toBeInTheDocument();
  });

  it('kartu deposit tidak mengarang nominal bila data kamar belum ada', () => {
    renderWithRouter(<DepositRulesCard petDepositRupiah={100000} />);
    expect(screen.getAllByText(/mengikuti kamar yang dipilih/i).length).toBeGreaterThan(0);
  });

  it('CTA checkout memakai warna berbeda dan menyebut konsekuensi overstay', () => {
    const onCheckout = vi.fn();
    renderWithRouter(<TenantCheckoutCta canCheckout onCheckout={onCheckout} />);

    const button = screen.getByRole('button', { name: /Ajukan Keluar/i });
    expect(button.className).toContain('btn-warning');
    expect(screen.getByText(/12\.00 WIB di hari-H/i)).toBeInTheDocument();
    expect(screen.getByText(/12\.00 WIB keesokan harinya \(H\+1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/menjadi piutang/i)).toBeInTheDocument();
  });

  it('CTA checkout nonaktif menampilkan alasan', () => {
    renderWithRouter(
      <TenantCheckoutCta canCheckout={false} disabledReason="Selesaikan tagihan aktif dulu." onCheckout={() => {}} />,
    );

    expect(screen.getByRole('button', { name: /Ajukan Keluar/i })).toBeDisabled();
    expect(screen.getByText('Selesaikan tagihan aktif dulu.')).toBeInTheDocument();
  });

  it('modal pengajuan keluar menampilkan kartu deposit kamar', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <CheckoutRequestModal show onHide={() => {}} onSuccess={() => {}} stay={stay} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Deposit jaminan — kamar A1/i)).toBeInTheDocument();
    expect(screen.getAllByText(/650\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/kamar dilepas pukul 12\.00 WIB/i)).toBeInTheDocument();
  });
});
