import { useState } from 'react';
import { Collapse } from 'react-bootstrap';
import { AlertTriangle, ClipboardList, Pin, BedDouble, Ticket, Package, CheckCircle } from 'lucide-react';
import styles from './AdminHealthBar.module.css';

type Tone = 'danger' | 'warning' | 'info' | 'success';

const chip = (tone: Tone) => `${styles.chip} ${styles[tone]}`;
const item = (tone: Tone) => `${styles.detailItem} ${styles[tone]}`;

type AdminHealthBarProps = {
  occupiedCount: number;
  totalRooms: number;
  overdueInvoiceCount: number;
  pendingPaymentReviewCount: number;
  activeTicketCount: number;
  stayWorkCount: number;
  lowStockCount: number;
};

export default function AdminHealthBar({
  occupiedCount, totalRooms, overdueInvoiceCount, pendingPaymentReviewCount,
  activeTicketCount, stayWorkCount, lowStockCount,
}: AdminHealthBarProps) {
  const [open, setOpen] = useState(false);
  const hasIssues = overdueInvoiceCount > 0 || pendingPaymentReviewCount > 0 || stayWorkCount > 0 || lowStockCount > 0;
  const occupancyPct = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;

  return (
    <div className={`${styles.bar} mb-3`}>
      <div className="d-flex align-items-center gap-2 flex-wrap">
        {overdueInvoiceCount > 0 && (
          <span className={chip('danger')}><AlertTriangle size={13} /> {overdueInvoiceCount} overdue</span>
        )}
        {pendingPaymentReviewCount > 0 && (
          <span className={chip('warning')}><ClipboardList size={13} /> {pendingPaymentReviewCount} bukti</span>
        )}
        {stayWorkCount > 0 && (
          <span className={chip('warning')}><Pin size={13} /> {stayWorkCount} sewa</span>
        )}
        <span className={chip('info')}><BedDouble size={13} /> {occupiedCount}/{totalRooms} terisi</span>
        {activeTicketCount > 0 && (
          <span className={chip('info')}><Ticket size={13} /> {activeTicketCount} tiket</span>
        )}
        {lowStockCount > 0 && (
          <span className={chip('warning')}><Package size={13} /> {lowStockCount} stok tipis</span>
        )}
        {!hasIssues && (
          <span className={chip('success')}><CheckCircle size={13} /> Semua aman</span>
        )}
        <button
          type="button"
          className={`btn btn-link btn-sm p-0 ms-auto text-secondary ${styles.toggle}`}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="admin-health-detail"
        >
          {open ? 'Sembunyikan' : 'Detail kondisi'}
        </button>
      </div>
      <Collapse in={open}>
        <div id="admin-health-detail" className="mt-2">
          <div className={styles.detailGrid}>
            <div className={item(occupancyPct >= 80 ? 'success' : 'info')}>
              <strong>Hunian</strong>
              <span>{occupiedCount}/{totalRooms} kamar ({occupancyPct}%)</span>
            </div>
            <div className={item(stayWorkCount > 0 ? 'warning' : 'success')}>
              <strong>Masa sewa</strong>
              <span>{stayWorkCount > 0 ? `${stayWorkCount} butuh keputusan` : 'Alur aman'}</span>
            </div>
            <div className={item(overdueInvoiceCount > 0 || pendingPaymentReviewCount > 0 ? 'danger' : 'success')}>
              <strong>Keuangan</strong>
              <span>{overdueInvoiceCount} overdue · {pendingPaymentReviewCount} bukti review</span>
            </div>
            <div className={item(activeTicketCount > 0 ? 'info' : 'success')}>
              <strong>Staff & Tiket</strong>
              <span>{activeTicketCount > 0 ? `${activeTicketCount} tiket aktif` : 'Aman'}</span>
            </div>
            {lowStockCount > 0 ? (
              <div className={item('warning')}>
                <strong>Stok</strong>
                <span>{lowStockCount} item menipis</span>
              </div>
            ) : null}
          </div>
        </div>
      </Collapse>
    </div>
  );
}
