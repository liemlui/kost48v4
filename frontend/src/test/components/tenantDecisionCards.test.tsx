import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ActionQueueTable from '../../components/command-center/ActionQueueTable';
import { buildTenantDecisionQueue } from '../../utils/tenantDecisionQueue';
import type { Invoice, RenewRequest } from '../../types';

const SEKARANG = new Date('2026-10-17T05:00:00.000Z');

const tagihanTerlambat = {
  id: 42,
  stayId: 7,
  invoiceNumber: 'INV-2026-0042',
  status: 'PENDING',
  dueDate: '2026-10-01',
  totalAmountRupiah: 500000,
} as unknown as Invoice;

const perpanjanganMenunggu = {
  id: 9,
  stayId: 7,
  tenantId: 3,
  requestedTerm: 'MONTHLY',
  status: 'PENDING_DECISION',
} as unknown as RenewRequest;

function renderKartu(items: ReturnType<typeof buildTenantDecisionQueue>) {
  return render(
    <MemoryRouter>
      <ActionQueueTable title="Yang perlu kamu kerjakan" items={items} collapsible={false} maxItems={3} />
    </MemoryRouter>,
  );
}

describe('AIDL-01b — kartu TENANT benar-benar dirender (bukan cuma data)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(SEKARANG);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('kartu tagihan tampil sebagai baris dengan tombol aksi', () => {
    renderKartu(buildTenantDecisionQueue({ overdueInvoice: tagihanTerlambat }));

    expect(screen.getByText('Tagihan INV-2026-0042')).toBeInTheDocument();
    expect(screen.getByText(/500\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Terlambat 16 hari/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bayar & kirim bukti' })).toBeInTheDocument();
  });

  it('kartu perpanjangan tampil sebagai teks arahan, tanpa tombol navigasi', () => {
    renderKartu(buildTenantDecisionQueue({ pendingDecisionRequest: perpanjanganMenunggu }));

    expect(screen.getByText('Perpanjangan menunggu keputusan')).toBeInTheDocument();
    expect(screen.getByText('Tentukan: lanjut atau tidak')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentukan: lanjut atau tidak' })).toBeNull();
  });

  it('dua masalah tampil bersamaan; tanpa masalah tabel memakai empty state', () => {
    const { unmount } = renderKartu(
      buildTenantDecisionQueue({ overdueInvoice: tagihanTerlambat, pendingDecisionRequest: perpanjanganMenunggu }),
    );
    expect(screen.getByText('Tagihan INV-2026-0042')).toBeInTheDocument();
    expect(screen.getByText('Perpanjangan menunggu keputusan')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // 1 header + 2 kartu
    unmount();

    renderKartu(buildTenantDecisionQueue({}));
    expect(screen.getByText('Tidak ada antrean mendesak')).toBeInTheDocument();
  });
});
