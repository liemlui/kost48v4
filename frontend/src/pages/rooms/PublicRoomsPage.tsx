import { useEffect, useMemo, useRef, useState } from "react";
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
import { getKost48LogoUrl, getKost48RoomGallery, resolveKost48MarketingImageUrl } from "../../data/kost48Assets";
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
  isPublicRoomBookable,
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
  const message = `Halo Admin KOST48, saya tertarik dengan kamar ${roomCode}. Boleh tanya ketersediaan atau estimasi kapan kosong?`;
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
  const localGallery = useMemo(() => getKost48RoomGallery(room.code, room.name, 6), [room.code, room.name]);
  const apiGallery = useMemo(
    () => (room.images ?? []).map((url) => resolveKost48MarketingImageUrl(url)).filter(Boolean) as string[],
    [room.images],
  );
  const candidateImages = useMemo(
    () => Array.from(new Set([...localGallery, ...apiGallery])),
    [localGallery, apiGallery],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [isHovered, setIsHovered] = useState(false);
  const resolvedImages = candidateImages.filter((imageUrl) => !failedImages.has(imageUrl));
  const activeImage = resolvedImages.length ? resolvedImages[activeIndex % resolvedImages.length] : null;

  useEffect(() => {
    setActiveIndex(0);
    setFailedImages(new Set());
  }, [room.id, candidateImages.join('|')]);

  useEffect(() => {
    if (activeIndex >= resolvedImages.length) setActiveIndex(0);
  }, [activeIndex, resolvedImages.length]);

  useEffect(() => {
    if (!isHovered || resolvedImages.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % resolvedImages.length);
    }, 1250);
    return () => window.clearInterval(timer);
  }, [isHovered, resolvedImages.length]);

  const markImageFailed = (imageUrl: string) => {
    setFailedImages((previous) => {
      if (previous.has(imageUrl)) return previous;
      const next = new Set(previous);
      next.add(imageUrl);
      return next;
    });
  };

  return (
    <div
      className={`room-market-image-wrap ${activeImage ? "" : "is-placeholder"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {activeImage ? (
        <img
          key={activeImage}
          src={activeImage}
          alt="Foto kamar KOST48"
          className="room-market-image"
          onError={() => markImageFailed(activeImage)}
        />
      ) : (
        <div className="room-market-placeholder">
          <span className="room-market-placeholder-icon">K48</span>
          <strong>Foto kamar menyusul</strong>
        </div>
      )}
      {resolvedImages.length > 1 ? (
        <div className="room-market-slide-dots" aria-hidden="true">
          {resolvedImages.slice(0, 6).map((imageUrl, index) => (
            <span key={`${room.id}-dot-${imageUrl}`} className={index === activeIndex % resolvedImages.length ? 'active' : ''} />
          ))}
        </div>
      ) : null}
      {resolvedImages.length > 1 ? <span className="room-market-image-counter">{(activeIndex % resolvedImages.length) + 1}/{resolvedImages.length}</span> : null}
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
            💬 {isAvailable ? "Tanya via WhatsApp" : "Tanya Ketersediaan"}
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
  const [logoBroken, setLogoBroken] = useState(false);
  const logoUrl = getKost48LogoUrl();

  return (
    <header className="rooms-public-topbar">
      <div className="rooms-public-brand">
        {logoUrl && !logoBroken ? (
          <img
            className="brand-mark rooms-public-logo"
            src={logoUrl}
            alt="Logo Kost48 Surabaya"
            onError={() => setLogoBroken(true)}
          />
        ) : (
          <div className="brand-mark">K48</div>
        )}
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
      const bookable = isPublicRoomBookable(room);
      const status = String(room.status ?? "").toUpperCase();
      if (avail === "bookable" && !bookable) return false;
      if (avail === "occupied" && (bookable || status !== "OCCUPIED")) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      const aRate = getBestRate(a, pricingTerm);
      const bRate = getBestRate(b, pricingTerm);
      return sort === "price-desc" ? bRate - aRate : aRate - bRate;
    });

    return list;
  }, [roomsFromApi, bathroom, cooling, avail, sort]);

  const bookableCount = rooms.filter((room) => isPublicRoomBookable(room)).length;
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
