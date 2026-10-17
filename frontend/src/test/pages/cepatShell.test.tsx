import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { AuthUser } from '../../types';

const mockLogout = vi.fn();
const mockAuth: { user: AuthUser | null; logout: () => void } = {
  user: null,
  logout: mockLogout,
};

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('../../hooks/useTenantPortalStage', () => ({
  useTenantPortalStage: () => ({
    stage: 'occupied',
    isLoading: false,
    hasStayHistory: true,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../pages/cepat/CepatHome', () => ({
  default: () => <div>Isi Mode Cepat</div>,
}));

import CepatShell from '../../pages/cepat/CepatShell';

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/cepat']}>
      <CepatShell />
      <LocationProbe />
    </MemoryRouter>,
  );
}

const owner: AuthUser = {
  id: 1,
  fullName: 'Owner KOST48',
  email: 'owner@kost48.test',
  role: 'OWNER',
  tenantId: null,
  isActive: true,
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockAuth.user = owner;
});

describe('AIDL-02 — saklar header shell Cepat', () => {
  it('merender shell tanpa AppLayout dan menampilkan isi Cepat', () => {
    renderShell();

    expect(screen.getByText('KOST48 · Mode Cepat')).toBeInTheDocument();
    expect(screen.getByText('Isi Mode Cepat')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Pilih mode tampilan/i })).toBeInTheDocument();
  });

  it('pindah ke Normal menyimpan pilihan dan tidak memanggil logout', async () => {
    renderShell();

    await userEvent.click(screen.getByRole('button', { name: 'Normal' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/owner-dashboard');
    expect(localStorage.getItem('kost48_mode:1')).toBe('normal');
    expect(localStorage.getItem('kost48_owner_density')).toBe('full');
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('STAFF yang pindah Normal mendarat di dashboard lama, bukan layar pilihan', async () => {
    mockAuth.user = { ...owner, id: 9, role: 'STAFF' };
    renderShell();

    await userEvent.click(screen.getByRole('button', { name: 'Normal' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
    expect(localStorage.getItem('kost48_mode:9')).toBe('normal');
    // STAFF tidak punya saklar lama; `admin-density` milik ADMIN dan tidak boleh ditulis.
    expect(localStorage.getItem('admin-density')).toBeNull();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('menekan Cepat saat sudah di Cepat tidak berpindah dan tidak logout', async () => {
    renderShell();

    await userEvent.click(screen.getByRole('button', { name: 'Cepat' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/cepat');
    expect(localStorage.getItem('kost48_mode:1')).toBeNull();
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
