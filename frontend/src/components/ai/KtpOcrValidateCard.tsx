import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { getOwnerAiStatus, validateKtpOcr, type KtpOcrValidateResult } from '../../api/ai';
import { verifyTenantKtp, saveTenantKtpData, type VerifyKtpPayload } from '../../api/tenants';
import { preprocessImage } from '../../utils/ocrPreprocess';
import AiResultPanel from './AiResultPanel';

type Props = {
  tenantId: number;
  tenantName?: string;
  ktpVerifiedAt?: string | null;
  ktpVerificationMethod?: string | null;
};

/**
 * G5+ — Validasi KTP (OWNER/ADMIN) dengan pipeline bertingkat:
 * OCR offline → AI DeepSeek → fallback rule-based → verifikasi manual.
 *
 * PDP: OCR foto KTP berjalan LOKAL; hanya teks yang dikirim ke backend/AI.
 * Setelah validasi, admin bisa verifikasi manual (method + notes) dan menyimpan
 * data KTP hasil ekstraksi ke profil tenant untuk bank data marketing.
 */
export default function KtpOcrValidateCard({ tenantId, tenantName, ktpVerifiedAt, ktpVerificationMethod }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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

  // Manual verify state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyMethod, setVerifyMethod] = useState<'AI' | 'AI_FAILED_MANUAL' | 'MANUAL'>('MANUAL');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [verified, setVerified] = useState(false);

  // Save KTP data state
  const [saving, setSaving] = useState(false);
  const [savedFields, setSavedFields] = useState<string[]>([]);

  const verifyMutation = useMutation({
    mutationFn: (payload: VerifyKtpPayload) => verifyTenantKtp(tenantId, payload),
    onSuccess: () => {
      setVerified(true);
      setShowVerifyModal(false);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
    },
  });

  if (!isOwnerAdmin) return null;

  const configured = !!status?.configured;
  const isVerified = verified || !!ktpVerifiedAt;
  const verificationMethod = verified ? verifyMethod : ktpVerificationMethod;

  const aiFailed = result?.fallback || result?.mode === 'RULE_FALLBACK' || error;
  const canManualVerify = aiFailed || !configured;

  async function handleKtpScan(file?: File) {
    if (!file) return;
    setScanning(true);
    setScanMsg('Mempersiapkan gambar…');
    setResult(null);
    try {
      const processed = await preprocessImage(file);
      setScanMsg('Memindai KTP di perangkat (offline)…');
      const { recognize } = await import('tesseract.js');
      const { data } = await recognize(processed, 'ind');
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
      // Auto-set verify method based on result
      if (res.result.recommendation === 'VERIFY') setVerifyMethod('AI');
      else if (res.fallback) setVerifyMethod('AI_FAILED_MANUAL');
      else setVerifyMethod('MANUAL');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Validasi gagal. Data tetap aman dan tidak berubah.');
    } finally {
      setBusy(false);
    }
  }

  async function handleManualVerify() {
    await verifyMutation.mutateAsync({ method: verifyMethod, notes: verifyNotes || undefined });
  }

  async function handleSaveKtpData() {
    if (!result) return;
    const { extracted, demographicsFromNik } = result.result;
    setSaving(true);
    try {
      const res = await saveTenantKtpData(tenantId, {
        gender: extracted.gender ?? demographicsFromNik.gender ?? undefined,
        birthDate: extracted.birthDate ?? demographicsFromNik.birthDate ?? undefined,
        originCity: extracted.birthPlace ?? undefined,
        originProvince: (extracted as any).province ?? undefined,
        occupation: undefined,
      });
      setSavedFields(res.savedFields);
    } catch {
      // ignore — data already saved or duplicate
    } finally {
      setSaving(false);
    }
  }

  function methodLabel(m: string | null | undefined): string {
    switch (m) {
      case 'AI': return '✅ AI Berhasil';
      case 'AI_FAILED_MANUAL': return '⚠️ AI Gagal — Manual';
      case 'MANUAL': return '👤 Manual Penuh';
      default: return m || '—';
    }
  }

  return (
    <Card className="content-card border-0 shadow-sm mb-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">
            Bantu Validasi KTP (AI){tenantName ? ` — ${tenantName}` : ''}
          </h6>
          <div className="d-flex gap-2 align-items-center">
            {isVerified ? (
              <Badge bg="success" className="small">✅ KTP Terverifikasi</Badge>
            ) : (
              <Badge bg="warning" text="dark" className="small">⚠️ Belum Diverifikasi</Badge>
            )}
            <span className="badge bg-light text-dark border">Bantuan AI</span>
          </div>
        </div>

        {verificationMethod ? (
          <div className="small text-muted mb-2">
            Metode verifikasi: <strong>{methodLabel(verificationMethod)}</strong>
          </div>
        ) : null}

        <p className="text-muted small mb-3">
          Foto KTP dipindai <strong>di perangkat ini (offline)</strong>; hanya teks yang dikirim ke AI —
          gambar tidak pernah dikirim.
          {!isVerified ? (
            <> AI memberi saran; <strong>Anda tetap harus verifikasi manual</strong> bila AI gagal atau ragu.</>
          ) : null}
        </p>

        {!isVerified ? (
          <>
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
                AI belum dikonfigurasi. Anda masih bisa verifikasi manual.
              </Alert>
            ) : null}

            <div className="d-flex gap-2 flex-wrap">
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
                  '🤖 Bantu Validasi KTP'
                )}
              </Button>

              <Button
                type="button"
                variant="outline-success"
                size="sm"
                onClick={() => setShowVerifyModal(true)}
              >
                ✅ Verifikasi Manual
              </Button>
            </div>

            {error ? <Alert variant="warning" className="mt-2 mb-0 small">{error}</Alert> : null}
          </>
        ) : (
          <Alert variant="success" className="py-2 px-3 mb-0 small">
            KTP sudah diverifikasi{verificationMethod ? ` (metode: ${methodLabel(verificationMethod)})` : ''}.
            {savedFields.length > 0 ? <> Data yang tersimpan: <strong>{savedFields.join(', ')}</strong>.</> : null}
          </Alert>
        )}

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
            saveDraft={{
              feature: 'ktp-ocr',
              targetType: 'Tenant',
              targetId: String(tenantId),
              mode: result.mode,
              model: result.model,
              snapshotHash: result.snapshotHash,
              promptHash: result.promptHash,
              confidence: result.confidence,
              resultJson: result.result as unknown as Record<string, unknown>,
              usageJson: result.usage as unknown as Record<string, unknown> | undefined,
            }}
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
              {(result.result.extracted as any).province ? <li>Provinsi (OCR): {(result.result.extracted as any).province}</li> : null}
              {result.result.extracted.address ? <li>Alamat (OCR): {result.result.extracted.address}</li> : null}
            </ul>
            {result.result.match.warnings?.length ? (
              <Alert variant="warning" className="py-1 px-2 mb-2 small">
                {result.result.match.warnings.map((w: string, i: number) => <div key={i}>⚠️ {w}</div>)}
              </Alert>
            ) : null}
            <div className="small mb-2">
              Rekomendasi AI:{' '}
              <span className={`badge ${result.result.recommendation === 'VERIFY' ? 'bg-success' : result.result.recommendation === 'REJECT' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                {result.result.recommendation === 'VERIFY' ? 'Boleh diverifikasi' : result.result.recommendation === 'REJECT' ? 'Tolak' : 'Perlu review manusia'}
              </span>{' '}
              <span className="text-muted">— keputusan akhir tetap di tangan Anda.</span>
            </div>

            {/* Tombol simpan data KTP ke profil */}
            {!isVerified || savedFields.length === 0 ? (
              <Button
                type="button"
                variant="outline-secondary"
                size="sm"
                disabled={saving}
                onClick={handleSaveKtpData}
              >
                {saving ? (
                  <><Spinner animation="border" size="sm" className="me-2" />Menyimpan…</>
                ) : savedFields.length > 0 ? (
                  `✅ Data tersimpan: ${savedFields.join(', ')}`
                ) : (
                  '💾 Simpan Data KTP ke Profil Tenant'
                )}
              </Button>
            ) : null}
          </AiResultPanel>
        ) : null}

        {/* Modal verifikasi manual */}
        <Modal show={showVerifyModal} onHide={() => setShowVerifyModal(false)} size="sm" centered>
          <Modal.Header closeButton>
            <Modal.Title className="small">Verifikasi Manual KTP</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="small text-muted">
              Anda akan menyetujui bahwa KTP tenant <strong>{tenantName || `#${tenantId}`}</strong> telah diverifikasi.
              {aiFailed ? ' AI gagal/tidak tersedia — verifikasi sepenuhnya manual.' : ''}
            </p>
            <Form.Group className="mb-2">
              <Form.Label className="small">Metode Verifikasi</Form.Label>
              <Form.Select
                size="sm"
                value={verifyMethod}
                onChange={(e) => setVerifyMethod(e.target.value as any)}
              >
                <option value="AI">AI Berhasil — DeepSeek merekomendasikan VERIFY</option>
                <option value="AI_FAILED_MANUAL">AI Gagal — Manual (fallback)</option>
                <option value="MANUAL">Manual Penuh — tanpa bantuan AI</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label className="small">Catatan (opsional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                size="sm"
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="Misal: NIK tidak terbaca OCR, dicek manual oleh admin…"
                maxLength={500}
              />
            </Form.Group>
            {verifyMutation.isError ? (
              <Alert variant="danger" className="py-1 px-2 small mb-2">
                {(verifyMutation.error as any)?.response?.data?.message ?? 'Gagal verifikasi.'}
              </Alert>
            ) : null}
          </Modal.Body>
          <Modal.Footer className="py-2">
            <Button variant="secondary" size="sm" onClick={() => setShowVerifyModal(false)}>
              Batal
            </Button>
            <Button
              variant="success"
              size="sm"
              disabled={verifyMutation.isPending}
              onClick={handleManualVerify}
            >
              {verifyMutation.isPending ? (
                <><Spinner animation="border" size="sm" className="me-2" />Menyetujui…</>
              ) : (
                '✅ Setujui & Verifikasi'
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </Card.Body>
    </Card>
  );
}
