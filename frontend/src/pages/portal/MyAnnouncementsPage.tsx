import { useQuery } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap';
import EmptyState from '../../components/common/EmptyState';
import SafeImage from '../../components/common/SafeImage';
import { getResource } from '../../api/resources';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import type { Announcement } from '../../types';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import { getOfficialAnnouncementFallbackImage } from '../../data/officialKost48Content';
import PageHeader from '../../components/common/PageHeader';
import { formatDateOnly } from '../../utils/dateTime';



export default function MyAnnouncementsPage() {
  const navigate = useNavigate();
  const { stage, isLoading: isStageLoading } = useTenantPortalStage();

  const query = useQuery({
    queryKey: ['portal-announcements'],
    queryFn: () => getResource<{ items: Announcement[] }>('/announcements/active'),
  });

  if (!isStageLoading && stage !== 'occupied') {
    return <Navigate to="/portal/bookings" replace />;
  }

  const items = Array.isArray(query.data?.items) ? query.data.items : [];
  const validatedItems = items.map((item) => ({
    id: item?.id ?? 0,
    title: item?.title?.trim() || 'Pengumuman',
    content: item?.content?.trim() || '',
    isPinned: Boolean(item?.isPinned),
    audience: item?.audience === 'ALL' || item?.audience === 'TENANT' ? item.audience : undefined,
    publishedAt: item?.publishedAt || item?.createdAt || null,
    expiresAt: item?.expiresAt || null,
    imageUrl: item?.imageUrl || null,
  })).filter((item) => item.id > 0);

  return (
    <div>
      <PageHeader
        eyebrow="Portal Penghuni"
        title="Pengumuman"
        description="Informasi penting dari pengelola KOST48 untuk seluruh penghuni."
      />
      <div className="tenant-announcements-compact-page">
      {query.isLoading ? <div className="py-4 text-center"><Spinner animation="border" /></div> : null}
      {query.isError ? (
        <Alert variant="danger">
          <div className="fw-semibold">Gagal memuat pengumuman aktif</div>
          <div className="small mt-1">Silakan coba lagi atau hubungi admin jika masalah berlanjut.</div>
        </Alert>
      ) : null}

      {!query.isLoading && !query.isError && !validatedItems.length ? (
        <EmptyState
          icon="📢"
          title="Belum ada pengumuman aktif"
          description="Jika ada informasi penting dari pengelola, pengumuman akan muncul dari banner di atas."
        />
      ) : null}

      <div className="d-grid gap-3">
        {validatedItems.map((item) => (
          <Card key={item.id} className="content-card tenant-announcement-card border-0">
            <Card.Body>
              <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-3">
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                    <h5 className="mb-0">{item.title}</h5>
                    {item.isPinned ? <Badge bg="warning" text="dark">Disematkan</Badge> : null}
                    {item.audience ? <Badge bg="secondary">{item.audience === 'ALL' ? 'Semua Pengguna' : 'Penghuni'}</Badge> : null}
                  </div>
                  <div className="app-caption">
                    Dipublikasikan {formatDateOnly(item.publishedAt)}
                    {item.expiresAt ? ` · Berlaku sampai ${formatDateOnly(item.expiresAt)}` : ''}
                  </div>
                </div>
                <Button variant="outline-primary" size="sm" onClick={() => navigate(`/portal/announcements/${item.id}`)}>Lihat</Button>
              </div>

              <div className="mb-3 tenant-announcement-list-image">
                <SafeImage
                  src={item.imageUrl ? (resolveAbsoluteFileUrl(item.imageUrl) ?? item.imageUrl) : getOfficialAnnouncementFallbackImage()}
                  alt={item.title}
                  fallbackTitle="Gambar pengumuman belum tersedia"
                  fallbackDescription="Pengumuman tetap bisa dibaca dari teks di bawah."
                  resolveUrl={false}
                />
              </div>
              <div className="announcement-body-text">{item.content || '(Tidak ada konten)'}</div>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
    </div>
  );
}
