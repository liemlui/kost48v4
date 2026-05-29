import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import NotificationBell from '../notifications/NotificationBell';
import PaymentUrgencyChip from '../payment-urgency/PaymentUrgencyChip';
import { getNavigationLinks, type TenantPortalStage } from '../../config/navigation';

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

export default function TenantWorkspaceTabs({
  stage,
  fullName,
  initials,
  onLogout,
}: {
  stage: TenantPortalStage;
  fullName?: string;
  initials: string;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const links = getNavigationLinks('TENANT', stage);

  return (
    <>
      <section className="tenant-workspace-topbar">
        <button type="button" className="tenant-workspace-brand" onClick={() => navigate(stage === 'browsing' ? '/rooms' : stage === 'booking' ? '/portal/bookings' : '/portal/stay')}>
          <span className="brand-mark small" aria-hidden="true">K48</span>
          <span>
            <strong>KOST48 Portal Penghuni</strong>
            <em>{getStageTitle(stage)}</em>
          </span>
        </button>

        <div className="tenant-workspace-userbar">
          <PaymentUrgencyChip />
          <NotificationBell />
          <button type="button" className="staff-user-profile-trigger" onClick={() => navigate('/portal/profile')} title="Buka profil">
            <span className="text-end">
              <strong>{fullName}</strong>
              <em>Penghuni</em>
            </span>
            <span className="user-avatar" role="img" aria-label={`Avatar ${fullName ?? 'User'}`}>
              {initials}
            </span>
          </button>
          <Button variant="outline-danger" size="sm" onClick={onLogout}>Logout</Button>
        </div>
      </section>

      <section className="tenant-workspace-guide-strip">
        <div>
          <div className="page-eyebrow">Panduan penghuni</div>
          <h2>{getStageTitle(stage)}</h2>
          <p>{getStageSummary(stage)}</p>
        </div>
      </section>

      <nav className="tenant-workspace-tabs" aria-label="Navigasi tenant">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => `tenant-workspace-tab ${isActive ? 'active' : ''}`} title={link.hint ?? link.label}>
            <span aria-hidden="true">{link.icon}</span>
            <strong>{link.label}</strong>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
