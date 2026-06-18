import { useAuthenticatedMediaUrl } from '../../hooks/useAuthenticatedMediaUrl';
import { tenantProfilePhotoUrl } from '../../api/tenants';

// PUB-FOTO-PROFIL-KTP: avatar tenant. Default foto profil diturunkan dari foto KTP pertama
// (keputusan owner M02). Saat foto tidak ada/ gagal dimuat, jatuh ke inisial nama.

function getInitials(name?: string | null) {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

interface TenantAvatarProps {
  tenantId?: number | null;
  fullName?: string | null;
  /** URL eksplisit bila sudah diketahui; kalau kosong tapi ada tenantId, diturunkan otomatis. */
  photoUrl?: string | null;
  /** Setel false untuk hanya menampilkan inisial tanpa mencoba memuat foto. */
  enabled?: boolean;
  className?: string;
}

export default function TenantAvatar({ tenantId, fullName, photoUrl, enabled = true, className }: TenantAvatarProps) {
  const source = enabled
    ? (photoUrl ?? (tenantId ? tenantProfilePhotoUrl(tenantId) : null))
    : null;
  const { url, failed } = useAuthenticatedMediaUrl(source);
  const showPhoto = Boolean(url) && !failed;

  return (
    <span
      className={`user-avatar${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={`Avatar ${fullName ?? 'Penghuni'}`}
    >
      {showPhoto ? (
        <img src={url ?? undefined} alt="" className="user-avatar-img" />
      ) : (
        getInitials(fullName)
      )}
    </span>
  );
}
