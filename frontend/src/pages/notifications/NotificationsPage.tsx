import { useCallback } from 'react';
import { Alert, Badge, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import type { AppNotificationItem } from '../../api/notifications';

function relativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHr < 24) return `${diffHr} jam lalu`;
  if (diffDay === 1) return 'Kemarin';
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { query, markReadMutation, markAllReadMutation } = useNotifications();
  const { data, isLoading, isError, refetch } = query;

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.items ?? [];

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

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <h3 className="mb-0">Notifikasi</h3>
          {unreadCount > 0 && (
            <Badge pill bg="danger" className="fs-6">
              {unreadCount} belum dibaca
            </Badge>
          )}
          {unreadCount === 0 && !isLoading && notifications.length > 0 && (
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

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && !isLoading && (
        <Alert variant="danger" className="d-flex align-items-center justify-content-between">
          <span>Gagal memuat notifikasi. Silakan coba lagi.</span>
          <Button variant="outline-danger" size="sm" onClick={() => refetch()}>
            Coba Lagi
          </Button>
        </Alert>
      )}

      {!isLoading && !isError && notifications.length === 0 && (
        <div className="text-center py-5">
          <div style={{ fontSize: '3rem' }} role="img" aria-hidden="true">🔔</div>
          <h5 className="mt-3 text-muted">Belum ada notifikasi</h5>
          <p className="text-muted small">Notifikasi dari pengelola kos akan muncul di sini.</p>
        </div>
      )}

      {!isLoading && !isError && notifications.length > 0 && (
        <div className="list-group">
          {notifications.map((item) => (
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
      )}
    </div>
  );
}