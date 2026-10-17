import { useNavigate } from 'react-router-dom';
import ModeSwitch from '../../components/cepat/ModeSwitch';
import { useAuth } from '../../context/AuthContext';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import { persistModeChoice, switchModeRoute, type AppMode } from '../../utils/modeCepat';
import type { UserRole } from '../../types';
import CepatHome from './CepatHome';
import '../../styles/18-cepat.css';

const ROLE_LABEL: Record<UserRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  STAFF: 'Staff',
  TENANT: 'Penghuni',
};

/**
 * Shell Mode Cepat — route `/cepat`, di luar `AppLayout`.
 *
 * Sengaja tidak memakai `AppLayout`: sidebar, topbar, dan CSS halaman Normal
 * tidak boleh berubah untuk increment ini (gate AIDL-02). Shell ini hanya
 * membawa header sendiri + saklar dua mode + isi kartu per role.
 */
export default function CepatShell() {
  const { user } = useAuth();
  const { stage } = useTenantPortalStage();
  const navigate = useNavigate();
  useDocumentTitle('Mode Cepat');

  if (!user) return null;

  const handleMode = (mode: AppMode) => {
    if (mode === 'cepat') return;
    persistModeChoice(user.role, user.id, mode);
    navigate(switchModeRoute(mode, user.role, stage), { replace: true });
  };

  return (
    <div className="cepat-shell">
      <header className="cepat-header">
        <div className="cepat-brand">
          <span className="cepat-brand-mark" aria-hidden="true">⚡</span>
          <span className="cepat-brand-copy">
            <strong>KOST48 · Mode Cepat</strong>
            <small>{ROLE_LABEL[user.role] ?? user.role} · {user.fullName}</small>
          </span>
        </div>
        <div className="cepat-header-actions">
          <ModeSwitch active="cepat" onSelect={handleMode} />
        </div>
      </header>

      <main className="cepat-main">
        <CepatHome role={user.role} stage={stage} />
      </main>

      <footer className="cepat-footer">
        <span>
          Mode Cepat menampilkan keputusan dari aturan yang sudah ada. AI hanya untuk owner dan
          tidak dipanggil saat halaman ini dibuka.
        </span>
      </footer>
    </div>
  );
}
