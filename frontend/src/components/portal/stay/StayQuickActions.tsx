import { Link } from 'react-router-dom';
import { officialKost48Location } from '../../../data/officialKost48Content';

type Props = {
  bayarHref: string;
  canRecordMeter: boolean;
  onCatatMeter: () => void;
  canRenew: boolean;
  renewDisabledReason?: string;
  onRenew: () => void;
  canCheckout: boolean;
  onCheckout: () => void;
};

type QuickAction = {
  key: string;
  icon: string;
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  title?: string;
  primary?: boolean;
};

/**
 * Hub aksi tenant yang diprioritaskan untuk tenant awam: 3 tombol inti
 * (Bayar · Catat Meter · Lapor Masalah) tampil besar & berwarna di baris atas,
 * aksi lanjutan (perpanjang/keluar/hubungi admin) tampil ringkas di bawahnya.
 */
export default function StayQuickActions(props: Props) {
  const primaryActions: QuickAction[] = [
    { key: 'bayar', icon: '💳', label: 'Bayar Tagihan', href: props.bayarHref, primary: true },
    { key: 'meter', icon: '⚡', label: 'Catat Meter', onClick: props.onCatatMeter, disabled: !props.canRecordMeter, title: props.canRecordMeter ? undefined : 'Pencatatan dibuka H-10 sebelum akhir kontrak', primary: true },
    { key: 'lapor', icon: '🛠️', label: 'Lapor Masalah', href: '/portal/tickets', primary: true },
  ];

  const secondaryActions: QuickAction[] = [
    { key: 'renew', icon: '🔄', label: 'Perpanjang', onClick: props.onRenew, disabled: !props.canRenew, title: props.renewDisabledReason },
    { key: 'checkout', icon: '🚪', label: 'Ajukan Keluar', onClick: props.onCheckout, disabled: !props.canCheckout, title: !props.canCheckout ? 'Selesaikan tagihan aktif dulu sebelum mengajukan keluar.' : undefined },
    { key: 'wa', icon: '💬', label: 'Hubungi Admin', href: officialKost48Location.whatsappUrl },
  ];

  const renderAction = (a: QuickAction) => {
    const inner = (
      <>
        <span className="qa-icon" aria-hidden="true">{a.icon}</span>
        <span className="qa-label">{a.label}</span>
      </>
    );
    const className = `tenant-quick-action${a.primary ? ' primary' : ''}`;
    if (a.href) {
      // Tautan eksternal (https) dibuka tab baru; rute internal memakai Link agar tetap SPA.
      const external = a.href.startsWith('http');
      if (external) {
        return (
          <a key={a.key} className={className} href={a.href} target="_blank" rel="noreferrer">
            {inner}
          </a>
        );
      }
      return (
        <Link key={a.key} className={className} to={a.href}>
          {inner}
        </Link>
      );
    }
    return (
      <button
        key={a.key}
        type="button"
        className={className}
        onClick={a.onClick}
        disabled={a.disabled}
        title={a.title}
      >
        {inner}
      </button>
    );
  };

  return (
    <div>
      <div className="tenant-quick-actions-grid tenant-quick-actions-primary" aria-label="Aksi utama">
        {primaryActions.map(renderAction)}
      </div>
      <div className="tenant-quick-actions-grid" aria-label="Aksi lanjutan">
        {secondaryActions.map(renderAction)}
      </div>
    </div>
  );
}
