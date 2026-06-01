import { useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { runAutoOps, type AutoOpsRunResult, type AutoOpsStatus } from '../../api/autoOps';

type AutoOpsRole = 'OWNER' | 'ADMIN';

type Props = {
  status?: AutoOpsStatus | null;
  role: AutoOpsRole;
  onCompleted?: () => void;
};

type CountSource = Record<string, unknown> | null | undefined;

type NormalizedRunResult = {
  expiredBookings: number;
  heldForPaymentReview: number;
  releasedRooms: number;
  expiredStayIds: Array<string | number>;
  releasedRoomIds: Array<string | number>;
  accountingAutoClose?: unknown;
};

const AUTOOPS_UAT_CHECKS = [
  {
    id: 'expired-booking',
    title: 'Expired unpaid booking',
    expected: 'Auto-cancel booking lewat batas tanpa bukti valid, lalu kamar kembali available.',
  },
  {
    id: 'pending-proof',
    title: 'Bukti pending review',
    expected: 'Tidak auto-cancel tenant yang sudah kirim bukti; admin/owner tetap review manual.',
  },
  {
    id: 'rejected-proof',
    title: 'Bukti ditolak setelah deadline',
    expected: 'Booking/payment yang gagal setelah batas waktu harus dilepas agar kamar tidak tertahan.',
  },
  {
    id: 'orphan-room',
    title: 'Reserved orphan room',
    expected: 'Kamar RESERVED tanpa booking/payment valid harus dilepas ke AVAILABLE.',
  },
  {
    id: 'first-paid-wins',
    title: 'First valid paid wins',
    expected: 'Pembayaran valid pertama menang; booking/minat lain yang belum bayar tidak mengunci kamar.',
  },
];

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickNumber(source: CountSource, keys: string[]) {
  if (!source) return 0;
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return toNumber(source[key]);
  }
  return 0;
}

function pickArray(source: CountSource, keys: string[]) {
  if (!source) return [] as Array<string | number>;
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) return value.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number');
  }
  return [] as Array<string | number>;
}

function normalizeRunResult(result: AutoOpsRunResult | null): NormalizedRunResult | null {
  if (!result) return null;
  const source = result as Record<string, unknown>;
  const expiredStayIds = pickArray(source, ['expiredStayIds', 'expiredBookingIds', 'cancelledBookingIds']);
  const releasedRoomIds = pickArray(source, ['releasedRoomIds', 'releasedRoomsIds', 'orphanReleasedRoomIds']);
  return {
    expiredBookings: pickNumber(source, ['expiredBookings', 'cancelledBookings', 'expiredBookingCount']),
    heldForPaymentReview: pickNumber(source, ['heldForPaymentReview', 'pendingReviewHeld', 'paymentReviewHeldCount']),
    releasedRooms: pickNumber(source, ['releasedRooms', 'orphanReleasedRooms', 'releasedRoomCount']) || releasedRoomIds.length,
    expiredStayIds,
    releasedRoomIds,
    accountingAutoClose: source.accountingAutoClose,
  };
}

function describeAccountingAutoClose(result: NormalizedRunResult | null) {
  const autoClose = result?.accountingAutoClose as any;
  if (!autoClose) return 'Accounting auto-close belum mengirim hasil pada run ini.';
  if (autoClose.closed) return 'Accounting auto-close menutup periode sebelumnya dengan aman.';
  if (autoClose.skipped) return `Accounting auto-close safe-skip: ${autoClose.skippedReason ?? 'periode belum siap ditutup.'}`;
  return 'Accounting auto-close selesai tanpa perubahan periode.';
}

function buildRunSummary(result: NormalizedRunResult | null) {
  if (!result) return [];
  return [
    {
      label: 'Booking direset',
      value: result.expiredBookings,
      helper: result.expiredStayIds.length ? `ID: ${result.expiredStayIds.join(', ')}` : 'Booking lewat batas tanpa bukti valid.',
    },
    {
      label: 'Bukti ditahan review',
      value: result.heldForPaymentReview,
      helper: 'Tidak auto-cancel; admin harus putuskan.',
    },
    {
      label: 'Kamar dilepas',
      value: result.releasedRooms,
      helper: result.releasedRoomIds.length ? `Room ID: ${result.releasedRoomIds.join(', ')}` : 'Reserved orphan kembali available.',
    },
  ];
}

