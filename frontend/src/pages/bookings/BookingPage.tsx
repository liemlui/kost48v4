import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Col, Form, Row, Spinner } from "react-bootstrap";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createTenantBooking, listPublicRooms } from "../../api/bookings";
import CurrencyDisplay from "../../components/common/CurrencyDisplay";
import EmptyState from "../../components/common/EmptyState";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge, {
  getStatusLabel,
} from "../../components/common/StatusBadge";
import type {
  CreateTenantBookingPayload,
  PricingTerm,
  PublicRoom,
} from "../../types";
import { calculateRentByPricingTerm, isUtilitiesIncludedForPricingTerm } from "../../utils/pricing";
import { getKost48RoomGallery, resolveKost48MarketingImageUrl } from "../../data/kost48Assets";
import { formatRupiah } from "../../utils/formatCurrency";
import {
  getPublicRoomBathroomSentence,
  getPublicRoomBusinessHighlight,
  getPublicRoomCoolingSentence,
  getPublicRoomUtilityCopy,
  getPublicRoomVisibleAmenities,
} from "../../utils/publicRoomDisplay";

type BookingFormState = {
  roomId: number;
  checkInDate: string;
  pricingTerm: PricingTerm;
  notes: string;
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function BookingRoomPhotoStrip({ room }: { room: PublicRoom }) {
  const images = room.images ?? [];
  const localGallery = useMemo(() => getKost48RoomGallery(room.code, room.name, 5), [room.code, room.name]);
  const apiGallery = useMemo(
    () => images.map((url) => resolveKost48MarketingImageUrl(url)).filter(Boolean) as string[],
    [images],
  );
  const candidateImages = useMemo(() => Array.from(new Set([
    ...localGallery,
    ...apiGallery,
  ])), [localGallery, apiGallery]);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const resolvedImages = candidateImages.filter((imageUrl) => !failedImages.has(imageUrl));
  const cover = resolvedImages[0];

  useEffect(() => {
    setFailedImages(new Set());
  }, [room.id, candidateImages.join('|')]);

  const markImageFailed = (imageUrl: string) => {
    setFailedImages((previous) => {
      if (previous.has(imageUrl)) return previous;
      const next = new Set(previous);
      next.add(imageUrl);
      return next;
    });
  };

  if (!cover) {
    return (
      <div className="booking-room-photo-empty">
        <span>K48</span>
        <strong>Foto kamar menyusul</strong>
        <small>Admin bisa kirim foto terbaru jika kamu butuh sebelum masuk.</small>
      </div>
    );
  }

  return (
    <div className="booking-room-photo-strip">
      <img src={cover} alt={`Foto utama kamar ${room.code}`} onError={() => markImageFailed(cover)} />
      {resolvedImages.length > 1 ? (
        <div className="booking-room-photo-thumbs" aria-label="Foto detail kamar">
          {resolvedImages.slice(1, 5).map((imageUrl, index) => (
            <img key={`${imageUrl}-${index}`} src={imageUrl} alt={`Foto detail kamar ${index + 2}`} onError={() => markImageFailed(imageUrl)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BookingFeatureCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="booking-room-feature-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


export default function BookingPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialRoom =
    (location.state as { room?: PublicRoom } | null)?.room ?? null;

  const [formState, setFormState] = useState<BookingFormState>({
    roomId: Number(roomId),
    checkInDate: todayString(),
    pricingTerm:
      initialRoom?.highlightedPricingTerm ??
      initialRoom?.availablePricingTerms?.[0] ??
      "MONTHLY",
    notes: "",
  });
  const [error, setError] = useState("");

  const roomQuery = useQuery({
    queryKey: ["public-room-for-booking", roomId],
    queryFn: async () => {
      if (initialRoom) return initialRoom;
      const response = await listPublicRooms({ limit: 500 });
      return (
        response.items.find((item) => String(item.id) === String(roomId)) ??
        null
      );
    },
  });

  const room = roomQuery.data ?? initialRoom;
  const availableTerms = useMemo(
    () =>
      room?.availablePricingTerms?.length
        ? room.availablePricingTerms
        : (["MONTHLY"] as PricingTerm[]),
    [room],
  );

  useEffect(() => {
    if (!room) return;
    const nextTerm = availableTerms.includes(formState.pricingTerm)
      ? formState.pricingTerm
      : availableTerms[0];
    setFormState((prev) => ({
      ...prev,
      roomId: room.id,
      pricingTerm: nextTerm,
    }));
  }, [room, availableTerms, formState.pricingTerm]);

  const mutation = useMutation({
    mutationFn: (payload: CreateTenantBookingPayload) =>
      createTenantBooking(payload),
    onSuccess: async () => {
      const message =
        "Pemesanan berhasil diajukan. Sekarang kamu cukup menunggu review admin.";
      sessionStorage.setItem("kost48:portal-bookings:success-message", message);
      await queryClient.invalidateQueries({ queryKey: ["public-rooms"] });
      await queryClient.invalidateQueries({ queryKey: ["tenant-bookings"] });
      await queryClient.invalidateQueries({ queryKey: ["portal-stage"] });
      await queryClient.invalidateQueries({ queryKey: ["stays"] });
      navigate("/portal/bookings", { replace: true });
    },
    onError: (err: unknown) => {
      const message =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { message?: string | string[] } } })
              .response?.data?.message ?? "Pemesanan gagal dibuat.")
          : "Pemesanan gagal dibuat.";
      setError(Array.isArray(message) ? message.join(", ") : message);
    },
  });

  const selectedRate = useMemo(() => {
    if (!room || !room.pricing?.monthlyRateRupiah) return null;
    return calculateRentByPricingTerm(
      room.pricing.monthlyRateRupiah,
      formState.pricingTerm,
    );
  }, [room, formState.pricingTerm]);

  const initialTotal = useMemo(() => {
    const rent = Number(selectedRate ?? 0);
    const deposit = Number(room?.defaultDepositRupiah ?? 0);
    return rent + deposit;
  }, [room, selectedRate]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!room) {
      setError("Ringkasan kamar belum siap. Silakan muat ulang halaman ini.");
      return;
    }
    setError("");
    const payload: CreateTenantBookingPayload = {
      roomId: room.id,
      checkInDate: formState.checkInDate,
      pricingTerm: formState.pricingTerm,
      ...(formState.notes?.trim() ? { notes: formState.notes.trim() } : {}),
    };
    mutation.mutate(payload);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Pemesanan kamar"
        title="Ajukan Pemesanan"
        description="Cukup isi tanggal mulai tinggal dan masa sewa. Admin akan mengecek kamar lalu menyiapkan tagihan awal jika pemesanan disetujui."
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {roomQuery.isLoading ? (
        <div className="py-5 text-center">
          <Spinner animation="border" />
        </div>
      ) : null}
      {roomQuery.isError ? (
        <Alert variant="danger">
          Gagal memuat ringkasan kamar. Silakan kembali ke katalog kamar.
        </Alert>
      ) : null}
      {!roomQuery.isLoading && !room ? (
        <EmptyState
          icon="🚪"
          title="Kamar tidak ditemukan"
          description="Kamar yang ingin dipesan tidak tersedia di katalog publik saat ini."
          action={{
            label: "Kembali ke Katalog Kamar",
            onClick: () => navigate("/rooms"),
          }}
        />
      ) : null}

      {room ? (
        <Row className="g-4">
          <Col lg={5}>
            <Card className="content-card border-0 h-100 tenant-booking-room-summary">
              <Card.Body>
                {(() => {
                  const utilityCopy = getPublicRoomUtilityCopy(room, formState.pricingTerm);
                  return (
                    <>
                      <BookingRoomPhotoStrip room={room} />

                      <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                        <div>
                          <div className="fw-semibold fs-4">{room.code}</div>
                          <div className="text-muted">
                            {room.name || "Kamar KOST48 Surabaya"}
                          </div>
                        </div>
                        <StatusBadge status="SUCCESS" customLabel="Bisa diajukan" />
                      </div>

                      <div className="booking-room-feature-grid mb-3">
                        <BookingFeatureCard label="Kamar mandi" value={getPublicRoomBathroomSentence(room)} />
                        <BookingFeatureCard label="Pendingin" value={getPublicRoomCoolingSentence(room)} />
                      </div>

                      <div className="booking-room-estimate-box mb-3">
                        <div className="small text-muted mb-1">Estimasi tagihan awal</div>
                        <div className="fs-4 fw-bold"><CurrencyDisplay amount={initialTotal} /></div>
                        <div className="booking-room-estimate-lines">
                          <span>Sewa pertama <strong><CurrencyDisplay amount={selectedRate} showZero={false} /></strong></span>
                          <span>Deposit awal <strong><CurrencyDisplay amount={room.defaultDepositRupiah} showZero={false} /></strong></span>
                        </div>
                      </div>

                      <div className="booking-room-utility-box mb-3">
                        <div>
                          <strong>{utilityCopy.title}</strong>
                          <p>{utilityCopy.description}</p>
                        </div>
                      </div>

                      <div className="room-market-amenities mb-3" aria-label="Fasilitas utama kamar">
                        {getPublicRoomVisibleAmenities(room, 5).map((name) => <span key={name}>{name}</span>)}
                      </div>

                      <Alert variant="light" className="mb-0 booking-room-note">
                        <strong>Catatan kamar:</strong> {getPublicRoomBusinessHighlight(room)}
                      </Alert>
                    </>
                  );
                })()}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={7}>
            <Card className="content-card border-0 tenant-simple-booking-form">
              <Card.Body>
                <div className="tenant-form-stepper mb-4">
                  <span className="active">1. Pilih kamar</span>
                  <span className="active">2. Ajukan</span>
                  <span>3. Tunggu admin</span>
                </div>

                <Form onSubmit={handleSubmit}>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Tanggal mulai tinggal</Form.Label>
                        <Form.Control
                          type="date"
                          min={todayString()}
                          value={formState.checkInDate}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              checkInDate: event.target.value,
                            }))
                          }
                          required
                        />
                        <Form.Text muted>
                          Admin akan mengecek apakah tanggal ini bisa diproses.
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Masa sewa</Form.Label>
                        <Form.Select
                          value={formState.pricingTerm}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              pricingTerm: event.target.value as PricingTerm,
                            }))
                          }
                          required
                        >
                          {availableTerms.map((term) => {
                            const rent = room?.pricing?.monthlyRateRupiah
                              ? calculateRentByPricingTerm(
                                  room.pricing.monthlyRateRupiah,
                                  term,
                                )
                              : null;
                            const incUtil =
                              isUtilitiesIncludedForPricingTerm(term);
                            return (
                              <option key={term} value={term}>
                                {getStatusLabel(term)}
                                {rent
                                  ? ` — ${formatRupiah(rent)}`
                                  : ""}
                                {incUtil ? " (termasuk listrik & air)" : ""}
                              </option>
                            );
                          })}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col xs={12}>
                      <Form.Group>
                        <Form.Label>
                          Catatan untuk admin{" "}
                          <span className="text-muted fw-normal">
                            (opsional)
                          </span>
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={formState.notes}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              notes: event.target.value,
                            }))
                          }
                          placeholder="Contoh: rencana masuk sore hari, atau pertanyaan singkat untuk admin."
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Alert variant="info" className="small mt-4 mb-0">
                    Setelah diajukan, admin akan mengecek kamar dan menyiapkan tagihan awal.
                    Kamu baru perlu <strong>Bayar & Kirim Bukti</strong> setelah tagihan awal tersedia di portal tenant.
                  </Alert>

                  <div className="d-flex gap-2 justify-content-end mt-4 flex-wrap">
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={() => navigate("/rooms")}
                    >
                      Kembali
                    </Button>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending
                        ? "Mengajukan..."
                        : "Ajukan Pemesanan"}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : null}
    </div>
  );
}
