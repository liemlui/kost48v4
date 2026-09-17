import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../api/auth', () => ({ resetPassword: vi.fn() }));

import { resetPassword } from '../../api/auth';
import ResetPasswordPage from '../../pages/auth/ResetPasswordPage';

function renderPage(path = '/reset-password') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  it('menyamarkan token reset dan menandai password baru untuk password manager', () => {
    renderPage('/reset-password?token=secret-reset-token');

    expect(screen.getByLabelText('Token Reset')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Token Reset')).toHaveAttribute('autocomplete', 'off');
    expect(screen.getByLabelText('Password Baru')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('Konfirmasi Password Baru')).toHaveAttribute('autocomplete', 'new-password');
  });

  it('menolak submit tanpa token sebelum memanggil API', () => {
    renderPage();

    fireEvent.submit(screen.getByRole('button', { name: 'Simpan Password Baru' }).closest('form')!);

    expect(screen.getByText(/Token reset wajib diisi/i)).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });
});
