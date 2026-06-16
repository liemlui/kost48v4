import { useMemo, useState } from 'react';
import { Accordion, Alert, Badge, Button, Card, Spinner } from 'react-bootstrap';
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
  recurringExpenseDrafts?: unknown;
  automaticDepreciation?: unknown;
  accountingAutoClose?: unknown;
};

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
    recurringExpenseDrafts: source.recurringExpenseDrafts,
    automaticDepreciation: source.automaticDepreciation,
    accountingAutoClose: source.accountingAutoClose,
  };
}

function describeFinanceAutomation(result: NormalizedRunResult | null) {
  const drafts = result?.recurringExpenseDrafts as any;
  const depreciation = result?.automaticDepreciation as any;
  const draftText = drafts?.skipped
    ? `Draft rutin safe-skip: ${drafts.skippedReason ?? 'tidak dijalankan'}.`
    : `${Number(drafts?.createdCount ?? 0)} draft expense rutin dibuat.`;
  const depreciationText = depreciation?.posted
    ? `Depresiasi ${depreciation.year}-${String(depreciation.month).padStart(2, '0')} berhasil diposting.`
    : `Depresiasi safe-skip: ${depreciation?.skippedReason ?? 'tidak ada hasil'}.`;
  return `${draftText} ${depreciationText}`;
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
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['assets'] }),
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
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
      <Card.Body className="p-3">
        <div className="autoops-control-layout">
          <div>
            <div className="page-eyebrow mb-1">AutoOps</div>
            <h3 className="mb-1">Reset booking kedaluwarsa & kamar menggantung.</h3>
            <p className="mb-0 text-muted">Proses otomatis: batalkan booking lewat batas, lepas kamar tanpa pembayaran valid, tahan bukti untuk review manual.</p>
          </div>
          <div className="autoops-control-actions">
            <Button
              variant={hasWork ? 'warning' : 'outline-primary'}
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !canRun}
            >
              {mutation.isPending ? <><Spinner animation="border" size="sm" className="me-2" />Menjalankan...</> : 'Jalankan AutoOps'}
            </Button>
          </div>
        </div>

        <div className="autoops-control-grid mt-2">
          <div><strong>{expired}</strong><span>booking kedaluwarsa</span></div>
          <div><strong>{held}</strong><span>bukti perlu review</span></div>
          <div><strong>{orphan}</strong><span>kamar menggantung</span></div>
        </div>

        <Alert variant={hasWork ? 'warning' : 'info'} className="mt-2 mb-0 small">
          AutoOps hanya reset booking & kamar. Pembayaran, perpanjangan, dan checkout tetap diputuskan manual oleh admin/owner.
        </Alert>

        <div className="d-flex align-items-center gap-2 mt-2">
          <Badge bg={hasWork ? 'warning' : 'success'} text={hasWork ? 'dark' : undefined}>{hasWork ? 'Perlu Aksi' : 'Aman'}</Badge>
          <small className="text-muted">{hasWork ? `${expired + held + orphan} kandidat menunggu proses.` : 'Tidak ada booking atau kamar yang perlu direset.'}</small>
        </div>

        {lastError ? <Alert variant="danger" className="mt-2 mb-0 small">{lastError}</Alert> : null}

        {lastResult ? (
          <Accordion className="mt-2" defaultActiveKey={undefined}>
            <Accordion.Item eventKey="0">
              <Accordion.Header>
                Riwayat Run Terakhir
                <Badge bg="secondary" className="ms-2">{lastResult.expiredBookings + lastResult.releasedRooms} aksi</Badge>
              </Accordion.Header>
              <Accordion.Body>
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
                <Alert variant="light" className="mt-2 mb-0 small">
                  {describeFinanceAutomation(lastResult)}
                </Alert>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        ) : null}
      </Card.Body>
    </Card>
  );
}
