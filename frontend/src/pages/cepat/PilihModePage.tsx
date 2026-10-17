import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  CEPAT_PATH,
  getStoredMode,
  isModeChoiceRole,
  persistModeChoice,
  switchModeRoute,
  type AppMode,
} from '../../utils/modeCepat';
import '../../styles/18-cepat.css';

/**
 * Layar pilih-mode setelah login — hanya OWNER/ADMIN (CEPAT-PILIH).
 * Pilihan disimpan per pengguna; perpindahan berikutnya tidak perlu login ulang.
 */
export default function PilihModePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle('Pilih Mode');

  if (!user) return null;
  if (!isModeChoiceRole(user.role)) return <Navigate to={CEPAT_PATH} replace />;

  const current = getStoredMode(user.id);

  const choose = (mode: AppMode) => {
    persistModeChoice(user.role, user.id, mode);
    navigate(switchModeRoute(mode, user.role), { replace: true });
  };

  return (
    <div className="cepat-shell pilih-mode-shell">
      <main className="pilih-mode-main">
        <div className="pilih-mode-head">
          <span className="cepat-eyebrow">KOST48</span>
          <h1>Mau bekerja dengan cara apa hari ini?</h1>
          <p>
            Dua mode memakai data dan aturan yang sama. Kamu bisa berganti kapan saja lewat saklar
            di header — tanpa keluar akun.
          </p>
        </div>

        <div className="pilih-mode-grid">
          <button
            type="button"
            className={`pilih-mode-card${current === 'cepat' ? ' is-current' : ''}`}
            onClick={() => choose('cepat')}
            aria-pressed={current === 'cepat'}
          >
            <span className="pilih-mode-icon" aria-hidden="true">⚡</span>
            <span className="pilih-mode-title">Mode Cepat</span>
            <span className="pilih-mode-desc">
              3–5 kartu keputusan, langkah berikutnya, dan tautan ke pekerjaan yang menunggu.
              Cocok untuk memulai hari dari ponsel.
            </span>
            <span className="pilih-mode-badge">{current === 'cepat' ? 'Terakhir dipilih' : 'Pilih Cepat'}</span>
          </button>

          <button
            type="button"
            className={`pilih-mode-card${current === 'normal' ? ' is-current' : ''}`}
            onClick={() => choose('normal')}
            aria-pressed={current === 'normal'}
          >
            <span className="pilih-mode-icon" aria-hidden="true">📋</span>
            <span className="pilih-mode-title">Mode Normal</span>
            <span className="pilih-mode-desc">
              Seluruh menu, tabel, laporan, dan pengaturan seperti sekarang. Cocok untuk mencari,
              mengaudit, dan mengoreksi data.
            </span>
            <span className="pilih-mode-badge">{current === 'normal' ? 'Terakhir dipilih' : 'Pilih Normal'}</span>
          </button>
        </div>

        <p className="pilih-mode-footnote">
          Pilihan diingat untuk akun ini. STAFF dan penghuni langsung masuk Mode Cepat dan tetap
          bisa berganti lewat saklar.
        </p>
      </main>
    </div>
  );
}
