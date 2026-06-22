import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Accordion, Container, Modal, Spinner } from 'react-bootstrap';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { listPublicRooms } from '../../api/bookings';
import { fetchPublicSocialProof } from '../../api/marketing';
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
import {
  NAV_LINKS, GALLERY_ITEMS, FACILITY_GROUPS, TRUST_ITEMS, HOME_FAQ_ITEMS, EXTRA_FAQ_ITEMS, MAPS_EMBED_URL, CATALOG_BATCH_SIZE,
  resolvePublicMarketingAssetUrl, getTodayDateInput, formatCompactRupiah, formatMonthlyRange, buildWhatsAppUrl, buildRoomWhatsAppUrl, getRoomCover,
  Lightbox, GuestTopbar, RoomPreviewCard, RoomPreviewSkeleton, GuestFooter, MobileShortcutNav,
} from './publicGuestShared';
export default function PublicGuestDashboardPage() {
  const { user } = useAuth();
  const { stage } = useTenantPortalStage();
  const location = useLocation();
  const initialCatalogParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [scrolled, setScrolled] = useState(false);
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
  // PUB-REVIEWS-FILTER: urutkan ulasan (Terbaru / Rating Tertinggi), tampil maks 10.
  const [reviewSort, setReviewSort] = useState<'recent' | 'rating'>('recent');
  const [visibleRoomCount, setVisibleRoomCount] = useState(CATALOG_BATCH_SIZE);
  const [galleryBroken, setGalleryBroken] = useState<Record<string, boolean>>({});
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
    if (location.pathname !== '/rooms') return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById('kamar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  const roomsQuery = useQuery({
    queryKey: ['guest-dashboard-public-rooms'],
    queryFn: () => listPublicRooms({ limit: 100, pricingTerm: 'MONTHLY' }),
    staleTime: 60_000,
  });

  const socialProofQuery = useQuery({
    queryKey: ['public-social-proof'],
    queryFn: fetchPublicSocialProof,
    staleTime: 5 * 60_000,
  });

  const rooms = roomsQuery.data?.items ?? [];
  const stats = useMemo(() => ({
    bookable: rooms.filter((r) => isPublicRoomBookable(r) && String(r.status ?? '').toUpperCase() !== 'MAINTENANCE').length,
    occupied: rooms.filter((r) => String(r.status ?? '').toUpperCase() === 'OCCUPIED').length,
    total: rooms.length,
  }), [rooms]);

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

  const faqItems = showAllFaq ? [...HOME_FAQ_ITEMS, ...EXTRA_FAQ_ITEMS] : HOME_FAQ_ITEMS;
  const activeFacility = FACILITY_GROUPS.find((group) => group.id === activeFacilityTab) ?? FACILITY_GROUPS[0];
  const ratingAvailable = Boolean((socialProofQuery.data?.reviewCount ?? 0) > 0 && (socialProofQuery.data?.averageRating ?? 0) > 0);
  const occupantCount = socialProofQuery.data?.occupantCount ?? stats.occupied;
  // PUB-REVIEWS-FILTER: urutkan + batasi 10 ulasan (client-side).
  const displayedReviews = useMemo(() => {
    const list = [...(socialProofQuery.data?.reviews ?? [])];
    list.sort((a, b) =>
      reviewSort === 'rating'
        ? b.rating - a.rating
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return list.slice(0, 10);
  }, [socialProofQuery.data?.reviews, reviewSort]);
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
          <p className="gx-hero-sub">
            Kamar nyaman dengan pilihan AC atau kipas, fasilitas harian lengkap, dan proses booking yang lebih jelas dari awal.
          </p>
          {monthlyRates.length > 0 && (
            <div className="gx-hero-price-badge">
              <span aria-hidden="true">🏷️</span>
              <strong>Mulai {formatCompactRupiah(Math.min(...monthlyRates))}/bln</strong>
              <span className="gx-hero-price-badge-sub">{stats.bookable} kamar tersedia</span>
            </div>
          )}
          <div className="gx-hero-cta">
            <a className="gx-hero-btn-primary" href="#kamar"><span aria-hidden="true">🛏️</span> Lihat Kamar Tersedia →</a>
            <a className="gx-hero-btn-ghost" href={buildWhatsAppUrl('Halo Admin KOST48, saya ingin tanya ketersediaan kamar.')} target="_blank" rel="noreferrer"><span aria-hidden="true">💬</span> WhatsApp Admin</a>
            <a className="gx-hero-btn-ghost" href={officialKost48Location.mapsUrl} target="_blank" rel="noreferrer"><span aria-hidden="true">📍</span> Lihat di Maps</a>
          </div>
          <p className="gx-hero-tagline">"Rumah kos sih, tapi terasa seperti rumah sendiri."</p>
        </div>
        <div className="gx-hero-next" aria-hidden="true">Kamar tersedia, fasilitas, dan lokasi ada di bawah.</div>
      </section>

      <section className="gx-avail-section" id="cek-kamar">
        <Container fluid="xl">
          <div className={`gx-booking-widget${scrolled ? ' gx-booking-widget-compact' : ''}`}>
            <div className="gx-booking-copy">
              <div className="gx-label">Cek ketersediaan kamar</div>
              <h2>Mulai dari preferensi tinggalmu.</h2>
              <p>
                Pilih kebutuhan awal, lalu cek kamar yang bisa diajukan booking. Status kamar diambil dari sistem KOST48.
              </p>
            </div>
            <div className="gx-booking-form" aria-label="Form cek ketersediaan kamar">
              <label>
                <span>Mulai tinggal</span>
                <input
                  type="date"
                  min={todayDate}
                  value={checkInDate}
                  onChange={(event) => handleCheckInDateChange(event.target.value)}
                />
              </label>
              <label>
                <span>Durasi tinggal</span>
                <select value={duration} onChange={(event) => setDuration(event.target.value)}>
                  <option value="monthly">Bulanan</option>
                  <option value="weekly">Mingguan</option>
                  <option value="daily">Harian</option>
                </select>
              </label>
              <label>
                <span>Preferensi kamar</span>
                <select value={preference} onChange={(event) => setPreference(event.target.value)}>
                  <option value="all">Semua tipe</option>
                  <option value="ac">AC</option>
                  <option value="fan">Kipas</option>
                  <option value="inside">KM dalam</option>
                </select>
              </label>
              <button type="button" className="gx-booking-submit" onClick={handleCheckAvailability}>
                Cek Kamar Tersedia
              </button>
            </div>
            <div className="gx-booking-status" aria-live="polite">
              {roomsQuery.isLoading ? (
                <><Spinner animation="border" size="sm" /> Memuat status kamar</>
              ) : (
                <>
                  <strong>{stats.bookable} kamar tersedia hari ini</strong>
                  <span>{stats.total} pilihan kamar</span>
                  <span>Data dari sistem KOST48</span>
                </>
              )}
            </div>
          </div>
        </Container>
      </section>

      <section className="gx-market-section" id="kamar">
        <Container fluid="xl">
          <div className="gx-market-head">
            <div className="gx-section-head">
              <div className="gx-label">Katalog kamar</div>
              <h2>Beranda dan cek kamar dalam satu halaman.</h2>
              <p>Filter kamar berdasarkan ketersediaan, tipe pendingin, kamar mandi, dan tarif tanpa meninggalkan beranda.</p>
            </div>
          </div>

          <div className="gx-home-proof-grid">
            <div className="gx-home-proof">
              <span>Kamar tersedia</span>
              <strong>{roomsQuery.isLoading ? <Spinner animation="border" size="sm" /> : stats.bookable}</strong>
            </div>
            <div className="gx-home-proof">
              <span>Pilihan kamar</span>
              <strong>{roomsQuery.isLoading ? <Spinner animation="border" size="sm" /> : stats.total}</strong>
            </div>
            <div className="gx-home-proof">
              <span>Dari Pakuwon Mall / PTC</span>
              <strong>7 menit</strong>
            </div>
          </div>

          <div className="gx-catalog-toolbar" aria-label="Filter katalog kamar">
            <div className="gx-catalog-filter">
              <span>Ketersediaan</span>
              <button type="button" className={catalogAvailability === 'all' ? 'active' : ''} onClick={() => setCatalogAvailability('all')}>Semua</button>
              <button type="button" className={catalogAvailability === 'bookable' ? 'active' : ''} onClick={() => setCatalogAvailability('bookable')}>Kosong</button>
              <button type="button" className={catalogAvailability === 'checking' ? 'active' : ''} onClick={() => setCatalogAvailability('checking')}>Dibersihkan / Maintenance</button>
              <button type="button" className={catalogAvailability === 'occupied' ? 'active' : ''} onClick={() => setCatalogAvailability('occupied')}>Penuh / Terisi</button>
            </div>
            <div className="gx-catalog-filter">
              <span>Preferensi</span>
              <button type="button" className={catalogPreference === 'all' ? 'active' : ''} onClick={() => setCatalogPreference('all')}>Semua tipe</button>
              <button type="button" className={catalogPreference === 'ac' ? 'active' : ''} onClick={() => setCatalogPreference('ac')}>AC</button>
              <button type="button" className={catalogPreference === 'fan' ? 'active' : ''} onClick={() => setCatalogPreference('fan')}>Kipas</button>
              <button type="button" className={catalogPreference === 'inside' ? 'active' : ''} onClick={() => setCatalogPreference('inside')}>KM dalam</button>
            </div>
            <div className="gx-catalog-filter">
              <span>Kategori</span>
              <button type="button" className={catalogCategory === 'all' ? 'active' : ''} onClick={() => setCatalogCategory('all')}>Semua</button>
              <button type="button" className={catalogCategory === 'ECONOMY' ? 'active' : ''} onClick={() => setCatalogCategory('ECONOMY')}>Ekonomi</button>
              <button type="button" className={catalogCategory === 'STANDARD' ? 'active' : ''} onClick={() => setCatalogCategory('STANDARD')}>Standar</button>
              <button type="button" className={catalogCategory === 'DELUXE' ? 'active' : ''} onClick={() => setCatalogCategory('DELUXE')}>Deluxe</button>
            </div>
            <label className="gx-catalog-sort">
              <span>Urutkan</span>
              <select value={catalogSort} onChange={(event) => setCatalogSort(event.target.value)}>
                <option value="price-asc">Tarif terendah</option>
                <option value="price-desc">Tarif tertinggi</option>
              </select>
            </label>
          </div>

          <div className="gx-catalog-results" aria-live="polite">
            {roomsQuery.isLoading ? 'Memuat kamar dari sistem KOST48.' : `${catalogRooms.length} kamar sesuai filter.`}
          </div>

          {roomsQuery.isLoading ? (
            <div className="gx-room-grid">
              {[0, 1, 2, 3].map((item) => <RoomPreviewSkeleton key={item} />)}
            </div>
          ) : roomsQuery.isError ? (
            <div className="gx-home-empty">Katalog kamar belum dapat dimuat. Silakan coba lagi atau hubungi admin via WhatsApp.</div>
          ) : visibleCatalogRooms.length ? (
            <div className="gx-room-grid">
              {visibleCatalogRooms.map((room) => <RoomPreviewCard key={room.id} room={room} />)}
            </div>
          ) : (
            <div className="gx-home-empty">Belum ada kamar yang cocok dengan filter ini. Coba ubah preferensi atau tanya admin via WhatsApp.</div>
          )}

          {!roomsQuery.isLoading && visibleCatalogRooms.length < catalogRooms.length && (
            <div className="gx-room-more">
              <button type="button" className="gx-btn-outline" onClick={() => setVisibleRoomCount((count) => count + CATALOG_BATCH_SIZE)}>
                Tampilkan Lebih Banyak Kamar
              </button>
            </div>
          )}

          <div className="gx-room-range">
            <span>Tarif bulanan saat ini</span>
            <strong>{formatMonthlyRange(
              monthlyRates.length ? Math.min(...monthlyRates) : 0,
              monthlyRates.length ? Math.max(...monthlyRates) : 0,
            )}</strong>
          </div>
        </Container>
      </section>

      <section className="gx-trust-section">
        <Container fluid="xl">
          <div className="gx-section-head gx-section-head-center">
            <div className="gx-label">Proses jelas</div>
            <h2>Kenapa booking di KOST48 lebih jelas?</h2>
            <p>Yang biasanya tercecer di chat dibuat lebih terlihat: status kamar, pengajuan booking, pembayaran, dan portal penghuni.</p>
          </div>
          <div className="gx-trust-grid">
            {TRUST_ITEMS.map((item) => (
              <article className="gx-trust-card" key={item.title}>
                <span className="gx-trust-mark">{item.mark}</span>
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
            <div className="gx-location-copy">
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
            <div className="gx-contact-map">
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
                <h2>Ulasan dari penghuni terverifikasi.</h2>
                <p>Pengalaman penghuni ditampilkan secara anonim dan hanya dari ulasan yang memenuhi kriteria.</p>
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
              <button type="button" role="tab" aria-selected={reviewSort === 'recent'} className={reviewSort === 'recent' ? 'active' : ''} onClick={() => setReviewSort('recent')}>Terbaru</button>
              <button type="button" role="tab" aria-selected={reviewSort === 'rating'} className={reviewSort === 'rating' ? 'active' : ''} onClick={() => setReviewSort('rating')}>Rating Tertinggi</button>
            </div>
            <div className="gx-review-grid">
              {displayedReviews.map((review, index) => (
                <article className="gx-review-card" key={`${review.initials}-${review.createdAt}-${index}`}>
                  <div className="gx-review-card-head">
                    <span className="gx-review-avatar">{review.initials}</span>
                    <div>
                      <strong>Penghuni {review.initials}</strong>
                      <span>{review.rating.toFixed(1)} / 5</span>
                    </div>
                  </div>
                  <p>{review.comment || 'Memberikan penilaian positif untuk layanan KOST48.'}</p>
                </article>
              ))}
            </div>
          </Container>
        </section>
      ) : !socialProofQuery.isLoading ? (
        <section className="gx-keunggulan-section" id="ulasan">
          <Container fluid="xl">
            <div className="gx-section-head gx-section-head-center">
              <div className="gx-label">Keunggulan KOST48</div>
              <h2>Kenapa memilih KOST48?</h2>
              <p>Hunian yang transparan, nyaman, dan dekat semua kebutuhan harian di Surabaya Barat.</p>
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
          <div className="gx-final-cta">
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
              <a className="gx-btn-primary" href="#kamar"><span aria-hidden="true">🔍</span> Lihat Pilihan Kamar</a>
              <a className="gx-btn-outline" href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer"><span aria-hidden="true">💬</span> Chat WhatsApp</a>
              <a className="gx-btn-outline" href={officialKost48Location.mapsUrl} target="_blank" rel="noreferrer"><span aria-hidden="true">📍</span> Buka Google Maps</a>
            </div>
          </div>
        </Container>
      </section>

      <a className="gx-mobile-booking" href="#kamar" aria-label="Cek kamar tersedia">
        <strong>{roomsQuery.isLoading ? 'Cek kamar' : `${stats.bookable} kamar tersedia`}</strong>
        <span><span aria-hidden="true">🔍</span> Cek</span>
      </a>

      <GuestFooter />
    </div>
  );
}
