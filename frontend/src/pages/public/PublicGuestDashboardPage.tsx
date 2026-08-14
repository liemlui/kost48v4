// FILE: PublicGuestDashboardPage.tsx — halaman utama publik: hero, kamar, fasilitas, CTA
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Accordion, Container, Modal, Spinner } from 'react-bootstrap';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { listPublicRooms } from '../../api/bookings';
import { fetchPublicRoomSummary, fetchPublicSocialProof } from '../../api/marketing';
import { fetchPublicConfig } from '../../api/settings';
import type { PublicConfig } from '../../api/settings';
import { listFacilityImages } from '../../api/facilityImages';
import { listMarketingAssets } from '../../api/marketingAssets';
import Kost48LogoMark from '../../components/common/Kost48LogoMark';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRoute } from '../../config/navigation';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import { officialKost48Location } from '../../data/officialKost48Content';
import {
  getKost48FrontPhotoUrl,
  getKost48RoomCover,
  resolveKost48MarketingImageUrl,
} from '../../data/kost48Assets';
import type { PublicRoom } from '../../types';
import {
  getBestPublicRoomRate,
  getPublicRoomAvailabilityDisplay,
  getPublicRoomBathroom,
  getPublicRoomBathroomLabel,
  getPublicRoomCooling,
  getPublicRoomCoolingLabel,
  getPublicRoomVisibleAmenities,
  isPublicRoomBookable,
} from '../../utils/publicRoomDisplay';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import { formatRupiah, formatRupiahWithoutSymbol } from '../../utils/formatCurrency';
import { WIFI_DEFAULT_PRICE_RUPIAH } from '../../config/constants';
import {
  NAV_LINKS, GALLERY_ITEMS, FACILITY_GROUPS, TRUST_ITEMS, HOME_FAQ_ITEMS, EXTRA_FAQ_ITEMS, MAPS_EMBED_URL, CATALOG_BATCH_SIZE,
  resolvePublicMarketingAssetUrl, getTodayDateInput, formatCompactRupiah, formatMonthlyRange, buildWhatsAppUrl, buildRoomWhatsAppUrl, getRoomCover,
  Lightbox, GuestTopbar, RoomPreviewCard, RoomPreviewSkeleton, GuestFooter, MobileShortcutNav,
} from './publicGuestShared';
const HERO_SUB_TEXT = 'Kamar nyaman dengan pilihan AC atau kipas, fasilitas harian lengkap, dan proses booking yang lebih jelas dari awal.';

// ═══════════════════════════════════════════════════════════
//  COMPONENT: PublicGuestDashboardPage
// ═══════════════════════════════════════════════════════════

