import '../../styles/tenant-area';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap';
import EmptyState from '../../components/common/EmptyState';
import SafeImage from '../../components/common/SafeImage';
import { getResource } from '../../api/resources';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import type { Announcement } from '../../types';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import { getOfficialAnnouncementFallbackImage } from '../../data/officialKost48Content';
import { formatDateOnly } from '../../utils/dateTime';



function normalizeAnnouncement(item: Announcement | undefined | null) {
  if (!item || !item.id) return null;
  return {
    ...item,
    title: item.title?.trim() || 'Pengumuman',
    content: item.content?.trim() || 'Belum ada isi pengumuman.',
    publishedAt: item.publishedAt || item.createdAt || null,
  };
}

export default function TenantAnnouncementDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { stage, isLoading: isStageLoading } = useTenantPortalStage();

  const query = useQuery({
    queryKey: ['portal-announcements', 'detail', id],
    queryFn: () => getResource<{ items: Announcement[] }>('/announcements/active'),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const item = useMemo(() => {
    const targetId = Number(id);
    const items = Array.isArray(query.data?.items) ? query.data.items : [];
    return normalizeAnnouncement(items.find((announcement) => Number(announcement.id) === targetId));
  }, [query.data, id]);

  if (!isStageLoading && stage !== 'occupied') return <Navigate to="/portal/bookings" replace />;

  return (
    <div className="tenant-announcement-detail-page">
      {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
      {query.isError ? <Alert variant="danger">Gagal memuat pengumuman. Coba lagi atau hubungi admin.</Alert> : null}

      {!query.isLoading && !query.isError && !item ? (
        <EmptyState
          icon="📢"
          title="Pengumuman tidak ditemukan"
          description="Pengumuman mungkin sudah tidak aktif. Buka daftar pengumuman untuk melihat informasi terbaru."
          action={{ label: 'Lihat Pengumuman', onClick: () => navigate('/portal/announcements') }}
        />
      ) : null}

      {item ? (
        <Card className="content-card tenant-announcement-detail-card border-0">
          <Card.Body>
            <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-3">
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                  <h3 className="mb-0">{item.title}</h3>
                  {item.isPinned ? <Badge bg="warning" text="dark">Disematkan</Badge> : null}
                  {item.audience ? <Badge bg="secondary">{item.audience === 'ALL' ? 'Semua Pengguna' : 'Penghuni'}</Badge> : null}
                </div>
                <div className="app-caption">
                  Dipublikasikan {formatDateOnly(item.publishedAt)}
                  {item.expiresAt ? ` · Berlaku sampai ${formatDateOnly(item.expiresAt)}` : ''}
                </div>
              </div>
              <Button variant="outline-primary" size="sm" onClick={() => navigate('/portal/announcements')}>Daftar Pengumuman</Button>
            </div>

            <div className="tenant-announcement-detail-image">
              <SafeImage
                src={item.imageUrl ? (resolveAbsoluteFileUrl(item.imageUrl) ?? item.imageUrl) : getOfficialAnnouncementFallbackImage()}
                alt={item.title}
                fallbackTitle="Gambar pengumuman belum tersedia"
                fallbackDescription="Pengumuman tetap bisa dibaca dari teks di bawah."
                resolveUrl={false}
              />
            </div>

            <div className="announcement-body-text tenant-announcement-detail-body">{item.content}</div>
          </Card.Body>
        </Card>
      ) : null}
    </div>
  );
}
