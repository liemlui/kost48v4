import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PageHeader from '../../components/common/PageHeader';

describe('Y-O7 — PageHeader (layout header)', () => {
  it('merender judul, deskripsi, eyebrow', () => {
    render(<PageHeader title="Laporan Keuangan" description="Ringkasan finansial" eyebrow="Finance" />);
    expect(screen.getByRole('heading', { name: 'Laporan Keuangan' })).toBeInTheDocument();
    expect(screen.getByText('Ringkasan finansial')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
  });

  it('tombol aksi utama memanggil onAction', async () => {
    const onAction = vi.fn();
    render(<PageHeader title="X" actionLabel="Simpan" onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('secondaryAction dirender', () => {
    render(<PageHeader title="X" secondaryAction={<button>Ekspor</button>} />);
    expect(screen.getByRole('button', { name: 'Ekspor' })).toBeInTheDocument();
  });

  it('tanpa aksi → tidak ada area aksi', () => {
    render(<PageHeader title="Hanya Judul" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
