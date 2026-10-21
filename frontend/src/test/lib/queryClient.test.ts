import { describe, expect, it } from 'vitest';
import { queryClient } from '../../lib/queryClient';

// Pagar kebijakan cache (arahan owner 18 Okt 2026): data penting harus selalu
// segar. Tes ini GAGAL bila seseorang mengembalikan staleTime > 0 atau mematikan
// refetch saat tab kembali fokus.
describe('kebijakan cache data global', () => {
  it('tidak menyimpan data basi: staleTime 0 ms', () => {
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(0);
  });

  it('menyegarkan data saat window kembali fokus', () => {
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(true);
  });

  it('menyegarkan data saat koneksi pulih', () => {
    expect(queryClient.getDefaultOptions().queries?.refetchOnReconnect).toBe(true);
  });
});
