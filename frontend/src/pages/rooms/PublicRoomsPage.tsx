import { useMemo, useRef, useState } from "react";
import type React from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Col, Container, Row, Spinner } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listPublicRooms } from "../../api/bookings";
import CurrencyDisplay from "../../components/common/CurrencyDisplay";
import EmptyState from "../../components/common/EmptyState";
import TenantBookingGate from "../../components/tenant/TenantBookingGate";
import RoomComparePanel from "../../components/rooms/RoomComparePanel";
import type { PricingTerm, PublicRoom } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useTenantPortalStage } from "../../hooks/useTenantPortalStage";
import { resolveAbsoluteFileUrl } from "../../utils/resolveAbsoluteFileUrl";
import {
  getBestPublicRoomRate,
  getPublicRoomBathroom,
  getPublicRoomBathroomLabel,
  getPublicRoomBusinessHighlight,
  getPublicRoomCooling,
  getPublicRoomCoolingLabel,
  getPublicRoomInitialCostEstimate,
  getPublicRoomAvailabilityDisplay,
  getPublicRoomVisibleAmenities,
} from "../../utils/publicRoomDisplay";

const bathroomOptions = [
  { value: "", label: "Semua" },
  { value: "inside", label: "Dalam" },
  { value: "outside", label: "Luar" },
] as const;

const coolingOptions = [
  { value: "", label: "Semua" },
  { value: "ac", label: "AC" },
  { value: "fan", label: "Kipas" },
] as const;

const sortOptions = [
  { value: "price-asc", label: "Termurah" },
  { value: "price-desc", label: "Termahal" },
];

type BathroomFilter = "" | "inside" | "outside";
type CoolingFilter = "" | "ac" | "fan";
type AvailFilter = "" | "bookable" | "occupied";

const availFilterOptions = [
  { value: "", label: "Semua" },
  { value: "bookable", label: "Kamar Kosong" },
  { value: "occupied", label: "Kamar Terisi" },
] as const;

const pricingTerm: PricingTerm = "MONTHLY";

function getBestRate(room: PublicRoom, term: PricingTerm) {
  return getBestPublicRoomRate(room, term);
}

function getSelectedUnit() {
  return "/bulan";
}

function buildWhatsAppUrl(room: PublicRoom) {
  const number = String(import.meta.env.VITE_PUBLIC_ADMIN_WHATSAPP ?? "").replace(/\D/g, "");
  const roomCode = room.code || `Kamar #${room.id}`;
  const message = `Halo Admin KOST48, saya ingin tanya kamar ${roomCode}. Apakah masih tersedia?`;
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
}


function getFeatureIcon(title: string, value: string) {
  if (/kamar mandi/i.test(title)) return "🚿";
  if (/pendingin/i.test(title)) return /ac/i.test(value) ? "❄️" : "🌬️";
  return "✓";
}

function RoomFeatureTile({ title, value }: { title: string; value: string }) {
  return (
    <div className="room-market-feature-tile">
      <span className="room-market-feature-icon" aria-hidden="true">{getFeatureIcon(title, value)}</span>
      <small>{title}</small>
      <strong>{value}</strong>
    </div>
  );
}

