import { useCallback, useRef } from 'react';
import { Badge, Dropdown, Spinner } from 'react-bootstrap';
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

function truncateBody(body: string, maxLen = 60): string {
  if (body.length <= maxLen) return body;
  return `${body.slice(0, maxLen).trimEnd()}…`;
}

interface NotificationItemRowProps {
  item: AppNotificationItem;
  onClick: (item: AppNotificationItem) => void;
}

function NotificationItemRow({ item, onClick }: NotificationItemRowProps) {
  return (
    <Dropdown.Item
      as="button"
      className={`notification-dropdown-item ${item.isRead ? '' : 'unread'}`}
      onClick={() => onClick(item)}
    >
      <div className="d-flex align-items-start gap-2">
        <span
          className={`notification-dot mt-1 flex-shrink-0 ${item.isRead ? 'read' : 'unread'}`}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div className={`notification-title text-truncate ${item.isRead ? '' : 'fw-bold'}`}>
            {item.title}
          </div>
          <div className="notification-body text-truncate text-muted small">
            {truncateBody(item.body)}
          </div>
          <div className="notification-time text-muted small">
            {relativeTime(item.createdAt)}
          </div>
        </div>
      </div>
    </Dropdown.Item>
  );
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { query, markReadMutation, markAllReadMutation } = useNotifications();
  const { data, isLoading, isError } = query;
  const toggleRef = useRef<HTMLButtonElement>(null);

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.items ?? [];
  const latestFive = notifications.slice(0, 5);

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
    <Dropdown align="end" onToggle={(isOpen) => { if (!isOpen) toggleRef.current?.blur(); }}>
      <Dropdown.Toggle
        ref={toggleRef}
        variant="link"
        id="notification-bell-toggle"
        className="notification-bell-toggle position-relative p-0 border-0"
        aria-label={`Notifikasi${unreadCount > 0 ? `, ${unreadCount} belum dibaca` : ''}`}
      >
        <span role="img" aria-hidden="true" style={{ fontSize: '1.35rem', lineHeight: 1 }}>🔔</span>
        {unreadCount > 0 && (
          <Badge
            pill
            bg="danger"
            className="position-absolute top-0 start-100 translate-middle"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="notification-dropdown-menu p-0" style={{ minWidth: 320, maxWidth: 380 }}>
        <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
          <span className="fw-semibold">Notifikasi</span>
          {unreadCount > 0 && (
            <button
              type="button"
              className="btn btn-link btn-sm text-decoration-none p-0"
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
            >
              {markAllReadMutation.isPending ? 'Menandai...' : 'Tandai semua dibaca'}
            </button>
          )}
        </div>

        {isLoading && (
          <div className="d-flex justify-content-center py-4">
            <Spinner animation="border" size="sm" />
          </div>
        )}

        {isError && !isLoading && (
          <div className="px-3 py-3 text-center text-muted small">Gagal memuat notifikasi</div>
        )}

        {!isLoading && !isError && latestFive.length === 0 && (
          <div className="px-3 py-4 text-center text-muted">Belum ada notifikasi</div>
        )}

        {!isLoading &&
          !isError &&
          latestFive.map((item) => (
            <NotificationItemRow key={item.id} item={item} onClick={handleItemClick} />
          ))}

        <div className="border-top">
          <Dropdown.Item
            as="button"
            className="text-center text-decoration-none fw-semibold small py-2"
            onClick={() => navigate('/notifications')}
          >
            Lihat semua notifikasi →
          </Dropdown.Item>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
}