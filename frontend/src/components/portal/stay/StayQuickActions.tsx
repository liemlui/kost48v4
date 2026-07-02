import { officialKost48Location } from '../../../data/officialKost48Content';

type Props = {
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
};

export default function StayQuickActions(props: Props) {
  const actions: QuickAction[] = [
    { key: 'meter', icon: '⚡', label: 'Catat Meter', onClick: props.onCatatMeter, disabled: !props.canRecordMeter, title: props.canRecordMeter ? undefined : 'Pencatatan dibuka H-10 sebelum akhir kontrak' },
    { key: 'renew', icon: '🔄', label: 'Perpanjang', onClick: props.onRenew, disabled: !props.canRenew, title: props.renewDisabledReason },
    { key: 'checkout', icon: '🚪', label: 'Ajukan Keluar', onClick: props.onCheckout, disabled: !props.canCheckout, title: !props.canCheckout ? 'Selesaikan tagihan aktif dulu sebelum mengajukan keluar.' : undefined },
    { key: 'wa', icon: '💬', label: 'Hubungi Admin', href: officialKost48Location.whatsappUrl },
  ];

  return (
    <div className="tenant-quick-actions-grid">
      {actions.map((a) => {
        const inner = (
          <>
            <span className="qa-icon" aria-hidden="true">{a.icon}</span>
            <span className="qa-label">{a.label}</span>
          </>
        );
        if (a.href) {
          return (
            <a key={a.key} className="tenant-quick-action" href={a.href} target="_blank" rel="noreferrer">
              {inner}
            </a>
          );
        }
        return (
          <button
            key={a.key}
            type="button"
            className="tenant-quick-action"
            onClick={a.onClick}
            disabled={a.disabled}
            title={a.title}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
