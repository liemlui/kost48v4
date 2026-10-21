import { Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

type Props = {
  canCheckout: boolean;
  disabledReason?: string;
  onCheckout: () => void;
  /** Sudah ada pengajuan keluar yang berjalan. */
  hasActiveRequest?: boolean;
};

/**
 * CTA checkout dengan warna berbeda (amber) + copy humanis (W-TNT-001 langkah 5).
 * Copy menyebut konsekuensi overstay yang benar-benar ditegakkan `stay-sweep.service.ts`:
 * kamar dilepas 12.00 WIB hari-H, checkout paksa 12.00 WIB H+1, sisa tagihan jadi piutang.
 */
export default function TenantCheckoutCta({ canCheckout, disabledReason, onCheckout, hasActiveRequest }: Props) {
  return (
    <Card id="tenant-checkout-cta" className="tenant-checkout-cta border-0 mb-3">
      <Card.Body className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="flex-grow-1" style={{ minWidth: 240 }}>
          <div className="fw-semibold mb-1">🗓️ Rencanakan keluarmu dari jauh hari</div>
          <div className="small text-muted mb-1">
            Kalau kamu sudah tahu akan keluar, ajukan sekarang — proses inspeksi dan pengembalian deposit jadi lebih tenang.
          </div>
          <div className="small text-muted">
            Kalau tanggal keluar terlewat tanpa perpanjangan, kamar dilepas ke penghuni baru <strong>pukul 12.00 WIB di hari-H</strong> dan
            checkout paksa berjalan <strong>pukul 12.00 WIB keesokan harinya (H+1)</strong>. Tagihan yang belum lunas tetap ditagih,
            dipotong dari deposit; kalau deposit tidak cukup, sisanya menjadi piutang.
          </div>
          <div className="mt-2">
            <Link to="/portal/manual#checkout" className="small">Baca aturan checkout & overstay →</Link>
          </div>
        </div>
        <div className="d-flex flex-column align-items-stretch gap-1">
          <Button variant="warning" onClick={onCheckout} disabled={!canCheckout} title={!canCheckout ? disabledReason : undefined}>
            {hasActiveRequest ? 'Lihat pengajuan keluar' : 'Ajukan Keluar'}
          </Button>
          {!canCheckout && disabledReason ? (
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>{disabledReason}</span>
          ) : null}
        </div>
      </Card.Body>
    </Card>
  );
}
