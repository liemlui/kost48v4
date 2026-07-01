import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockLogin = vi.fn();
const mockLogout = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, logout: mockLogout }),
}));

import LoginPage from '../../pages/auth/LoginPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('Y-P2 — LoginPage (auth integration)', () => {
  it('merender form login (heading + tombol Masuk)', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Masuk ke Portal KOST48/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Masuk' })).toBeInTheDocument();
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

  it('kredensial backoffice valid → memanggil login', async () => {
    mockLogin.mockResolvedValue({ role: 'OWNER' });
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: /Admin \/ Operasional/i }));
    await userEvent.type(screen.getByPlaceholderText('admin@kost48.com'), 'admin@kost48.com');
    await userEvent.type(screen.getByPlaceholderText('Masukkan password admin'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Masuk' }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('admin@kost48.com', 'secret123'));
  });
});
