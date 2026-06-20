import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Button, Modal } from 'react-bootstrap';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error('useConfirm harus dipakai di dalam ConfirmProvider');
  return fn;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ title: '', message: '' });
  const resolveRef = useRef<(value: boolean) => void>(null!);

  const confirm: ConfirmFn = (options) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  };

  const handleConfirm = () => { setOpen(false); resolveRef.current(true); };
  const handleCancel = () => { setOpen(false); resolveRef.current(false); };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal show={open} onHide={handleCancel} centered>
        <Modal.Header closeButton>
          <Modal.Title>{opts.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{opts.message}</Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleCancel}>
            {opts.cancelLabel ?? 'Batal'}
          </Button>
          <Button variant={opts.variant ?? 'primary'} onClick={handleConfirm}>
            {opts.confirmLabel ?? 'Konfirmasi'}
          </Button>
        </Modal.Footer>
      </Modal>
    </ConfirmContext.Provider>
  );
}
