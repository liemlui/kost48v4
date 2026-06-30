import { Alert, Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import type { RoomFacilityCheck, RoomFacilityCheckStatus } from '../../types';

interface FacilityGapPanelProps {
  check?: RoomFacilityCheck | null;
  roomId: number;
}

const STATUS_META: Record<RoomFacilityCheckStatus, { label: string; bg: string }> = {
  OK: { label: 'Ada di inventaris', bg: 'success' },
  PRESENT_PROBLEM: { label: 'Ada tapi bermasalah', bg: 'warning' },
  MISSING: { label: 'Belum ada', bg: 'danger' },
  UNLINKED: { label: 'Perlu dihubungkan', bg: 'warning' },
};

export default function FacilityGapPanel({ check, roomId }: FacilityGapPanelProps) {
  const navigate = useNavigate();
  if (!check) return null;

  const inventoryBacked = check.items.filter((it) => it.kind === 'INVENTORY_BACKED');
  const structural = check.items.filter((it) => it.kind === 'STRUCTURAL');
  const gapCount = inventoryBacked.filter((it) => it.status === 'MISSING' || it.status === 'UNLINKED').length;

  return (
    <div className="facility-gap-panel mb-3">
      {check.hasGap ? (
        <Alert variant="warning" className="mb-2">
          <strong>⚠️ {gapCount} fasilitas perlu dilengkapi di inventaris.</strong>
          <div className="small mt-1">
            Kamar dengan kekurangan barang otomatis <strong>disembunyikan dari katalog publik</strong> sampai lengkap.
          </div>
        </Alert>
      ) : (
        <Alert variant="success" className="mb-2">
          <strong>✓ Fasilitas &amp; inventaris kamar sudah cocok.</strong>
        </Alert>
      )}

      {check.acGap ? (
        <Alert variant="danger" className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <strong>❄️ Kamar ini ber-AC tapi belum ada barang AC di inventaris.</strong>
            <div className="small mt-1">
              Catat AC lewat Mutasi Stok → tipe <em>Pasang ke Kamar (ASSIGN_TO_ROOM)</em> untuk kamar ini.
            </div>
          </div>
          <Button size="sm" variant="danger" onClick={() => navigate(`/inventory-movements?roomId=${roomId}`)}>
            Pasang ke Kamar
          </Button>
        </Alert>
      ) : null}

      <div className="facility-gap-list">
        <div className="card-title-soft mb-2">Barang wajib (sesuai kriteria kamar)</div>
        <ul className="list-unstyled mb-3">
          {inventoryBacked.map((it) => {
            const meta = STATUS_META[it.status];
            return (
              <li key={it.key} className="d-flex align-items-center justify-content-between gap-2 py-1 border-bottom">
                <span className="fw-semibold">
                  {it.label}
                  {it.critical ? <span className="text-danger ms-1" title="Wajib (kritis)">*</span> : null}
                </span>
                <span className="d-flex align-items-center gap-2">
                  <Badge bg={meta.bg}>{meta.label}</Badge>
                  {(it.status === 'MISSING' || it.status === 'UNLINKED') ? (
                    <Button size="sm" variant="outline-secondary" onClick={() => navigate(`/inventory-movements?roomId=${roomId}`)}>
                      Catat di Mutasi
                    </Button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>

        {structural.length ? (
          <>
            <div className="card-title-soft mb-2">Sudah termasuk kategori (tak perlu inventaris)</div>
            <div className="d-flex flex-wrap gap-2">
              {structural.map((it) => (
                <span key={it.key} className="badge bg-light text-dark border">{it.label}</span>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
