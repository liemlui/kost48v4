import { ChangeEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Form,
  Modal,
  Spinner,
} from "react-bootstrap";
import { createMeterReading } from "../../api/meterReadings";
import { createResource, listResource } from "../../api/resources";
import {
  uploadTicketImage,
  type UploadedImageMeta,
} from "../../api/mediaUploads";
import type { Room } from "../../types";
import CameraOrGalleryInput from "../common/CameraOrGalleryInput";
import SafeImage from "../common/SafeImage";
import { compressImageFile as compressBrowserImage } from "../../utils/compressImageFile";

type FieldReportKind = "BARANG_RUSAK" | "CEK_KAMAR" | "STOK_HABIS";
type LauncherMode = FieldReportKind | "CATAT_METER" | null;

type StaffRoomOption = Room & {
  currentStay?: {
    id?: number;
    tenantId?: number;
    tenant?: { id?: number; fullName?: string | null } | null;
  } | null;
};

type Props = {
  fixedRoom?: StaffRoomOption | null;
  compact?: boolean;
  singleButton?: boolean;
  onCreated?: () => void | Promise<void>;
};

const reportCopy: Record<
  FieldReportKind,
  {
    title: string;
    button: string;
    problemLabel: string;
    placeholder: string;
    help: string;
  }
> = {
  BARANG_RUSAK: {
    title: "Barang Rusak / Hilang",
    button: "Barang Rusak / Hilang",
    problemLabel: "Nama barang dan masalah",
    placeholder: "Contoh: Remote AC hilang / kursi patah",
    help: "Untuk barang kamar, buka Kamar → Barang Kamar bila ingin konteks lokasi lebih jelas. Tombol ini tetap bisa dipakai untuk laporan umum.",
  },
  CEK_KAMAR: {
    title: "Laporkan Kondisi Kamar",
    button: "Kondisi Kamar",
    problemLabel: "Hasil cek kamar",
    placeholder: "Contoh: Kamar bersih, lampu kamar mandi mati",
    help: "Tulis kondisi yang ditemukan. Kalau aman, tulis singkat saja agar admin tahu kamar sudah dicek.",
  },
  STOK_HABIS: {
    title: "Stok Gudang / Alat Habis",
    button: "Stok Gudang Habis",
    problemLabel: "Stok atau alat yang bermasalah",
    placeholder:
      "Contoh: sabun lantai habis / alat pel rusak / plastik sampah tinggal sedikit",
    help: "Untuk stok gudang dan barang umum, buka tab Gudang bila ingin melihat data barang lebih lengkap. Tombol ini tetap bisa dipakai untuk laporan cepat.",
  },
};

function roomLabel(room?: StaffRoomOption | null) {
  if (!room) return "Pilih kamar";
  return `${room.code}${room.name ? ` · ${room.name}` : ""}`;
}

function activeTenantId(room?: StaffRoomOption | null) {
  return room?.currentStay?.tenantId ?? room?.currentStay?.tenant?.id ?? null;
}

function activeStayId(room?: StaffRoomOption | null) {
  return room?.currentStay?.id ?? room?.activeStayId ?? null;
}

async function compressImageFile(file: File): Promise<File> {
  return compressBrowserImage(file, { maxSide: 1600, quality: 0.78 });
}

