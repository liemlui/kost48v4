import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useClientPagination } from '../../hooks/useClientPagination';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('Y-N4 — utility hooks', () => {
  describe('useClientPagination', () => {
    it('memecah items sesuai pageSize', () => {
      const { result } = renderHook(() => useClientPagination(range(25), [], 10));
      expect(result.current.totalItems).toBe(25);
      expect(result.current.totalPages).toBe(3);
      expect(result.current.page).toBe(1);
      expect(result.current.pagedItems).toEqual(range(10));
      expect(result.current.hasPagination).toBe(true);
    });

    it('setPage mengubah slice', () => {
      const { result } = renderHook(() => useClientPagination(range(25), [], 10));
      act(() => result.current.setPage(2));
      expect(result.current.pagedItems[0]).toBe(11);
      act(() => result.current.setPage(3));
      expect(result.current.pagedItems).toEqual([21, 22, 23, 24, 25]);
    });

    it('list <= pageSize → tanpa paginasi', () => {
      const { result } = renderHook(() => useClientPagination(range(5), [], 10));
      expect(result.current.totalPages).toBe(1);
      expect(result.current.hasPagination).toBe(false);
    });
  });

  describe('useDocumentTitle', () => {
    it('menyetel title + suffix, memulihkan saat unmount', () => {
      document.title = 'AWAL';
      const { unmount } = renderHook(() => useDocumentTitle('Laporan'));
      expect(document.title).toBe('Laporan · KOST48');
      unmount();
      expect(document.title).toBe('AWAL');
    });

    it('tanpa argumen → judul default marketing', () => {
      renderHook(() => useDocumentTitle());
      expect(document.title).toMatch(/KOST48 Surabaya Barat/);
    });
  });
});
