import { useState, type ReactNode } from 'react';
import { Alert, Button, Spinner } from 'react-bootstrap';

type Props<T> = {
  label: string;
  loadingLabel?: string;
  variant?: string;
  size?: 'sm' | 'lg';
  disabled?: boolean;
  run: () => Promise<T>;
  renderResult: (result: T) => ReactNode;
};

export default function AiAssistButton<T>({ label, loadingLabel = 'Menganalisa...', variant = 'outline-primary', size = 'sm', disabled, run, renderResult }: Props<T>) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await run();
      setResult(next);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Analisa gagal. Data tetap aman dan tidak berubah.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ai-assist-box">
      <Button type="button" variant={variant as any} size={size} disabled={disabled || busy} onClick={handleClick}>
        {busy ? <><Spinner animation="border" size="sm" className="me-2" />{loadingLabel}</> : label}
      </Button>
      {error ? <Alert variant="warning" className="mt-2 mb-0 small">{error}</Alert> : null}
      {result ? <div className="ai-assist-result mt-2">{renderResult(result)}</div> : null}
    </div>
  );
}
