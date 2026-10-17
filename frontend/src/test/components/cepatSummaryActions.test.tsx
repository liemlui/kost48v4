import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ActionQueueItem } from '../../components/command-center/ActionQueueTable';
import CepatSummaryActions from '../../components/cepat/CepatSummaryActions';

const items: ActionQueueItem[] = [
  {
    id: 'invoice-1',
    priority: 'HIGH',
    type: 'Tagihan',
    subject: 'Tagihan INV-2026-0042',
    issue: 'Tenggat lewat.',
    recommendedAction: 'Bayar & kirim bukti',
  },
];

describe('AIDL-05 — aksi ringkasan WhatsApp/cetak', () => {
  it('membuat tautan WhatsApp berisi ringkasan yang sama dengan yang dicetak', () => {
    render(<CepatSummaryActions items={items} role="OWNER" />);

    const link = screen.getByRole('link', { name: /Kirim ringkasan via WhatsApp/i });
    const url = new URL(link.getAttribute('href') ?? '');
    const text = url.searchParams.get('text') ?? '';

    expect(url.origin + url.pathname).toBe('https://wa.me/6285648887628');
    expect(text).toContain('KOST48-CEPAT/1');
    expect(text).toContain('[TINGGI] Tagihan · Tagihan INV-2026-0042');
    expect(screen.getByText(/Tanpa NIK, foto identitas, atau alamat/i)).toBeInTheDocument();
  });

  it('cetak memanggil window.print dan menyiapkan area print-only', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<CepatSummaryActions items={items} role="ADMIN" />);

    await userEvent.click(screen.getByRole('button', { name: /Cetak ringkasan/i }));

    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Ringkasan Mode Cepat', { selector: 'h1' })).toBeInTheDocument();
    printSpy.mockRestore();
  });

  it('STAFF/TENANT tidak melihat aksi ini', () => {
    const { container } = render(<CepatSummaryActions items={items} role="TENANT" />);
    expect(container).toBeEmptyDOMElement();
  });
});
