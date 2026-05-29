import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";
import {
  getStaffFieldReportReviewQueue,
  reviewStaffFieldReport,
} from "../../api/staffFieldReports";
import {
  adminDecisionOptions,
  fieldReportStatusLabels,
  getOptionLabel,
  getStaffRepairLabel,
  inventoryMovementTypeOptions,
} from "../../constants/staffRepairOptions";
import type { StaffFieldReport } from "../../types";

function reportTitle(report: StaffFieldReport) {
  return (
    report.roomItem?.item?.name ||
    report.inventoryItem?.name ||
    report.ticket?.title ||
    `Laporan #${report.id}`
  );
}

function reportLocation(report: StaffFieldReport) {
  return (
    report.room?.code ||
    report.roomItem?.room?.code ||
    report.ticket?.room?.code ||
    "Gudang / umum"
  );
}

function reportStatusText(status?: string | null) {
  return status ? fieldReportStatusLabels[status] || status : "Laporan";
}

export default function AdminStaffFieldReportQueue() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<StaffFieldReport | null>(null);
  const [decision, setDecision] = useState<
    "APPROVE" | "REJECT" | "NEEDS_MORE_INFO"
  >("APPROVE");
  const [adminNotes, setAdminNotes] = useState("");
  const [createMovement, setCreateMovement] = useState(false);
  const [movementType, setMovementType] = useState<"ASSIGN_TO_ROOM" | "OUT">(
    "ASSIGN_TO_ROOM",
  );
  const [evidenceChecked, setEvidenceChecked] = useState(false);
  const [finalDecisionChecked, setFinalDecisionChecked] = useState(false);
  const [stockMovementChecked, setStockMovementChecked] = useState(false);

  const queueQuery = useQuery({
    queryKey: ["staff-field-report-review-queue"],
    queryFn: getStaffFieldReportReviewQueue,
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return null;
      if (adminNotes.trim().length < 8)
        throw new Error("Catatan admin minimal 8 karakter.");
      if (!evidenceChecked || !finalDecisionChecked)
        throw new Error("Checklist konfirmasi admin wajib dicentang.");
      if (decision === "APPROVE" && createMovement && !stockMovementChecked)
        throw new Error("Konfirmasi mutasi stok resmi wajib dicentang.");
      return reviewStaffFieldReport(selected.id, {
        adminDecision: decision,
        adminNotes: adminNotes.trim() || undefined,
        createMovement:
          decision === "APPROVE" &&
          createMovement &&
          selected.requestedInventoryItemId &&
          selected.requestedQty
            ? {
                inventoryItemId: selected.requestedInventoryItemId,
                movementType,
                qty: String(selected.requestedQty),
                roomId: selected.roomId ?? undefined,
                note: `Dari laporan staff #${selected.id}: ${adminNotes || selected.conditionNotes || "permintaan barang"}`,
              }
            : undefined,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["staff-field-report-review-queue"],
        }),
        queryClient.invalidateQueries({ queryKey: ["tickets"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] }),
        queryClient.invalidateQueries({ queryKey: ["/inventory-items", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["/inventory-movements", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["room"] }),
      ]);
      setSelected(null);
      setAdminNotes("");
      setDecision("APPROVE");
      setCreateMovement(false);
      setMovementType("ASSIGN_TO_ROOM");
      setEvidenceChecked(false);
      setFinalDecisionChecked(false);
      setStockMovementChecked(false);
    },
  });

  const queue = queueQuery.data;
  const total =
    (queue?.pendingStockApproval?.length ?? 0) +
    (queue?.pendingItemDecision?.length ?? 0) +
    (queue?.pendingVerification?.length ?? 0);

  const openReview = (
    report: StaffFieldReport,
    nextDecision: "APPROVE" | "REJECT" | "NEEDS_MORE_INFO" = "APPROVE",
    nextCreateMovement = false,
  ) => {
    setSelected(report);
    setDecision(nextDecision);
    setCreateMovement(nextCreateMovement);
    setEvidenceChecked(false);
    setFinalDecisionChecked(false);
    setStockMovementChecked(false);
    setAdminNotes("");
  };

  return (
    <Card className="content-card border-0 mb-3">
      <Card.Body>
        <div className="table-meta align-items-start mb-3">
          <div>
            <div className="eyebrow mb-1">Antrian konfirmasi admin</div>
            <h6 className="mb-1">Laporan staff yang butuh keputusan</h6>
            <div className="panel-subtitle">
              Cek laporan kondisi, permintaan barang, dan pekerjaan yang selesai
              sebelum status barang menjadi final.
            </div>
          </div>
          <span className="table-meta-count">{total} perlu cek</span>
        </div>
        {queueQuery.isLoading ? (
          <div className="py-3">
            <Spinner size="sm" /> Memuat antrian...
          </div>
        ) : null}
        {queueQuery.isError ? (
          <Alert variant="danger">
            Antrian laporan staff belum bisa dimuat.
          </Alert>
        ) : null}
        {!queueQuery.isLoading && !queueQuery.isError ? (
          <Row className="g-3">
            <Col lg={4}>
              <div className="small fw-semibold mb-2">Permintaan barang</div>
              {(queue?.pendingStockApproval ?? []).slice(0, 5).map((report) => (
                <div className="staff-admin-report-card" key={report.id}>
                  <strong>{reportTitle(report)}</strong>
                  <span>
                    {reportLocation(report)} · {reportStatusText(report.status)}
                  </span>
                  <small>
                    Butuh: {report.requestedInventoryItem?.name ?? "barang"} x{" "}
                    {String(report.requestedQty ?? "-")}
                  </small>
                  <Button
                    size="sm"
                    onClick={() => {
                      openReview(report, "APPROVE", true);
                      setMovementType(report.roomId ? "ASSIGN_TO_ROOM" : "OUT");
                    }}
                  >
                    Cek
                  </Button>
                </div>
              ))}
              {!(queue?.pendingStockApproval ?? []).length ? (
                <div className="small text-muted">
                  Tidak ada permintaan barang.
                </div>
              ) : null}
            </Col>
            <Col lg={4}>
              <div className="small fw-semibold mb-2">Keputusan barang</div>
              {(queue?.pendingItemDecision ?? []).slice(0, 5).map((report) => (
                <div className="staff-admin-report-card" key={report.id}>
                  <strong>{reportTitle(report)}</strong>
                  <span>
                    {reportLocation(report)} ·{" "}
                    {getStaffRepairLabel(report.reportedCondition)}
                  </span>
                  <small>
                    {report.conditionNotes || "Menunggu keputusan admin."}
                  </small>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={() => {
                      openReview(report, "APPROVE", false);
                      setMovementType(report.roomId ? "ASSIGN_TO_ROOM" : "OUT");
                    }}
                  >
                    Cek
                  </Button>
                </div>
              ))}
              {!(queue?.pendingItemDecision ?? []).length ? (
                <div className="small text-muted">
                  Tidak ada keputusan barang pending.
                </div>
              ) : null}
            </Col>
            <Col lg={4}>
              <div className="small fw-semibold mb-2">Selesai perlu cek</div>
              {(queue?.pendingVerification ?? []).slice(0, 5).map((ticket) => (
                <div className="staff-admin-report-card" key={ticket.id}>
                  <strong>
                    {ticket.title ||
                      ticket.ticketNumber ||
                      `Tiket #${ticket.id}`}
                  </strong>
                  <span>
                    {ticket.room?.code || "Lokasi belum jelas"} · DONE
                  </span>
                  <small>
                    Close tiket dari daftar tiket setelah bukti dicek.
                  </small>
                </div>
              ))}
              {!(queue?.pendingVerification ?? []).length ? (
                <div className="small text-muted">
                  Tidak ada pekerjaan selesai yang menunggu cek.
                </div>
              ) : null}
            </Col>
          </Row>
        ) : null}
      </Card.Body>

      <Modal
        show={Boolean(selected)}
        onHide={() => {
          setSelected(null);
          setEvidenceChecked(false);
          setFinalDecisionChecked(false);
          setStockMovementChecked(false);
          setAdminNotes("");
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Konfirmasi Laporan Staff</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selected ? (
            <>
              <div className="staff-field-target mb-3">
                <div className="small text-muted">Laporan</div>
                <div className="fw-semibold">{reportTitle(selected)}</div>
                <div className="small text-muted">
                  {reportLocation(selected)}
                </div>
              </div>
              {reviewMutation.isError ? (
                <Alert variant="danger" className="py-2 small">
                  {(reviewMutation.error as any)?.message ||
                    "Keputusan belum tersimpan."}
                </Alert>
              ) : null}
              <Alert variant="info" className="py-2 small">
                Staff hanya melapor. Admin/owner yang menentukan keputusan final
                dan mutasi stok.
              </Alert>
              <div className="mb-3 rounded-4 border bg-light p-3">
                <Form.Check
                  className="mb-2"
                  type="checkbox"
                  id="staff-report-evidence-check"
                  label="Saya sudah cek catatan/foto staff."
                  checked={evidenceChecked}
                  onChange={(event) =>
                    setEvidenceChecked(event.currentTarget.checked)
                  }
                />
                <Form.Check
                  type="checkbox"
                  id="staff-report-final-decision-check"
                  label="Saya paham keputusan ini adalah keputusan admin, bukan keputusan staff."
                  checked={finalDecisionChecked}
                  onChange={(event) =>
                    setFinalDecisionChecked(event.currentTarget.checked)
                  }
                />
              </div>
              <p className="mb-2">
                <strong>Kondisi:</strong>{" "}
                {getStaffRepairLabel(selected.reportedCondition)}
              </p>
              <p className="mb-2">
                <strong>Catatan staff:</strong> {selected.conditionNotes || "-"}
              </p>
              {selected.photoUrl ? (
                <img
                  src={selected.photoUrl}
                  alt="Bukti staff"
                  style={{
                    width: 160,
                    height: 100,
                    objectFit: "cover",
                    borderRadius: 10,
                  }}
                />
              ) : null}
              <Form.Group className="mt-3">
                <Form.Label>Keputusan admin</Form.Label>
                <div
                  className="staff-choice-grid admin-decision-grid"
                  role="group"
                  aria-label="Keputusan admin"
                >
                  {adminDecisionOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`staff-choice-card ${decision === option.value ? "is-active" : ""} ${option.value === "APPROVE" ? "tone-good" : option.value === "REJECT" ? "tone-danger" : "tone-warning"}`}
                      onClick={() => setDecision(option.value)}
                      aria-pressed={decision === option.value}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.helper}</span>
                    </button>
                  ))}
                </div>
                <Form.Text>
                  Pilih keputusan ringkas. Close tiket tetap dilakukan dari alur
                  tiket setelah bukti dicek.
                </Form.Text>
              </Form.Group>
              {selected.requestsReplacement && decision !== "APPROVE" ? (
                <Alert variant="warning" className="py-2 small mt-3">
                  Mutasi stok hanya bisa dibuat jika diagnosis disetujui.
                </Alert>
              ) : null}
              {selected.requestsReplacement ? (
                <div className="mt-3 rounded-4 border bg-light p-3">
                  <Form.Check
                    type="switch"
                    id="admin-create-movement"
                    label={`Buat mutasi stok sekarang (${selected.requestedInventoryItem?.name ?? "barang"} x ${String(selected.requestedQty ?? "-")})`}
                    checked={decision === "APPROVE" && createMovement}
                    disabled={decision !== "APPROVE"}
                    onChange={(event) =>
                      setCreateMovement(event.currentTarget.checked)
                    }
                  />
                  {createMovement && decision === "APPROVE" ? (
                    <Form.Group className="mt-2">
                      <Form.Label>Jenis mutasi stok</Form.Label>
                      <Form.Select
                        value={movementType}
                        onChange={(event) =>
                          setMovementType(
                            event.currentTarget.value as
                              | "ASSIGN_TO_ROOM"
                              | "OUT",
                          )
                        }
                      >
                        {(selected.roomId
                          ? inventoryMovementTypeOptions
                          : inventoryMovementTypeOptions.filter(
                              (option) => option.value === "OUT",
                            )
                        ).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Text>
                        {getOptionLabel(
                          inventoryMovementTypeOptions,
                          movementType,
                        )}
                      </Form.Text>
                      <Alert variant="warning" className="small mt-2 mb-2">
                        Ini mengubah stok resmi. Pastikan bukti staff sudah dicek.
                      </Alert>
                      <Form.Check
                        type="checkbox"
                        label="Saya paham ini mengubah stok resmi."
                        checked={stockMovementChecked}
                        onChange={(event) => setStockMovementChecked(event.currentTarget.checked)}
                      />
                    </Form.Group>
                  ) : null}
                </div>
              ) : null}
              <Form.Group className="mt-3">
                <Form.Label>Catatan admin</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.currentTarget.value)}
                  placeholder="Contoh: disetujui, ambil lampu cadangan 1 pcs dari gudang"
                  isInvalid={
                    Boolean(adminNotes) && adminNotes.trim().length < 8
                  }
                />
                <Form.Text>
                  Minimal 8 karakter untuk audit keputusan admin.
                </Form.Text>
                <Form.Control.Feedback type="invalid">
                  Catatan admin minimal 8 karakter.
                </Form.Control.Feedback>
              </Form.Group>
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="light"
            onClick={() => {
              setSelected(null);
              setEvidenceChecked(false);
              setFinalDecisionChecked(false);
              setStockMovementChecked(false);
              setAdminNotes("");
            }}
          >
            Batal
          </Button>
          <Button
            onClick={() => reviewMutation.mutate()}
            disabled={
              reviewMutation.isPending ||
              adminNotes.trim().length < 8 ||
              !evidenceChecked ||
              !finalDecisionChecked ||
              (decision === "APPROVE" && createMovement && !stockMovementChecked)
            }
          >
            {reviewMutation.isPending ? "Menyimpan..." : "Konfirmasi Admin"}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}
