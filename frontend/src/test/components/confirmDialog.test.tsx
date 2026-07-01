import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider, useConfirm } from '../../components/common/ConfirmProvider';

// Konsumen realistis: tombol memicu confirm, hasil ditampilkan.
function Consumer() {
  const confirm = useConfirm();
  const [result, setResult] = useState<string>('belum');
  return (
    <div>
      <button onClick={async () => setResult((await confirm({ title: 'Hapus Data?', message: 'Tindakan permanen.' })) ? 'ya' : 'tidak')}>
        Picu
      </button>
      <span data-testid="result">{result}</span>
    </div>
  );
}

function renderConsumer() {
  return render(
    <ConfirmProvider>
      <Consumer />
    </ConfirmProvider>,
  );
}

describe('Y-O3 — ConfirmProvider / dialog (component)', () => {
  it('memunculkan modal berisi judul & pesan saat dipicu', async () => {
    renderConsumer();
    await userEvent.click(screen.getByRole('button', { name: 'Picu' }));
    expect(await screen.findByText('Hapus Data?')).toBeInTheDocument();
    expect(screen.getByText('Tindakan permanen.')).toBeInTheDocument();
  });

  it('konfirmasi → hasil "ya"', async () => {
    renderConsumer();
    await userEvent.click(screen.getByRole('button', { name: 'Picu' }));
    await screen.findByText('Hapus Data?');
    await userEvent.click(screen.getByRole('button', { name: /konfirmasi/i }));
    expect(screen.getByTestId('result')).toHaveTextContent('ya');
  });

  it('batal → hasil "tidak"', async () => {
    renderConsumer();
    await userEvent.click(screen.getByRole('button', { name: 'Picu' }));
    await screen.findByText('Hapus Data?');
    await userEvent.click(screen.getByRole('button', { name: /batal/i }));
    expect(screen.getByTestId('result')).toHaveTextContent('tidak');
  });
});
