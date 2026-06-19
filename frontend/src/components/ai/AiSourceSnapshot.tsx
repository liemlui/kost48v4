import { Card, Collapse } from 'react-bootstrap';
import { useState } from 'react';

type Props = {
  data: Record<string, unknown> | null;
};

/** Menampilkan data sumber (snapshot) yang dikirim ke AI. Collapsed by default. */
export default function AiSourceSnapshot({ data }: Props) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  return (
    <div className="ai-source-snapshot mt-2">
      <button
        type="button"
        className="btn btn-link btn-sm p-0 text-muted small"
        onClick={() => setOpen(!open)}
      >
        {open ? '▼' : '▶'} Data yang dikirim ke AI
      </button>
      <Collapse in={open}>
        <Card body className="mt-1 p-2 bg-light small">
          <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </Card>
      </Collapse>
    </div>
  );
}
