import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockAuth = { login: mockLogin, logout: mockLogout, user: null as { id: number; role: string } | null, loading: false };
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

import LoginPage from '../../pages/auth/LoginPage';

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mockAuth.user = null;
  mockAuth.loading = false;
});

describe('Y-P2 — LoginPage (auth integration)', () => {
  it('merender form login (heading + tombol Masuk)', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Masuk ke Portal KOST48/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeInTheDocument();
  });

  it('sesi aktif tanpa preferensi diarahkan ke layar pilih-mode (OWNER)', async () => {
    mockAuth.user = { id: 1, role: 'OWNER' };
    renderPage();

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/pilih-mode'));
    expect(screen.queryByRole('button', { name: 'Masuk' })).not.toBeInTheDocument();
  });

  it('sesi aktif dengan preferensi tersimpan memakai mode itu', async () => {
    localStorage.setItem('kost48_mode:1', 'normal');
    mockAuth.user = { id: 1, role: 'OWNER' };
    renderPage();

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/owner-dashboard'));
  });

  it('submit kosong → validasi, login tidak dipanggil', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(await screen.findByText(/Masukkan email atau nomor HP/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('ganti ke tab Admin mengubah label identifier', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: /Admin \/ Operasional/i }));
    expect(screen.getByText('Email Admin / Staff')).toBeInTheDocument();
  });

  it('kredensial backoffice valid → memanggil login lalu ke pilih-mode', async () => {
    mockLogin.mockResolvedValue({ id: 1, role: 'OWNER' });
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: /Admin \/ Operasional/i }));
    await userEvent.type(screen.getByPlaceholderText('admin@kost48.com'), 'admin@kost48.com');
    await userEvent.type(screen.getByPlaceholderText('Masukkan password admin'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('admin@kost48.com', 'secret123'));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/pilih-mode'));
  });

  it('STAFF tanpa preferensi langsung ke Mode Cepat setelah login', async () => {
    mockLogin.mockResolvedValue({ id: 9, role: 'STAFF' });
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: /Admin \/ Operasional/i }));
    await userEvent.type(screen.getByPlaceholderText('admin@kost48.com'), 'staff@kost48.com');
    await userEvent.type(screen.getByPlaceholderText('Masukkan password admin'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/cepat'));
  });
});
