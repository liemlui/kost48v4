import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ActionQueueTable, { type ActionQueueItem } from '../../components/command-center/ActionQueueTable';

function item(overrides: Partial<ActionQueueItem>): ActionQueueItem {
  return {
    id: 1,
    priority: 'HIGH',
    type: 'Tagihan jatuh tempo',
    subject: 'INV-2026-0042',
    issue: 'Lewat jatuh tempo',
    recommendedAction: 'Lihat Tagihan',
    actionTo: '/invoices/42',
    ...overrides,
  };
}

function renderQueue(items: ActionQueueItem[]) {
  return render(
    <MemoryRouter>
      <ActionQueueTable title="Antrean Aksi" items={items} collapsible={false} maxItems={8} />
    </MemoryRouter>,
  );
}

describe('W-TNT-004 — tombol "Ingatkan via WA" pada kartu urgent', () => {
  it('kartu urgent dengan nomor → tautan wa.me berisi pesan', () => {
    renderQueue([item({ contactName: 'Budi', contactPhone: '0812 3456 7890' })]);
    const link = screen.getByRole('link', { name: 'Ingatkan via WA' });
    expect(link.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/6281234567890\?text=/);
    expect(link.getAttribute('href')).toContain(encodeURIComponent('INV-2026-0042'));
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('nomor kosong → arahan isi profil, bukan tautan mati', () => {
    renderQueue([item({ contactName: 'Budi', contactPhone: '' })]);
    expect(screen.queryByRole('link', { name: 'Ingatkan via WA' })).toBeNull();
    expect(screen.getByRole('button', { name: /Nomor belum ada/ })).toBeInTheDocument();
  });

  it('kartu tidak urgent tidak menampilkan tombol WA', () => {
    renderQueue([item({ priority: 'MEDIUM', contactPhone: '081234567890' })]);
    expect(screen.queryByRole('link', { name: 'Ingatkan via WA' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Nomor belum ada/ })).toBeNull();
  });

  it('kartu tanpa data kontak (bukan tenant) tidak menampilkan tombol WA', () => {
    renderQueue([item({ contactPhone: undefined })]);
    expect(screen.queryByRole('link', { name: 'Ingatkan via WA' })).toBeNull();
  });
});
