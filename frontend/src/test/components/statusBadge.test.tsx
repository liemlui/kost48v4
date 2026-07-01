import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../../components/common/StatusBadge';

describe('Y-O2 — StatusBadge', () => {
  it('menampilkan label status', () => {
    render(<StatusBadge status="ACTIVE" />);
    // label diambil dari getStatusLabel — minimal ada teks non-kosong
    const badge = document.querySelector('.status-badge');
    expect(badge).toBeTruthy();
    expect(badge?.textContent?.trim().length).toBeGreaterThan(0);
  });

  it('customLabel dipakai sebagai teks', () => {
    render(<StatusBadge status="ACTIVE" customLabel="Sedang Aktif" />);
    expect(screen.getByText('Sedang Aktif')).toBeInTheDocument();
  });

  it('showLabel=false menyembunyikan teks tetapi tetap ada aria-label', () => {
    render(<StatusBadge status="OCCUPIED" showLabel={false} customLabel="Terisi" />);
    const badge = document.querySelector('.status-badge') as HTMLElement;
    expect(badge.textContent).toBe('');
    expect(badge.getAttribute('aria-label')).toBe('Terisi');
  });

  it('status lowercase dinormalkan (tidak crash)', () => {
    render(<StatusBadge status={'available' as any} />);
    expect(document.querySelector('.status-badge')).toBeTruthy();
  });
});
