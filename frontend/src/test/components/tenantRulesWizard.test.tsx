import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TenantRulesWizard from '../../components/tenant/TenantRulesWizard';
import { DEFAULT_TENANT_RULE_CONTEXT } from '../../data/tenantRules';

const context = {
  ...DEFAULT_TENANT_RULE_CONTEXT,
  roomCode: 'A1',
  roomDepositRupiah: 500000,
  rentRupiah: 1000000,
  roomSize: 'STANDARD',
  occupantCount: 2,
};

describe('TenantRulesWizard — 4 pertanyaan, tanpa penyimpanan', () => {
  it('menampilkan pertanyaan pertama + tombol lewati', () => {
    const onSkip = vi.fn();
    render(<TenantRulesWizard context={context} onSkip={onSkip} />);

    expect(screen.getByText(/Pertanyaan 1 dari 4/i)).toBeInTheDocument();
    expect(screen.getByText(/Kamu sudah penghuni atau masih calon/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Lewati, tampilkan semua aturan/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('4 jawaban menghasilkan ringkasan aturan + angka', () => {
    render(<TenantRulesWizard context={context} onSkip={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Sudah penghuni/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ya, bawa hewan/i }));
    fireEvent.click(screen.getByRole('button', { name: /3–4 orang/i }));
    fireEvent.click(screen.getByRole('button', { name: /6 bulan/i }));

    expect(screen.getByText(/Aturan yang berlaku untukmu/i)).toBeInTheDocument();
    expect(screen.getByText(/sudah penghuni · bawa hewan · 3–4 orang · bayar 6 bulan/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Deposit kamar A1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5\.700\.000/).length).toBeGreaterThan(0);
  });

  it('tidak menyimpan jawaban ke storage', () => {
    window.localStorage.clear();
    window.sessionStorage.clear();

    render(<TenantRulesWizard context={context} onSkip={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Masih calon/i }));
    fireEvent.click(screen.getByRole('button', { name: /Tidak/i }));
    fireEvent.click(screen.getByRole('button', { name: /1–2 orang/i }));
    fireEvent.click(screen.getByRole('button', { name: /1 tahun/i }));

    expect(screen.getByText(/Tidak ada data yang disimpan/i)).toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('tombol kembali mengembalikan ke pertanyaan sebelumnya', () => {
    render(<TenantRulesWizard context={context} onSkip={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Masih calon/i }));
    expect(screen.getByText(/Pertanyaan 2 dari 4/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Kembali/i }));
    expect(screen.getByText(/Pertanyaan 1 dari 4/i)).toBeInTheDocument();
  });
});
