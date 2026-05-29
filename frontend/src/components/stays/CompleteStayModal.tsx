import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Form, Modal, Spinner } from "react-bootstrap";
import { ReadinessChecklist } from "../command-center";
import { useStay } from "../../hooks/useStay";
import { Invoice, Stay } from "../../types";
import {
  buildCheckoutReadinessItems,
  getCheckoutReadinessSummary,
  getDraftInvoices,
  getOpenInvoices,
  getOverdueOpenInvoices,
} from "../../utils/checkoutReadiness";

function toDateInput(value?: string | null) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime()))
    return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

export default function CompleteStayModal({
  show,
  onHide,
  onSuccess,
  stay,
  invoices,
  approvedCheckOutDate = null,
  hasApprovedCheckoutRequest = false,
  hasPendingCheckoutRequest = false,
  meterCount = 0,
  latestMeterReadingAt = null,
}: {
  show: boolean;
  onHide: () => void;
  onSuccess?: () => void;
  stay: Stay;
  invoices: Invoice[];
  approvedCheckOutDate?: string | null;
  hasApprovedCheckoutRequest?: boolean;
  hasPendingCheckoutRequest?: boolean;
  meterCount?: number;
  latestMeterReadingAt?: string | null;
}) {
  const { completeMutation } = useStay(stay.id);
  const [actualCheckOutDate, setActualCheckOutDate] = useState(() =>
    toDateInput(approvedCheckOutDate),
  );
  const [checkoutReason, setCheckoutReason] = useState("");
  const [error, setError] = useState("");
  const [confirmedFinalCheck, setConfirmedFinalCheck] = useState(false);

  const openInvoices = useMemo(() => getOpenInvoices(invoices), [invoices]);
  const draftInvoices = useMemo(() => getDraftInvoices(invoices), [invoices]);
  const overdueOpenInvoices = useMemo(
    () => getOverdueOpenInvoices(invoices),
    [invoices],
  );
  const readinessSummary = useMemo(
    () => getCheckoutReadinessSummary(invoices, hasApprovedCheckoutRequest),
    [hasApprovedCheckoutRequest, invoices],
  );
  const readinessItems = useMemo(
    () =>
      buildCheckoutReadinessItems({
        stay,
        invoices,
        hasApprovedCheckoutRequest,
        hasPendingCheckoutRequest,
        meterCount,
        latestMeterReadingAt,
      }),
    [
      hasApprovedCheckoutRequest,
      hasPendingCheckoutRequest,
      invoices,
      latestMeterReadingAt,
      meterCount,
      stay,
    ],
  );

  const canSubmit = Boolean(
    actualCheckOutDate &&
    checkoutReason.trim() &&
    confirmedFinalCheck &&
    openInvoices.length === 0,
  );

  useEffect(() => {
    if (show) {
      setActualCheckOutDate(toDateInput(approvedCheckOutDate));
      setConfirmedFinalCheck(false);
    }
  }, [approvedCheckOutDate, show]);

  const handleClose = () => {
    setActualCheckOutDate(toDateInput(approvedCheckOutDate));
    setCheckoutReason("");
    setError("");
    setConfirmedFinalCheck(false);
    onHide();
  };

  const handleSubmit = async () => {
    setError("");

    if (!actualCheckOutDate) {
      setError("Tanggal checkout final wajib diisi.");
      return;
    }
    if (!checkoutReason.trim()) {
      setError(
        "Alasan checkout final wajib diisi agar audit operasional jelas.",
      );
      return;
    }
    if (openInvoices.length > 0) {
      setError("Tagihan aktif masih memblokir final checkout.");
      return;
    }
    if (!confirmedFinalCheck) {
      setError("Centang konfirmasi final checkout terlebih dahulu.");
      return;
    }

    try {
      await completeMutation.mutateAsync({
        actualCheckOutDate,
        checkoutReason: checkoutReason.trim(),
      });
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Gagal menjalankan checkout final.",
      );
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Final Checkout — Lepas Kamar</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="warning" className="small mb-3">
          <strong>Final checkout adalah aksi sensitif.</strong> Aksi ini
          menyelesaikan masa sewa dan melepas kamar. Deposit tetap diproses
          terpisah setelah cek kondisi kamar dan barang.
        </Alert>

        <Alert variant={readinessSummary.tone} className="mb-3">
          <div className="fw-semibold">{readinessSummary.title}</div>
          <div className="small mt-1">{readinessSummary.message}</div>
        </Alert>

        <ReadinessChecklist
          title="Safety Checkout"
          subtitle="Clear tagihan sebelum kamar dilepas."
          items={readinessItems}
        />

        {openInvoices.length > 0 ? (
          <Alert variant="danger" className="small">
            <strong>Checkout belum bisa.</strong> Ada {openInvoices.length}{" "}
            tagihan aktif.{" "}
            {draftInvoices.length ? `${draftInvoices.length} DRAFT. ` : ""}
            {overdueOpenInvoices.length
              ? `${overdueOpenInvoices.length} terlambat. `
              : ""}
          </Alert>
        ) : null}

        <Alert variant="info" className="small mb-3">
          <strong>Urutan:</strong> tagihan clear → cek meter/kamar → final
          checkout → proses deposit.
        </Alert>

        {error ? <Alert variant="danger">{error}</Alert> : null}

        <Form.Group className="mb-3">
          <Form.Label>
            Tanggal Checkout Final<span className="text-danger ms-1">*</span>
          </Form.Label>
          <Form.Control
            type="date"
            value={actualCheckOutDate}
            onChange={(e) => setActualCheckOutDate(e.target.value)}
            required
          />
          <div className="text-muted small mt-1">
            Tanggal tenant benar-benar keluar dan kamar dilepas secara sistem.
          </div>
        </Form.Group>

        <Form.Group>
          <Form.Label>
            Alasan Checkout Final<span className="text-danger ms-1">*</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={checkoutReason}
            onChange={(e) => setCheckoutReason(e.target.value)}
            required
            placeholder="Contoh: Masa sewa selesai, tenant pindah, atau checkout disepakati admin."
          />
          <div className="text-muted small mt-1">
            Wajib diisi untuk audit operasional dan histori masa sewa.
          </div>
        </Form.Group>

        <div className="border rounded-3 p-3 mt-3 bg-light">
          <Form.Check
            className="small"
            type="checkbox"
            id="final-checkout-confirm"
            checked={confirmedFinalCheck}
            onChange={(e) => setConfirmedFinalCheck(e.target.checked)}
            label="Tagihan sudah clear dan kamar siap dilepas. Deposit diproses terpisah setelah ini."
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Batal
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={completeMutation.isPending || !canSubmit}
          variant={openInvoices.length > 0 ? "secondary" : "primary"}
        >
          {completeMutation.isPending ? (
            <>
              <Spinner size="sm" className="me-2" />
              Memproses...
            </>
          ) : (
            "Finalkan Checkout"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
