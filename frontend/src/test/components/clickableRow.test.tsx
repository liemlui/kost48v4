import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClickableRow from '../../components/common/ClickableRow';

function renderRow(onClick: () => void) {
  return render(
    <table>
      <tbody>
        <ClickableRow onClick={onClick} label="Buka baris">
          <td>Sel</td>
        </ClickableRow>
      </tbody>
    </table>,
  );
}

describe('Y-O4 — ClickableRow', () => {
  it('klik memanggil onClick', async () => {
    const onClick = vi.fn();
    renderRow(onClick);
    await userEvent.click(screen.getByRole('row', { name: 'Buka baris' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('tombol Enter memanggil onClick (keyboard a11y)', async () => {
    const onClick = vi.fn();
    renderRow(onClick);
    const row = screen.getByRole('row', { name: 'Buka baris' });
    row.focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('row bisa difokus (tabIndex 0) + punya aria-label', () => {
    renderRow(vi.fn());
    const row = screen.getByRole('row', { name: 'Buka baris' });
    expect(row).toHaveAttribute('tabindex', '0');
    expect(row).toHaveAttribute('aria-label', 'Buka baris');
  });
});
