import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Col, Container, Row, Spinner } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listPublicRooms } from "../../api/bookings";
import CurrencyDisplay from "../../components/common/CurrencyDisplay";
import EmptyState from "../../components/common/EmptyState";
import TenantBookingGate from "../../components/tenant/TenantBookingGate";
import RoomComparePanel from "../../components/rooms/RoomComparePanel";
import Kost48LogoMark from "../../components/common/Kost48LogoMark";
import type { PricingTerm, PublicRoom } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useTenantPortalStage } from "../../hooks/useTenantPortalStage";
import { getKost48RoomGallery, resolveKost48MarketingImageUrl } from "../../data/kost48Assets";
import { officialKost48Location } from "../../data/officialKost48Content";
import {
  getBestPublicRoomRate,
  getPublicRoomBathroom,
  getPublicRoomBathroomLabel,
  getPublicRoomCooling,
  getPublicRoomCoolingLabel,
  getPublicRoomAvailabilityDisplay,
  getPublicRoomVisibleAmenities,
  isPublicRoomBookable,
} from "../../utils/publicRoomDisplay";

type BathroomFilter = "" | "inside" | "outside";
type CoolingFilter = "" | "ac" | "fan";
type AvailFilter = "" | "bookable" | "occupied" | "checking";
type SortFilter = "price-asc" | "price-desc";

const pricingTerm: PricingTerm = "MONTHLY";

