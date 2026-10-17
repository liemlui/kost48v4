import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CEPAT_PATH, persistModeChoice, shouldShowFloatingSwitch } from '../../utils/modeCepat';
import ModeSwitch from '../cepat/ModeSwitch';

/**
 * Jalan masuk Normal → Cepat tanpa menyentuh `AppLayout`.
 *
 * Saklar permanen di header Normal akan mengubah berkas shell lama — hal yang
 * dilarang gate AIDL-02. Kontrol ini karena itu mengambang di atas halaman
 * Normal yang sudah login, dan disembunyikan di halaman publik/login/Cepat.
 */
export default function ModeCepatFloatingSwitch() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (!user || !shouldShowFloatingSwitch(pathname, true)) return null;

  return (
    <div className="mode-cepat-floating" data-testid="mode-cepat-floating">
      <ModeSwitch
        active="normal"
        label="Saklar Mode Cepat"
        onSelect={(mode) => {
          if (mode === 'normal') return;
          persistModeChoice(user.role, user.id, mode);
          navigate(CEPAT_PATH);
        }}
      />
    </div>
  );
}