export default function AutoOpsControlPanel({ status, role, onCompleted }: Props) {
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<NormalizedRunResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const expired = pickNumber(status as CountSource, ['expiredCandidates', 'expiredBookings', 'expiredBookingCandidates']);
  const held = pickNumber(status as CountSource, ['heldForPaymentReview', 'paymentPendingReview', 'pendingReviewCount']);
  const orphan = pickNumber(status as CountSource, ['orphanReservedRooms', 'orphanReservedRoomCount', 'reservedOrphans']);
  const hasWork = expired + held + orphan > 0;
  const runSummary = useMemo(() => buildRunSummary(lastResult), [lastResult]);
  const canRun = role === 'OWNER' || role === 'ADMIN';

  const mutation = useMutation({
    mutationFn: runAutoOps,
    onSuccess: async (result) => {
      setLastError(null);
      setLastResult(normalizeRunResult(result));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard-owner'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-admin'] }),
        queryClient.invalidateQueries({ queryKey: ['auto-ops-status'] }),
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-review'] }),
      ]);
      onCompleted?.();
    },
    onError: (error: any) => {
      setLastError(error?.response?.data?.message ?? error?.message ?? 'AutoOps gagal dijalankan.');
    },
  });

  return (
    <Card className={`content-card border-0 autoops-control-panel ${hasWork ? 'needs-action' : 'stable'}`.trim()}>
      <Card.Body>
        <div className="autoops-control-layout">
          <div>
            <div className="page-eyebrow mb-1">AutoOps Pembayaran Pertama</div>
            <h3 className="mb-1">Kamar mengikuti pembayaran valid pertama, bukan sekadar booking.</h3>
            <p className="mb-0 text-muted">
              Panel ini menjalankan reset booking lewat batas, melepas kamar booking menggantung, dan menahan bukti pembayaran menunggu cek agar tetap diputuskan manusia.
            </p>
          </div>
          <div className="autoops-control-actions">
            <Button
              variant={hasWork ? 'danger' : 'outline-primary'}
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !canRun}
            >
              {mutation.isPending ? <><Spinner animation="border" size="sm" className="me-2" />Menjalankan...</> : 'Jalankan AutoOps sekarang'}
            </Button>
            <small>{role === 'OWNER' ? 'Owner dapat menjalankan manual untuk audit.' : 'Admin dapat menjalankan operasional, bukan menyetujui pembayaran.'}</small>
          </div>
        </div>

        <div className="autoops-control-grid mt-3">
          <div><strong>{expired}</strong><span>siap dibatalkan</span></div>
          <div><strong>{held}</strong><span>bukti menunggu cek</span></div>
          <div><strong>{orphan}</strong><span>booking menggantung</span></div>
        </div>

        <Alert variant={hasWork ? 'warning' : 'info'} className="mt-3 mb-0 small">
          AutoOps tidak menyetujui pembayaran, tidak menyetujui perpanjangan, tidak menyelesaikan keluar final, dan tidak mengembalikan dana titipan. Alur sensitif tetap keputusan manusia.
        </Alert>

        <div className="autoops-uat-checklist mt-3">
          <div className="autoops-uat-header">
            <div>
              <div className="panel-title">Checklist pembayaran pertama</div>
              <div className="panel-subtitle">Jika angka masih 0/0/0, belum ada data booking atau pembayaran yang bisa diproses otomatis.</div>
            </div>
            <Badge bg={hasWork ? 'warning' : 'secondary'} text={hasWork ? 'dark' : undefined}>{hasWork ? 'Ada kandidat' : 'Belum ada kandidat'}</Badge>
          </div>
          <div className="autoops-uat-grid">
            {AUTOOPS_UAT_CHECKS.map((item) => (
              <div key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.expected}</span>
              </div>
            ))}
          </div>
        </div>

        {lastError ? <Alert variant="danger" className="mt-3 mb-0 small">{lastError}</Alert> : null}

        {lastResult ? (
          <div className="autoops-run-result mt-3">
            <div className="table-meta mb-2">
              <div>
                <div className="panel-title">Hasil run terakhir</div>
                <div className="panel-subtitle">Ringkasan hasil proses otomatis terakhir.</div>
              </div>
            </div>
            <div className="autoops-result-grid">
              {runSummary.map((item) => (
                <div key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                  <small>{item.helper}</small>
                </div>
              ))}
            </div>
            <Alert variant="light" className="mt-2 mb-0 small">
              {describeAccountingAutoClose(lastResult)}
            </Alert>
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}
