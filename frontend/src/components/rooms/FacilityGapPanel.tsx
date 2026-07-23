import { useState } from 'react';
import { Alert, Badge, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createResource } from '../../api/resources';
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
  const queryClient = useQueryClient();
  const [autoLinkResult, setAutoLinkResult] = useState<{ linked: number; skipped: number } | null>(null);

  const autoLinkMutation = useMutation({
    mutationFn: () => createResource<unknown>(`/rooms/${roomId}/facilities/auto-link`, {}),
    onSuccess: (data: any) => {
      const linked = data?.linked?.length ?? data?.data?.linked?.length ?? 0;
      const skipped = data?.skipped?.length ?? data?.data?.skipped?.length ?? 0;
      setAutoLinkResult({ linked, skipped });
      queryClient.invalidateQueries({ queryKey: ['room-facilities', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
    },
  });

  if (!check) return null;

  const inventoryBacked = check.items.filter((it) => it.kind === 'INVENTORY_BACKED');
  const structural = check.items.filter((it) => it.kind === 'STRUCTURAL');
  const gapCount = inventoryBacked.filter((it) => it.status === 'MISSING' || it.status === 'UNLINKED').length;
  const unlinkedCount = inventoryBacked.filter((it) => it.status === 'UNLINKED').length;

  return (
    <div className="facility-gap-panel mb-3">
      {check.hasGap ? (
        <Alert variant="warning" className="mb-2">
          <strong>⚠️ {gapCount} fasilitas perlu dilengkapi di inventaris.</strong>
          <div className="small mt-1">
            Kamar dengan kekurangan barang otomatis <strong>disembunyikan dari katalog publik</strong> sampai lengkap.
          </div>
          {unlinkedCount > 0 ? (
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline-warning"
                disabled={autoLinkMutation.isPending}
                onClick={() => autoLinkMutation.mutate()}
              >
                {autoLinkMutation.isPending ? (
                  <><Spinner size="sm" /> Menautkan...</>
                ) : (
                  '🔗 Tautkan Otomatis'
                )}
              </Button>
              <span className="text-muted small ms-2">
                Cocokkan fasilitas dengan barang inventaris yang sudah ada di kamar ini.
              </span>
            </div>
          ) : null}
          {autoLinkResult ? (
            <div className="small mt-2">
              ✅ {autoLinkResult.linked} fasilitas berhasil ditautkan
              {autoLinkResult.skipped > 0 ? `, ${autoLinkResult.skipped} dilewati (tidak ada kecocokan).` : '.'}
            </div>
          ) : null}
          {autoLinkMutation.isError ? (
            <div className="text-danger small mt-1">Gagal menautkan. Coba lagi.</div>
          ) : null}
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
        <div className="card-title-soft mb-2">
          Barang wajib (sesuai kriteria kamar)
          <span className="text-muted small ms-2">
            — Fasilitas = deklarasi · RoomItem = barang fisik dari gudang
          </span>
        </div>
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
