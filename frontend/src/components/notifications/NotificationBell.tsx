import { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Badge, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import type { AppNotificationItem } from '../../api/notifications';

function relativeTime(dateString: string): string {
  const then = new Date(dateString).getTime();
  if (isNaN(then)) return dateString || '-';
  const now = Date.now();
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
    <button
      type="button"
      className={`notification-dropdown-item w-100 text-start border-0 bg-transparent px-3 py-2 ${item.isRead ? '' : 'unread'}`}
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
    </button>
  );
}

interface MenuPos { top: number; right: number }

export default function NotificationBell() {
  const navigate = useNavigate();
  const { query, markReadMutation, markAllReadMutation } = useNotifications();
  const { data, isLoading, isError } = query;
  const bellRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos>({ top: 60, right: 16 });

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.items ?? [];
  const latestFive = notifications.slice(0, 5);

  const recalcPos = useCallback(() => {
    if (!bellRef.current) return;
    const rect = bellRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  const handleToggle = useCallback(() => {
    if (!open) recalcPos();
    setOpen((v) => !v);
  }, [open, recalcPos]);

  // Tutup saat klik di luar
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        bellRef.current && bellRef.current.contains(e.target as Node)
      ) return;
      if (
        menuRef.current && menuRef.current.contains(e.target as Node)
      ) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Tutup saat scroll / resize (posisi bisa berubah)
  useEffect(() => {
    if (!open) return;
    const handler = () => { recalcPos(); };
    window.addEventListener('resize', handler, { passive: true });
    window.addEventListener('scroll', handler, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, { capture: true });
    };
  }, [open, recalcPos]);

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const handleItemClick = useCallback(
    (item: AppNotificationItem) => {
      if (!item.isRead) markReadMutation.mutate(item.id);
      if (item.linkTo) {
        try { navigate(item.linkTo); } catch { /* invalid linkTo */ }
      }
      setOpen(false);
    },
    [markReadMutation, navigate],
  );

  const menu = open
    ? ReactDOM.createPortal(
        <div
          ref={menuRef}
          className="notification-dropdown-menu p-0 dropdown-menu show"
          style={{
            position: 'fixed',
            top: menuPos.top,
            right: menuPos.right,
            zIndex: 9999,
          }}
          role="menu"
          aria-label="Notifikasi"
        >
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

          {!isLoading && !isError && latestFive.map((item) => (
            <NotificationItemRow key={item.id} item={item} onClick={handleItemClick} />
          ))}

          <div className="border-top">
            <button
              type="button"
              className="w-100 text-center text-decoration-none fw-semibold small py-2 border-0 bg-transparent"
              onClick={() => { navigate('/notifications'); setOpen(false); }}
            >
              Lihat semua notifikasi →
            </button>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={bellRef}
        type="button"
        id="notification-bell-toggle"
        className="notification-bell-toggle position-relative p-0 border-0 bg-transparent"
        aria-label={`Notifikasi${unreadCount > 0 ? `, ${unreadCount} belum dibaca` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={handleToggle}
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
      </button>
      {menu}
    </>
  );
}
