import { useMemo, useState } from "react";
import { Alert, Button, Form, Modal, Spinner } from "react-bootstrap";
import { useStay } from "../../hooks/useStay";
import { Stay } from "../../types";
import { formatRupiah } from "../../utils/formatCurrency";
import {
  depositActionMeta,
  getDepositSettlementNumbers,
  parseRupiahInput,
  validateDepositSettlement,
  type DepositAction,
} from "../../utils/depositSettlementCopy";

export default function ProcessDepositModal({
  show,
  onHide,
  stay,
}: {
  show: boolean;
  onHide: () => void;
  stay: Stay;
}) {
  const { processDepositMutation } = useStay(stay.id);
  const depositPaidAmount = Number(stay.depositPaidAmountRupiah ?? 0);
  const depositAmount =
    depositPaidAmount > 0
      ? depositPaidAmount
      : Number(stay.depositAmountRupiah ?? 0);
  const [action, setAction] = useState<DepositAction>("FULL_REFUND");
  const [deduction, setDeduction] = useState("0");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [confirmedRoomCheck, setConfirmedRoomCheck] = useState(false);
  const [confirmedDepositAmount, setConfirmedDepositAmount] = useState(false);

  const rawDeductionNumber = useMemo(
    () => parseRupiahInput(deduction),
    [deduction],
  );
  const settlement = useMemo(
    () =>
      getDepositSettlementNumbers(depositAmount, action, rawDeductionNumber),
    [action, depositAmount, rawDeductionNumber],
  );
  const selectedAction = depositActionMeta[action];
  const requiresNote = action === "PARTIAL_REFUND" || action === "FORFEIT";
  const validationMessage = validateDepositSettlement({
    depositAmount,
    action,
    deductionAmount: rawDeductionNumber,
    note,
  });
  const canSubmit =
    !validationMessage &&
    confirmedRoomCheck &&
    confirmedDepositAmount &&
    !processDepositMutation.isPending;

  const handleActionChange = (nextAction: DepositAction) => {
    setAction(nextAction);
    setError("");
    if (nextAction === "FULL_REFUND") {
      setDeduction("0");
    }
    if (nextAction === "FORFEIT") {
      setDeduction(String(depositAmount));
    }
  };

  const handleClose = () => {
    setAction("FULL_REFUND");
    setDeduction("0");
    setNote("");
    setError("");
    setConfirmedRoomCheck(false);
    setConfirmedDepositAmount(false);
    onHide();
  };

  const handleSubmit = async () => {
    setError("");

    const nextError = validateDepositSettlement({
      depositAmount,
      action,
      deductionAmount: rawDeductionNumber,
      note,
    });
    if (nextError) {
      setError(nextError);
      return;
    }

    try {
      await processDepositMutation.mutateAsync({
        action,
        depositDeductionRupiah: settlement.deductionAmount,
        depositRefundedRupiah: settlement.refundAmount,
        depositNote: note.trim() || undefined,
      });
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Gagal memproses deposit.");
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Proses Deposit Tenant</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error ? <Alert variant="danger">{error}</Alert> : null}

        <Alert variant="warning" className="small mb-3">
          <strong>Deposit bukan omzet.</strong> Proses setelah cek kamar dan
          kewajiban.
        </Alert>

        <Alert variant="light" className="border mb-3">
          <div className="d-flex flex-wrap gap-3 justify-content-between">
            <div>
              <div className="text-muted small">Deposit awal</div>
              <div className="fw-bold fs-5">
                {formatRupiah(settlement.depositAmount)}
              </div>
            </div>
            <div>
              <div className="text-muted small">Potongan</div>
              <div className="fw-bold fs-5">
                {formatRupiah(settlement.deductionAmount)}
              </div>
            </div>
            <div>
              <div className="text-muted small">Dikembalikan</div>
              <div className="fw-bold fs-5">
                {formatRupiah(settlement.refundAmount)}
              </div>
            </div>
            <div>
              <div className="text-muted small">Total diproses</div>
              <div className="fw-bold fs-5">
                {formatRupiah(settlement.processedAmount)}
              </div>
            </div>
          </div>
        </Alert>

        {depositPaidAmount > 0 &&
        depositPaidAmount !== Number(stay.depositAmountRupiah ?? 0) ? (
          <Alert variant="info" className="small mb-3">
            Sistem memakai deposit yang benar-benar diterima:{" "}
            <strong>{formatRupiah(depositPaidAmount)}</strong>.
          </Alert>
        ) : null}

        <Form.Group className="mb-3">
          <Form.Label>Keputusan Deposit</Form.Label>
          <Form.Select
            value={action}
            onChange={(e) =>
              handleActionChange(e.target.value as DepositAction)
            }
          >
            <option value="FULL_REFUND">
              {depositActionMeta.FULL_REFUND.label}
            </option>
            <option value="PARTIAL_REFUND">
              {depositActionMeta.PARTIAL_REFUND.label}
            </option>
            <option value="FORFEIT">{depositActionMeta.FORFEIT.label}</option>
          </Form.Select>
          <Alert variant={selectedAction.tone} className="small mt-2 mb-0">
            {selectedAction.helper}
          </Alert>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Nominal Potongan</Form.Label>
          <Form.Control
            type="text"
            inputMode="numeric"
            value={deduction}
            onChange={(e) =>
              setDeduction(e.target.value.replace(/[^0-9]/g, ""))
            }
            disabled={action !== "PARTIAL_REFUND"}
            placeholder="Contoh: 150000"
          />
          <div className="text-muted small mt-1">
            Potongan hanya untuk refund sebagian.
          </div>
        </Form.Group>

        <Form.Group>
          <Form.Label>
            Catatan Keputusan
            {requiresNote ? <span className="text-danger ms-1">*</span> : null}
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              requiresNote
                ? "Contoh: Dipotong untuk kerusakan remote AC dan denda kunci hilang."
                : "Opsional: catatan refund penuh."
            }
          />
          <div className="text-muted small mt-1">
            {requiresNote
              ? "Wajib minimal 8 karakter."
              : "Opsional untuk refund penuh."}
          </div>
        </Form.Group>

        <div className="border rounded-3 p-3 mt-3 bg-light">
          <div className="fw-semibold mb-2">Konfirmasi singkat</div>
          <Form.Check
            className="small mb-2"
            type="checkbox"
            id="deposit-room-check"
            checked={confirmedRoomCheck}
            onChange={(e) => setConfirmedRoomCheck(e.target.checked)}
            label="Kondisi kamar/barang sudah dicek."
          />
          <Form.Check
            className="small"
            type="checkbox"
            id="deposit-amount-check"
            checked={confirmedDepositAmount}
            onChange={(e) => setConfirmedDepositAmount(e.target.checked)}
            label="Nominal deposit yang diproses sudah benar."
          />
        </div>

        {validationMessage ? (
          <Alert variant="warning" className="small mt-3 mb-0">
            {validationMessage}
          </Alert>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Batal
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          variant={action === "FORFEIT" ? "danger" : "primary"}
        >
          {processDepositMutation.isPending ? (
            <>
              <Spinner size="sm" className="me-2" />
              Memproses...
            </>
          ) : (
            "Simpan Keputusan Deposit"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
