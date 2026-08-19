import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import NotificationBell from '../notifications/NotificationBell';
import PaymentUrgencyChip from '../payment-urgency/PaymentUrgencyChip';
import Kost48LogoMark from '../common/Kost48LogoMark';
import TenantAvatar from '../common/TenantAvatar';
import { useAuth } from '../../context/AuthContext';
import { getNavigationSections, type TenantFeatures, type TenantPortalStage } from '../../config/navigation';
import { getResource } from '../../api/resources';
import GettingStartedGuide from './GettingStartedGuide';
import type { Announcement } from '../../types';

function getStageTitle(stage: TenantPortalStage) {
  if (stage === 'browsing') return 'Pilih kamar yang cocok';
  if (stage === 'booking') return 'Pantau pemesanan';
  return 'Panduan Kos Saya';
}

function getStageSummary(stage: TenantPortalStage) {
  if (stage === 'browsing') return 'Pilih kamar, lalu pantau status pemesanan.';
  if (stage === 'booking') return 'Lihat status pemesanan, tagihan, dan bukti bayar.';
  return 'Kamar, tagihan, laporan, dan aksi penting.';
}

function normalizeAnnouncement(item: Announcement | undefined) {
  if (!item) return null;
  const title = item.title?.trim() || 'Pengumuman';
  const content = item.content?.trim() || '';
  if (!title && !content) return null;
  return {
    id: item.id,
    title,
    content,
    isPinned: Boolean(item.isPinned),
  };
}

function TenantAnnouncementStrip({ stage }: { stage: TenantPortalStage }) {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['portal-announcements', 'top-strip'],
    queryFn: () => getResource<{ items: Announcement[] }>('/announcements/active'),
    enabled: stage === 'occupied',
    staleTime: 5 * 60_000,
    retry: false,
  });

  const items = Array.isArray(query.data?.items) ? query.data.items : [];
  const selected = normalizeAnnouncement([...items].sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)))[0]);

  if (stage !== 'occupied' || !selected) return null;

  return (
    <section className="tenant-announcement-strip" aria-label="Pengumuman penghuni">
      <div className="tenant-announcement-strip-main">
        <span className="tenant-announcement-icon" aria-hidden="true">📢</span>
        <div>
          <div className="tenant-announcement-label">Pengumuman</div>
          <strong>{selected.title}</strong>
          {selected.content ? (
            <p
              className="tenant-announcement-content"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginBottom: 0,
              }}
            >
              {selected.content}
            </p>
          ) : null}
        </div>
      </div>
      <Button variant="outline-primary" size="sm" onClick={() => navigate(`/portal/announcements/${selected.id}`)}>Lihat</Button>
    </section>
  );
}

export default function TenantWorkspaceTabs({
  stage,
  stageLoading = false,
  hasStayHistory = false,
  fullName,
  initials,
  onLogout,
  features,
}: {
  stage: TenantPortalStage;
  stageLoading?: boolean;
  hasStayHistory?: boolean;
  fullName?: string;
  initials: string;
  onLogout: () => void;
  features?: TenantFeatures;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sections = getNavigationSections('TENANT', stage, features);

  return (
    <>
      <section className="tenant-workspace-topbar">
        <button type="button" className="tenant-workspace-brand" onClick={() => navigate(stage === 'browsing' ? '/rooms' : stage === 'booking' ? '/portal/bookings' : '/portal/stay')}>
          <Kost48LogoMark size="small" />
          <span>
            <strong>KOST48 Portal Penghuni</strong>
            <em>{stageLoading ? 'Portal Penghuni' : getStageTitle(stage)}</em>
          </span>
        </button>

        <div className="tenant-workspace-userbar">
          <PaymentUrgencyChip />
          <NotificationBell />
          <button type="button" className="staff-user-profile-trigger" onClick={() => navigate('/profile')} title="Buka profil">
            <span className="text-end">
              <strong>{fullName}</strong>
              <em>Penghuni</em>
            </span>
            <TenantAvatar tenantId={user?.tenantId} fullName={fullName} />
            {initials ? <span className="visually-hidden">{initials}</span> : null}
          </button>
          <Button variant="outline-danger" size="sm" className="tenant-logout-button" onClick={onLogout}>Keluar</Button>
        </div>
      </section>

      {stageLoading ? (
        // Hindari kedip stage: selama status portal masih dimuat, jangan render chrome
        // khas browsing (onboarding "pilih kamar") yang salah untuk penghuni occupied/booking.
        <section className="tenant-workspace-guide-strip" aria-busy="true">
          <div>
            <div className="page-eyebrow">Panduan penghuni</div>
            <h2>Memuat portal…</h2>
            <p>Menyiapkan ruang kerja penghuni Anda.</p>
          </div>
        </section>
      ) : (
        <>
          <TenantAnnouncementStrip stage={stage} />

          <GettingStartedGuide stage={stage} hasStayHistory={hasStayHistory} />

          <section className="tenant-workspace-guide-strip">
            <div>
              <div className="page-eyebrow">Panduan penghuni</div>
              <h2>{getStageTitle(stage)}</h2>
              <p>{getStageSummary(stage)}</p>
            </div>
          </section>

          {sections.map((section) => (
            <section key={section.title} className="tenant-workspace-nav-section" aria-label={section.title}>
              {sections.length > 1 ? (
                <div className="tenant-workspace-nav-section-label">{section.title}</div>
              ) : null}
              <nav className="tenant-workspace-tabs" aria-label={`Navigasi ${section.title}`}>
                {section.links.map((link) => (
                  <NavLink key={link.to} to={link.to} className={({ isActive }) => `tenant-workspace-tab ${isActive ? 'active' : ''}`} title={link.hint ?? link.label}>
                    <span aria-hidden="true">{link.icon}</span>
                    <strong>{link.label}</strong>
                  </NavLink>
                ))}
              </nav>
            </section>
          ))}
        </>
      )}
    </>
  );
}
