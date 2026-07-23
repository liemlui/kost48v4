import '../../styles/tenant-area';
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
    queryFn: async () => {
      try {
        // Gunakan endpoint /announcements/:id langsung, bukan filter client-side
        const response = await getResource<{ data: Announcement }>(`/announcements/${id}`);
        // Backend response: { message, data: { ... } } — getResource mengembalikan data
        if (response && typeof response === 'object' && 'data' in response) {
          return (response as any).data as Announcement;
        }
        return response as unknown as Announcement;
      } catch (err: any) {
        // Tangkap 403/404 sebagai error khusus agar UI menampilkan "tidak berhak/tidak tersedia"
        const status = err?.response?.status;
        if (status === 403 || status === 404) {
          throw new Error('NOT_AVAILABLE');
        }
        throw err;
      }
    },
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const item = normalizeAnnouncement(query.data);

  if (!isStageLoading && stage !== 'occupied') return <Navigate to="/portal/bookings" replace />;

  // Deteksi error "tidak tersedia/tidak berhak"
  const isNotAvailable = query.isError && query.error?.message === 'NOT_AVAILABLE';

  return (
    <div className="tenant-announcement-detail-page">
      {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}

      {isNotAvailable ? (
        <EmptyState
          icon="🔒"
          title="Pengumuman tidak tersedia"
          description="Pengumuman ini mungkin sudah tidak aktif, belum tayang, atau kamu tidak memiliki akses. Buka daftar pengumuman untuk melihat informasi terbaru."
          action={{ label: 'Lihat Pengumuman', onClick: () => navigate('/portal/announcements') }}
        />
      ) : null}

      {query.isError && !isNotAvailable ? (
        <Alert variant="danger">Gagal memuat pengumuman. Coba lagi atau hubungi admin.</Alert>
      ) : null}

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
