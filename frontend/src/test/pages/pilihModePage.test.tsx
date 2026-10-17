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

import PilihModePage from '../../pages/cepat/PilihModePage';

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/pilih-mode']}>
      <PilihModePage />
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

describe('AIDL-02 — layar pilih-mode (OWNER/ADMIN)', () => {
  it('menampilkan dua pilihan mode untuk OWNER', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /Mau bekerja dengan cara apa hari ini/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mode Cepat/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mode Normal/i })).toBeInTheDocument();
  });

  it('memilih Cepat menyimpan pilihan per pengguna lalu pindah tanpa logout', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /Mode Cepat/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/cepat');
    expect(localStorage.getItem('kost48_mode:1')).toBe('cepat');
    expect(localStorage.getItem('kost48_owner_density')).toBe('compact');
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('memilih Normal memakai rute lama owner dan menyelaraskan saklar lama', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /Mode Normal/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/owner-dashboard');
    expect(localStorage.getItem('kost48_mode:1')).toBe('normal');
    expect(localStorage.getItem('kost48_owner_density')).toBe('full');
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('STAFF tidak melihat layar pilihan dan langsung ke Mode Cepat', () => {
    mockAuth.user = { ...owner, id: 9, role: 'STAFF' };
    renderPage();

    expect(screen.getByTestId('location')).toHaveTextContent('/cepat');
    expect(screen.queryByRole('heading', { name: /Mau bekerja dengan cara apa hari ini/i })).not.toBeInTheDocument();
  });
});