function buildWhatsAppUrl(room: PublicRoom) {
  const number = String(import.meta.env.VITE_PUBLIC_ADMIN_WHATSAPP ?? "").replace(/\D/g, "");
  const roomCode = room.code || `Kamar #${room.id}`;
  const isChecking = String(room.status ?? "").toUpperCase() === "MAINTENANCE";
  const message = isChecking
    ? `Halo Admin KOST48, saya tertarik dengan kamar ${roomCode}. Saya lihat kamar sedang dicek. Boleh tanya estimasi kapan siap ditempati?`
    : `Halo Admin KOST48, saya tertarik dengan kamar ${roomCode}. Boleh tanya ketersediaan atau estimasi kapan kosong?`;
  return number
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

// ── Room image carousel ────────────────────────────────────────────────────
function RoomCardImage({ room }: { room: PublicRoom }) {
  const localGallery = useMemo(() => getKost48RoomGallery(room.code, room.name, 5), [room.code, room.name]);
  const apiGallery = useMemo(
    () => (room.images ?? []).map((url) => resolveKost48MarketingImageUrl(url)).filter(Boolean) as string[],
    [room.images],
  );
  const candidates = useMemo(() => Array.from(new Set([...localGallery, ...apiGallery])), [localGallery, apiGallery]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [hovered, setHovered] = useState(false);
  const resolved = candidates.filter((url) => !failed.has(url));
  const active = resolved.length ? resolved[activeIndex % resolved.length] : null;

  useEffect(() => { setActiveIndex(0); setFailed(new Set()); }, [room.id, candidates.join("|")]);
  useEffect(() => { if (activeIndex >= resolved.length) setActiveIndex(0); }, [activeIndex, resolved.length]);
  useEffect(() => {
    if (!hovered || resolved.length <= 1) return undefined;
    const t = window.setInterval(() => setActiveIndex((i) => (i + 1) % resolved.length), 1200);
    return () => clearInterval(t);
  }, [hovered, resolved.length]);

  const markFailed = (url: string) => setFailed((prev) => {
    if (prev.has(url)) return prev;
    return new Set([...prev, url]);
  });

  return (
    <div
      className={`rm-card-img-wrap${active ? "" : " rm-card-img-empty"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {active ? (
        <img
          key={active}
          src={active}
          alt={`Foto kamar ${room.code}`}
          className="rm-card-img"
          loading="lazy"
          decoding="async"
          onError={() => markFailed(active)}
        />
      ) : (
        <div className="rm-card-img-placeholder">
          <span>K48</span>
          <small>Foto menyusul</small>
        </div>
      )}
      {resolved.length > 1 && (
        <div className="rm-card-img-dots" aria-hidden="true">
          {resolved.slice(0, 5).map((_, i) => (
            <span key={i} className={i === activeIndex % resolved.length ? "active" : ""} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Room card ──────────────────────────────────────────────────────────────
function RoomCard({
  room,
  isTenant,
  isCompared,
  compareDisabled,
  onToggleCompare,
}: {
  room: PublicRoom;
  isTenant: boolean;
  isCompared: boolean;
  compareDisabled: boolean;
  onToggleCompare: () => void;
}) {
  const navigate = useNavigate();
  const avail = getPublicRoomAvailabilityDisplay(room);
  const mainRate = getBestPublicRoomRate(room, pricingTerm);
  const amenities = getPublicRoomVisibleAmenities(room).slice(0, 3);

  const goDetail = () => navigate(`/rooms/${room.id}/detail`, { state: { room } });
  const goBook = () => navigate(isTenant ? `/portal/booking/${room.id}` : `/booking/${room.id}`, { state: { room } });

  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button,a")) return;
    goDetail();
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if ((e.target as HTMLElement).closest("button,a")) return;
    e.preventDefault();
    goDetail();
  };

  return (
    <article
      className="rm-card"
      role="link"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      aria-label={`Lihat detail ${room.name || room.code || `kamar ${room.id}`}`}
    >
      {/* Image */}
      <div className="rm-card-img-shell">
        <RoomCardImage room={room} />
        <span className={`rm-card-badge rm-badge-${avail.tone}`}>{avail.label}</span>
        <button
          type="button"
          className={`rm-card-compare-btn${isCompared ? " active" : ""}`}
          onClick={(e) => { e.stopPropagation(); onToggleCompare(); }}
          disabled={compareDisabled}
          aria-pressed={isCompared}
          title={compareDisabled ? "Maks. 3 kamar" : isCompared ? "Hapus dari perbandingan" : "Tambah ke perbandingan"}
        >
          {isCompared ? "✓" : "+"}
        </button>
      </div>

      {/* Body */}
      <div className="rm-card-body">
        <div className="rm-card-title-row">
          <div>
            <div className="rm-card-code">{room.code || `Kamar ${room.id}`}</div>
            <div className="rm-card-name">{room.name || "Kamar KOST48 Surabaya"}</div>
          </div>
        </div>

        <div className="rm-card-specs">
          <span>
            {getPublicRoomBathroom(room) === "inside" ? "🚿" : "🪣"} {getPublicRoomBathroomLabel(room)}
          </span>
          <span>
            {getPublicRoomCooling(room) === "ac" ? "❄️" : "🌬️"} {getPublicRoomCoolingLabel(room)}
          </span>
        </div>

        {amenities.length > 0 && (
          <div className="rm-card-amenities">
            {amenities.map((a) => <span key={a}>{a}</span>)}
          </div>
        )}

        <div className="rm-card-price-row">
          <strong>
            <CurrencyDisplay amount={mainRate} />
          </strong>
          <span>/bulan</span>
          {mainRate === 0 && <span className="rm-card-price-ask">Tanya admin</span>}
        </div>

        <div className="rm-card-actions">
          {avail.canBook && (
            <Button size="sm" className="rm-btn-book" onClick={(e) => { e.stopPropagation(); goBook(); }}>
              Ajukan Booking
            </Button>
          )}
          <a
            className="btn btn-sm btn-outline-secondary rm-btn-wa"
            href={buildWhatsAppUrl(room)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            💬 {avail.canBook ? "Tanya via WhatsApp" : "Tanya Ketersediaan"}
          </a>
          <button
            type="button"
            className="rm-btn-detail"
            onClick={(e) => { e.stopPropagation(); goDetail(); }}
          >
            Lihat detail →
          </button>
        </div>
      </div>
    </article>
  );
}

// ── Chip filter ────────────────────────────────────────────────────────────
function FilterChip({
  label,
  active,
  onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`rm-filter-chip${active ? " active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

// ── Public topbar for rooms page ───────────────────────────────────────────
function RoomsTopbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [iconBroken, setIconBroken] = useState(false);
  const [textBroken, setTextBroken] = useState(false);

  return (
    <header className="rm-topbar">
      <button type="button" className="rm-topbar-brand" onClick={() => navigate("/")}>
        {!iconBroken ? (
          <img
            className="rm-topbar-logo"
            src="/room-images/logo-kost48-sby.webp"
            alt=""
            aria-hidden="true"
            onError={() => setIconBroken(true)}
          />
        ) : (
          <Kost48LogoMark size="small" />
        )}
        {!textBroken ? (
          <img
            src="/room-images/logo-kost48-surabaya.webp"
            alt="Kost 48 Surabaya"
            className="rm-topbar-text-logo"
            onError={() => setTextBroken(true)}
          />
        ) : (
          <div className="rm-topbar-brand-text"><span>Kost48 Surabaya</span><small>Surabaya Barat</small></div>
        )}
      </button>

      <nav className="rm-topbar-nav" aria-label="Navigasi">
        <button type="button" onClick={() => navigate("/")}>⌂ Beranda</button>
        <a href={officialKost48Location.mapsUrl} target="_blank" rel="noreferrer">📍 Maps</a>
        <a href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer">💬 WhatsApp</a>
      </nav>

      <div className="rm-topbar-user">
        {user ? (
          <>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => navigate(user.role === "TENANT" ? "/portal/bookings" : "/dashboard")}
            >
              {user.role === "TENANT" ? "Portal Saya" : "Workspace"}
            </Button>
            <Button size="sm" variant="outline-danger" onClick={logout}>Keluar</Button>
          </>
        ) : (
          <Button size="sm" onClick={() => navigate("/login")}>Masuk Portal</Button>
        )}
      </div>
    </header>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function PublicRoomsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [comparedRoomIds, setComparedRoomIds] = useState<number[]>([]);
  const comparePanelRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const { stage, isLoading: isTenantStageLoading } = useTenantPortalStage();
  const isTenant = user?.role === "TENANT";

  const bathroom = (searchParams.get("bathroom") ?? "") as BathroomFilter;
  const cooling = (searchParams.get("cooling") ?? "") as CoolingFilter;
  const avail = (searchParams.get("avail") ?? "") as AvailFilter;
  const sort = (searchParams.get("sort") ?? "price-asc") as SortFilter;

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
      if (avail === "checking" && status !== "MAINTENANCE") return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      const aRate = getBestPublicRoomRate(a, pricingTerm);
      const bRate = getBestPublicRoomRate(b, pricingTerm);
      return sort === "price-desc" ? bRate - aRate : aRate - bRate;
    });

    return list;
  }, [roomsFromApi, bathroom, cooling, avail, sort]);

  const bookableCount = rooms.filter((r) => isPublicRoomBookable(r)).length;
  const lockedForTenant = isTenant && !isTenantStageLoading && stage !== "browsing";

  const comparedRooms = useMemo(
    () => comparedRoomIds.map((id) => roomsFromApi.find((r) => r.id === id)).filter((r): r is PublicRoom => Boolean(r)),
    [comparedRoomIds, roomsFromApi],
  );

  const toggleCompare = (roomId: number) => {
    setComparedRoomIds((prev) => {
      if (prev.includes(roomId)) return prev.filter((id) => id !== roomId);
      if (prev.length >= 3) return prev;
      return [...prev, roomId];
    });
  };

  const update = (next: Record<string, string>) => {
    const p = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    setSearchParams(p, { replace: true });
  };

  const hasActiveFilter = !!(bathroom || cooling || avail || sort !== "price-asc");

  return (
    <div className={isTenant ? "tenant-room-discovery-page" : "rm-page"}>
      {!isTenant && <RoomsTopbar />}

      <Container fluid="xl" className={isTenant ? "py-0" : "rm-container"}>
        {isTenantStageLoading && <div className="py-5 text-center"><Spinner animation="border" /></div>}
        {lockedForTenant && <TenantBookingGate mode="rooms" />}

        {!lockedForTenant && (
          <>
            {/* ── Header ── */}
            {!isTenant && (
              <div className="rm-page-header">
                <div className="rm-breadcrumb">
                  <button type="button" onClick={() => navigate("/")}>Beranda</button>
                  <span aria-hidden="true">›</span>
                  <strong>Katalog Kamar</strong>
                </div>
                <h1 className="rm-page-title">Cek Kamar KOST48</h1>
                <p className="rm-page-subtitle">
                  Pilih kamar berdasarkan tipe, fasilitas, dan status ketersediaan.
                  Status transparan — kamar aman setelah pembayaran disetujui admin.
                </p>
                <div className="rm-page-meta-chips">
                  <span>✓ Dekat Pakuwon Mall / PTC</span>
                  <span>✓ Status jelas dan transparan</span>
                  <span>✓ Booking dibantu admin</span>
                </div>
              </div>
            )}

            {/* ── Filter bar ── */}
            <div className="rm-filter-bar">
              <div className="rm-filter-group">
                <span className="rm-filter-label">Ketersediaan</span>
                <FilterChip label="Semua" active={!avail} onClick={() => update({ avail: "" })} />
                <FilterChip label="Bisa diajukan" active={avail === "bookable"} onClick={() => update({ avail: "bookable" })} />
                <FilterChip label="Sedang dicek" active={avail === "checking"} onClick={() => update({ avail: "checking" })} />
                <FilterChip label="Terisi" active={avail === "occupied"} onClick={() => update({ avail: "occupied" })} />
              </div>
              <div className="rm-filter-divider" aria-hidden="true" />
              <div className="rm-filter-group">
                <span className="rm-filter-label">Pendingin</span>
                <FilterChip label="AC" active={cooling === "ac"} onClick={() => update({ cooling: cooling === "ac" ? "" : "ac" })} />
                <FilterChip label="Kipas" active={cooling === "fan"} onClick={() => update({ cooling: cooling === "fan" ? "" : "fan" })} />
              </div>
              <div className="rm-filter-divider" aria-hidden="true" />
              <div className="rm-filter-group">
                <span className="rm-filter-label">Kamar mandi</span>
                <FilterChip label="KM Dalam" active={bathroom === "inside"} onClick={() => update({ bathroom: bathroom === "inside" ? "" : "inside" })} />
                <FilterChip label="KM Luar" active={bathroom === "outside"} onClick={() => update({ bathroom: bathroom === "outside" ? "" : "outside" })} />
              </div>
              <div className="rm-filter-divider" aria-hidden="true" />
              <div className="rm-filter-group">
                <span className="rm-filter-label">Harga</span>
                <FilterChip label="Termurah" active={sort === "price-asc"} onClick={() => update({ sort: "price-asc" })} />
                <FilterChip label="Termahal" active={sort === "price-desc"} onClick={() => update({ sort: "price-desc" })} />
              </div>
              {hasActiveFilter && (
                <button
                  type="button"
                  className="rm-filter-reset"
                  onClick={() => setSearchParams({}, { replace: true })}
                >
                  ✕ Reset filter
                </button>
              )}
            </div>

            {/* ── Count ── */}
            <div className="rm-count-bar">
              {query.isLoading ? (
                <span className="text-muted"><Spinner animation="border" size="sm" className="me-2" />Memuat kamar...</span>
              ) : (
                <span>
                  <strong>{rooms.length}</strong> kamar ditampilkan
                  {bookableCount > 0 && rooms.length !== bookableCount && (
                    <> · <strong className="rm-count-bookable">{bookableCount}</strong> bisa diajukan sekarang</>
                  )}
                </span>
              )}
            </div>

            {/* ── States ── */}
            {query.isError && (
              <Alert variant="danger" className="rm-alert">
                Gagal memuat katalog kamar. Silakan coba lagi atau hubungi admin.
                <a className="ms-2 alert-link" href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
              </Alert>
            )}

            {/* ── Room grid ── */}
            {!query.isLoading && !query.isError && rooms.length === 0 && (
              <div className="rm-empty">
                <EmptyState
                  icon="🛏️"
                  title="Tidak ada kamar yang cocok"
                  description="Coba ubah atau reset filter di atas."
                />
                <a className="btn btn-outline-secondary mt-3" href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer">
                  💬 Tanya ketersediaan via WhatsApp
                </a>
              </div>
            )}

            <Row className="g-3 rm-grid">
              {rooms.map((room) => {
                const isCompared = comparedRoomIds.includes(room.id);
                return (
                  <Col xl={4} md={6} key={room.id}>
                    <RoomCard
                      room={room}
                      isTenant={isTenant}
                      isCompared={isCompared}
                      compareDisabled={!isCompared && comparedRoomIds.length >= 3}
                      onToggleCompare={() => toggleCompare(room.id)}
                    />
                  </Col>
                );
              })}
            </Row>

            {/* ── Compare ── */}
            {comparedRooms.length > 0 && (
              <>
                <div className="rm-compare-anchor" ref={comparePanelRef}>
                  <RoomComparePanel rooms={comparedRooms} onClear={() => setComparedRoomIds([])} />
                </div>
                <div className="rm-compare-bar" role="status" aria-live="polite">
                  <div>
                    <strong>{comparedRooms.length} kamar dipilih</strong>
                    <span>Lihat perbandingan estimasi awal</span>
                  </div>
                  <div className="rm-compare-bar-actions">
                    <Button size="sm" onClick={() => comparePanelRef.current?.scrollIntoView({ behavior: "smooth" })}>
                      Lihat Perbandingan
                    </Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => setComparedRoomIds([])}>
                      Bersihkan
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </Container>
    </div>
  );
}
