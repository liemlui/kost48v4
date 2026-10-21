import { Badge, Card } from 'react-bootstrap';
import { formatRupiah } from '../../utils/formatCurrency';

type Props = {
  roomCode?: string | null;
  /** Nominal deposit kamar dari data kamar/stay — bukan konstanta. */
  roomDepositRupiah?: number | null;
  petDepositRupiah: number;
  hasPet?: boolean | null;
  /** `checkout` = versi ringkas yang tampil di modal pengajuan keluar. */
  variant?: 'rules' | 'checkout';
  className?: string;
};

/**
 * Kartu deposit ringkas (W-TNT-001 langkah 5).
 * Nominal kamar dibaca dari `Room.defaultDepositRupiah` / `Stay.depositAmountRupiah`;
 * deposit hewan dari `OperationalSetting.petDepositRupiah` (public-config).
 */
export default function DepositRulesCard({
  roomCode,
  roomDepositRupiah,
  petDepositRupiah,
  hasPet,
  variant = 'rules',
  className = '',
}: Props) {
  const compact = variant === 'checkout';
  const roomDepositLabel =
    roomDepositRupiah != null ? formatRupiah(roomDepositRupiah) : 'mengikuti kamar yang dipilih';

  return (
    <Card className={`tenant-deposit-card border-0 ${compact ? 'tenant-deposit-card-compact' : ''} ${className}`.trim()}>
      <Card.Body className={compact ? 'py-3' : undefined}>
        <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
          <div>
            <div className="fw-semibold">🔒 Deposit jaminan{roomCode ? ` — kamar ${roomCode}` : ''}</div>
            <div className="text-muted small">Dana titip, bukan biaya sewa. Dikembalikan setelah kewajiban selesai.</div>
          </div>
          <Badge bg="success" className="align-self-start">Refundable</Badge>
        </div>

        <div className="d-flex flex-wrap gap-2 mb-2">
          <div className="tenant-deposit-figure">
            <span>Deposit kamar</span>
            <strong>{roomDepositLabel}</strong>
            <small>dari data kamar</small>
          </div>
          <div className="tenant-deposit-figure">
            <span>Deposit hewan</span>
            <strong>{formatRupiah(petDepositRupiah)}</strong>
            <small>{hasPet ? 'kamu membawa hewan' : 'hanya bila membawa hewan'}</small>
          </div>
        </div>

        <ul className="tenant-deposit-points mb-0">
          <li><strong>Menutup:</strong> tagihan terbuka saat checkout — termasuk sewa dan utilitas.</li>
          <li><strong>Memotong:</strong> kerusakan akibat kelalaian dan biaya overstay, selalu dengan catatan.</li>
          <li><strong>Kekurangan:</strong> bila deposit tidak cukup, sisanya menjadi piutangmu.</li>
          <li><strong>Diproses:</strong> setelah inspeksi kamar dan pelunasan; sisa dikembalikan.</li>
        </ul>

        {!compact ? (
          <div className="text-muted mt-2" style={{ fontSize: '0.72rem' }}>
            Nominal kamar mengikuti data kamar; deposit hewan mengikuti Pengaturan pengelola. Nominal pastimu juga tampil di tagihan awal.
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}