function RoomMarketImage({ room }: { room: PublicRoom }) {
  const firstImage = room.images?.[0];
  const resolved = firstImage ? resolveAbsoluteFileUrl(firstImage) : null;
  const [imgState, setImgState] = useState<"loading" | "ok" | "error">("loading");
  const showImg = imgState === "ok";

  return (
    <div className={`room-market-image-wrap ${showImg ? "" : "is-placeholder"}`}>
      {resolved ? (
        <img
          src={resolved}
          alt="Foto kamar KOST48"
          className="room-market-image"
          style={showImg ? {} : { position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
          onLoad={() => setImgState("ok")}
          onError={() => setImgState("error")}
        />
      ) : null}
      {!showImg ? (
        <div className="room-market-placeholder">
          <span className="room-market-placeholder-icon">K48</span>
          <strong>Foto kamar menyusul</strong>
        </div>
      ) : null}
    </div>
  );
}

function PriceRow({ label, amount, unit }: { label: string; amount?: number | null; unit: string }) {
  const value = Number(amount ?? 0);
  return (
    <div className="room-market-price-row">
      <span>{label}</span>
      <strong>{value > 0 ? <><CurrencyDisplay amount={value} /> <small>{unit}</small></> : "Tanya admin"}</strong>
    </div>
  );
}

function RoomMarketCard({
  room,
  isTenant,
  pricingTerm,
  isCompared,
  compareDisabled,
  onToggleCompare,
}: {
  room: PublicRoom;
  isTenant: boolean;
  pricingTerm: PricingTerm;
  isCompared: boolean;
  compareDisabled: boolean;
  onToggleCompare: () => void;
}) {
  const navigate = useNavigate();
  const availability = getPublicRoomAvailabilityDisplay(room);
  const isAvailable = availability.canBook;
  const mainRate = getBestRate(room, pricingTerm);
  const selectedUnit = getSelectedUnit();
  const initialCost = getPublicRoomInitialCostEstimate(room, pricingTerm);

  const handleDetail = () => {
    navigate(`/rooms/${room.id}/detail`, { state: { room } });
  };

  const handleBook = () => {
    navigate(isTenant ? `/portal/booking/${room.id}` : `/booking/${room.id}`, { state: { room } });
  };

  const handleCardClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button,a,input,select,textarea")) return;
    handleDetail();
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target as HTMLElement;
    if (target.closest("button,a,input,select,textarea")) return;
    event.preventDefault();
    handleDetail();
  };

  return (
    <Card
      className="room-market-card room-market-card-clickable h-100 border-0"
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      aria-label={`Lihat detail ${room.name || room.code || `kamar ${room.id}`}`}
    >
      <RoomMarketImage room={room} />
      <button
        type="button"
        className={`room-market-compare-toggle ${isCompared ? "active" : ""}`}
        onClick={(event) => { event.stopPropagation(); onToggleCompare(); }}
        disabled={compareDisabled}
        aria-pressed={isCompared}
        aria-label={isCompared ? "Hapus dari perbandingan" : "Tambahkan kamar ke perbandingan"}
        title={compareDisabled ? "Maksimal 3 kamar untuk dibandingkan" : isCompared ? "Hapus dari perbandingan" : "Tambahkan ke perbandingan"}
      >
        <span className="room-market-compare-symbol">{isCompared ? "✓" : "+"}</span>
        <span>{isCompared ? "Dipilih" : "Bandingkan"}</span>
      </button>
      <span className={`room-market-status-badge ${availability.tone}`}>
        {availability.label}
      </span>
      <Card.Body>
        <div className="room-market-title-block">
          <h2>{room.code || `Kamar ${room.id}`}</h2>
          <p>{room.name || "Kamar KOST48 Surabaya"}</p>
        </div>

        <div className="room-market-features room-market-features-two">
          <RoomFeatureTile title="Kamar mandi" value={getPublicRoomBathroomLabel(room)} />
          <RoomFeatureTile title="Pendingin" value={getPublicRoomCoolingLabel(room)} />
        </div>

        <div className="room-market-amenities" aria-label="Fasilitas utama">
          {getPublicRoomVisibleAmenities(room).map((name) => <span key={name}>{name}</span>)}
        </div>

        <div className="room-market-divider" />

        <div className="room-market-main-price">
          <strong><CurrencyDisplay amount={mainRate} /></strong>
          <span>{selectedUnit}</span>
        </div>

        <div className="room-market-price-box">
          <PriceRow label="Bulanan" amount={room.pricing?.monthlyRateRupiah} unit="/bln" />
          <PriceRow label="Mingguan" amount={room.pricing?.weeklyRateRupiah} unit="/mgg" />
          <PriceRow label="Harian" amount={room.pricing?.dailyRateRupiah} unit="/hari" />
          <PriceRow label="Deposit" amount={room.defaultDepositRupiah} unit="" />
        </div>

        <p className="room-market-copy">{getPublicRoomBusinessHighlight(room)}</p>

        <div className="room-market-booking-safety-note">
          <strong>{availability.shortCopy}</strong>
          {isAvailable ? <span> Aman setelah pembayaran disetujui.</span> : null}
        </div>

        {isAvailable ? (
          <div className="room-market-price-box room-market-initial-cost-box">
            <PriceRow label="Estimasi awal" amount={initialCost.total} unit="" />
            <small>Sewa pertama + deposit.</small>
          </div>
        ) : null}

        <div className="room-market-actions">
          {isAvailable ? (
            <Button className="w-100" onClick={handleBook}>Ajukan Booking</Button>
          ) : null}
          <a className="btn btn-outline-secondary w-100" href={buildWhatsAppUrl(room)} target="_blank" rel="noreferrer">
            💬 Tanya via WhatsApp
          </a>
        </div>
      </Card.Body>
    </Card>
  );
}

function SegmentedFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="rooms-market-segment-group" aria-label={label}>
      <div className="rooms-market-filter-label">{label}</div>
      <div className="rooms-market-segment-options">
        {options.map((option) => (
          <button
            key={option.value || "all"}
            type="button"
            className={value === option.value ? "active" : ""}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PublicTopbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <header className="rooms-public-topbar">
      <div className="rooms-public-brand">
        <div className="brand-mark">K48</div>
        <div>
          <div className="brand-title">Kost48 Surabaya</div>
          <div className="brand-subtitle">Surabaya Barat</div>
        </div>
      </div>
      <nav className="rooms-public-nav" aria-label="Navigasi katalog">
        <button type="button" onClick={() => navigate("/")}>⌂ Beranda</button>
        {user ? (
          <>
            <Button
              variant="outline-secondary"
              onClick={() => navigate(user.role === "TENANT" ? "/portal/bookings" : "/dashboard")}
            >
              {user.role === "TENANT" ? "Portal Saya" : "Workspace"}
            </Button>
            <Button variant="outline-danger" onClick={logout}>Logout</Button>
          </>
        ) : (
          <Button onClick={() => navigate("/login")}>Masuk</Button>
        )}
      </nav>
    </header>
  );
}

export default function PublicRoomsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [comparedRoomIds, setComparedRoomIds] = useState<number[]>([]);
  const comparePanelRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const { stage, isLoading: isTenantStageLoading } = useTenantPortalStage();
  const isTenant = user?.role === "TENANT";

  const bathroom = (searchParams.get("bathroom") ?? "") as BathroomFilter;
  const cooling = (searchParams.get("cooling") ?? "") as CoolingFilter;
  const avail = (searchParams.get("avail") ?? "") as AvailFilter;
  const sort = searchParams.get("sort") ?? "price-asc";

  const query = useQuery({
    queryKey: ["public-rooms", { pricingTerm }],
    queryFn: () => listPublicRooms({ limit: 100, pricingTerm }),
  });

  const roomsFromApi = useMemo(() => query.data?.items ?? [], [query.data]);

  const rooms = useMemo(() => {
    let list = roomsFromApi.filter((room) => {
      if (bathroom && getPublicRoomBathroom(room) !== bathroom) return false;
      if (cooling && getPublicRoomCooling(room) !== cooling) return false;
      if (avail === "bookable" && room.isAvailable === false) return false;
      if (avail === "occupied" && room.isAvailable !== false) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      const aRate = getBestRate(a, pricingTerm);
      const bRate = getBestRate(b, pricingTerm);
      return sort === "price-desc" ? bRate - aRate : aRate - bRate;
    });

    return list;
  }, [roomsFromApi, bathroom, cooling, avail, sort]);

  const bookableCount = rooms.filter((room) => room.isAvailable !== false).length;
  const totalCount = rooms.length;
  const lockedForTenant = isTenant && !isTenantStageLoading && stage !== "browsing";
  const comparedRooms = useMemo(
    () => comparedRoomIds
      .map((id) => roomsFromApi.find((room) => room.id === id))
      .filter((room): room is PublicRoom => Boolean(room)),
    [comparedRoomIds, roomsFromApi],
  );

  const toggleCompare = (roomId: number) => {
    setComparedRoomIds((current) => {
      if (current.includes(roomId)) return current.filter((id) => id !== roomId);
      if (current.length >= 3) return current;
      return [...current, roomId];
    });
  };

  const scrollToCompare = () => {
    comparePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateParams = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params, { replace: true });
  };

  return (
    <div className={isTenant ? "tenant-room-discovery-page" : "public-page-shell rooms-market-page"}>
      {!isTenant ? <PublicTopbar /> : null}
      <Container fluid="xl" className={isTenant ? "py-0" : "py-4 py-lg-5"}>
        {isTenantStageLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
        {lockedForTenant ? <TenantBookingGate mode="rooms" /> : null}

        {!lockedForTenant ? (
          <>
            <section className="rooms-market-hero">
              <div className="rooms-market-breadcrumb"><button type="button">Beranda</button><span>›</span><strong>Katalog Kamar</strong></div>
              <h1>Kamar kos yang jelas biayanya, jujur statusnya</h1>
              <p>Lihat semua kamar — termasuk yang sedang ditempati. Status transparan, booking dibantu admin, kamar aman setelah pembayaran disetujui.</p>
              <div className="rooms-market-trust-chips">
                <span>✓ Biaya awal jelas</span>
                <span>✓ Booking direview admin</span>
                <span>✓ Kamar aman setelah pembayaran disetujui</span>
                <span>✓ Listrik &amp; air sesuai aturan kamar</span>
              </div>
            </section>

            <Card className="rooms-market-filter-card border-0">
              <Card.Body>
                <div className="rooms-market-filter-grid">
                  <SegmentedFilter
                    label="Ketersediaan"
                    value={avail}
                    options={availFilterOptions}
                    onChange={(value) => updateParams({ avail: value })}
                  />
                  <SegmentedFilter
                    label="Kamar mandi"
                    value={bathroom}
                    options={bathroomOptions}
                    onChange={(value) => updateParams({ bathroom: value })}
                  />
                  <SegmentedFilter
                    label="Pendingin"
                    value={cooling}
                    options={coolingOptions}
                    onChange={(value) => updateParams({ cooling: value })}
                  />
                  <SegmentedFilter
                    label="Urutkan harga bulanan"
                    value={sort}
                    options={sortOptions}
                    onChange={(value) => updateParams({ sort: value })}
                  />
                </div>
              </Card.Body>
            </Card>

            <Alert variant="info" className="rooms-market-safety-alert small">
              <strong>Aturan booking:</strong> Booking belum mengunci kamar. Kamar aman setelah pembayaran disetujui.
            </Alert>

            <div className="rooms-market-count">
              <strong>{totalCount} kamar</strong> tersedia di katalog
              {bookableCount < totalCount ? (
                <span className="rooms-market-count-bookable"> · <strong>{bookableCount}</strong> bisa diajukan sekarang</span>
              ) : null}
            </div>

            {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
            {query.isError ? <Alert variant="danger" className="mt-4">Gagal memuat katalog kamar. Silakan coba lagi.</Alert> : null}
            {!query.isLoading && !query.isError && rooms.length === 0 ? (
              <div className="mt-4">
                <EmptyState icon="🛏️" title="Belum ada kamar yang cocok" description="Coba ubah filter kamar mandi atau pendingin." />
              </div>
            ) : null}

            <Row className="g-4 mt-2">
              {rooms.map((room) => {
                const isCompared = comparedRoomIds.includes(room.id);
                const compareDisabled = !isCompared && comparedRoomIds.length >= 3;

                return (
                  <Col xl={4} md={6} key={room.id}>
                    <RoomMarketCard
                      room={room}
                      isTenant={isTenant}
                      pricingTerm={pricingTerm}
                      isCompared={isCompared}
                      compareDisabled={compareDisabled}
                      onToggleCompare={() => toggleCompare(room.id)}
                    />
                  </Col>
                );
              })}
            </Row>

            {comparedRooms.length > 0 ? (
              <div className="room-market-compare-anchor" ref={comparePanelRef}>
                <RoomComparePanel rooms={comparedRooms} onClear={() => setComparedRoomIds([])} />
              </div>
            ) : null}

            {comparedRooms.length > 0 ? (
              <div className="room-market-compare-bar" role="status" aria-live="polite">
                <div>
                  <strong>{comparedRooms.length} kamar dipilih</strong>
                  <span>Bandingkan estimasi awal.</span>
                </div>
                <div className="room-market-compare-bar-actions">
                  <Button size="sm" onClick={scrollToCompare}>Lihat Perbandingan</Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => setComparedRoomIds([])}>Bersihkan</Button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </Container>
    </div>
  );
}
