import { Alert } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { generateBrief, getOwnerAiStatus, type BriefResult } from '../../api/ai';
import AiAssistButton from '../ai/AiAssistButton';
import AiResultPanel from '../ai/AiResultPanel';
import AiRecommendationList from './AiRecommendationList';
import { toSafeAiPriorityActions } from '../../utils/aiRecommendationLinks';

/**
 * Panel agenda AI untuk Mode Cepat OWNER (AIDL-03).
 *
 * Batas yang disengaja:
 * - Tidak ada panggilan AI saat halaman dibuka. Satu-satunya jalur adalah
 *   tombol manual; status AI dibaca lewat GET status (bukan generate).
 * - `priorityActions[].route` dari AI TIDAK pernah dipakai mentah. Semua rute
 *   lewat `toSafeAiPriorityActions()` → allowlist `decisionRoutes`.
 * - Saat AI mati/key kosong, panel ini hanya menampilkan keterangan; kartu
 *   aturan di luar panel tetap tampil penuh (CEPAT-AI-MATI).
 */
export default function CepatAiBrief() {
  const statusQuery = useQuery({
    queryKey: ['owner-ai', 'status', 'cepat'],
    queryFn: getOwnerAiStatus,
    staleTime: 300_000,
    retry: 1,
  });

  if (statusQuery.isLoading) return null;

  if (statusQuery.isError) {
    return (
      <Alert variant="light" className="cepat-ai-off small" role="status">
        Status AI belum bisa dibaca. Kartu aturan tetap bisa dipakai; coba muat ulang nanti.
      </Alert>
    );
  }

  const status = statusQuery.data;
  if (!status?.configured) {
    return (
      <Alert variant="light" className="cepat-ai-off small" role="status">
        AI tidak aktif — API key belum diisi. Mode Cepat tetap menampilkan kartu aturan.
      </Alert>
    );
  }
  if (!status.enabled) {
    return (
      <Alert variant="light" className="cepat-ai-off small" role="status">
        AI dimatikan di Pengaturan. Kartu aturan tetap menjadi jalur utama.
      </Alert>
    );
  }

  return (
    <section className="cepat-ai" aria-label="Rekomendasi AI opsional">
      <div className="cepat-ai-head">
        <div>
          <span className="cepat-eyebrow">Opsional · hanya owner</span>
          <h2>Rekomendasi AI</h2>
        </div>
        <span className="cepat-ai-quota">Sisa kuota hari ini: {status.dailyRemaining}/{status.dailyLimit}</span>
      </div>

      <AiAssistButton<BriefResult>
        label="Minta rekomendasi AI (manual)"
        loadingLabel="Menyusun rekomendasi…"
        run={generateBrief}
        renderResult={(result) => (
          <AiResultPanel
            title="Rekomendasi AI"
            mode={result.mode}
            fallback={result.fallback}
            warnings={result.warnings}
            missingData={result.missingData}
            usage={result.usage}
            model={result.model}
          >
            <p className="fw-medium mb-2">{result.result?.summary}</p>
            <AiRecommendationList items={toSafeAiPriorityActions(result.result?.priorityActions)} />
            {!result.result?.priorityActions?.length ? (
              <p className="small text-muted mt-2 mb-0">
                AI tidak memberi aksi prioritas. Kartu aturan di atas tetap menjadi acuan.
              </p>
            ) : null}
          </AiResultPanel>
        )}
      />

      <p className="cepat-ai-note">
        AI tidak dipanggil saat halaman dibuka. Tautan hanya aktif bila rutenya dikenali allowlist;
        rute lain ditampilkan sebagai teks.
      </p>
    </section>
  );
}
