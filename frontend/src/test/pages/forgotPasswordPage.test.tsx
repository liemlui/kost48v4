import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ forgotPassword: vi.fn() }));
vi.mock('../../api/auth', () => ({ forgotPassword: mocks.forgotPassword }));

import ForgotPasswordPage from '../../pages/auth/ForgotPasswordPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('ForgotPasswordPage', () => {
  it('menampilkan pesan netral dan tidak merender preview token yang tidak didukung backend', async () => {
    mocks.forgotPassword.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Alamat Email'), 'penghuni@example.com');
    await user.click(screen.getByRole('button', { name: 'Kirim Email Reset' }));

    expect(await screen.findByText('Permintaan diproses')).toBeInTheDocument();
    expect(screen.getByText(/Jika akun dengan email/i)).toBeInTheDocument();
    expect(screen.queryByText(/Email terkirim/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Token Reset \(Dev Preview\)/i)).not.toBeInTheDocument();
  });
});
