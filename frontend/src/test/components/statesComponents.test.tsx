import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from '../../components/common/EmptyState';
import { TableSkeleton, PageLoadingSkeleton } from '../../components/common/SkeletonLoader';

describe('Y-O5 — EmptyState / Skeleton', () => {
  describe('EmptyState', () => {
    it('menampilkan judul & deskripsi', () => {
      render(<EmptyState title="Belum ada data" description="Silakan tambah data." />);
      expect(screen.getByText('Belum ada data')).toBeInTheDocument();
      expect(screen.getByText('Silakan tambah data.')).toBeInTheDocument();
    });

    it('tombol aksi memanggil onClick', async () => {
      const onClick = vi.fn();
      render(<EmptyState title="Kosong" action={{ label: 'Tambah', onClick }} />);
      await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));
      expect(onClick).toHaveBeenCalledOnce();
    });

    it('tanpa action → tidak ada tombol', () => {
      render(<EmptyState title="Kosong" />);
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('SkeletonLoader', () => {
    it('TableSkeleton merender rows×cols blok', () => {
      const { container } = render(<TableSkeleton rows={3} cols={4} />);
      expect(container.querySelectorAll('.skeleton-block')).toHaveLength(12);
    });

    it('PageLoadingSkeleton punya role=status untuk pembaca layar', () => {
      render(<PageLoadingSkeleton label="Memuat…" />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-busy', 'true');
      expect(status).toHaveAttribute('aria-label', 'Memuat…');
    });
  });
});
