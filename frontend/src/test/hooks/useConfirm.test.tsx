import { describe, it, expect } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider, useConfirm } from '../../components/common/ConfirmProvider';

describe('Y-N3 — useConfirm dialog lifecycle', () => {
  it('resolve true saat tombol konfirmasi diklik', async () => {
    const { result } = renderHook(() => useConfirm(), { wrapper: ConfirmProvider });
    let promise: Promise<boolean>;
    act(() => {
      promise = result.current({ title: 'Hapus?', message: 'Yakin hapus data?' });
    });
    expect(await screen.findByText('Hapus?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /konfirmasi/i }));
    await expect(promise!).resolves.toBe(true);
  });

  it('resolve false saat tombol batal diklik', async () => {
    const { result } = renderHook(() => useConfirm(), { wrapper: ConfirmProvider });
    let promise: Promise<boolean>;
    act(() => {
      promise = result.current({ title: 'Batalkan?', message: 'Batalkan aksi?' });
    });
    await screen.findByText('Batalkan?');
    await userEvent.click(screen.getByRole('button', { name: /batal/i }));
    await expect(promise!).resolves.toBe(false);
  });

  it('label kustom dipakai', async () => {
    const { result } = renderHook(() => useConfirm(), { wrapper: ConfirmProvider });
    act(() => {
      void result.current({ title: 'T', message: 'M', confirmLabel: 'Ya, Lanjut', cancelLabel: 'Tidak' });
    });
    expect(await screen.findByRole('button', { name: 'Ya, Lanjut' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tidak' })).toBeInTheDocument();
  });

  it('useConfirm di luar provider melempar error', () => {
    function Bare() {
      useConfirm();
      return null;
    }
    expect(() => render(<Bare />)).toThrow(/ConfirmProvider/);
  });
});
