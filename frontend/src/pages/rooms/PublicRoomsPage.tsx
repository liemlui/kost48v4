import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Col, Container, Row, Spinner } from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listPublicRooms } from "../../api/bookings";
import GuestPreferenceWizard from "../../components/public/GuestPreferenceWizard";
import EmptyState from "../../components/common/EmptyState";
import { SkeletonBlock } from "../../components/common/SkeletonLoader";
import TenantBookingGate from "../../components/tenant/TenantBookingGate";
import RoomComparePanel from "../../components/rooms/RoomComparePanel";
import AvailabilityTimeline from "../../components/public/RichAvailabilityCalendar";
import Kost48LogoMark from "../../components/common/Kost48LogoMark";
import RoomCard from "../../components/rooms/RoomCard";
import type { PricingTerm, PublicRoom } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useTenantPortalStage } from "../../hooks/useTenantPortalStage";
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
const ROOMS_PER_PAGE = 9; // F2-11 (W-03): paginasi katalog publik
type PaginationItem = number | "gap";

function getPaginationItems(totalPages: number, currentPage: number): PaginationItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages: PaginationItem[] = [];
  for (let p = 1; p <= totalPages; p += 1) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "gap") {
      pages.push("gap");
    }
  }
  return pages;
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
        {/* Wordmark teks bersih 2-warna (ganti gambar logo gradasi multi-warna). */}
        <div className="rm-topbar-brand-text"><span>KOST<span className="gx-brand-accent">48</span> Surabaya</span><small>Surabaya Barat</small></div>
      </button>

      <nav className="rm-topbar-nav" aria-label="Navigasi">
        <button type="button" onClick={() => navigate("/")}>
          <svg className="rm-nav-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9.5 12 3l9 6.5" /><path d="M5 10v10h14V10" /></svg>
          Beranda
        </button>
        <button type="button" onClick={() => navigate("/panduan")}>
          <svg className="rm-nav-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
          Panduan & FAQ
        </button>
        <button type="button" onClick={() => navigate("/reviews")}>
          <svg className="rm-nav-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
          Ulasan
        </button>
        <a href={officialKost48Location.mapsUrl} target="_blank" rel="noreferrer">
          <svg className="rm-nav-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
          Maps
        </a>
        <a href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer">
          <svg className="rm-nav-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5z" /></svg>
          WhatsApp
        </a>
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
  const [wizardDone, setWizardDone] = useState(false);
  const { user } = useAuth();
  const { stage, isLoading: isTenantStageLoading } = useTenantPortalStage();
  const isTenant = user?.role === "TENANT";
  const restoresSearch = useRef(false);

  // UX-02: simpan/pulihkan filter katalog & scroll saat navigasi kembali dari detail.
  const CACHE_KEY = 'kost48-catalog-state';
  useEffect(() => {
    if (!restoresSearch.current) {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const saved = JSON.parse(cached);
          if (saved.search) setSearchParams(new URLSearchParams(saved.search), { replace: true });
          if (saved.scrollY && saved.scrollY > 0) {
            window.setTimeout(() => window.scrollTo({ top: saved.scrollY }), 60);
          }
        } catch { /* abaikan cache rusak */ }
      }
      restoresSearch.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ search: searchParams.toString(), scrollY: window.scrollY }));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [searchParams]);

  const bathroom = (searchParams.get("bathroom") ?? "") as BathroomFilter;
  const cooling = (searchParams.get("cooling") ?? "") as CoolingFilter;
  const avail = (searchParams.get("avail") ?? "bookable") as AvailFilter;
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

  // F2-11 (W-03): paginasi 9 per halaman (ROOMS_PER_PAGE); reset ke hal.1 saat filter/sort berubah.
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [bathroom, cooling, avail, sort]);
  const totalPages = Math.max(1, Math.ceil(rooms.length / ROOMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRooms = useMemo(
    () => rooms.slice((safePage - 1) * ROOMS_PER_PAGE, safePage * ROOMS_PER_PAGE),
    [rooms, safePage],
  );

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

  const hasActiveFilter = !!(bathroom || cooling || avail !== "bookable" || sort !== "price-asc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const paginationItems = useMemo(() => getPaginationItems(totalPages, safePage), [safePage, totalPages]);

  return (
    <div className={isTenant ? "tenant-room-discovery-page" : "rm-page"}>
      {!isTenant && <RoomsTopbar />}

      <Container fluid="xl" className={isTenant ? "py-0" : "rm-container"}>
        {isTenantStageLoading && <div className="py-5 text-center"><Spinner animation="border" /></div>}
        {lockedForTenant && <TenantBookingGate mode="rooms" />}

        {!lockedForTenant && (
          <>
            {/* ── Wizard intercept: ambil alih halaman sebelum katalog ── */}
            {!isTenant && !wizardDone ? (
              <div className="gpw-intercept-shell">
                <GuestPreferenceWizard
                  rooms={roomsFromApi}
                  roomsLoading={query.isLoading}
                  onDone={(filters) => {
                    const p = new URLSearchParams(searchParams);
                    if (filters.bathroom === 'inside')    p.set('bathroom', 'inside');
                    else if (filters.bathroom === 'outside') p.set('bathroom', 'outside');
                    if (filters.cooling === 'ac')         p.set('cooling', 'ac');
                    else if (filters.cooling === 'fan')   p.set('cooling', 'fan');
                    setSearchParams(p, { replace: true });
                    setWizardDone(true);
                  }}
                  onSkip={() => setWizardDone(true)}
                />
              </div>
            ) : (
            <>

            {/* ── Header ── */}
            {!isTenant && (
              <div className="rm-page-header" id="rm-catalog">
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
            <button
              type="button"
              className="rm-filter-toggle d-lg-none"
              aria-controls="room-filter-panel"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <span>{filtersOpen ? "Tutup filter" : "Filter & urutkan"}</span>
              {hasActiveFilter ? <span className="rm-filter-toggle-dot" aria-hidden="true" /> : null}
            </button>
            <div id="room-filter-panel" className={`rm-filter-bar${filtersOpen ? " is-open" : ""}`}>
              <div className="rm-filter-group">
                <span className="rm-filter-label">Ketersediaan</span>
                {/* UD-07: "Semua Kamar" lebih jujur — termasuk kamar terisi & yang sedang dicek (tidak semua bisa diajukan). */}
                <FilterChip label="Semua Kamar" active={!avail} onClick={() => update({ avail: "" })} />
                <FilterChip label="Kosong" active={avail === "bookable"} onClick={() => update({ avail: "bookable" })} />
                <FilterChip label="Dibersihkan / Maintenance" active={avail === "checking"} onClick={() => update({ avail: "checking" })} />
                <FilterChip label="Penuh / Terisi" active={avail === "occupied"} onClick={() => update({ avail: "occupied" })} />
                {!avail && <span className="rm-filter-hint">Termasuk kamar terisi &amp; yang sedang dicek</span>}
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
                  {totalPages > 1 ? (
                    <>Menampilkan <strong>{(safePage - 1) * ROOMS_PER_PAGE + 1}&ndash;{(safePage - 1) * ROOMS_PER_PAGE + pageRooms.length}</strong> dari <strong>{rooms.length}</strong> kamar</>
                  ) : (
                    <><strong>{rooms.length}</strong> kamar ditampilkan</>
                  )}
                  {bookableCount > 0 && rooms.length !== bookableCount && (
                    <> · <strong className="rm-count-bookable">{bookableCount}</strong> bisa diajukan sekarang</>
                  )}
                </span>
              )}
            </div>

            {/* ── Skeleton saat memuat (F2-11 W-02) ── */}
            {query.isLoading && (
              <Row className="g-3 rm-grid" aria-hidden="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Col lg={4} md={4} sm={6} key={i}>
                    <div className="rm-card">
                      <SkeletonBlock height={180} />
                      <div className="rm-card-body">
                        <SkeletonBlock width="55%" height={18} className="mb-2" />
                        <SkeletonBlock width="40%" height={12} className="mb-3" />
                        <SkeletonBlock width="70%" height={28} />
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            )}

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
                  title="Semua kamar sedang penuh"
                  description="Saat ini belum ada kamar kosong yang bisa dipesan. Hubungi admin via WhatsApp atau cek lagi nanti untuk ketersediaan terbaru."
                />
                <a className="btn btn-outline-secondary mt-3" href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer">
                  💬 Tanya ketersediaan via WhatsApp
                </a>
              </div>
            )}

            <Row className="g-3 rm-grid">
              {pageRooms.map((room) => {
                const isCompared = comparedRoomIds.includes(room.id);
                return (
                  <Col lg={4} md={4} sm={6} key={room.id}>
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

            {/* ── Paginasi (F2-11 W-03) ── */}
            {totalPages > 1 && (
              <nav className="rm-pagination d-flex justify-content-center align-items-center gap-2 mt-4" aria-label="Navigasi halaman katalog">
                <Button size="sm" variant="outline-secondary" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                  ‹ Sebelumnya
                </Button>
                {paginationItems.map((item, idx) => (
                  item === "gap" ? (
                    <span key={`gap-${idx}`} className="rm-pagination-ellipsis" aria-hidden="true">&hellip;</span>
                  ) : (
                    <Button
                      key={item}
                      size="sm"
                      variant={item === safePage ? "primary" : "outline-secondary"}
                      aria-current={item === safePage ? "page" : undefined}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </Button>
                  )
                ))}
                <Button size="sm" variant="outline-secondary" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                  Berikutnya ›
                </Button>
              </nav>
            )}

            {/* ── PANDUAN KATEGORI KAMAR ── */}
            <div className="rm-guide-shell">
              <div className="rm-guide-header">
                <span className="rm-guide-icon">🏠</span>
                <h3 className="rm-guide-title">Panduan Kategori Kamar</h3>
              </div>
              <div className="rm-guide-cards">
                <div className="rm-guide-card"><span className="rm-guide-card-icon">🌬️</span><div><strong>Ekonomi</strong><small>Kipas angin · Kamar mandi luar bersama · Tarif paling terjangkau</small></div></div>
                <div className="rm-guide-card"><span className="rm-guide-card-icon">🚿</span><div><strong>Standar</strong><small>Kipas angin · Kamar mandi dalam (private) · Harga menengah</small></div></div>
                <div className="rm-guide-card"><span className="rm-guide-card-icon">❄️</span><div><strong>Deluxe</strong><small>AC · Kamar mandi dalam (private) · Fasilitas terlengkap</small></div></div>
                <div className="rm-guide-card"><span className="rm-guide-card-icon">🏗️</span><div><strong>Mezzanine</strong><small>Kamar bertingkat dua (loft) · Ruang penyimpanan atas · Unik dan lebih lega</small></div></div>
                <div className="rm-guide-card"><span className="rm-guide-card-icon">📐</span><div><strong>Besar</strong><small>Luas ~10 m² ke atas · Ruang gerak lebih lega · +Rp 200.000/bulan</small></div></div>
                <div className="rm-guide-card"><span className="rm-guide-card-icon">📏</span><div><strong>Standar</strong><small>Luas ~7–9 m² · Efisien dan fungsional · Tarif dasar</small></div></div>
              </div>
            </div>

            {/* ── KALENDER KETERSEDIAAN ── */}
            <AvailabilityTimeline />
            {/* RichAvailabilityCalendar menggantikan AvailabilityTimeline lama */}

            {/* ── Compare ── */}
            {comparedRooms.length > 0 && (
              <>
                <div className="rm-compare-anchor" ref={comparePanelRef}>
                  <RoomComparePanel rooms={comparedRooms} onClear={() => setComparedRoomIds([])} />
                </div>
                <div className="rm-compare-bar" role="status" aria-live="polite">
                  <div>
                    <strong className={comparedRooms.length >= 3 ? "rm-compare-limit" : undefined}>
                      {comparedRooms.length}/3 kamar dipilih
                    </strong>
                    <span>{comparedRooms.length >= 3 ? "Maksimal tercapai, lihat perbandingan" : "Lihat perbandingan estimasi awal"}</span>
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
          </>
        )}
      </Container>
    </div>
  );
}
