import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  me: vi.fn(),
}));

import { login, me } from '../../api/auth';
import { AuthProvider, useAuth } from '../../context/AuthContext';

const USER = { id: 1, fullName: 'Owner Kost', email: 'owner@kost48.com', role: 'OWNER' } as any;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe('Y-N1 — useAuth (login state, role, token)', () => {
  it('tanpa token → unauthenticated setelah init', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('login → menyimpan token, set user & role', async () => {
    (login as any).mockResolvedValue({ accessToken: 'tok-123', user: USER });
    (me as any).mockResolvedValue(USER);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login('owner@kost48.com', 'password');
    });

    expect(login).toHaveBeenCalledWith('owner@kost48.com', 'password');
    await waitFor(() => expect(result.current.user?.role).toBe('OWNER'));
    expect(result.current.token).toBe('tok-123');
    expect(localStorage.getItem('kost48_access_token')).toBe('tok-123');
  });

  it('logout → membersihkan token & user', async () => {
    (login as any).mockResolvedValue({ accessToken: 'tok-xyz', user: USER });
    (me as any).mockResolvedValue(USER);

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.login('owner@kost48.com', 'pw'); });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    act(() => result.current.logout());

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('kost48_access_token')).toBeNull();
  });

  it('useAuth di luar AuthProvider melempar error', () => {
    // renderHook tanpa wrapper → hook membaca context undefined → throw
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });
});
