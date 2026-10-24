import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/ToastProvider';
import { PageLoadingSkeleton } from '../common/SkeletonLoader';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import {
  TENANT_STAGE_NAMES,
  getDefaultRoute,
  type Role,
  type TenantPortalStage,
} from '../../config/navigation';

type ProtectedRouteProps = {
  /** Peran yang boleh membuka rute ini. Tidak diisi = semua peran ber-token (perilaku lama). */
  allowRoles?: Role[];
  /**
   * Khusus TENANT: tahap portal yang boleh membuka rute ini (`browsing`/`booking` = calon,
   * `occupied` = penghuni). Tidak diisi = semua tahap. Sumber tahap tetap
   * `useTenantPortalStage` (`/stays/me/current` + `/tenant/bookings/my`).
   */
  allowStages?: TenantPortalStage[];
};

function getRoleDeniedMessage(role?: string): string {
  if (role === 'TENANT') {
    return 'Halaman ini bukan menu penghuni. Pilihan yang tersedia ada di "Lihat semua menu".';
  }
  return 'Area portal penghuni hanya dapat dibuka dengan akun penghuni.';
}

function getStageDeniedMessage(stage: TenantPortalStage): string {
  // S6: pesan menyebut tahap apa adanya dan menunjuk jalan keluar (§8.8: tidak ada
  // fitur tersembunyi tanpa "Lihat semua menu"), bukan layar kosong.
  return `Halaman ini untuk penghuni yang sudah punya sewa aktif. Tahap akun Anda sekarang: ${TENANT_STAGE_NAMES[stage]}. Buka "Lihat semua menu" untuk pilihan lain.`;
}

export default function ProtectedRoute({ allowRoles, allowStages }: ProtectedRouteProps) {
  const { token, user, loading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const { stage, isLoading: isStageLoading } = useTenantPortalStage();

  const isTenant = user?.role === 'TENANT';
  const hasRoleRule = Array.isArray(allowRoles) && allowRoles.length > 0;
  const hasStageRule = isTenant && Array.isArray(allowStages) && allowStages.length > 0;

  // Tahap TENANT baru bermakna setelah `/stays/me/current` selesai; jangan menolak prematur.
  const waitingStage = hasStageRule && isStageLoading;

  const roleDenied = Boolean(user) && hasRoleRule && !allowRoles!.includes(user!.role);
  const stageDenied = Boolean(user) && hasStageRule && !waitingStage && !allowStages!.includes(stage);
  const isDenied = (roleDenied || stageDenied) && !waitingStage;

  const redirectTo = user ? getDefaultRoute(user.role, stage) : '/login';
  const deniedMessage = roleDenied ? getRoleDeniedMessage(user?.role) : getStageDeniedMessage(stage);

  const deniedNotifiedRef = useRef(false);
  useEffect(() => {
    deniedNotifiedRef.current = false;
  }, [location.pathname]);

  useEffect(() => {
    // S6: penolakan selalu memberi pesan jelas lalu mengalihkan — bukan spinner abadi.
    if (!isDenied || deniedNotifiedRef.current) return;
    deniedNotifiedRef.current = true;
    toast(deniedMessage, 'warning', 6000);
  }, [isDenied, deniedMessage, toast]);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Spinner />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (waitingStage) return <PageLoadingSkeleton />;

  if (isDenied) {
    return <Navigate to={redirectTo} replace state={{ deniedFrom: location.pathname, deniedMessage }} />;
  }

  return <Outlet />;
}
