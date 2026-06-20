import { useState } from 'react';
import { Collapse } from 'react-bootstrap';

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
    <div className="admin-health-bar mb-3">
      <div className="d-flex align-items-center gap-2 flex-wrap">
        {overdueInvoiceCount > 0 && <span className="admin-health-chip danger">⚠ {overdueInvoiceCount} overdue</span>}
        {pendingPaymentReviewCount > 0 && <span className="admin-health-chip warning">📋 {pendingPaymentReviewCount} bukti</span>}
        {stayWorkCount > 0 && <span className="admin-health-chip warning">📌 {stayWorkCount} sewa</span>}
        <span className="admin-health-chip info">🛏 {occupiedCount}/{totalRooms} terisi</span>
        {activeTicketCount > 0 && <span className="admin-health-chip info">🎫 {activeTicketCount} tiket</span>}
        {lowStockCount > 0 && <span className="admin-health-chip warning">📦 {lowStockCount} stok tipis</span>}
        {!hasIssues && <span className="admin-health-chip success">✅ Semua aman</span>}
        <button
          type="button"
          className="btn btn-link btn-sm p-0 ms-auto text-secondary admin-health-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="admin-health-detail"
        >
          {open ? 'Sembunyikan' : 'Detail kondisi'}
        </button>
      </div>
      <Collapse in={open}>
        <div id="admin-health-detail" className="admin-health-detail mt-2">
          <div className="admin-health-detail-grid">
            <div className={`admin-health-detail-item ${occupancyPct >= 80 ? 'success' : 'info'}`}>
              <strong>Hunian</strong>
              <span>{occupiedCount}/{totalRooms} kamar ({occupancyPct}%)</span>
            </div>
            <div className={`admin-health-detail-item ${stayWorkCount > 0 ? 'warning' : 'success'}`}>
              <strong>Masa sewa</strong>
              <span>{stayWorkCount > 0 ? `${stayWorkCount} butuh keputusan` : 'Alur aman'}</span>
            </div>
            <div className={`admin-health-detail-item ${overdueInvoiceCount > 0 || pendingPaymentReviewCount > 0 ? 'danger' : 'success'}`}>
              <strong>Keuangan</strong>
              <span>{overdueInvoiceCount} overdue · {pendingPaymentReviewCount} bukti review</span>
            </div>
            <div className={`admin-health-detail-item ${activeTicketCount > 0 ? 'info' : 'success'}`}>
              <strong>Staff & Tiket</strong>
              <span>{activeTicketCount > 0 ? `${activeTicketCount} tiket aktif` : 'Aman'}</span>
            </div>
            {lowStockCount > 0 ? (
              <div className="admin-health-detail-item warning">
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
