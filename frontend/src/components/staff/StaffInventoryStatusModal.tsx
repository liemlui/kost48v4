import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Form, Modal, Spinner } from "react-bootstrap";
import {
  uploadTicketImage,
  type UploadedImageMeta,
} from "../../api/mediaUploads";
import { listResource } from "../../api/resources";
import {
  updateInventoryItemFieldStatus,
  updateRoomItemFieldStatus,
} from "../../api/staffInventory";
import {
  warehouseConditionOptions,
  type StaffRepairConditionOption,
} from "../../constants/staffRepairOptions";
import type { InventoryItem, RoomItem } from "../../types";
import { getInventoryHealth } from "../../utils/inventoryHealth";
import CameraOrGalleryInput from "../common/CameraOrGalleryInput";
import SafeImage from "../common/SafeImage";
import { compressImageFile as compressBrowserImage } from "../../utils/compressImageFile";

type Target =
  | { type: "room-item"; item: RoomItem }
  | { type: "inventory-item"; item: InventoryItem };

type Props = {
  target: Target | null;
  show: boolean;
  onHide: () => void;
  onSaved?: () => void | Promise<void>;
};

type RoomTriage = "" | "NORMAL" | "PROBLEM";
type RoomIssueType =
  | ""
  | "NOT_WORKING"
  | "VISIBLE_DAMAGE"
  | "MISSING"
  | "UNSURE";
type RoomHandlingPlan = "" | "REPAIR" | "REPLACE" | "ADMIN_CHECK";

const roomIssueCopy: Record<
  Exclude<RoomIssueType, "">,
  { label: string; helper: string }
> = {
  NOT_WORKING: {
    label: "Tidak berfungsi",
    helper: "Contoh: lampu mati, AC tidak dingin, kran tidak keluar air.",
  },
  VISIBLE_DAMAGE: {
    label: "Tampak rusak",
    helper: "Contoh: pecah, patah, bocor, kabel terkelupas.",
  },
  MISSING: {
    label: "Tidak ada / hilang",
    helper: "Barang tidak ditemukan di kamar dan perlu keputusan admin.",
  },
  UNSURE: {
    label: "Tidak yakin",
    helper: "Kondisi belum pasti. Admin perlu cek sebelum status final.",
  },
};

const roomHandlingCopy: Record<
  Exclude<RoomHandlingPlan, "">,
  { label: string; helper: string }
> = {
  REPAIR: {
    label: "Bisa diperbaiki",
    helper: "Barang masih ada dan kemungkinan cukup diperbaiki/disetel ulang.",
  },
  REPLACE: {
    label: "Perlu diganti",
    helper:
      "Barang kemungkinan perlu pengganti dari gudang, tetapi tetap menunggu persetujuan admin.",
  },
  ADMIN_CHECK: {
    label: "Saya tidak yakin",
    helper: "Biarkan admin menentukan apakah perlu diperbaiki atau diganti.",
  },
};

async function compressImageFile(file: File): Promise<File> {
  return compressBrowserImage(file, { maxSide: 1600, quality: 0.78 });
}

function targetTitle(target: Target | null) {
  if (!target) return "Laporkan kondisi barang";
  if (target.type === "room-item")
    return target.item.item?.name ?? `Barang kamar #${target.item.id}`;
  return target.item.name;
}

