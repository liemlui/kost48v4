// S6 — bukti guard rute: penolakan peran/tahap memberi pesan lalu mengalihkan,
// tidak pernah berhenti di layar kosong atau spinner abadi.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AuthUser } from '../../types';

const mockToast = vi.fn();
const mockLogout = vi.fn();
const mockAuth: { user: AuthUser | null; token: string | null; loading: boolean; logout: () => void } = {
  user: null,
  token: null,
  loading: false,
  logout: mockLogout,
};
const mockStage: {
  stage: 'browsing' | 'booking' | 'occupied';
  isLoading: boolean;
  hasStayHistory: boolean;
} = {
  stage: 'browsing',
  isLoading: false,
  hasStayHistory: false,
};

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('../../components/common/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('../../hooks/useTenantPortalStage', () => ({
  useTenantPortalStage: () => ({
    stage: mockStage.stage,
    stageName: mockStage.stage,
    isCandidate: mockStage.stage !== 'occupied',
    isLoading: mockStage.isLoading,
    hasStayHistory: mockStage.hasStayHistory,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

import ProtectedRoute from '../../components/layout/ProtectedRoute';

const tenant: AuthUser = {
  id: 7,
  fullName: 'Penghuni Uji',
  email: 'tenant@kost48.test',
  role: 'TENANT',
  tenantId: 3,
  isActive: true,
};

const staff: AuthUser = {
  id: 8,
  fullName: 'Staf Uji',
  email: 'staff@kost48.test',
  role: 'STAFF',
  tenantId: null,
  isActive: true,
};

function renderGuard(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute allowRoles={['TENANT']} allowStages={['occupied']} />}>
          <Route path="/portal/stay" element={<div>ISI PORTAL PENGHUNI</div>} />
        </Route>
        <Route element={<ProtectedRoute allowRoles={['TENANT']} allowStages={['browsing', 'booking', 'occupied']} />}>
          <Route path="/portal/bookings" element={<div>ISI PENGAJUAN</div>} />
        </Route>
        <Route path="/rooms" element={<div>KATALOG KAMAR</div>} />
        <Route path="/dashboard" element={<div>DASHBOARD STAF</div>} />
        <Route path="/login" element={<div>HALAMAN MASUK</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.user = tenant;
  mockAuth.token = 'token-uji';
  mockAuth.loading = false;
  mockStage.stage = 'browsing';
  mockStage.isLoading = false;
});

describe('S6 — ProtectedRoute (allowRoles + allowStages)', () => {
  it('calon penghuni ditolak dari rute isi sewa, diberi pesan jelas, lalu dialihkan ke katalog', async () => {
    renderGuard('/portal/stay');

    expect(await screen.findByText('KATALOG KAMAR')).toBeInTheDocument();
    expect(screen.queryByText('ISI PORTAL PENGHUNI')).not.toBeInTheDocument();
    await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1));
    const [message, variant] = mockToast.mock.calls[0];
    expect(String(message)).toMatch(/sewa aktif/i);
    // Pesan menyebut jalan keluar, bukan hanya "dilarang".
    expect(String(message)).toMatch(/Lihat semua menu/);
    expect(variant).toBe('warning');
  });

  it('penghuni (occupied) boleh membuka rute isi sewa tanpa toast penolakan', async () => {
    mockStage.stage = 'occupied';
    renderGuard('/portal/stay');

    expect(await screen.findByText('ISI PORTAL PENGHUNI')).toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('calon penghuni tetap boleh membuka status pengajuan', async () => {
    renderGuard('/portal/bookings');

    expect(await screen.findByText('ISI PENGAJUAN')).toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('peran lain ditolak dengan pesan peran lalu dialihkan ke beranda peran itu', async () => {
    mockAuth.user = staff;
    renderGuard('/portal/bookings');

    expect(await screen.findByText('DASHBOARD STAF')).toBeInTheDocument();
    await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1));
    expect(String(mockToast.mock.calls[0][0])).toMatch(/akun penghuni/i);
  });

  it('selama tahap masih dimuat, guard menampilkan skeleton (bukan penolakan prematur)', async () => {
    mockStage.isLoading = true;
    renderGuard('/portal/stay');

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('KATALOG KAMAR')).not.toBeInTheDocument();
    expect(screen.queryByText('ISI PORTAL PENGHUNI')).not.toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('tanpa token, pengunjung dialihkan ke halaman masuk', async () => {
    mockAuth.user = null;
    mockAuth.token = null;
    renderGuard('/portal/bookings');

    expect(await screen.findByText('HALAMAN MASUK')).toBeInTheDocument();
  });
});
