import { useMemo, useState } from 'react';
import { Alert, Button, Card, Spinner } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { runAutoOps, type AutoOpsRunResult, type AutoOpsStatus } from '../../api/autoOps';

type AutoOpsRole = 'OWNER' | 'ADMIN';

type Props = {
  status?: AutoOpsStatus | null;
  role: AutoOpsRole;
  onCompleted?: () => void;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function describeAccountingAutoClose(result: AutoOpsRunResult | null) {
  const autoClose = result?.accountingAutoClose as any;
  if (!autoClose) return 'Accounting auto-close belum dijalankan pada sesi ini.';
  if (autoClose.closed) return 'Accounting auto-close menutup periode sebelumnya dengan aman.';
  if (autoClose.skipped) return `Accounting auto-close safe-skip: ${autoClose.skippedReason ?? 'periode belum siap ditutup.'}`;
  return 'Accounting auto-close selesai tanpa perubahan periode.';
}

function buildRunSummary(result: AutoOpsRunResult | null) {
  if (!result) return [];
  return [
    { label: 'Booking direset', value: toNumber(result.expiredBookings), helper: 'Booking lewat batas tanpa bukti valid.' },
    { label: 'Bukti ditahan review', value: toNumber(result.heldForPaymentReview), helper: 'Tidak auto-cancel; admin harus putuskan.' },
    { label: 'Kamar dilepas', value: toNumber(result.releasedRooms), helper: 'Reserved orphan kembali available.' },
  ];
}

export default function AutoOpsControlPanel({ status, role, onCompleted }: Props) {
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<AutoOpsRunResult | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const expired = toNumber(status?.expiredCandidates);
  const held = toNumber(status?.heldForPaymentReview);
  const orphan = toNumber(status?.orphanReservedRooms);
  const hasWork = expired + held + orphan > 0;
  const runSummary = useMemo(() => buildRunSummary(lastResult), [lastResult]);

  const mutation = useMutation({
    mutationFn: runAutoOps,
    onSuccess: async (result) => {
      setLastError(null);
      setLastResult(result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard-owner'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-admin'] }),
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
            <div className="page-eyebrow mb-1">AutoOps First-Paid Control</div>
            <h3 className="mb-1">Kamar mengikuti pembayaran valid pertama, bukan sekadar booking.</h3>
            <p className="mb-0 text-muted">
              Panel ini menjalankan reset booking lewat batas, melepas kamar reserved orphan, dan menahan bukti pembayaran pending agar tetap direview manusia.
            </p>
          </div>
          <div className="autoops-control-actions">
            <Button
              variant={hasWork ? 'danger' : 'outline-primary'}
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <><Spinner animation="border" size="sm" className="me-2" />Menjalankan...</> : 'Jalankan AutoOps sekarang'}
            </Button>
            <small>{role === 'OWNER' ? 'Owner dapat trigger manual untuk audit.' : 'Admin dapat trigger operasional, bukan approval pembayaran.'}</small>
          </div>
        </div>

        <div className="autoops-control-grid mt-3">
          <div><strong>{expired}</strong><span>siap reset/cancel</span></div>
          <div><strong>{held}</strong><span>bukti pending review</span></div>
          <div><strong>{orphan}</strong><span>reserved orphan</span></div>
        </div>

        <Alert variant={hasWork ? 'warning' : 'info'} className="mt-3 mb-0 small">
          AutoOps tidak approve pembayaran, tidak approve perpanjangan, tidak final checkout, dan tidak refund deposit. Flow sensitif tetap keputusan manusia.
        </Alert>

        {lastError ? <Alert variant="danger" className="mt-3 mb-0 small">{lastError}</Alert> : null}

        {lastResult ? (
          <div className="autoops-run-result mt-3">
            <div className="table-meta mb-2">
              <div>
                <div className="panel-title">Hasil run terakhir</div>
                <div className="panel-subtitle">Gunakan angka ini untuk UAT AutoOps tanpa membaca log mentah.</div>
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
