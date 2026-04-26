import { useQuery } from '@tanstack/react-query';
import { Alert, Badge, Card } from 'react-bootstrap';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { HeroSkeleton } from '../../components/common/SkeletonLoader';
import { getResource } from '../../api/resources';
import type { Announcement } from '../../types';

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function MyAnnouncementsPage() {
  const query = useQuery({
    queryKey: ['portal-announcements'],
    queryFn: () => getResource<{ items: Announcement[] }>('/announcements/active'),
  });

  // Defensive handling untuk data yang mungkin tidak sesuai contract
  const items = Array.isArray(query.data?.items) ? query.data.items : [];

  // Validasi tambahan untuk setiap item
  const validatedItems = items.map((item) => ({
    id: item?.id ?? 0,
    title: item?.title?.trim() || 'Pengumuman',
    content: item?.content?.trim() || '',
    isPinned: Boolean(item?.isPinned),
    audience: item?.audience === 'ALL' || item?.audience === 'TENANT' ? item.audience : undefined,
    publishedAt: item?.publishedAt || item?.createdAt || null,
    expiresAt: item?.expiresAt || null,
    imageUrl: item?.imageUrl || null,
  })).filter((item) => item.id > 0); // Filter out items dengan ID tidak valid

  return (
    <div>
      <PageHeader
        title="Pengumuman"
        description="Informasi terbaru dari pengelola kost, jadwal penting, dan pemberitahuan yang masih aktif."
      />

      {query.isLoading ? <HeroSkeleton /> : null}
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
          description="Jika ada informasi penting dari pengelola, pengumuman akan muncul di halaman ini."
        />
      ) : null}

      <div className="d-grid gap-3">
        {validatedItems.map((item) => (
          <Card key={item.id} className="content-card border-0">
            <Card.Body>
              <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-3">
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                    <h5 className="mb-0">{item.title}</h5>
                    {item.isPinned ? <Badge bg="warning" text="dark">Pinned</Badge> : null}
                    {item.audience ? <Badge bg="secondary">{item.audience === 'ALL' ? 'Semua Pengguna' : 'Tenant'}</Badge> : null}
                  </div>
                  <div className="app-caption">
                    Dipublikasikan {formatDate(item.publishedAt)}
                    {item.expiresAt ? ` · Berlaku sampai ${formatDate(item.expiresAt)}` : ''}
                  </div>
                </div>
              </div>

              {item.imageUrl ? <div className="mb-3"><img src={item.imageUrl} alt={item.title} style={{ width: 180, maxWidth: '100%', height: 110, objectFit: 'cover', borderRadius: 8 }} /></div> : null}
              <div className="announcement-body-text">{item.content || '(Tidak ada konten)'}</div>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}
