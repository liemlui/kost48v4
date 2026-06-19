import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { getOwnerAiStatus, validateKtpOcr, type KtpOcrValidateResult } from '../../api/ai';
import AiResultPanel from './AiResultPanel';

type Props = {
  tenantId: number;
  tenantName?: string;
};

/**
 * G5 — Bantu Validasi KTP (OWNER/ADMIN). PDP: OCR foto KTP berjalan LOKAL di
 * perangkat; hanya TEKS hasil OCR yang dikirim ke backend/AI. Tidak pernah gambar.
 * Verifikasi final tetap memakai tombol Verifikasi KTP existing — kartu ini hanya bantu.
 */
export default function KtpOcrValidateCard({ tenantId, tenantName }: Props) {
  const { user } = useAuth();
  const isOwnerAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const { data: status } = useQuery({
    queryKey: ['owner-ai', 'status'],
    queryFn: getOwnerAiStatus,
    enabled: isOwnerAdmin,
    staleTime: 60_000,
  });

  const [ocrText, setOcrText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KtpOcrValidateResult | null>(null);

  if (!isOwnerAdmin) return null;

  const configured = !!status?.configured;

  async function handleKtpScan(file?: File) {
    if (!file) return;
    setScanning(true);
    setScanMsg('Memindai KTP di perangkat (offline)…');
    setResult(null);
    try {
      const { recognize } = await import('tesseract.js');
      const { data } = await recognize(file, 'ind');
      setOcrText((data.text || '').trim());
      setScanMsg('Teks KTP terbaca. PERIKSA & koreksi bila perlu, lalu klik "Bantu Validasi KTP".');
    } catch {
      setScanMsg('Gagal memindai KTP. Anda bisa menempel teks OCR manual di bawah.');
    } finally {
      setScanning(false);
    }
  }

  async function handleValidate() {
    if (!ocrText.trim()) {
      setError('Teks OCR masih kosong.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await validateKtpOcr(tenantId, ocrText.trim());
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Validasi gagal. Data tetap aman dan tidak berubah.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="content-card border-0 shadow-sm mb-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Bantu Validasi KTP (AI){tenantName ? ` — ${tenantName}` : ''}</h6>
          <span className="badge bg-light text-dark border">Bantuan AI</span>
        </div>
        <p className="text-muted small mb-3">
          Foto KTP dipindai <strong>di perangkat ini (offline)</strong>; hanya teks yang dikirim ke AI —
          gambar tidak pernah dikirim. Hasil hanya saran; <strong>verifikasi final tetap tombol Verifikasi KTP</strong>.
        </p>

        <Form.Group className="mb-2">
          <Form.Label className="small mb-1">Pindai foto KTP (opsional)</Form.Label>
          <Form.Control
            type="file"
            accept="image/*"
            size="sm"
            disabled={scanning}
            onChange={(e) => handleKtpScan((e.target as HTMLInputElement).files?.[0])}
          />
          {scanning ? (
            <div className="d-flex align-items-center gap-2 mt-2 small text-muted">
              <Spinner animation="border" size="sm" /> {scanMsg}
            </div>
          ) : scanMsg ? (
            <div className="small text-muted mt-2">{scanMsg}</div>
          ) : null}
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label className="small mb-1">Teks OCR KTP</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
            placeholder="Hasil OCR akan muncul di sini, atau tempel teks KTP manual…"
          />
        </Form.Group>

        {!configured ? (
          <Alert variant="secondary" className="py-1 px-2 small mb-2">
            AI belum dikonfigurasi. Tombol validasi AI dinonaktifkan.
          </Alert>
        ) : null}

        <Button
          type="button"
          variant="outline-primary"
          size="sm"
          disabled={!configured || busy || scanning || !ocrText.trim()}
          onClick={handleValidate}
        >
          {busy ? (
            <><Spinner animation="border" size="sm" className="me-2" />Memvalidasi…</>
          ) : (
            'Bantu Validasi KTP'
          )}
        </Button>

        {error ? <Alert variant="warning" className="mt-2 mb-0 small">{error}</Alert> : null}

        {result ? (
          <AiResultPanel
            title="Hasil Validasi KTP"
            mode={result.mode}
            fallback={result.fallback}
            warnings={result.warnings}
            missingData={result.missingData}
            usage={result.usage}
            model={result.model}
            confidence={result.confidence}
          >
            <ul className="mb-2 ps-3">
              <li>
                Nama OCR: <strong>{result.result.extracted.name ?? '—'}</strong>{' '}
                {result.result.match.nameMatchesTenant === true ? '✅ cocok' : result.result.match.nameMatchesTenant === false ? '⚠️ beda dengan tenant' : '(cek manual)'}
              </li>
              <li>
                NIK OCR: <strong>{result.result.extracted.nik ?? '—'}</strong> (mask){' '}
                {result.result.nikFormatValid ? '' : '⚠️ format bukan 16 digit'}{' '}
                {result.result.match.nikMatchesTenant ? '✅ cocok tenant' : '⚠️ tidak cocok tenant'}
              </li>
              <li>
                Demografi dari NIK: lahir <strong>{result.result.demographicsFromNik.birthDate ?? '—'}</strong>,{' '}
                gender <strong>{result.result.demographicsFromNik.gender ?? '—'}</strong>
              </li>
              {result.result.extracted.birthPlace ? <li>Tempat lahir (OCR): {result.result.extracted.birthPlace}</li> : null}
            </ul>
            {result.result.match.warnings?.length ? (
              <Alert variant="warning" className="py-1 px-2 mb-2 small">
                {result.result.match.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
              </Alert>
            ) : null}
            <div className="small">
              Rekomendasi AI:{' '}
              <span className={`badge ${result.result.recommendation === 'VERIFY' ? 'bg-success' : result.result.recommendation === 'REJECT' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                {result.result.recommendation === 'VERIFY' ? 'Boleh diverifikasi' : result.result.recommendation === 'REJECT' ? 'Tolak' : 'Perlu review manusia'}
              </span>{' '}
              <span className="text-muted">— keputusan akhir tetap di tangan Anda.</span>
            </div>
          </AiResultPanel>
        ) : null}
      </Card.Body>
    </Card>
  );
}