export default function PublicGuestDashboardPage() {
  const { user } = useAuth();
  const { stage } = useTenantPortalStage();
  const location = useLocation();

  const initialCatalogParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [activeFacilityTab, setActiveFacilityTab] = useState(FACILITY_GROUPS[0].id);
  const facilityImagesQuery = useQuery({
    queryKey: ['facility-images'],
    queryFn: listFacilityImages,
    staleTime: 120_000,
  });
  const marketingAssetsQuery = useQuery({
    queryKey: ['marketing-assets'],
    queryFn: listMarketingAssets,
    staleTime: 120_000,
  });
  const facilityImageMap = useMemo(() => {
    const map = new Map<string, string>();
    if (facilityImagesQuery.data) {
      for (const item of facilityImagesQuery.data) map.set(item.slug, item.url);
    }
    return map;
  }, [facilityImagesQuery.data]);
  const marketingAssetMap = useMemo(() => {
    const map = new Map<string, string>();
    if (marketingAssetsQuery.data) {
      for (const item of marketingAssetsQuery.data) map.set(item.slug, item.activeUrl);
    }
    return map;
  }, [marketingAssetsQuery.data]);

  const [heroTyped, setHeroTyped] = useState('');
  const [heroTypingDone, setHeroTypingDone] = useState(false);
  const [showAllFaq, setShowAllFaq] = useState(false);
  const todayDate = useMemo(() => getTodayDateInput(), []);
  const [checkInDate, setCheckInDate] = useState(todayDate);
  const [duration, setDuration] = useState('monthly');
  const [preference, setPreference] = useState('all');
  const [catalogAvailability, setCatalogAvailability] = useState(() => {
    const value = initialCatalogParams.get('avail');
    return value === 'bookable' || value === 'checking' || value === 'occupied' ? value : 'all';
  });
  const [catalogPreference, setCatalogPreference] = useState(() => {
    const cooling = initialCatalogParams.get('cooling');
    const bathroom = initialCatalogParams.get('bathroom');
    if (cooling === 'ac' || cooling === 'fan') return cooling;
    if (bathroom === 'inside') return 'inside';
    return 'all';
  });
  const [catalogSort, setCatalogSort] = useState(() => initialCatalogParams.get('sort') === 'price-desc' ? 'price-desc' : 'price-asc');
  // PUB-ROOM-CATEGORY: filter kategori kamar (client-side).
  const [catalogCategory, setCatalogCategory] = useState(() => {
    const value = (initialCatalogParams.get('category') || '').toUpperCase();
    return ['ECONOMY', 'STANDARD', 'DELUXE'].includes(value) ? value : 'all';
  });
  // PUB-REVIEWS-FILTER: urutkan + paginasi ulasan (6 per halaman).
  const [reviewSort, setReviewSort] = useState<'recent' | 'rating'>('recent');
  const [reviewPage, setReviewPage] = useState(1);
  const REVIEW_PER_PAGE = 6;
  const [visibleRoomCount, setVisibleRoomCount] = useState(CATALOG_BATCH_SIZE);
  const [galleryBroken, setGalleryBroken] = useState<Record<string, boolean>>({});
  const availSectionRef = useRef<HTMLElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [displayStats, setDisplayStats] = useState({ bookable: 0, occupied: 0, total: 0, percent: 0 });
  const countUpStarted = useRef(false);
  const heroImageUrl = resolvePublicMarketingAssetUrl(marketingAssetMap.get('hero-front')) ?? getKost48FrontPhotoUrl();
  const galleryItems = useMemo(
    () => GALLERY_ITEMS.map((item) => ({
      ...item,
      src: resolvePublicMarketingAssetUrl(marketingAssetMap.get(item.id)) ?? item.src,
    })),
    [marketingAssetMap],
  );
  const visibleGalleryItems = galleryItems.filter((item) => !galleryBroken[item.id]);
  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  useEffect(() => {
    setGalleryBroken({});
  }, [marketingAssetsQuery.data]);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    let i = 0;
    let id: ReturnType<typeof setInterval>;
    const delay = setTimeout(() => {
      id = setInterval(() => {
        i += 1;
        setHeroTyped(HERO_SUB_TEXT.slice(0, i));
        if (i >= HERO_SUB_TEXT.length) { clearInterval(id); setHeroTypingDone(true); }
      }, 22);
    }, 760);
    return () => { clearTimeout(delay); clearInterval(id); };
  }, []);

  // UX-06: scroll progress bar (0-100%) di landing panjang.
  useEffect(() => {
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(h > 0 ? Math.min(100, Math.round((window.scrollY / h) * 100)) : 0);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  useEffect(() => {
    if (location.pathname !== '/rooms') return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById('kamar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('gx-visible'); obs.unobserve(e.target); }
      }),
      { threshold: 0.05, rootMargin: '0px 0px -10px 0px' },
    );
    const t = setTimeout(() => {
      document.querySelectorAll('.gx-reveal, .gx-reveal-l, .gx-reveal-r').forEach((el) => {
        const rect = (el as Element).getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          (el as Element).classList.add('gx-visible');
        } else {
          obs.observe(el);
        }
      });
    }, 60);
    return () => { clearTimeout(t); obs.disconnect(); };
  }, []);

  useEffect(() => {
    const el = availSectionRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setStatsVisible(true); }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const roomsQuery = useQuery({
    queryKey: ['guest-dashboard-public-rooms'],
    queryFn: () => listPublicRooms({ limit: 100, pricingTerm: 'MONTHLY' }),
    staleTime: 60_000,
  });

  const roomSummaryQuery = useQuery({
    queryKey: ['public-room-summary'],
    queryFn: fetchPublicRoomSummary,
    staleTime: 60_000,
  });

  const socialProofQuery = useQuery({
    queryKey: ['public-social-proof'],
    queryFn: fetchPublicSocialProof,
    staleTime: 5 * 60_000,
  });

  const publicConfigQuery = useQuery({
    queryKey: ['public-config'],
    queryFn: fetchPublicConfig,
    staleTime: 30 * 60_000,
  });
  const cfg = publicConfigQuery.data as PublicConfig | undefined;
  const freeKwh = cfg?.freeElectricityKwhPerMonth ?? 30;
  const electricityTariff = cfg?.electricityTariffPerKwhRupiah ?? 2500;
  const wifiPrice = cfg?.wifiRupiah ?? WIFI_DEFAULT_PRICE_RUPIAH;
  const petDeposit = cfg?.petDepositRupiah ?? 100000;

  const rooms = roomsQuery.data?.items ?? [];
  const catalogStats = useMemo(() => ({
    bookable: rooms.filter((r) => isPublicRoomBookable(r) && String(r.status ?? '').toUpperCase() !== 'MAINTENANCE').length,
    occupied: rooms.filter((r) => String(r.status ?? '').toUpperCase() === 'OCCUPIED').length,
    total: rooms.length,
  }), [rooms]);
  const stats = useMemo(() => {
    const summary = roomSummaryQuery.data;
    if (!summary) return catalogStats;
    return {
      bookable: summary.bookable,
      occupied: summary.occupied,
      total: summary.total,
    };
  }, [catalogStats, roomSummaryQuery.data]);
  const isStatsLoading = roomSummaryQuery.isLoading && !roomSummaryQuery.data;
  // AO-17: state ketersediaan yang jujur — bedakan loading, error, ada kamar, penuh, dan belum ada data.
  const bookableRooms = useMemo(
    () => rooms.filter((r) => isPublicRoomBookable(r)),
    [rooms],
  );
  const availabilityState = isStatsLoading
    ? 'loading'
    : roomsQuery.isError || roomSummaryQuery.isError
      ? 'error'
      : stats.bookable > 0
        ? 'available'
        : stats.total > 0
          ? 'full'
          : 'empty';

  // Z-17: Sync displayStats immediately when data loads (not just on scroll)
  useEffect(() => {
    if (stats.total > 0) {
      const pct = Math.round((stats.occupied / stats.total) * 100);
      setDisplayStats({ bookable: stats.bookable, occupied: stats.occupied, total: stats.total, percent: pct });
    }
  }, [stats]);

  useEffect(() => {
    if (!statsVisible || isStatsLoading || countUpStarted.current) return undefined;
    // Z-17: already synced by displayStats effect — skip count-up animation to avoid flash
    if (displayStats.total > 0) return undefined;
    countUpStarted.current = true;
    const { bookable, occupied, total } = stats;
    const actualPercent = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const steps = 28;
    let s = 0;
    const id = setInterval(() => {
      s += 1;
      const p = 1 - Math.pow(1 - s / steps, 3);
      setDisplayStats({ bookable: Math.round(bookable * p), occupied: Math.round(occupied * p), total: Math.round(total * p), percent: Math.round(actualPercent * p) });
      if (s >= steps) { clearInterval(id); setDisplayStats({ bookable, occupied, total, percent: actualPercent }); }
    }, Math.round(820 / steps));
    return () => clearInterval(id);
  }, [statsVisible, stats, isStatsLoading]);

  const monthlyRates = useMemo(
    () => rooms.map((room) => getBestPublicRoomRate(room, 'MONTHLY')).filter((rate) => rate > 0),
    [rooms],
  );

  const catalogRooms = useMemo(() => {
    const filtered = rooms.filter((room) => {
      const availability = getPublicRoomAvailabilityDisplay(room);
      const status = String(room.status ?? '').toUpperCase();
      if (catalogAvailability === 'bookable' && (!availability.canBook || status === 'MAINTENANCE')) return false;
      if (catalogAvailability === 'checking' && status !== 'MAINTENANCE') return false;
      if (catalogAvailability === 'occupied' && (availability.canBook || status !== 'OCCUPIED')) return false;
      if (catalogPreference === 'ac' && getPublicRoomCooling(room) !== 'ac') return false;
      if (catalogPreference === 'fan' && getPublicRoomCooling(room) !== 'fan') return false;
      if (catalogPreference === 'inside' && getPublicRoomBathroom(room) !== 'inside') return false;
      if (catalogCategory !== 'all' && String(room.category ?? 'STANDARD').toUpperCase() !== catalogCategory) return false;
      return true;
    });

    return filtered
      .sort((a, b) => {
        const aRate = getBestPublicRoomRate(a, 'MONTHLY');
        const bRate = getBestPublicRoomRate(b, 'MONTHLY');
        return catalogSort === 'price-desc' ? bRate - aRate : aRate - bRate;
      });
  }, [rooms, catalogAvailability, catalogPreference, catalogSort, catalogCategory]);

  const visibleCatalogRooms = useMemo(
    () => catalogRooms.slice(0, visibleRoomCount),
    [catalogRooms, visibleRoomCount],
  );

  const faqItems = useMemo(() => {
    const base = showAllFaq ? [...HOME_FAQ_ITEMS, ...EXTRA_FAQ_ITEMS] : HOME_FAQ_ITEMS;
    return base.map((item) => {
      let answer = item.answer;
      if (item.question === 'Bagaimana sistem listrik?') {
        answer = answer.replace('Jatah gratis 30 kWh/bulan', `Jatah gratis ${freeKwh} kWh/bulan`);
        answer = answer.replace('Rp 2.500/kWh', `{formatRupiah(electricityTariff)}/kWh`);
      } else if (item.question === 'Apakah tersedia WiFi?') {
        answer = answer.replace('Rp 50.000', `{formatRupiah(wifiPrice)}`);
      } else if (item.question === 'Apakah boleh membawa hewan peliharaan?') {
        answer = answer.replace('Rp 100.000', `{formatRupiah(petDeposit)}`);
      }
      return { ...item, answer };
    });
  }, [showAllFaq, freeKwh, electricityTariff, wifiPrice, petDeposit]);
  const activeFacility = FACILITY_GROUPS.find((group) => group.id === activeFacilityTab) ?? FACILITY_GROUPS[0];
  const ratingAvailable = Boolean((socialProofQuery.data?.reviewCount ?? 0) > 0 && (socialProofQuery.data?.averageRating ?? 0) > 0);
  const occupantCount = socialProofQuery.data?.occupantCount ?? stats.occupied;
  // PUB-REVIEWS-FILTER: urutkan + paginasi 6 per halaman (client-side).
  const allSortedReviews = useMemo(() => {
    const list = [...(socialProofQuery.data?.reviews ?? [])];
    list.sort((a, b) =>
      reviewSort === 'rating'
        ? b.rating - a.rating
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return list;
  }, [socialProofQuery.data?.reviews, reviewSort]);
  const reviewTotalPages = Math.ceil(allSortedReviews.length / REVIEW_PER_PAGE);
  const displayedReviews = useMemo(
    () => allSortedReviews.slice((reviewPage - 1) * REVIEW_PER_PAGE, reviewPage * REVIEW_PER_PAGE),
    [allSortedReviews, reviewPage, REVIEW_PER_PAGE],
  );
  const handleCheckInDateChange = (value: string) => {
    setCheckInDate(!value || value < todayDate ? todayDate : value);
  };
  const handleCheckAvailability = () => {
    setCatalogAvailability('bookable');
    setCatalogPreference(preference);
    setVisibleRoomCount(CATALOG_BATCH_SIZE);
    document.getElementById('kamar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    setVisibleRoomCount(CATALOG_BATCH_SIZE);
  }, [catalogAvailability, catalogPreference, catalogSort]);

  if (user) return <Navigate to={getDefaultRoute(user.role, stage)} replace />;

  return (
    <div className="gx-page">
      <GuestTopbar scrolled={scrolled} />
      <main id="main-content">
      {/* UX-06: scroll progress bar — thin line di bawah topbar */}
      <div
        className="gx-scroll-progress"
        role="progressbar"
        aria-valuenow={scrollProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Kemajuan membaca halaman"
        style={{ width: `${scrollProgress}%` }}
      />
      {/* R-07: sticky shortcut nav mobile, muncul setelah scroll melewati hero */}
      <MobileShortcutNav visible={scrolled} />
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={closeLightbox} />}

      <section className="gx-hero" id="top">
        <div className="gx-hero-bg" style={{ backgroundImage: `url(${heroImageUrl})` }} aria-hidden="true" />
        <div className="gx-hero-overlay" aria-hidden="true" />
        <div className="gx-hero-body">
          <p className="gx-hero-eyebrow">Jalan Hikmah V No. 48 - Surabaya Barat</p>
          <h1 className="gx-hero-title">KOST48 Surabaya</h1>
          <p className="gx-hero-headline">Kost bersih &amp; aman dekat Pakuwon Mall</p>
          <p
            className="gx-hero-sub"
            aria-label={HERO_SUB_TEXT}
          >
            {heroTyped || ' '}
            <span className={`gx-typewriter-cursor${heroTypingDone ? ' done' : ''}`} aria-hidden="true" />
          </p>
          {monthlyRates.length > 0 && (
            <div className="gx-hero-price-badge">
              <span aria-hidden="true">🏷️</span>
              <strong>Mulai {formatCompactRupiah(Math.min(...monthlyRates))}/bln</strong>
              <span className={`gx-hero-price-badge-sub${availabilityState === 'full' || availabilityState === 'empty' ? ' is-neutral' : ''}`}>
                {availabilityState === 'loading' ? 'Memuat ketersediaan…'
                  : availabilityState === 'error' ? 'Ketersediaan belum dapat dimuat'
                  : availabilityState === 'full' ? 'Semua kamar sedang terisi'
                  : availabilityState === 'empty' ? 'Belum ada data kamar'
                  : `${stats.bookable} kamar tersedia`}
              </span>
            </div>
          )}
          <div className="gx-hero-cta">
            {availabilityState === 'available' || availabilityState === 'loading' || availabilityState === 'error' ? (
              <>
                <a className="gx-hero-btn-primary" href="#kamar"><span aria-hidden="true">🛏️</span> Lihat Kamar Tersedia →</a>
                <a className="gx-hero-btn-ghost" href={buildWhatsAppUrl('Halo Admin KOST48, saya ingin tanya ketersediaan kamar.')} target="_blank" rel="noreferrer"><span aria-hidden="true">💬</span> WhatsApp Admin</a>
              </>
            ) : (
              <>
                <a className="gx-hero-btn-primary" href={buildWhatsAppUrl('Halo Admin KOST48, kabari saya saat ada kamar tersedia.')} target="_blank" rel="noreferrer"><span aria-hidden="true">🔔</span> Kabari saya saat tersedia</a>
                <a className="gx-hero-btn-ghost" href="#kamar"><span aria-hidden="true">📋</span> Lihat seluruh kamar</a>
              </>
            )}
          </div>
        </div>
        <div className="gx-hero-next" aria-hidden="true">Kamar tersedia, fasilitas, dan lokasi ada di bawah.</div>
      </section>

      <section className="gx-avail-section" id="cek-kamar" ref={availSectionRef}>
        <Container fluid="xl">
          <div className="gx-avail-wrap">
            <div className="gx-avail-text">
              <div className="gx-label">Ketersediaan kamar — diperbarui langsung</div>
              <h2>Kamar tersedia, transparan tanpa chat dulu.</h2>
              <p>
                Lihat status setiap kamar secara real-time — filter AC/kipas, KM dalam/luar, harga,
                dan bandingkan hingga 3 kamar sekaligus. Tidak perlu login, tidak perlu nunggu balas WA.
              </p>
              <div className={`gx-avail-live-badge${availabilityState === 'full' || availabilityState === 'empty' ? ' is-neutral' : ''}`} aria-live="polite">
                <span className="gx-avail-live-dot" aria-hidden="true" />
                {availabilityState === 'loading' ? 'Memuat ketersediaan…'
                  : availabilityState === 'error' ? 'Ketersediaan belum dapat dimuat'
                  : availabilityState === 'full' ? 'Semua kamar sedang terisi'
                  : availabilityState === 'empty' ? 'Belum ada data kamar'
                  : `${stats.bookable} kamar tersedia sekarang`}
              </div>
              <div className="gx-avail-stats">
                <div className="gx-stat gx-stat-green">
                  <span className="gx-stat-num">{isStatsLoading ? '...' : displayStats.bookable}</span>
                  <span className="gx-stat-label">Kamar tersedia</span>
                </div>
                <div className="gx-stat gx-stat-amber">
                  <span className="gx-stat-num">{isStatsLoading ? '...' : displayStats.occupied}</span>
                  <span className="gx-stat-label">Terisi</span>
                </div>
                <div className="gx-stat gx-stat-gray">
                  <span className="gx-stat-num">{isStatsLoading ? '...' : displayStats.total}</span>
                  <span className="gx-stat-label">Total kamar</span>
                </div>
              </div>
              {!isStatsLoading && stats.total > 0 && (
                <div className="gx-avail-progress-wrap">
                  <div className="gx-avail-progress-meta">
                    <span>Tingkat hunian saat ini</span>
                    <strong className={`gx-percent-badge${stats.bookable > 0 && stats.bookable <= 5 ? ' is-scarce' : ''}`}>
                      <span className="gx-percent-num">{displayStats.percent}%</span>
                      {stats.bookable > 0 && stats.bookable <= 5 && <span className="gx-percent-note">⚡ Sisa {stats.bookable} kamar!</span>}
                    </strong>
                  </div>
                  <div
                    className="gx-avail-progress"
                    role="progressbar"
                    aria-valuenow={stats.occupied}
                    aria-valuemin={0}
                    aria-valuemax={stats.total}
                    aria-label={`${stats.occupied} dari ${stats.total} kamar terisi`}
                  >
                    <div
                      className={`gx-avail-progress-bar${stats.bookable > 0 && stats.bookable <= 5 ? ' is-scarce' : ''}`}
                      style={{ width: statsVisible ? `${Math.round((stats.occupied / stats.total) * 100)}%` : '0%' }}
                    />
                  </div>
                </div>
              )}
              <a className="gx-btn-primary" href="/rooms"><span aria-hidden="true">🔍</span> Lihat Katalog Kamar</a>
              <span className="text-muted small mt-2 d-block">💡 Cukup DP 30% untuk amankan kamar — sisanya saat check-in.</span>
            </div>
            <div className="gx-avail-steps">
              <div className="gx-avail-step">
                <span className="gx-avail-step-num">1</span>
                <div>
                  <strong>Pilih kamar</strong>
                  <small>Filter AC/kipas, KM dalam/luar, harga, dan bandingkan 3 kamar sekaligus.</small>
                </div>
              </div>
              <div className="gx-avail-step">
                <span className="gx-avail-step-num">2</span>
                <div>
                  <strong>Isi data & DP 30%</strong>
                  <small>Formulir singkat: nama, nomor KTP, tanggal check-in. DP hangus hanya jika batal.</small>
                </div>
              </div>
              <div className="gx-avail-step">
                <span className="gx-avail-step-num">3</span>
                <div>
                  <strong>Kamar diamankan</strong>
                  <small>Admin review lalu konfirmasi via portal. Sisa pembayaran dibawa saat check-in.</small>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="gx-market-section" id="kamar">
        <Container fluid="xl">
          <div className="gx-market-head">
            <div className="gx-section-head gx-reveal">
              <div className="gx-label">Pilih kamarmu</div>
              <h2>Pilih kamar yang benar-benar sesuai, bukan sekadar yang ada.</h2>
              <p>Filter AC/kipas, kamar mandi dalam/luar, dan harga. Bandingkan 3 kamar sekaligus — baru booking yang benar-benar cocok.</p>
            </div>
            <Link to="/rooms" className="gx-btn-outline">Lihat Katalog Lengkap →</Link>
          </div>

          {/* Preview card 4 kamar — teaser, bukan full catalog */}
          {roomsQuery.isLoading ? (
            <div className="gx-room-grid">
              {[0, 1, 2, 3].map((item) => <RoomPreviewSkeleton key={item} />)}
            </div>
          ) : roomsQuery.isError ? (
            <div className="gx-home-empty">Katalog kamar belum dapat dimuat. <Link to="/rooms">Coba buka katalog langsung →</Link></div>
          ) : rooms.length > 0 && bookableRooms.length === 0 ? (
            <div className="gx-home-empty gx-home-waitlist">
              <strong>Semua kamar sedang terisi.</strong>
              <p>Seluruh kamar KOST48 saat ini terisi. Kabari kami agar kamu jadi yang pertama tahu saat ada kamar kosong.</p>
              <div className="gx-home-waitlist-actions">
                <a href={buildWhatsAppUrl('Halo Admin KOST48, kabari saya saat ada kamar tersedia.')} className="gx-btn gx-btn-whatsapp" target="_blank" rel="noopener noreferrer">Kabari saya via WhatsApp</a>
                <Link to="/rooms" className="gx-btn-outline">Lihat seluruh kamar</Link>
              </div>
            </div>
          ) : rooms.length > 0 ? (
            <>
              <div className="gx-room-grid">
                {bookableRooms.slice(0, 4).map((room) => <RoomPreviewCard key={room.id} room={room} />)}
              </div>
              <div className="gx-room-range">
                <span>Tarif bulanan mulai</span>
                <strong>{formatMonthlyRange(
                  monthlyRates.length ? Math.min(...monthlyRates) : 0,
                  monthlyRates.length ? Math.max(...monthlyRates) : 0,
                )}</strong>
              </div>
              <div className="gx-room-more">
                <Link to="/rooms" className="gx-btn-outline">Lihat Semua Kamar ({stats.total}) →</Link>
              </div>
            </>
          ) : (
            <div className="gx-home-empty">Belum ada kamar yang tersedia saat ini. <Link to="/rooms">Cek ketersediaan langsung</Link> atau <a href={buildWhatsAppUrl("Halo Admin KOST48, saya ingin tanya ketersediaan kamar.")} className="gx-btn gx-btn-whatsapp" target="_blank" rel="noopener noreferrer">Hubungi via WhatsApp</a></div>
          )}
        </Container>
      </section>

      <section className="gx-trust-section">
        <Container fluid="xl">
          <div className="gx-section-head gx-section-head-center">
            <div className="gx-label">Beda dari kost lain</div>
            <h2>Semua info kamar bisa langsung dicek — tidak perlu chat tanya-tanya dulu.</h2>
            <p>Status kamar, jadwal booking, pembayaran, dan komunikasi — semua di satu portal. Kamu tahu posisinya di mana sejak hari pertama.</p>
          </div>
          <div className="gx-trust-grid gx-stagger">
            {TRUST_ITEMS.map((item) => (
              <article className="gx-trust-card" key={item.title}>
                <span className="gx-trust-mark" aria-hidden="true">{item.mark}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="gx-content-section" id="fasilitas">
        <Container fluid="xl">
          <div className="gx-section-head">
            <div className="gx-label">Fasilitas</div>
            <h2>Fasilitas yang mendukung hidup sehari-hari.</h2>
            <p>Pilih kategori untuk melihat fasilitas utama tanpa harus membaca daftar panjang sekaligus.</p>
          </div>
          <div className="gx-facility-tabs" role="tablist" aria-label="Kategori fasilitas">
            {FACILITY_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                role="tab"
                className={activeFacilityTab === group.id ? 'active' : ''}
                aria-selected={activeFacilityTab === group.id}
                onClick={() => setActiveFacilityTab(group.id)}
              >
                {group.title}
              </button>
            ))}
          </div>
          <div className="gx-facility-panel" role="tabpanel">
            <div className="gx-facility-list gx-facility-list-active">
              {activeFacility.items.map((item) => {
                const imgUrl = facilityImageMap.get(item.slug);
                const resolvedImgUrl = imgUrl ? resolveAbsoluteFileUrl(imgUrl) ?? imgUrl : null;
                return (
                  <div key={item.label} className={`gx-facility-row${resolvedImgUrl ? ' has-photo' : ''}`}>
                    {resolvedImgUrl ? (
                      <img
                        src={resolvedImgUrl}
                        alt={item.label}
                        className="gx-facility-photo"
                        loading="lazy"
                      />
                    ) : (
                      <span className="gx-facility-icon" aria-hidden="true">{item.mark}</span>
                    )}
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.desc}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      <section className="gx-location-section" id="lokasi">
        <Container fluid="xl">
          <div className="gx-location-grid">
            <div className="gx-location-copy gx-reveal-l">
              <div className="gx-label">Lokasi</div>
              <h2>Dekat Pakuwon Mall / PTC di Surabaya Barat.</h2>
              <p>KOST48 berada di Jalan Hikmah V No. 48, Lontar, Sambikerep. Lokasinya mudah dikenali dan cocok untuk calon penghuni yang ingin akses harian lebih praktis.</p>
              <div className="gx-location-facts">
                <span>7 menit berjalan kaki</span>
                <span>Surabaya Barat 60216</span>
                <span>Area Pakuwon Mall / PTC</span>
              </div>
              <div className="gx-contact-actions">
                <a className="gx-btn-primary" href={officialKost48Location.mapsUrl} target="_blank" rel="noreferrer">Buka Google Maps</a>
                <a className="gx-btn-outline" href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer">Chat WhatsApp</a>
              </div>
            </div>
            <div className="gx-contact-map gx-reveal-r">
              <iframe
                title="Peta Lokasi KOST48 Surabaya"
                src={MAPS_EMBED_URL}
                width="100%"
                height="380"
                style={{ border: 0, display: 'block' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a href={officialKost48Location.mapsUrl} target="_blank" rel="noreferrer" className="gx-map-open">Buka di Google Maps</a>
            </div>
          </div>
        </Container>
      </section>

      {/* R-02: section ulasan hanya tampil jika ada data ulasan nyata; jika kosong tampilkan blok Keunggulan */}
      {!socialProofQuery.isLoading && !socialProofQuery.isError && displayedReviews.length > 0 ? (
        <section className="gx-social-proof-section" id="ulasan">
          <Container fluid="xl">
            <div className="gx-social-proof-head">
              <div className="gx-section-head">
                <div className="gx-label">Cerita penghuni</div>
                <h2>Ulasan dari penghuni dan tamu KOST48.</h2>
                <p>Ulasan dari penghuni nyata dan tamu Google Maps — ditampilkan apa adanya.</p>
                <Link to="/reviews" className="btn btn-outline-primary btn-sm" style={{ borderRadius: 999, flexShrink: 0 }}>Lihat semua ulasan →</Link>
              </div>
              <div className="gx-social-proof-summary" aria-label="Ringkasan kepercayaan">
                {ratingAvailable && (
                  <div>
                    <strong>{socialProofQuery.data?.averageRating.toFixed(1)}</strong>
                    <span>rating terverifikasi</span>
                  </div>
                )}
                <div>
                  <strong>{occupantCount}</strong>
                  <span>penghuni aktif</span>
                </div>
                <div>
                  <strong>Asli</strong>
                  <span>foto properti</span>
                </div>
                <div>
                  <strong>Live</strong>
                  <span>status kamar</span>
                </div>
              </div>
            </div>
            <div className="gx-catalog-filter gx-review-filter" role="tablist" aria-label="Urutkan ulasan">
              <span>Urutkan</span>
              <button type="button" role="tab" aria-selected={reviewSort === 'recent'} className={reviewSort === 'recent' ? 'active' : ''} onClick={() => { setReviewSort('recent'); setReviewPage(1); }}>Terbaru</button>
              <button type="button" role="tab" aria-selected={reviewSort === 'rating'} className={reviewSort === 'rating' ? 'active' : ''} onClick={() => { setReviewSort('rating'); setReviewPage(1); }}>Rating Tertinggi</button>
            </div>
            <div className="gx-review-grid">
              {displayedReviews.map((review, index) => {
                const isGoogle = review.source === 'google';
                const displayName = review.displayName || ('Penghuni ' + review.initials);
                return (
                  <article className="gx-review-card" key={`${review.initials}-${review.createdAt}-${index}`}>
                    <div className="gx-review-card-head">
                      <span className="gx-review-avatar">{review.initials}</span>
                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <strong>{displayName}</strong>
                          {isGoogle && (
                            <span style={{ fontSize: 11, background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a', borderRadius: 6, padding: '1px 7px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              ⭐ Google Review
                            </span>
                          )}
                        </div>
                        <span>{review.rating.toFixed(1)} / 5</span>
                      </div>
                    </div>
                    <p>{review.comment || '⭐ Memberikan penilaian positif untuk KOST48.'}</p>
                  </article>
                );
              })}
            </div>
            {reviewTotalPages > 1 && (
              <div className="d-flex justify-content-center align-items-center gap-2 mt-4" role="navigation" aria-label="Halaman ulasan">
                <button type="button" className="gx-btn-outline" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setReviewPage((p) => Math.max(1, p - 1))} disabled={reviewPage === 1}>‹</button>
                {Array.from({ length: reviewTotalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} type="button" onClick={() => setReviewPage(p)} aria-current={p === reviewPage ? 'page' : undefined}
                    style={{ padding: '6px 14px', fontSize: 13, minWidth: 36, borderRadius: 8, border: '1px solid', borderColor: p === reviewPage ? '#0ea5e9' : '#e2e8f0', background: p === reviewPage ? '#0ea5e9' : 'transparent', color: p === reviewPage ? '#fff' : 'inherit', cursor: 'pointer' }}>
                    {p}
                  </button>
                ))}
                <button type="button" className="gx-btn-outline" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setReviewPage((p) => Math.min(reviewTotalPages, p + 1))} disabled={reviewPage === reviewTotalPages}>›</button>
              </div>
            )}
            <div className="text-center mt-3">
              <Link to="/reviews" style={{ fontSize: 13, color: 'inherit', opacity: 0.6 }}>Lihat semua ulasan →</Link>
            </div>
          </Container>
        </section>
      ) : !socialProofQuery.isLoading ? (
        <section className="gx-keunggulan-section" id="ulasan">
          <Container fluid="xl">
            <div className="gx-section-head gx-section-head-center">
              <div className="gx-label">Belum Ada Ulasan</div>
              <h2>Jadilah penghuni pertama yang memberikan ulasan.</h2>
              <p>Belum ada ulasan dari penghuni terverifikasi. Saat kamu sudah tinggal, kamu bisa memberikan penilaian lewat portal penghuni — membantu calon penghuni lain lebih percaya.</p>
            </div>
            <div className="gx-keunggulan-grid">
              <div className="gx-keunggulan-card">
                <span className="gx-keunggulan-icon" aria-hidden="true">📍</span>
                <h3>Lokasi Pakuwon / PTC</h3>
                <p>7 menit jalan kaki dari Pakuwon Mall dan PTC. Akses mudah ke tol, minimarket, dan pusat kuliner.</p>
              </div>
              <div className="gx-keunggulan-card">
                <span className="gx-keunggulan-icon" aria-hidden="true">🔒</span>
                <h3>Keamanan terjaga</h3>
                <p>Lingkungan aman dengan akses terkontrol, parkir luas, dan pengelolaan yang responsif.</p>
              </div>
              <div className="gx-keunggulan-card">
                <span className="gx-keunggulan-icon" aria-hidden="true">💰</span>
                <h3>Harga transparan</h3>
                <p>Tarif tertera jelas di katalog. Tidak ada biaya tersembunyi — deposit dan DP dijelaskan sejak awal.</p>
              </div>
              <div className="gx-keunggulan-card">
                <span className="gx-keunggulan-icon" aria-hidden="true">📶</span>
                <h3>WiFi tersedia</h3>
                <p>Layanan WiFi tambahan tersedia Rp 50.000/perangkat. Cocok untuk WFH atau streaming harian.</p>
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      {visibleGalleryItems.length > 0 ? (
        <section className="gx-gallery-section">
          <Container fluid="xl">
            <div className="gx-gallery-compact">
              <div className="gx-section-head">
                <div className="gx-label">Informasi lengkap</div>
                <h2>Butuh brosur untuk dibagikan?</h2>
                <p>Lihat brosur KOST48 dalam ukuran penuh untuk dibagikan ke keluarga atau teman.</p>
              </div>
              <div className="gx-gallery-grid">
                {visibleGalleryItems.map((item) => (
                  <button
                    key={item.id}
                    className="gx-gallery-item"
                    onClick={() => setLightboxSrc(item.src)}
                    aria-label={`Buka ${item.label} ukuran penuh`}
                  >
                    <img
                      src={item.src}
                      alt={item.label}
                      className="gx-gallery-img"
                      loading="lazy"
                      onError={() => setGalleryBroken((prev) => ({ ...prev, [item.id]: true }))}
                    />
                    <div className="gx-gallery-overlay"><span>Lihat</span></div>
                    <div className="gx-gallery-label">{item.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      <section className="gx-faq-section" id="faq">
        <Container fluid="xl">
          <div className="gx-section-head">
            <div className="gx-label">FAQ</div>
            <h2>Yang sering ditanyakan calon penghuni.</h2>
          </div>

          <Accordion className="gx-accordion" flush alwaysOpen>
            {faqItems.map((item, i) => (
              <Accordion.Item key={item.question} eventKey={String(i)} className="gx-acc-item">
                <Accordion.Header className="gx-acc-header">
                  <span className="gx-acc-cat">{item.category}</span>
                  {item.question}
                </Accordion.Header>
                <Accordion.Body className="gx-acc-body">{item.answer}</Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>

          <div className="gx-faq-more">
            <button type="button" className="gx-btn-outline" onClick={() => setShowAllFaq((value) => !value)}>
              {showAllFaq ? 'Tampilkan FAQ Utama' : 'Lihat Semua FAQ'}
            </button>
          </div>
        </Container>
      </section>

      <section className="gx-contact-section" id="hubungi-kami">
        <Container fluid="xl">
          <div className="gx-final-cta gx-reveal">
            <div>
              <div className="gx-label">Hubungi kami</div>
              <h2>Siap cek kamar di KOST48?</h2>
              <p>Lihat kamar tersedia atau tanya admin untuk menyesuaikan kebutuhan tinggalmu.</p>
              <address className="gx-address">
                <strong>KOST48 Surabaya Barat</strong>
                <span>Jalan Hikmah V No. 48</span>
                <span>Kec. Sambikerep, Kel. Lontar</span>
                <span>Surabaya Barat - Kode Pos 60216</span>
              </address>
            </div>
            <div className="gx-final-actions">
              <Link to="/rooms" className="gx-btn-primary"><span aria-hidden="true">🔍</span> Lihat Pilihan Kamar</Link>
              <a className="gx-btn-outline" href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer"><span aria-hidden="true">💬</span> Chat WhatsApp</a>
            </div>
          </div>
        </Container>
      </section>

      <Link to="/rooms" className="gx-mobile-booking" aria-label="Cek kamar tersedia">
        <strong>{isStatsLoading ? 'Cek kamar' : `${stats.bookable} kamar tersedia`}</strong>
        <span><span aria-hidden="true">🔍</span> Cek</span>
      </Link>

      {scrolled && (
        <button
          type="button"
          className="gx-scroll-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Kembali ke atas"
        >
          ↑
        </button>
      )}

      </main>
      <GuestFooter />
    </div>
  );
}