function ChoiceCard({
  active,
  title,
  helper,
  onClick,
  tone = "neutral",
}: {
  active: boolean;
  title: string;
  helper: string;
  onClick: () => void;
  tone?: "neutral" | "good" | "warning" | "danger";
}) {
  return (
    <button
      type="button"
      className={`staff-choice-card ${active ? "is-active" : ""} tone-${tone}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <strong>{title}</strong>
      <span>{helper}</span>
    </button>
  );
}

function getRoomReportChoice(
  triage: RoomTriage,
  issueType: RoomIssueType,
  handlingPlan: RoomHandlingPlan,
): StaffRepairConditionOption | null {
  if (triage === "NORMAL") {
    return {
      value: "GOOD",
      backendStatus: "GOOD",
      label: "Terlihat normal",
      helper:
        "Staff melaporkan barang terlihat aman. Admin tetap bisa mengecek laporan bila diperlukan.",
    };
  }

  if (triage !== "PROBLEM") return null;

  if (issueType === "MISSING") {
    return {
      value: "MISSING",
      backendStatus: "MISSING",
      label: "Tidak ada / hilang",
      helper: roomIssueCopy.MISSING.helper,
      allowReplacementRequest: true,
    };
  }

  if (issueType === "UNSURE") {
    return {
      value: "PENDING_CHECK",
      backendStatus: "MAINTENANCE",
      label: "Perlu cek admin",
      helper: roomIssueCopy.UNSURE.helper,
    };
  }

  if (issueType && handlingPlan === "REPLACE") {
    return {
      value: "NEEDS_REPLACEMENT",
      backendStatus: "MAINTENANCE",
      label: "Perlu diganti",
      helper: roomHandlingCopy.REPLACE.helper,
      allowReplacementRequest: true,
    };
  }

  if (issueType && handlingPlan === "ADMIN_CHECK") {
    return {
      value: "PENDING_CHECK",
      backendStatus: "MAINTENANCE",
      label: "Perlu cek admin",
      helper: roomHandlingCopy.ADMIN_CHECK.helper,
    };
  }

  if (issueType && handlingPlan === "REPAIR") {
    return {
      value: "NEEDS_REPAIR",
      backendStatus: "MAINTENANCE",
      label: "Bisa diperbaiki",
      helper: roomHandlingCopy.REPAIR.helper,
      allowReplacementRequest: true,
    };
  }

  return null;
}

export default function StaffInventoryStatusModal({
  target,
  show,
  onHide,
  onSaved,
}: Props) {
  const queryClient = useQueryClient();
  const [roomTriage, setRoomTriage] = useState<RoomTriage>("");
  const [roomIssueType, setRoomIssueType] = useState<RoomIssueType>("");
  const [roomHandlingPlan, setRoomHandlingPlan] =
    useState<RoomHandlingPlan>("");
  const [conditionValue, setConditionValue] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<UploadedImageMeta | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [requestsReplacement, setRequestsReplacement] = useState(false);
  const [requestedInventoryItemId, setRequestedInventoryItemId] = useState("");
  const [requestedQty, setRequestedQty] = useState("1");

  const isRoomTarget = target?.type === "room-item";
  const selectedRoomCondition = useMemo(
    () => getRoomReportChoice(roomTriage, roomIssueType, roomHandlingPlan),
    [roomTriage, roomIssueType, roomHandlingPlan],
  );
  const selectedWarehouseCondition =
    warehouseConditionOptions.find(
      (option) => option.value === conditionValue,
    ) ?? null;
  const inventoryHealth =
    target?.type === "inventory-item" ? getInventoryHealth(target.item) : null;
  const selectedCondition = isRoomTarget
    ? selectedRoomCondition
    : selectedWarehouseCondition;
  const canRequestReplacement =
    isRoomTarget &&
    Boolean(
      selectedCondition?.allowReplacementRequest ||
      selectedCondition?.defaultRequestsReplacement,
    );

  const inventoryItemsQuery = useQuery({
    queryKey: ["staff-replacement-inventory-options"],
    queryFn: () =>
      listResource<InventoryItem>("/inventory-items", {
        limit: 200,
        isActive: "true",
      }),
    enabled: show && canRequestReplacement && requestsReplacement,
  });
  const replacementOptions = useMemo(
    () =>
      (inventoryItemsQuery.data?.items ?? []).filter(
        (item) => item.isActive !== false,
      ),
    [inventoryItemsQuery.data?.items],
  );

  const helperCopy = useMemo(() => {
    if (isRoomTarget) {
      return "Jawab sesuai kondisi lapangan. Tambahkan foto atau catatan agar tindak lanjut lebih jelas.";
    }
    return "Stok habis/menipis terbaca dari jumlah barang. Laporkan masalah fisik atau kebutuhan restock bila perlu.";
  }, [isRoomTarget]);

  const reset = () => {
    setRoomTriage("");
    setRoomIssueType("");
    setRoomHandlingPlan("");
    setConditionValue("");
    setNote("");
    setPhoto(null);
    setPreview(null);
    setError("");
    setRequestsReplacement(false);
    setRequestedInventoryItemId("");
    setRequestedQty("1");
  };

  useEffect(() => {
    if (show) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, target?.type, target?.item.id]);

  const close = () => {
    reset();
    onHide();
  };

  const roomNeedsHandlingStep =
    roomTriage === "PROBLEM" &&
    roomIssueType !== "" &&
    !["MISSING", "UNSURE"].includes(roomIssueType);
  const isRoomChoiceComplete =
    roomTriage === "NORMAL" ||
    (roomTriage === "PROBLEM" &&
      Boolean(roomIssueType) &&
      (!roomNeedsHandlingStep || Boolean(roomHandlingPlan)));
  const isChoiceComplete = isRoomTarget
    ? isRoomChoiceComplete
    : Boolean(selectedWarehouseCondition);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) return null;
      if (!isChoiceComplete || !selectedCondition)
        throw new Error(
          isRoomTarget
            ? "Lengkapi pilihan kondisi barang secara bertahap dulu."
            : "Pilih jenis laporan gudang dulu.",
        );
      if (
        canRequestReplacement &&
        requestsReplacement &&
        (!requestedInventoryItemId || !requestedQty.trim())
      ) {
        throw new Error(
          "Pilih barang pengganti dan jumlah yang dibutuhkan. Jika belum tahu barangnya, matikan dulu permintaan pengganti.",
        );
      }
      if (!photo?.fileUrl && !note.trim()) {
        throw new Error(
          "Isi catatan singkat atau upload foto agar admin bisa mengecek laporan.",
        );
      }
      const payload = {
        status: selectedCondition.backendStatus,
        note: note.trim() || selectedCondition.label,
        photoUrl: photo?.fileUrl,
        photoFileKey: photo?.fileKey,
        photoOriginalFilename: photo?.originalFilename,
        photoMimeType: photo?.mimeType,
        photoFileSizeBytes: photo?.fileSizeBytes,
        requestsReplacement:
          canRequestReplacement && requestsReplacement ? true : undefined,
        requestedInventoryItemId:
          canRequestReplacement &&
          requestsReplacement &&
          requestedInventoryItemId
            ? Number(requestedInventoryItemId)
            : undefined,
        requestedQty:
          canRequestReplacement && requestsReplacement
            ? requestedQty
            : undefined,
      };
      if (target.type === "room-item") {
        return updateRoomItemFieldStatus(target.item.id, payload);
      }
      return updateInventoryItemFieldStatus(target.item.id, payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["room"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] }),
        queryClient.invalidateQueries({ queryKey: ["/inventory-items"] }),
        queryClient.invalidateQueries({
          queryKey: ["staff-general-inventory"],
        }),
        queryClient.invalidateQueries({ queryKey: ["tickets"] }),
        queryClient.invalidateQueries({ queryKey: ["staff-field-reports"] }),
        queryClient.invalidateQueries({
          queryKey: ["staff-field-report-review-queue"],
        }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-staff"] }),
        queryClient.invalidateQueries({
          queryKey: ["staff-performance-me-dashboard"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["staff-performance-me-evidence"],
        }),
      ]);
      await onSaved?.();
      close();
    },
    onError: (err: any) =>
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Laporan kondisi belum terkirim.",
      ),
  });

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const compressed = await compressImageFile(file);
      const uploaded = await uploadTicketImage(compressed);
      setPhoto(uploaded);
      setPreview(uploaded.fileUrl);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Foto belum berhasil diunggah. Coba foto lain.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const chooseRoomTriage = (next: RoomTriage) => {
    setRoomTriage(next);
    setRoomIssueType("");
    setRoomHandlingPlan("");
    setRequestsReplacement(false);
    setRequestedInventoryItemId("");
    setRequestedQty("1");
  };

  const chooseIssueType = (next: RoomIssueType) => {
    setRoomIssueType(next);
    setRoomHandlingPlan("");
    setRequestsReplacement(false);
    setRequestedInventoryItemId("");
    setRequestedQty("1");
  };

  const chooseHandling = (next: RoomHandlingPlan) => {
    setRoomHandlingPlan(next);
    setRequestsReplacement(false);
    setRequestedInventoryItemId("");
    setRequestedQty("1");
  };

  return (
    <Modal
      show={show}
      onHide={close}
      centered
      dialogClassName="staff-report-modal"
    >
      <Modal.Header closeButton>
        <div>
          <div className="staff-modal-eyebrow">Laporan staff</div>
          <Modal.Title>
            {isRoomTarget ? "Laporkan Barang Kamar" : "Laporkan Masalah Gudang"}
          </Modal.Title>
        </div>
      </Modal.Header>
      <Modal.Body>
        {error ? (
          <Alert variant="danger" className="py-2 staff-modal-alert">
            {error}
          </Alert>
        ) : null}
        <Alert variant="info" className="staff-modal-guidance">
          {helperCopy}
        </Alert>

        <div className="staff-field-target mb-3">
          <div className="small text-muted">Barang yang dicek</div>
          <div className="fw-semibold">{targetTitle(target)}</div>
          {inventoryHealth ? (
            <div
              className={`staff-auto-stock-insight tone-${inventoryHealth.tone}`}
            >
              <strong>{inventoryHealth.label}</strong>
              <span>{inventoryHealth.copy}</span>
            </div>
          ) : null}
        </div>

        {isRoomTarget ? (
          <div className="staff-progressive-form">
            <section className="staff-step-card">
              <div className="staff-step-head">
                <span>1</span>
                <div>
                  <strong>Kondisi barang ini sekarang?</strong>
                  <small>
                    Pilih jawaban paling dekat dengan kondisi lapangan.
                  </small>
                </div>
              </div>
              <div className="staff-choice-grid two">
                <ChoiceCard
                  active={roomTriage === "NORMAL"}
                  title="Normal"
                  helper="Barang terlihat aman atau sudah kembali baik."
                  tone="good"
                  onClick={() => chooseRoomTriage("NORMAL")}
                />
                <ChoiceCard
                  active={roomTriage === "PROBLEM"}
                  title="Ada masalah"
                  helper="Barang rusak, hilang, atau perlu dicek."
                  tone="warning"
                  onClick={() => chooseRoomTriage("PROBLEM")}
                />
              </div>
            </section>

            {roomTriage === "PROBLEM" ? (
              <section className="staff-step-card">
                <div className="staff-step-head">
                  <span>2</span>
                  <div>
                    <strong>Masalah yang terlihat?</strong>
                    <small>
                      Jelaskan kondisi yang terlihat dan tambahkan foto bila perlu.
                    </small>
                  </div>
                </div>
                <div className="staff-choice-grid">
                  <ChoiceCard
                    active={roomIssueType === "NOT_WORKING"}
                    title={roomIssueCopy.NOT_WORKING.label}
                    helper={roomIssueCopy.NOT_WORKING.helper}
                    tone="warning"
                    onClick={() => chooseIssueType("NOT_WORKING")}
                  />
                  <ChoiceCard
                    active={roomIssueType === "VISIBLE_DAMAGE"}
                    title={roomIssueCopy.VISIBLE_DAMAGE.label}
                    helper={roomIssueCopy.VISIBLE_DAMAGE.helper}
                    tone="danger"
                    onClick={() => chooseIssueType("VISIBLE_DAMAGE")}
                  />
                  <ChoiceCard
                    active={roomIssueType === "MISSING"}
                    title={roomIssueCopy.MISSING.label}
                    helper={roomIssueCopy.MISSING.helper}
                    tone="danger"
                    onClick={() => chooseIssueType("MISSING")}
                  />
                  <ChoiceCard
                    active={roomIssueType === "UNSURE"}
                    title={roomIssueCopy.UNSURE.label}
                    helper={roomIssueCopy.UNSURE.helper}
                    onClick={() => chooseIssueType("UNSURE")}
                  />
                </div>
              </section>
            ) : null}

            {roomNeedsHandlingStep ? (
              <section className="staff-step-card">
                <div className="staff-step-head">
                  <span>3</span>
                  <div>
                    <strong>Menurut kondisi lapangan, perlu apa?</strong>
                    <small>
                      Ini hanya estimasi awal untuk membantu admin mengambil
                      keputusan.
                    </small>
                  </div>
                </div>
                <div className="staff-choice-grid">
                  <ChoiceCard
                    active={roomHandlingPlan === "REPAIR"}
                    title={roomHandlingCopy.REPAIR.label}
                    helper={roomHandlingCopy.REPAIR.helper}
                    tone="warning"
                    onClick={() => chooseHandling("REPAIR")}
                  />
                  <ChoiceCard
                    active={roomHandlingPlan === "REPLACE"}
                    title={roomHandlingCopy.REPLACE.label}
                    helper={roomHandlingCopy.REPLACE.helper}
                    tone="danger"
                    onClick={() => chooseHandling("REPLACE")}
                  />
                  <ChoiceCard
                    active={roomHandlingPlan === "ADMIN_CHECK"}
                    title={roomHandlingCopy.ADMIN_CHECK.label}
                    helper={roomHandlingCopy.ADMIN_CHECK.helper}
                    onClick={() => chooseHandling("ADMIN_CHECK")}
                  />
                </div>
              </section>
            ) : null}

            {selectedCondition ? (
              <div className="staff-report-result">
                <span>Ringkasan laporan</span>
                <strong>{selectedCondition.label}</strong>
                <small>{selectedCondition.helper}</small>
              </div>
            ) : null}
          </div>
        ) : (
          <section className="staff-step-card">
            <div className="staff-step-head">
              <span>1</span>
              <div>
                <strong>Apa yang perlu dilaporkan?</strong>
                <small>
                  Jangan pilih stok habis/menipis secara manual. Sistem sudah
                  menghitungnya dari qty dan minimal stok.
                </small>
              </div>
            </div>
            <div className="staff-choice-grid">
              {warehouseConditionOptions.map((option) => (
                <ChoiceCard
                  key={option.value}
                  active={conditionValue === option.value}
                  title={option.label}
                  helper={option.helper ?? "Kirim sebagai laporan gudang."}
                  tone={
                    ["DAMAGED", "MISSING"].includes(option.value)
                      ? "danger"
                      : [
                            "COUNT_MISMATCH",
                            "RESTOCK_REQUEST",
                            "NEEDS_REPAIR",
                            "PENDING_CHECK",
                          ].includes(option.value)
                        ? "warning"
                        : "neutral"
                  }
                  onClick={() => setConditionValue(option.value)}
                />
              ))}
            </div>
            {selectedWarehouseCondition ? (
              <div className="staff-system-rule-note mt-3">
                <strong>Alur otomatis</strong>
                <span>
                  Laporan akan masuk sebagai catatan lapangan. Sistem tetap
                  menghitung status stok otomatis; admin hanya masuk untuk
                  koreksi stok resmi, restock, atau keputusan kondisi fisik.
                </span>
              </div>
            ) : null}
          </section>
        )}

        <div className="staff-evidence-panel mt-3">
          <Form.Group className="mb-3">
            <Form.Label>Foto bukti</Form.Label>
            <CameraOrGalleryInput onChange={handleImage} />
            {preview ? (
              <SafeImage
                className="staff-proof-preview"
                src={preview}
                alt="Foto bukti"
              />
            ) : null}
            <Form.Text>
              Tambahkan foto agar admin lebih cepat memutuskan. Bisa dilewati
              jika catatan sudah jelas.
            </Form.Text>
          </Form.Group>
          <Form.Group>
            <Form.Label>Catatan lapangan</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.currentTarget.value)}
              placeholder={
                isRoomTarget
                  ? "Contoh: lampu kamar mati total saat dicek pagi ini"
                  : "Contoh: jumlah fisik hanya 3 pcs, di sistem tertulis 8 pcs"
              }
            />
          </Form.Group>
        </div>

        {isRoomTarget ? (
          <div
            className={`staff-replacement-panel mt-3 ${!canRequestReplacement ? "is-disabled" : ""}`}
          >
            <div className="d-flex gap-3 align-items-start justify-content-between">
              <div>
                <strong>Perlu minta barang pengganti dari gudang?</strong>
                <small>
                  Jika belum tahu barangnya, biarkan mati. Admin tetap bisa
                  memutuskan nanti.
                </small>
              </div>
              <Form.Check
                type="switch"
                id="replacement-request-switch"
                checked={canRequestReplacement && requestsReplacement}
                disabled={!canRequestReplacement}
                onChange={(event) =>
                  setRequestsReplacement(event.currentTarget.checked)
                }
                aria-label="Ajukan barang pengganti dari gudang"
              />
            </div>
            {canRequestReplacement && requestsReplacement ? (
              <div className="row g-2 mt-3">
                <div className="col-md-8">
                  <Form.Label className="small fw-semibold">
                    Barang dari gudang
                  </Form.Label>
                  <Form.Select
                    value={requestedInventoryItemId}
                    onChange={(event) =>
                      setRequestedInventoryItemId(event.currentTarget.value)
                    }
                  >
                    <option value="">Pilih barang</option>
                    {replacementOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · stok {Number(item.qtyOnHand ?? 0)}{" "}
                        {item.unit ?? "pcs"}
                      </option>
                    ))}
                  </Form.Select>
                </div>
                <div className="col-md-4">
                  <Form.Label className="small fw-semibold">Jumlah</Form.Label>
                  <Form.Control
                    inputMode="decimal"
                    value={requestedQty}
                    onChange={(event) =>
                      setRequestedQty(
                        event.currentTarget.value.replace(/[^0-9.]/g, ""),
                      )
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="light"
          className="staff-modal-secondary"
          onClick={close}
        >
          Batal
        </Button>
        <Button
          className="staff-modal-primary"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !isChoiceComplete}
        >
          {mutation.isPending ? (
            <>
              <Spinner size="sm" className="me-2" />
              Mengirim...
            </>
          ) : (
            "Kirim Laporan Kondisi"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
