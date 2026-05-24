import { Button, Modal } from 'react-bootstrap';
import StatusBadge from '../common/StatusBadge';
import CurrencyDisplay from '../common/CurrencyDisplay';
import type { ResourceConfig } from '../../config/resources';
import { formatDateSafe, formatValue } from '../../pages/resources/simpleCrudHelpers';

function renderDetailValue(item: Record<string, unknown>, key: string) {
  const value = item[key];
  if (key === 'status') return <StatusBadge status={String(value || 'SECONDARY')} />;
  if (key === 'isActive') return <StatusBadge status={value === true ? 'ACTIVE' : 'INACTIVE'} customLabel={value === true ? 'Aktif' : 'Nonaktif'} />;
  if (key === 'isPublished') return <StatusBadge status={value === true ? 'ACTIVE' : 'INACTIVE'} customLabel={value === true ? 'Published' : 'Draft'} />;
  if (key === 'isPinned') return <StatusBadge status={value === true ? 'INFO' : 'SECONDARY'} customLabel={value === true ? 'Pinned' : 'Tidak pinned'} />;
  if (key.toLowerCase().includes('date') || key.endsWith('At')) return formatDateSafe(value as string | Date | null | undefined);
  if (key.endsWith('Rupiah') || key === 'amountRupiah') return <CurrencyDisplay amount={Number(value ?? 0)} showZero />;
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  return formatValue(value);
}


function getPrimaryActionLabel(config: ResourceConfig, item: Record<string, unknown>) {
  if (config.path === '/tenants') {
    const currentStay = item.currentStay as { id?: number } | undefined;
    return currentStay?.id ? 'Lihat masa sewa' : 'Check-in tenant';
  }
  if (config.path === '/rooms') return 'Buka detail kamar';
  return 'Buka detail';
}

function tenantSummary(item: Record<string, unknown>) {
  const currentStay = item.currentStay as { id?: number; room?: { code?: string; name?: string }; plannedCheckOutDate?: string | null } | null | undefined;
  const portal = item.portalUserSummary as { portalEmail?: string; portalIsActive?: boolean } | null | undefined;
  return (
    <div className="entity-detail-grid mb-3">
      <div className="entity-detail-item"><span>Status tinggal</span><strong>{currentStay?.room?.code ? `Kamar ${currentStay.room.code}` : 'Tidak sedang menempati'}</strong></div>
      <div className="entity-detail-item"><span>Akses portal</span><strong>{portal?.portalIsActive ? `Aktif · ${portal.portalEmail ?? '-'}` : 'Belum aktif / nonaktif'}</strong></div>
      <div className="entity-detail-item"><span>Kontak</span><strong>{String(item.phone ?? item.email ?? '-')}</strong></div>
    </div>
  );
}

export default function ResourceDetailModal({
  show,
  item,
  config,
  onHide,
  onEdit,
  onPrimaryAction,
}: {
  show: boolean;
  item: Record<string, unknown> | null;
  config: ResourceConfig;
  onHide: () => void;
  onEdit?: (item: Record<string, unknown>) => void;
  onPrimaryAction?: (item: Record<string, unknown>) => void;
}) {
  const title = item ? String(item.fullName ?? item.title ?? item.name ?? item.code ?? item.invoiceNumber ?? `${config.title} #${item.id}`) : config.title;
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {item && config.path === '/tenants' ? tenantSummary(item) : null}
        <div className="entity-detail-grid">
          {(item ? config.columns : []).map((column) => (
            <div className="entity-detail-item" key={column.key}>
              <span>{column.label}</span>
              <strong>{renderDetailValue(item!, column.key)}</strong>
            </div>
          ))}
        </div>
        <div className="small text-muted mt-3">Klik row di tabel untuk membuka detail. Aksi utama tetap mengikuti status data agar tidak dobel.</div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide}>Tutup</Button>
        {item && onPrimaryAction ? <Button variant="outline-primary" onClick={() => onPrimaryAction(item)}>{getPrimaryActionLabel(config, item)}</Button> : null}
        {item && onEdit ? <Button onClick={() => onEdit(item)}>Edit</Button> : null}
      </Modal.Footer>
    </Modal>
  );
}
