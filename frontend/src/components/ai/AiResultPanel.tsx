import type { ReactNode } from 'react';
import { Alert, Button, Card, Spinner } from 'react-bootstrap';
import { useMutation } from '@tanstack/react-query';
import AiCostBadge from './AiCostBadge';
import { saveAiDraft, type SaveAiDraftPayload } from '../../api/aiDrafts';

type Props = {
  title?: string;
  mode?: string;
  fallback?: boolean;
  warnings?: string[];
  missingData?: string[];
  usage?: { total_tokens?: number };
  model?: string;
  confidence?: number;
  /** G9: bila diisi, tampilkan tombol "Simpan sebagai draft" → antrean AiDraft. */
  saveDraft?: SaveAiDraftPayload;
  children: ReactNode;
};

/** Panel hasil AI dengan metadata: mode, confidence, usage, warnings. */
export default function AiResultPanel({
  title = 'Hasil AI',
  mode,
  fallback,
  warnings,
  missingData,
  usage,
  model,
  confidence,
  saveDraft,
  children,
}: Props) {
  const saveMutation = useMutation({ mutationFn: () => saveAiDraft(saveDraft as SaveAiDraftPayload) });

  return (
    <Card className="ai-result-panel mt-3">
      <Card.Header className="d-flex justify-content-between align-items-center py-2">
        <span className="fw-semibold small">{title}</span>
        <div className="d-flex gap-2 align-items-center">
          {confidence != null ? (
            <span className="small text-muted">
              Keyakinan: {Math.round(confidence * 100)}%
            </span>
          ) : null}
          {mode ? <span className="badge bg-secondary small">{mode}</span> : null}
          {fallback ? <span className="badge bg-warning text-dark small">Rule fallback</span> : null}
        </div>
      </Card.Header>
      <Card.Body className="small">
        {warnings?.length ? (
          <Alert variant="warning" className="py-1 px-2 mb-2 small">
            {warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
          </Alert>
        ) : null}
        {missingData?.length ? (
          <Alert variant="info" className="py-1 px-2 mb-2 small">
            {missingData.map((m, i) => <div key={i}>📋 {m}</div>)}
          </Alert>
        ) : null}
        {children}
        <AiCostBadge usage={usage} model={model} />
        {saveDraft ? (
          <div className="mt-2 d-flex align-items-center gap-2">
            <Button
              size="sm"
              variant="outline-secondary"
              disabled={saveMutation.isPending || saveMutation.isSuccess}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? <><Spinner animation="border" size="sm" className="me-2" />Menyimpan…</>
                : saveMutation.isSuccess ? '✅ Tersimpan di antrean' : 'Simpan sebagai draft'}
            </Button>
            {saveMutation.isError ? <span className="small text-danger">Gagal menyimpan draft.</span> : null}
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}
