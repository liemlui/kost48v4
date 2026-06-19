import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Badge, Button, Col, Form, Row, Spinner } from 'react-bootstrap';
import { draftExpenseReceiptFromOcr, getOwnerAiStatus, type ExpenseReceiptDraftResult } from '../../api/ai';
import AiResultPanel from '../ai/AiResultPanel';
import { useAuth } from '../../context/AuthContext';

type ExpenseDraftPatch = Record<string, unknown>;

type Props = {
  onApplyDraft: (patch: ExpenseDraftPatch) => void;
  disabled?: boolean;
};

function errorMessage(err: unknown) {
  if (err && typeof err === 'object' && 'response' in err) {
    const message = (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message;
  }
  return err instanceof Error ? err.message : null;
}

function buildExpensePatch(result: ExpenseReceiptDraftResult): ExpenseDraftPatch {
  const draft = result.result;
  return {
    expenseDate: draft.expenseDate ?? '',
    type: draft.type === 'FIXED' || draft.type === 'VARIABLE' ? draft.type : 'VARIABLE',
    category: draft.category || 'OTHER',
    description: draft.description || '',
    amountRupiah: draft.amountRupiah > 0 ? draft.amountRupiah : '',
    vendorName: draft.vendorName ?? '',
    note: draft.note || '',
    aiDraftMeta: {
      mode: result.mode,
      model: result.model,
      promptHash: result.promptHash,
      snapshotHash: result.snapshotHash,
      confidence: draft.confidence,
    },
  };
}

export default function ExpenseReceiptUpload({ onApplyDraft, disabled }: Props) {
  const { user } = useAuth();
  const isOwnerAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const ownerAiStatusQuery = useQuery({
    queryKey: ['owner-ai', 'status', 'expense-ocr'],
    queryFn: getOwnerAiStatus,
    enabled: isOwnerAdmin,
    staleTime: 300_000,
    retry: 1,
  });
  const [ocrText, setOcrText] = useState('');
  const [fileName, setFileName] = useState('');
  const [scanning, setScanning] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExpenseReceiptDraftResult | null>(null);
  const canUseAi = isOwnerAdmin && ownerAiStatusQuery.data?.configured === true;

  if (!canUseAi) return null;

  const handleFile = async (file?: File) => {
    if (!file) return;
    setScanning(true);
    setError(null);
    setResult(null);
    setFileName(file.name);
    try {
      const { recognize } = await import('tesseract.js');
      const { data } = await recognize(file, 'ind');
      const text = (data.text || '').trim();
      setOcrText(text);
      if (text.length < 10) {
        setError('Teks nota tidak terbaca jelas. Isi atau koreksi teks OCR manual.');
      }
    } catch (err) {
      setError(errorMessage(err) ?? 'Gagal membaca nota. Isi teks OCR manual.');
    } finally {
      setScanning(false);
    }
  };

  const handleDraft = async () => {
    const text = ocrText.trim();
    if (text.length < 10) {
      setError('Teks OCR minimal 10 karakter.');
      return;
    }
    setDrafting(true);
    setError(null);
    try {
      const next = await draftExpenseReceiptFromOcr(text);
      setResult(next);
    } catch (err) {
      setError(errorMessage(err) ?? 'Gagal merapikan draft expense.');
    } finally {
      setDrafting(false);
    }
  };

  return (
    <section className="mb-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <div>
          <h2 className="h6 mb-1">OCR Nota Expense</h2>
          <div className="small text-muted">Draft AI tidak membuat jurnal sampai expense disimpan.</div>
        </div>
        {fileName ? <Badge bg="secondary">{fileName}</Badge> : null}
      </div>

      <Row className="g-3 align-items-end">
        <Col md={5}>
          <Form.Group>
            <Form.Label>Foto nota</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              capture="environment"
              disabled={disabled || scanning}
              onChange={(event) => {
                const input = event.currentTarget as HTMLInputElement;
                const file = input.files?.[0];
                input.value = '';
                void handleFile(file);
              }}
            />
          </Form.Group>
        </Col>
        <Col md={7}>
          <Form.Group>
            <Form.Label>Teks OCR</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={ocrText}
              disabled={disabled}
              onChange={(event) => {
                setOcrText(event.target.value);
                setResult(null);
              }}
            />
          </Form.Group>
        </Col>
      </Row>

      <div className="d-flex flex-wrap gap-2 align-items-center mt-3">
        <Button type="button" variant="outline-primary" size="sm" onClick={handleDraft} disabled={disabled || scanning || drafting || ocrText.trim().length < 10}>
          {drafting ? <><Spinner animation="border" size="sm" className="me-2" />Merapikan...</> : 'Rapikan Draft AI'}
        </Button>
        {scanning ? <span className="small text-muted">Membaca nota...</span> : null}
      </div>

      {error ? <Alert variant="warning" className="mt-3 mb-0 small">{error}</Alert> : null}

      {result ? (
        <AiResultPanel
          title="Draft Expense"
          mode={result.mode}
          fallback={result.fallback}
          warnings={result.warnings}
          usage={result.usage}
          model={result.model}
          confidence={result.result.confidence}
        >
          <div className="d-grid gap-2">
            <div className="d-flex justify-content-between gap-3 border-bottom pb-2">
              <span>Tanggal</span>
              <strong>{result.result.expenseDate ?? 'Perlu cek'}</strong>
            </div>
            <div className="d-flex justify-content-between gap-3 border-bottom pb-2">
              <span>Vendor</span>
              <strong>{result.result.vendorName ?? '-'}</strong>
            </div>
            <div className="d-flex justify-content-between gap-3 border-bottom pb-2">
              <span>Nominal</span>
              <strong>{result.result.amountRupiah.toLocaleString('id-ID')}</strong>
            </div>
            <div className="d-flex justify-content-between gap-3 border-bottom pb-2">
              <span>Kategori</span>
              <strong>{result.result.category}</strong>
            </div>
            <div>
              <div className="fw-semibold">Deskripsi</div>
              <div>{result.result.description}</div>
            </div>
            {result.result.needsReview.length ? (
              <Alert variant="info" className="mb-0 py-2">
                {result.result.needsReview.map((item) => <div key={item}>{item}</div>)}
              </Alert>
            ) : null}
            <div className="d-flex justify-content-end">
              <Button type="button" size="sm" onClick={() => onApplyDraft(buildExpensePatch(result))}>
                Pakai Draft
              </Button>
            </div>
          </div>
        </AiResultPanel>
      ) : null}
    </section>
  );
}