export default function StaffActionLauncher({
  fixedRoom = null,
  compact = false,
  singleButton = false,
  onCreated,
}: Props) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<LauncherMode>(null);
  const [roomId, setRoomId] = useState<string>(
    fixedRoom?.id ? String(fixedRoom.id) : "",
  );
  const [problem, setProblem] = useState("");
  const [note, setNote] = useState("");
  const [reportImage, setReportImage] = useState<UploadedImageMeta | null>(
    null,
  );
  const [reportPreview, setReportPreview] = useState<string | null>(null);
  const [meterDate, setMeterDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [electricity, setElectricity] = useState("");
  const [water, setWater] = useState("");
  const [error, setError] = useState("");

  const roomsQuery = useQuery({
    queryKey: ["staff-field-rooms"],
    queryFn: () => listResource<StaffRoomOption>("/rooms", { limit: 300 }),
    enabled: !fixedRoom,
  });

  const rooms = useMemo(() => {
    const base = fixedRoom ? [fixedRoom] : (roomsQuery.data?.items ?? []);
    return base.filter((room) => room.isActive !== false);
  }, [fixedRoom, roomsQuery.data]);

  const selectedRoom = useMemo(
    () =>
      rooms.find((room) => String(room.id) === String(roomId)) ??
      fixedRoom ??
      null,
    [rooms, roomId, fixedRoom],
  );

  const reset = () => {
    setError("");
    setProblem("");
    setNote("");
    setReportImage(null);
    setReportPreview(null);
    setMeterDate(new Date().toISOString().slice(0, 10));
    setElectricity("");
    setWater("");
    if (!fixedRoom) setRoomId("");
  };

  const close = () => {
    setMode(null);
    reset();
  };

  const open = (nextMode: LauncherMode) => {
    setMode(nextMode);
    setError("");
    if (fixedRoom?.id) setRoomId(String(fixedRoom.id));
  };

  const afterSuccess = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tickets"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-staff"] }),
      queryClient.invalidateQueries({ queryKey: ["room"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-field-rooms"] }),
      queryClient.invalidateQueries({
        queryKey: ["staff-performance-me-dashboard"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["staff-performance-me-evidence"],
      }),
    ]);
    await onCreated?.();
  };

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!mode || mode === "CATAT_METER") return null;
      const tenantId = activeTenantId(selectedRoom);
      if (mode !== "STOK_HABIS" && !selectedRoom?.id)
        throw new Error("Pilih kamar dulu.");
      if (!problem.trim()) throw new Error("Tulis masalahnya secara singkat.");
      const copy = reportCopy[mode];
      const title =
        mode === "BARANG_RUSAK"
          ? `Barang rusak - ${problem.trim().slice(0, 60)}`
          : mode === "STOK_HABIS"
            ? `Stok gudang/alat - ${problem.trim().slice(0, 60)}`
            : `Cek kamar - ${roomLabel(selectedRoom)}`;
      const description = [
        copy.title,
        selectedRoom?.id
          ? `Lokasi/kamar: ${roomLabel(selectedRoom)}`
          : "Lokasi: gudang/area umum",
        `Masalah: ${problem.trim()}`,
        note.trim() ? `Catatan: ${note.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      return createResource("/tickets", {
        tenantId: tenantId ?? undefined,
        roomId: selectedRoom?.id,
        stayId: activeStayId(selectedRoom) ?? undefined,
        title,
        description,
        category: mode,
        issueImageUrl: reportImage?.fileUrl,
        issueImageFileKey: reportImage?.fileKey,
        issueImageOriginalFilename: reportImage?.originalFilename,
        issueImageMimeType: reportImage?.mimeType,
        issueImageFileSizeBytes: reportImage?.fileSizeBytes,
      });
    },
    onSuccess: async () => {
      await afterSuccess();
      close();
    },
    onError: (err: any) =>
      setError(
        err?.message ||
          err?.response?.data?.message ||
          "Laporan belum tersimpan. Coba lagi.",
      ),
  });

  const meterMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoom?.id) throw new Error("Pilih kamar dulu.");
      if (!electricity.trim() && !water.trim())
        throw new Error("Isi angka listrik atau air.");
      const readingAt = new Date(`${meterDate}T12:00:00`).toISOString();
      const saved = [];
      if (electricity.trim()) {
        saved.push(
          await createMeterReading({
            roomId: selectedRoom.id,
            utilityType: "ELECTRICITY",
            readingAt,
            readingValue: electricity.trim(),
            note: note.trim() || "Dicatat staf lapangan",
          }),
        );
      }
      if (water.trim()) {
        saved.push(
          await createMeterReading({
            roomId: selectedRoom.id,
            utilityType: "WATER",
            readingAt,
            readingValue: water.trim(),
            note: note.trim() || "Dicatat staf lapangan",
          }),
        );
      }
      return saved;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["meter-readings"] }),
        queryClient.invalidateQueries({ queryKey: ["room"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-staff"] }),
        queryClient.invalidateQueries({
          queryKey: ["staff-performance-me-dashboard"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["staff-performance-me-evidence"],
        }),
      ]);
      await onCreated?.();
      close();
    },
    onError: (err: any) =>
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Meter belum tersimpan. Coba lagi.",
      ),
  });

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const compressed = await compressImageFile(file);
      const uploaded = await uploadTicketImage(compressed);
      setReportImage(uploaded);
      setReportPreview(uploaded.fileUrl);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Foto belum berhasil diunggah. Coba foto lain.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const isReportMode = mode && mode !== "CATAT_METER";
  const copy = isReportMode ? reportCopy[mode as FieldReportKind] : null;
  const isBusy = reportMutation.isPending || meterMutation.isPending;

  return (
    <>
      <div
        className={
          compact ? "staff-action-launcher compact" : "staff-action-launcher"
        }
      >
        {singleButton ? (
          <div className="d-flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="primary"
              className="staff-quick-report-toggle"
              onClick={() => open("BARANG_RUSAK")}
            >
              + Barang Rusak
            </Button>
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => open("CATAT_METER")}
            >
              Meter
            </Button>
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => open("STOK_HABIS")}
            >
              Stok Habis
            </Button>
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => open("CEK_KAMAR")}
            >
              Kondisi Kamar
            </Button>
          </div>
        ) : (
          <div className="staff-action-group staff-action-grid" role="group" aria-label="Aksi laporan lapangan">
            <Button size="sm" variant="primary" onClick={() => open("BARANG_RUSAK")}>
              Laporkan Barang
            </Button>
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => open("CATAT_METER")}
            >
              Meter Listrik/Air
            </Button>
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => open("STOK_HABIS")}
            >
              Laporkan Stok
            </Button>
            <Button size="sm" variant="outline-primary" onClick={() => open("CEK_KAMAR")}>
              Kondisi Kamar
            </Button>
          </div>
        )}
      </div>

      <Modal show={Boolean(mode)} onHide={close} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {mode === "CATAT_METER" ? "Catat Angka Meter" : copy?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error ? (
            <Alert variant="danger" className="py-2">
              {error}
            </Alert>
          ) : null}
          {mode === "CATAT_METER" ? (
            <Alert variant="info" className="py-2 small">
              Catat angka meter hari ini. Pastikan angka terlihat jelas sebelum disimpan.
            </Alert>
          ) : copy ? (
            <>
              <Alert variant="info" className="py-2 small">
                Laporan ini akan masuk ke antrean tindak lanjut.
              </Alert>
              <Alert variant="light" className="border py-2 small">
                {copy.help}
              </Alert>
            </>
          ) : null}
          {!fixedRoom ? (
            <Form.Group className="mb-3">
              <Form.Label>
                {mode === "STOK_HABIS"
                  ? "Kamar / area terdekat (opsional)"
                  : "Kamar"}
              </Form.Label>
              <Form.Select
                value={roomId}
                onChange={(event) => setRoomId(event.currentTarget.value)}
              >
                <option value="">
                  {mode === "STOK_HABIS" ? "Gudang / area umum" : "Pilih kamar"}
                </option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {roomLabel(room)}
                  </option>
                ))}
              </Form.Select>
              <Form.Text>
                {mode === "STOK_HABIS"
                  ? "Boleh dikosongkan kalau laporan untuk gudang kebersihan atau area umum."
                  : "Pilih kamar yang sedang dicek."}
              </Form.Text>
            </Form.Group>
          ) : (
            <Alert variant="light" className="border py-2 mb-3">
              Kamar: <strong>{roomLabel(fixedRoom)}</strong>
            </Alert>
          )}

          {mode === "CATAT_METER" ? (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Tanggal cek</Form.Label>
                <Form.Control
                  type="date"
                  value={meterDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setMeterDate(event.currentTarget.value)}
                />
              </Form.Group>
              <div className="row g-2">
                <div className="col-6">
                  <Form.Group className="mb-3">
                    <Form.Label>Angka meter listrik</Form.Label>
                    <Form.Control
                      inputMode="decimal"
                      value={electricity}
                      onChange={(event) =>
                        setElectricity(event.currentTarget.value)
                      }
                      placeholder="Contoh: 12345"
                    />
                  </Form.Group>
                </div>
                <div className="col-6">
                  <Form.Group className="mb-3">
                    <Form.Label>Angka meter air</Form.Label>
                    <Form.Control
                      inputMode="decimal"
                      value={water}
                      onChange={(event) => setWater(event.currentTarget.value)}
                      placeholder="Contoh: 88"
                    />
                  </Form.Group>
                </div>
              </div>
              <Form.Group>
                <Form.Label>Catatan singkat</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.currentTarget.value)}
                  placeholder="Contoh: angka meter terlihat jelas"
                />
              </Form.Group>
            </>
          ) : (
            <>
              <Form.Group className="mb-3">
                <Form.Label>{copy?.problemLabel}</Form.Label>
                <Form.Control
                  value={problem}
                  onChange={(event) => setProblem(event.currentTarget.value)}
                  placeholder={copy?.placeholder}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Foto bukti</Form.Label>
                <CameraOrGalleryInput onChange={handleImage} />
                {reportPreview ? (
                  <SafeImage
                    className="staff-proof-preview"
                    src={reportPreview}
                    alt="Foto bukti"
                  />
                ) : null}
              </Form.Group>
              <Form.Group>
                <Form.Label>Catatan singkat</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.currentTarget.value)}
                  placeholder="Tulis tambahan jika perlu"
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={close}>
            Batal
          </Button>
          {mode === "CATAT_METER" ? (
            <Button onClick={() => meterMutation.mutate()} disabled={isBusy}>
              {isBusy ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Angka Meter"
              )}
            </Button>
          ) : (
            <Button onClick={() => reportMutation.mutate()} disabled={isBusy}>
              {isBusy ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Mengirim...
                </>
              ) : (
                "Kirim Laporan Lapangan"
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
}
