import PageHeader from '../../components/common/PageHeader';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Badge, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { useNotificationsInfinite } from '../../hooks/useNotificationsInfinite';
import type { AppNotificationItem } from '../../api/notifications';
import PushToggle from '../../components/notifications/PushToggle';
import { formatDateOnly, formatDateTimeWib } from '../../utils/dateTime';

// ── Helpers ────────────────────────────────────────────────────────────────────

function isSameDay(dateString: string, ref: Date): boolean {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === ref.getFullYear()
    && d.getMonth() === ref.getMonth()
    && d.getDate() === ref.getDate();
}

function formatGroupHeader(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString || '-';
  const now = new Date();
  if (isSameDay(dateString, now)) {
    return `Hari ini — ${formatDateOnly(d)}`;
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(dateString, yesterday)) {
    return `Kemarin — ${formatDateOnly(d)}`;
  }
  const diffMs = new Date().getTime() - d.getTime();
  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return `Minggu ini — ${formatDateOnly(d)}`;
  }
  return formatDateOnly(d);
}

function getDayKey(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'unknown';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDateTime(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString || '-';
  return formatDateTimeWib(d);
}

// Sembunyikan notifikasi data uji di production
function isTestNotification(item: AppNotificationItem): boolean {
  if (!import.meta.env.PROD) return false;
  const title = (item.title ?? '').toLowerCase();
  const body = (item.body ?? '').toLowerCase();
  return title.includes('int test') || body.includes('int test')
    || title.includes('harap abaikan') || body.includes('harap abaikan');
}

// Kategori datang dari backend saat notifikasi dibuat. Jangan infer dari
// entityType karena sebuah entity (mis. Stay) bisa memicu event finansial
// maupun operasional.
type FilterCategory = 'SEMUA' | 'KEUANGAN' | 'OPERASIONAL' | 'SISTEM';

function getCategory(item: AppNotificationItem): Exclude<FilterCategory, 'SEMUA'> {
  switch (item.category) {
    case 'FINANCE': return 'KEUANGAN';
    case 'OPERATIONS': return 'OPERASIONAL';
    case 'SYSTEM':
    default:
      return 'SISTEM';
  }
}

const FILTER_TABS: { id: FilterCategory; label: string }[] = [
  { id: 'SEMUA', label: 'Semua' },
  { id: 'KEUANGAN', label: 'Keuangan' },
  { id: 'OPERASIONAL', label: 'Operasional' },
  { id: 'SISTEM', label: 'Sistem' },
];

const PAGE_SIZE = 20;

// ── Component ──────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const navigate = useNavigate();
  // Infinite query — mengambil seluruh notifikasi dengan pagination server-side
  const {
    data: infiniteData,
    isLoading: isInfiniteLoading,
    isError: isInfiniteError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchInfinite,
  } = useNotificationsInfinite();

  // Mutation hook memakai cache yang sama tanpa membuat request halaman pertama
  // kedua; data halaman tetap datang dari infinite query di atas.
  const firstPageQuery = useNotifications({ limit: PAGE_SIZE, offset: 0 }, { enabled: false });
  const { markReadMutation, markAllReadMutation } = firstPageQuery;

  // Gabung semua halaman
  const allNotifications = useMemo(
    () => infiniteData?.pages.flatMap((page) => page.items) ?? [],
    [infiniteData],
  );

  const total = infiniteData?.pages[0]?.total ?? 0;
  const unreadCount = infiniteData?.pages[0]?.unreadCount ?? 0;

  // PERTIMBANGAN: unreadCount hanya dari halaman pertama adalah perkiraan.
  // Tepat karena API mengembalikan unreadCount global (bukan per halaman).

  const [activeFilter, setActiveFilter] = useState<FilterCategory>('SEMUA');

  // Sembunyikan notifikasi INT TEST di production
  const withoutTestData = useMemo(
    () => allNotifications.filter((item) => !isTestNotification(item)),
    [allNotifications],
  );

  // Filter berdasarkan tab kategori
  const filtered = useMemo(() => {
    if (activeFilter === 'SEMUA') return withoutTestData;
    return withoutTestData.filter((item) => getCategory(item) === activeFilter);
  }, [withoutTestData, activeFilter]);

  // Group per hari
  type DayGroup = { dayKey: string; header: string; items: AppNotificationItem[] };
  const grouped = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>();
    for (const item of filtered) {
      const key = getDayKey(item.createdAt);
      if (!map.has(key)) {
        map.set(key, { dayKey: key, header: formatGroupHeader(item.createdAt), items: [] });
      }
      map.get(key)!.items.push(item);
    }
    return Array.from(map.values());
  }, [filtered]);

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const handleItemClick = useCallback(
    (item: AppNotificationItem) => {
      if (!item.isRead) {
        markReadMutation.mutate(item.id);
      }
      if (item.linkTo) {
        try {
          navigate(item.linkTo);
        } catch {
          // safe: invalid linkTo falls through
        }
      }
    },
    [markReadMutation, navigate],
  );

  const isLoading = isInfiniteLoading;
  const isError = isInfiniteError;

  return (
    <div>
      <PageHeader
        eyebrow="Notifikasi"
        title="Notifikasi"
        description="Pemberitahuan sistem, tagihan, dan aktivitas terkait akun kamu."
      />
      <div className="container py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <h3 className="mb-0">Notifikasi</h3>
          {unreadCount > 0 && (
            <Badge pill bg="danger" className="fs-6">
              {unreadCount} belum dibaca
            </Badge>
          )}
          {unreadCount === 0 && !isLoading && total > 0 && (
            <Badge pill bg="secondary" className="fs-6">
              Semua sudah dibaca
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline-primary"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
          >
            {markAllReadMutation.isPending ? 'Menandai...' : 'Tandai semua dibaca'}
          </Button>
        )}
      </div>

      <PushToggle />

      {/* Filter Tabs */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={activeFilter === tab.id ? 'primary' : 'outline-secondary'}
            onClick={() => setActiveFilter(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && !isLoading && (
        <Alert variant="danger" className="d-flex align-items-center justify-content-between">
          <span>Gagal memuat notifikasi. Silakan coba lagi.</span>
          <Button variant="outline-danger" size="sm" onClick={() => refetchInfinite()}>
            Coba Lagi
          </Button>
        </Alert>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="text-center py-5">
          <div style={{ fontSize: '3rem' }} role="img" aria-hidden="true">🔔</div>
          <h5 className="mt-3 text-muted">
            {total === 0 ? 'Belum ada notifikasi' : 'Tidak ada notifikasi untuk kategori ini'}
          </h5>
          <p className="text-muted small">Notifikasi dari pengelola kos akan muncul di sini.</p>
        </div>
      )}

      {!isLoading && !isError && grouped.length > 0 && (
        <>
          {grouped.map((group) => (
            <div key={group.dayKey} className="mb-3">
              {/* Date separator */}
              <div className="d-flex align-items-center gap-2 mb-2">
                <small
                  className="text-muted fw-semibold text-uppercase"
                  style={{ fontSize: '0.7rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}
                >
                  {group.header}
                </small>
                <div className="flex-grow-1 border-bottom" />
              </div>

              <div className="list-group">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`list-group-item list-group-item-action d-flex align-items-start gap-3 p-3 ${item.isRead ? '' : 'list-group-item-light'}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <span
                      className={`notification-dot mt-2 flex-shrink-0 ${item.isRead ? 'read' : 'unread'}`}
                      aria-hidden="true"
                    />
                    <div className="flex-grow-1 min-w-0">
                      <div className={`notification-title ${item.isRead ? '' : 'fw-bold'}`}>
                        {item.title}
                      </div>
                      <div className="text-muted small mt-1">{item.body}</div>
                      <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                        <span className="text-muted small">
                          {formatDateTime(item.createdAt)}
                        </span>
                        <Badge pill bg={item.isRead ? 'secondary' : 'primary'} className="small">
                          {item.isRead ? 'Sudah dibaca' : 'Belum dibaca'}
                        </Badge>
                        {item.linkTo && (
                          <span className="text-primary small" style={{ cursor: 'pointer' }}>
                            Klik untuk buka →
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Muat lebih banyak — server-side pagination */}
          {hasNextPage && (
            <div className="text-center mt-3">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Memuat...' : `Muat lebih banyak (${total - allNotifications.length} tersisa)`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
    </div>
  );
}
