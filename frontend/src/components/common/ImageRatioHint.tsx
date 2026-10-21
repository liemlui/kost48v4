// FILE: ImageRatioHint.tsx — rekomendasi rasio di panel upload + pemeriksa non-blokir.
//
// Aturan produk: foto TIDAK pernah ditolak karena rasio (owner bisa mengunggah dari HP
// atau hasil scan brosur). Panel hanya menyebut rasio yang disarankan dan memberi
// peringatan yang bisa dilewati; tampilan publik menyelesaikan sisanya lewat FrameImage.
import { useCallback, useState } from 'react';
import { Alert } from 'react-bootstrap';
import {
  evaluateUploadRatio,
  readImageDimensions,
  UPLOAD_RATIO_GUIDES,
  type UploadRatioTarget,
  type UploadRatioVerdict,
} from '../../utils/imageFrame';

export default function ImageRatioHint({ target, className }: { target: UploadRatioTarget; className?: string }) {
  const guide = UPLOAD_RATIO_GUIDES[target];
  return (
    <small className={`image-ratio-hint text-muted${className ? ` ${className}` : ''}`}>
      <strong>Rasio disarankan: {guide.ratioText}</strong>
      {` · min. ${guide.minWidth} × ${guide.minHeight} px · ${guide.note}`}
    </small>
  );
}

/** Membaca dimensi file dan menilai rasionya. Tidak pernah melempar / memblokir unggahan. */
export function useUploadRatioCheck() {
  const [verdict, setVerdict] = useState<UploadRatioVerdict | null>(null);

  const checkFile = useCallback(async (file: File, target: UploadRatioTarget) => {
    const dimensions = await readImageDimensions(file);
    const next = evaluateUploadRatio(dimensions?.width ?? null, dimensions?.height ?? null, target);
    setVerdict(next);
    return next;
  }, []);

  /** Untuk unggahan banyak berkas: laporkan berkas pertama yang rasionya kurang ideal. */
  const checkFiles = useCallback(async (files: File[], target: UploadRatioTarget) => {
    let firstWarning: UploadRatioVerdict | null = null;
    for (const file of files) {
      const dimensions = await readImageDimensions(file);
      const next = evaluateUploadRatio(dimensions?.width ?? null, dimensions?.height ?? null, target);
      if (next.status === 'warn' && !firstWarning) {
        firstWarning = { ...next, message: `${file.name}: ${next.message}` };
      }
    }
    setVerdict(firstWarning);
    return firstWarning;
  }, []);

  const clear = useCallback(() => setVerdict(null), []);

  return { verdict, checkFile, checkFiles, clear };
}

export function UploadRatioNotice({ verdict, className }: { verdict: UploadRatioVerdict | null; className?: string }) {
  if (!verdict || verdict.status !== 'warn') return null;
  return (
    <Alert variant="warning" role="status" className={`py-1 px-2 small mb-2${className ? ` ${className}` : ''}`}>
      {verdict.message}
    </Alert>
  );
}
