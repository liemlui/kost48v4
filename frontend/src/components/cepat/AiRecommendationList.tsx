import { Link } from 'react-router-dom';
import type { SafeAiPriorityAction } from '../../utils/aiRecommendationLinks';

const SEVERITY_TONE: Record<string, string> = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'secondary',
};

/**
 * Daftar rekomendasi AI. Hanya `safeRoute` (hasil allowlist) yang dirender
 * sebagai tautan; rute yang tidak dikenali tetap tampil sebagai teks.
 */
export default function AiRecommendationList({ items }: { items: SafeAiPriorityAction[] }) {
  if (!items.length) {
    return <p className="small text-muted mb-0">Tidak ada rekomendasi prioritas dari AI.</p>;
  }

  return (
    <ul className="cepat-ai-list">
      {items.map((item, index) => (
        <li className="cepat-ai-item" key={`${item.title}-${index}`}>
          <span className={`badge bg-${SEVERITY_TONE[item.severity] ?? 'secondary'} text-${item.severity === 'HIGH' || item.severity === 'MEDIUM' ? 'dark' : 'white'}`}>
            {item.severity}
          </span>
          <span className="cepat-ai-copy">
            <span className="cepat-ai-title">{item.title}</span>
            {item.reason ? <span className="cepat-ai-reason">{item.reason}</span> : null}
            {item.safeRoute ? (
              <Link className="cepat-ai-link" to={item.safeRoute}>Buka halaman terkait →</Link>
            ) : (
              <span className="cepat-ai-link is-disabled" title="Rute dari AI tidak ada di allowlist">Tautan tidak tersedia</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
