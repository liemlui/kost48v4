import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import StatusStrip from '../../components/workspace/StatusStrip';

describe('Y-O8 — StatusStrip', () => {
  it('merender label + value tiap item', () => {
    render(
      <MemoryRouter>
        <StatusStrip items={[{ id: 'a', label: 'Kamar', value: 13 }]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Kamar')).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
  });

  it('item dengan onClick dirender sebagai tombol & memanggil handler', async () => {
    const onClick = vi.fn();
    render(
      <MemoryRouter>
        <StatusStrip items={[{ id: 'x', label: 'Filter', value: 5, onClick }]} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('item tanpa aksi bukan tombol', () => {
    render(
      <MemoryRouter>
        <StatusStrip items={[{ id: 'y', label: 'Statis', value: 1 }]} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});
