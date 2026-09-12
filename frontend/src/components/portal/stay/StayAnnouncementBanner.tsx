import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getResource } from '../../../api/resources';
import { PORTAL_QUERY_KEYS } from '../../../api/portalQueryKeys';
import type { Announcement } from '../../../types';

export default function StayAnnouncementBanner() {
  const navigate = useNavigate();
  const query = useQuery({
    // T-06: key & staleTime disamakan dengan TenantWorkspaceTabs (shell). Sebelumnya
    // staleTime berbeda (60s vs default) sehingga banner memicu permintaan kedua untuk
    // `/announcements/active` pada halaman yang sama.
    queryKey: PORTAL_QUERY_KEYS.activeAnnouncements,
    queryFn: () => getResource<{ items: Announcement[] }>('/announcements/active'),
  });

  const items = Array.isArray(query.data?.items) ? query.data!.items : [];
  if (!items.length) return null;

  const sorted = [...items].sort((a, b) => {
    const pin = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
    if (pin !== 0) return pin;
    const tb = new Date(b.publishedAt ?? b.createdAt ?? 0).getTime();
    const ta = new Date(a.publishedAt ?? a.createdAt ?? 0).getTime();
    return tb - ta;
  });
  const top = sorted[0];
  const text = (top.content ?? '').trim();
  const count = items.length;

  // Jika >1 pengumuman, klik navigasi ke halaman daftar supaya tenant bisa lihat semua
  const targetUrl = count > 1 ? '/portal/announcements' : `/portal/announcements/${top.id}`;

  return (
    <button
      type="button"
      className="tenant-stay-announcement-banner"
      onClick={() => navigate(targetUrl)}
    >
      <span className="asb-icon" aria-hidden="true">📢</span>
      <span className="asb-body">
        <strong>{(top.title ?? 'Pengumuman').trim() || 'Pengumuman'}</strong>
        {text ? <small>{text.length > 90 ? `${text.slice(0, 90)}…` : text}</small> : null}
      </span>
      <span className="asb-badge">{count} aktif</span>
      <span className="asb-cta">{count > 1 ? 'Lihat semua →' : 'Lihat →'}</span>
    </button>
  );
}
