import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import { getResource } from '../../api/resources';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import type { Announcement } from '../../types';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

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
    <div>
      <PageHeader
        eyebrow="Portal Penghuni"
        title="Detail Pengumuman"
        description="Informasi resmi dari pengelola KOST48."
        actionLabel="Kembali"
        onAction={() => navigate('/portal/announcements')}
      />

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
                  Dipublikasikan {formatDate(item.publishedAt)}
                  {item.expiresAt ? ` · Berlaku sampai ${formatDate(item.expiresAt)}` : ''}
                </div>
              </div>
              <Button variant="outline-primary" size="sm" onClick={() => navigate('/portal/announcements')}>Daftar Pengumuman</Button>
            </div>

            {item.imageUrl ? (
              <div className="tenant-announcement-detail-image">
                <img src={resolveAbsoluteFileUrl(item.imageUrl) ?? item.imageUrl} alt={item.title} />
              </div>
            ) : null}

            <div className="announcement-body-text tenant-announcement-detail-body">{item.content}</div>
          </Card.Body>
        </Card>
      ) : null}
    </div>
  );
}
