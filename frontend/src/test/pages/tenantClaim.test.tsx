// S8 — alur klaim pengajuan tamu di portal (`POST /tenant/bookings/claim`, kontrak S7).
//
// Yang dibuktikan test ini:
// 1. Tombol "Klaim pengajuan" memanggil endpoint klaim **apa adanya** (tanpa parameter kontak
//    tambahan — kontak diambil server dari akun yang login).
// 2. Klaim gagal (409) menampilkan **pesan seragam server apa adanya** + jalan keluar admin
//    (tautan WhatsApp), bukan layar kosong dan bukan pesan karangan baru.
// 3. Klaim berhasil menampilkan kode pengajuan `K48-…` dan mengarahkan ke langkah bayar DP.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../api/bookings', () => ({
  listMyTenantBookings: vi.fn(),
  cancelTenantBooking: vi.fn(),
  claimGuestBookings: vi.fn(),
}));
vi.mock('../../api/paymentSubmissions', () => ({
  listMyPaymentSubmissions: vi.fn(),
  submitPaymentWithProof: vi.fn(),
}));
vi.mock('../../api/resources', () => ({ getResource: vi.fn() }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 42,
      fullName: 'Calon Penghuni',
      email: 'calon@example.com',
      role: 'TENANT',
      tenantId: null,
      isActive: true,
    },
    token: 'test-token',
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshMe: vi.fn(),
  }),
}));
vi.mock('../../hooks/useTenantPortalStage', () => ({
  useTenantPortalStage: () => ({
    stage: 'browsing',
    isLoading: false,
    hasStayHistory: false,
    stageName: 'Calon penghuni',
    isCandidate: true,
    refetch: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { claimGuestBookings, listMyTenantBookings } from '../../api/bookings';
import { listMyPaymentSubmissions } from '../../api/paymentSubmissions';
import { getResource } from '../../api/resources';
import MyBookingsPage from '../../pages/portal/MyBookingsPage';

// Pesan seragam backend (`GUEST_CLAIM_UNIFORM_MESSAGE`) — disalin dari
// `backend/src/modules/tenant-bookings/tenant-bookings.helpers.ts`.
const UNIFORM_MESSAGE =
  'Pengajuan tidak dapat diklaim dengan akun ini. Pastikan email/nomor HP akun sama dengan yang dipakai saat mengajukan, atau hubungi admin KOST48 dengan menyebut kode pengajuan.';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/portal/bookings']}>
        <MyBookingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  (listMyTenantBookings as any).mockResolvedValue({ items: [], meta: {} });
  (listMyPaymentSubmissions as any).mockResolvedValue({ items: [], meta: {} });
  (getResource as any).mockRejectedValue({ response: { status: 404 } });
});

describe('S8 — klaim pengajuan tamu di portal', () => {
  it('menampilkan panel klaim dengan penjelasan akun wajib dan tombol klaim', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /Klaim pengajuan tamu/i })).toBeInTheDocument();
    expect(screen.getByText(/sama persis/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Klaim pengajuan$/i })).toBeInTheDocument();
  });

  it('memanggil endpoint klaim tanpa parameter tambahan', async () => {
    (claimGuestBookings as any).mockResolvedValue({ alreadyClaimed: false, tenantId: 9, claimed: [] });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /^Klaim pengajuan$/i }));

    await waitFor(() => expect(claimGuestBookings).toHaveBeenCalledTimes(1));
    expect(claimGuestBookings).toHaveBeenCalledWith();
  });

  it('klaim gagal menampilkan pesan seragam apa adanya + jalan keluar admin', async () => {
    (claimGuestBookings as any).mockRejectedValue({
      response: { status: 409, data: { message: UNIFORM_MESSAGE } },
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /^Klaim pengajuan$/i }));

    expect(await screen.findByText(UNIFORM_MESSAGE)).toBeInTheDocument();
    // Tidak ada pesan tambahan yang membocorkan sebab (0/1/lebih kandidat).
    expect(screen.queryByText(/tidak ditemukan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/lebih dari satu/i)).not.toBeInTheDocument();

    const adminLink = screen.getByRole('link', { name: /Hubungi admin KOST48/i });
    expect(adminLink).toHaveAttribute('href', expect.stringContaining('wa.me'));
  });

  it('klaim berhasil menampilkan kode pengajuan dan langkah bayar DP', async () => {
    (claimGuestBookings as any).mockResolvedValue({
      alreadyClaimed: false,
      tenantId: 9,
      claimed: [
        { stayId: 5, referenceCode: 'K48-0005-A', roomCode: 'F', status: 'ACTIVE' },
      ],
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /^Klaim pengajuan$/i }));

    expect(await screen.findByText('K48-0005-A')).toBeInTheDocument();
    expect(screen.getByText(/Kmr F/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lanjut kirim bukti DP/i })).toHaveAttribute(
      'href',
      '#tenant-booking-list',
    );
  });

  it('klaim yang sudah pernah dilakukan tidak mengubah apa pun (alreadyClaimed)', async () => {
    (claimGuestBookings as any).mockResolvedValue({ alreadyClaimed: true, tenantId: 9, claimed: [] });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /^Klaim pengajuan$/i }));

    expect(await screen.findByText(/sudah terkait dengan akun ini/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Lanjut kirim bukti DP/i })).toBeInTheDocument();
  });
});
