import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Accordion, Container, Modal, Spinner } from 'react-bootstrap';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { listPublicRooms } from '../../api/bookings';
import { fetchPublicSocialProof } from '../../api/marketing';
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

const NAV_LINKS = [
  { href: '#pilihan-kamar', icon: '🛏️', label: 'Kamar' },
  { href: '#fasilitas', icon: '✨', label: 'Fasilitas' },
  { href: '#lokasi', icon: '📍', label: 'Lokasi' },
  { href: '#ulasan', icon: '⭐', label: 'Ulasan' },
  { href: '#faq', icon: '❓', label: 'FAQ' },
];

const GALLERY_ITEMS = [
  { id: 'spanduk', src: '/room-images/spanduk-kost48-surabaya.webp', label: 'Spanduk KOST48' },
  { id: 'brosur-depan', src: '/room-images/brosur-depan.webp', label: 'Brosur - Halaman Depan' },
  { id: 'brosur-belakang', src: '/room-images/brosur-belakang.webp', label: 'Brosur - Halaman Belakang' },
];

const FACILITY_GROUPS = [
  {
    id: 'umum',
    title: 'Umum',
    items: [
      { mark: '🅿️', label: 'Parkir luas', desc: 'Ruang parkir untuk mobil dan motor.' },
      { mark: '🍳', label: 'Dapur bersama', desc: 'Area masak bersama untuk kebutuhan harian.' },
      { mark: '💧', label: 'Air PDAM + tandon', desc: 'Pasokan air dibantu tandon cadangan.' },
      { mark: '🌅', label: 'Balkon santai', desc: 'Area terbuka untuk istirahat sejenak.' },
      { mark: '🧺', label: 'Area jemur', desc: 'Beberapa titik jemur di area kos.' },
      { mark: '🌳', label: 'Taman & area hijau', desc: 'Lingkungan lebih teduh dan nyaman.' },
    ],
  },
  {
    id: 'kamar',
    title: 'Kamar',
    items: [
      { mark: '🛏️', label: 'Kasur', desc: 'Tipe kasur menyesuaikan kamar yang dipilih.' },
      { mark: '🚪', label: 'Lemari baju', desc: 'Penyimpanan dasar tersedia di kamar.' },
      { mark: '❄️', label: 'AC / kipas', desc: 'Pilihan pendingin sesuai tipe kamar.' },
      { mark: '🚿', label: 'Kamar mandi', desc: 'Pilihan kamar mandi dalam atau luar.' },
    ],
  },
  {
    id: 'tambahan',
    title: 'Tambahan',
    items: [
      { mark: '📶', label: 'WiFi', desc: 'Rp 50.000 per perangkat.' },
      { mark: '🚰', label: 'Galon air', desc: 'Rp 15.000 per galon.' },
      { mark: '📺', label: 'TV tambahan', desc: 'Rp 50.000 per bulan.' },
      { mark: '🔧', label: 'Perbaikan dasar', desc: 'Laporan fasilitas dibantu pengelola.' },
    ],
  },
];

const TRUST_ITEMS = [
  {
    mark: '01',
    title: 'Status kamar transparan',
    desc: 'Calon penghuni bisa melihat kamar yang tersedia, terisi, atau sedang dicek tanpa menebak dari chat.',
  },
  {
    mark: '02',
    title: 'Booking tidak hilang di chat',
    desc: 'Pengajuan booking dan pembayaran punya alur yang lebih rapi sehingga tindak lanjut lebih mudah dilacak.',
  },
  {
    mark: '03',
    title: 'Fasilitas terlihat sejak awal',
    desc: 'Foto, fasilitas, tarif, dan status kamar bisa dibandingkan sebelum menghubungi admin.',
  },
  {
    mark: '04',
    title: 'Penghuni punya portal',
    desc: 'Masa sewa, tagihan, bukti bayar, dan laporan masalah bisa dicek lebih jelas setelah tinggal.',
  },
  {
    mark: '05',
    title: 'Listrik transparan, bukan token',
    desc: 'Listrik pascabayar: pakai dulu, bayar sesuai meter. Ada 30 kWh gratis tiap bulan, dan saat keluar tidak ada sisa saldo yang hangus — tagihan meter terakhir dipotong dari deposit.',
  },
];

const HOME_FAQ_ITEMS = [
  {
    category: 'Aturan',
    question: 'Apakah KOST48 menerima pria dan wanita?',
    answer: 'Ya, KOST48 menerima penghuni pria dan wanita sesuai ketersediaan kamar dan aturan hunian.',
  },
  {
    category: 'Tarif',
    question: 'Berapa kisaran tarif kamar?',
    answer: 'Tarif mengikuti tipe kamar dan fasilitas. Kisaran katalog saat ini sekitar Rp 1,2 jt - Rp 1,6 jt per bulan.',
  },
  {
    category: 'Fasilitas',
    question: 'Apakah tersedia WiFi?',
    answer: 'Ya, tersedia layanan WiFi tambahan Rp 50.000 per perangkat.',
  },
  {
    category: 'Kamar',
    question: 'Apakah ada kamar kosong sekarang?',
    answer: 'Ketersediaan bisa dicek melalui katalog kamar dan dapat berubah sesuai booking atau verifikasi admin.',
  },
  {
    category: 'Aturan',
    question: 'Bagaimana aturan listrik & air?',
    answer: 'Listrik PASCABAYAR — bukan token/prabayar. Pakai dulu, bayar kemudian sesuai pemakaian meter. Tersedia 30 kWh gratis tiap bulan; kelebihannya ditagih transparan lewat invoice meter terpisah (bisa dibayar sekaligus dengan sewa). Saat keluar, tidak ada sisa saldo listrik yang hangus: tagihan meter terakhir cukup dipotong dari deposit jaminan, sisanya dikembalikan.',
  },
  {
    category: 'Lokasi',
    question: 'Di mana lokasi KOST48?',
    answer: 'KOST48 berada di Jalan Hikmah V No. 48, Surabaya Barat, sekitar Pakuwon Mall / PTC.',
  },
];

const EXTRA_FAQ_ITEMS = [
  {
    category: 'Aturan',
    question: 'Satu kamar untuk berapa orang?',
    answer: 'Standar satu kamar untuk 1-2 orang. Penghuni tambahan perlu konfirmasi terlebih dahulu kepada pengelola.',
  },
  {
    category: 'Layanan',
    question: 'Apakah ada layanan galon atau TV tambahan?',
    answer: 'Ada. Galon air Rp 15.000 per galon dan TV tambahan Rp 50.000 per bulan, mengikuti ketersediaan.',
  },
  {
    category: 'Aturan',
    question: 'Apakah tamu boleh berkunjung?',
    answer: 'Tamu wajib mengikuti aturan pengelola dan norma lingkungan. Kondisi khusus perlu dikonfirmasi ke admin.',
  },
  {
    category: 'Booking',
    question: 'Bagaimana cara booking kamar?',
    answer: 'Pilih kamar dari katalog, ajukan booking, lalu admin akan mengecek data dan ketersediaan sebelum pembayaran diproses.',
  },
];

const MAPS_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5304.776378640393!2d112.67025188642698!3d-7.28650073405867!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd7fc338c5ea093%3A0x68545aa7b3330f0a!2sKost%2048%20Dekat%20PTC%20%2F%20Supermall%20-%20Kost%20Surabaya%20Barat!5e0!3m2!1sid!2sid!4v1625312629036!5m2!1sid!2sid';

const CATALOG_BATCH_SIZE = 8;

function getTodayDateInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatCompactRupiah(value: number) {
  if (!value) return 'Tanya admin';
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  }
  return `Rp ${Math.round(value / 1_000).toLocaleString('id-ID')} rb`;
}

function formatMonthlyRange(minimum: number, maximum: number) {
  if (!minimum || !maximum) return 'Tanya admin';
  if (minimum === maximum) return formatCompactRupiah(minimum);
  return `${formatCompactRupiah(minimum)} - ${formatCompactRupiah(maximum)}`;
}

function buildWhatsAppUrl(message: string) {
  return `${officialKost48Location.whatsappUrl}?text=${encodeURIComponent(message)}`;
}

function buildRoomWhatsAppUrl(room: PublicRoom) {
  const roomName = room.code || room.name || `Kamar ${room.id}`;
  return buildWhatsAppUrl(`Halo Admin KOST48, saya tertarik dengan ${roomName}. Boleh tanya ketersediaan dan estimasi siap huni?`);
}

function getRoomCover(room: PublicRoom) {
  const apiImage = (room.images ?? [])
    .map((url) => resolveKost48MarketingImageUrl(url))
    .find(Boolean);
  return apiImage || getKost48RoomCover(room.code, room.name) || '/room-images/kamar-a-1.webp';
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <Modal show onHide={onClose} size="xl" centered dialogClassName="gx-lightbox-dialog" contentClassName="gx-lightbox-content">
      <Modal.Body className="gx-lightbox-body p-0">
        <button className="gx-lightbox-close" onClick={onClose} aria-label="Tutup">x</button>
        <img src={src} alt="Brosur KOST48" className="gx-lightbox-img" />
      </Modal.Body>
    </Modal>
  );
}

function GuestTopbar({ scrolled }: { scrolled: boolean }) {
  const [iconBroken, setIconBroken] = useState(false);

  return (
    <header className={`gx-topbar${scrolled ? ' gx-topbar-solid' : ''}`}>
      <Link to="/" className="gx-brand" aria-label="KOST48 Beranda">
        {!iconBroken ? (
          <img src="/room-images/logo-kost48-sby.webp" alt="" aria-hidden="true" className="gx-logo-icon" onError={() => setIconBroken(true)} />
        ) : (
          <Kost48LogoMark size="small" />
        )}
        <span className="gx-brand-name">KOST<span className="gx-brand-accent">48</span> Surabaya</span>
      </Link>
      <nav className="gx-nav" aria-label="Navigasi">
        {NAV_LINKS.map((l) => (
          <a key={l.href} href={l.href} className="gx-nav-link">
            <span aria-hidden="true" className="gx-nav-ico">{l.icon}</span> {l.label}
          </a>
        ))}
        <Link to="/login" className="gx-nav-link gx-nav-login" style={{ marginLeft: 'auto', fontWeight: 600 }}>
          <span aria-hidden="true" className="gx-nav-ico">🔑</span> Masuk Portal
        </Link>
      </nav>
      <div className="gx-nav-cta">
        <a className="gx-btn-ghost" href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer"><span aria-hidden="true">💬</span> WhatsApp</a>
        <a className="gx-btn-solid" href="#pilihan-kamar"><span aria-hidden="true">🔍</span> Cek Kamar</a>
      </div>
    </header>
  );
}

// PUB-ICON: ikon status kamar per tone (badge ketersediaan publik).
function roomStatusIcon(tone: string): string {
  if (tone === 'is-occupied') return '🔴';
  if (tone === 'is-maintenance') return '🧹';
  if (tone === 'is-limited') return '🟡';
  return '🟢';
}

// PUB-ROOM-CATEGORY: label + ikon kategori kamar untuk badge katalog.
function categoryBadge(cat?: string | null): { label: string; icon: string } | null {
  const c = String(cat ?? '').toUpperCase();
  if (c === 'DELUXE') return { label: 'Deluxe', icon: '💎' };
  if (c === 'ECONOMY') return { label: 'Ekonomi', icon: '🏷️' };
  if (c === 'STANDARD') return { label: 'Standar', icon: '🛋️' };
  return null;
}

// PUB-FACILITY-SHOW: ikon fasilitas ringkas di kartu kamar (cocokkan kata kunci).
function amenityIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('ac')) return '❄️';
  if (l.includes('kipas')) return '🌀';
  if (l.includes('km') || l.includes('mandi')) return '🚿';
  if (l.includes('wifi') || l.includes('wi-fi')) return '📶';
  if (l.includes('kasur') || l.includes('bed')) return '🛏️';
  if (l.includes('lemari')) return '🚪';
  if (l.includes('meja')) return '🪑';
  return '✓';
}

function RoomPreviewCard({ room }: { room: PublicRoom }) {
  const availability = getPublicRoomAvailabilityDisplay(room);
  const amenities = [
    getPublicRoomCoolingLabel(room),
    `KM ${getPublicRoomBathroomLabel(room)}`,
    ...getPublicRoomVisibleAmenities(room, 3),
  ].slice(0, 4);
  const rate = getBestPublicRoomRate(room, 'MONTHLY');

  return (
    <article className="gx-room-card">
      <div className="gx-room-image-wrap">
        <img src={getRoomCover(room)} alt={`Foto ${room.name || room.code || 'kamar KOST48'}`} className="gx-room-image" loading="lazy" />
        <span className={`gx-room-status ${availability.tone}`}><span aria-hidden="true">{roomStatusIcon(availability.tone)}</span> {availability.label}</span>
        {(() => {
          const cat = categoryBadge(room.category);
          const mezz = String(room.roomType ?? '').toUpperCase() === 'MEZZANINE';
          if (!cat && !mezz) return null;
          return (
            <span className="gx-room-category-badge">
              {cat ? <><span aria-hidden="true">{cat.icon}</span> {cat.label}</> : null}
              {mezz ? <span className="gx-room-mezz">Mezzanine</span> : null}
            </span>
          );
        })()}
      </div>
      <div className="gx-room-body">
        <div>
          <h3>{room.name || room.code || `Kamar ${room.id}`}</h3>
          <p>{availability.canBook ? 'Status kosong atau siap diajukan mengikuti tombol booking.' : 'Belum bisa dibooking langsung, tetapi tetap bisa ditanyakan.'}</p>
        </div>
        <strong className="gx-room-price">Mulai {formatCompactRupiah(rate)} / bulan</strong>
        <div className="gx-room-amenities" aria-label="Fasilitas ringkas">
          {amenities.map((item) => (
            <span key={item}><span aria-hidden="true">{amenityIcon(item)}</span> {item}</span>
          ))}
        </div>
        <div className="gx-room-actions">
          <Link className="gx-room-action-secondary" to={`/rooms/${room.id}/detail`} state={{ room }}>Lihat Detail</Link>
          {availability.canBook ? (
            <Link className="gx-room-action-primary" to={`/booking/${room.id}`} state={{ room }}><span aria-hidden="true">📝</span> Ajukan Booking</Link>
          ) : (
            // PUB-BTN-COLOR: kamar belum bisa dibooking → "Tanya" pakai gaya outline (bukan tombol utama).
            <a className="gx-room-action-secondary" href={buildRoomWhatsAppUrl(room)} target="_blank" rel="noreferrer"><span aria-hidden="true">💬</span> Tanya Ketersediaan</a>
          )}
        </div>
      </div>
    </article>
  );
}

function RoomPreviewSkeleton() {
  return (
    <article className="gx-room-card gx-room-card-loading" aria-label="Memuat kamar">
      <div className="gx-room-image-wrap" />
      <div className="gx-room-body">
        <span />
        <span />
        <span />
      </div>
    </article>
  );
}

function GuestFooter() {
  return (
    <footer className="gx-footer">
      <Container fluid="xl">
        <div className="gx-footer-inner">
          <div className="gx-footer-brand">
            <img src="/room-images/logo-kost48-sby.webp" alt="Logo KOST48" className="gx-footer-logo-img" />
            <div>
              <span className="gx-footer-brand-name">KOST<span className="gx-brand-accent">48</span> Surabaya</span>
              <small>Jl. Hikmah V No. 48 - Surabaya Barat 60216</small>
            </div>
          </div>
          <nav className="gx-footer-nav" aria-label="Navigasi footer">
            {NAV_LINKS.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
            <a href="#pilihan-kamar">Katalog Kamar</a>
            <Link to="/login">Masuk Portal</Link>
          </nav>
          <div className="gx-footer-links">
            <a href={officialKost48Location.mapsUrl} target="_blank" rel="noreferrer">Google Maps</a>
            <a href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
        </div>
        <p className="gx-footer-copy">
          KOST48 Surabaya Barat - Kos nyaman dekat Pakuwon Mall / PTC.
        </p>
      </Container>
    </footer>
  );
}

export default function PublicGuestDashboardPage() {
  const { user } = useAuth();
  const { stage } = useTenantPortalStage();
  const location = useLocation();
  const initialCatalogParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [scrolled, setScrolled] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [activeFacilityTab, setActiveFacilityTab] = useState(FACILITY_GROUPS[0].id);
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
  const visibleGalleryItems = GALLERY_ITEMS.filter((item) => !galleryBroken[item.id]);
  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    if (location.pathname !== '/rooms') return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById('pilihan-kamar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    document.getElementById('pilihan-kamar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    setVisibleRoomCount(CATALOG_BATCH_SIZE);
  }, [catalogAvailability, catalogPreference, catalogSort]);

  if (user) return <Navigate to={getDefaultRoute(user.role, stage)} replace />;

  return (
    <div className="gx-page">
      <GuestTopbar scrolled={scrolled} />
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={closeLightbox} />}

      <section className="gx-hero" id="top">
        <div className="gx-hero-bg" style={{ backgroundImage: `url(${getKost48FrontPhotoUrl()})` }} aria-hidden="true" />
        <div className="gx-hero-overlay" aria-hidden="true" />
        <div className="gx-hero-body">
          <p className="gx-hero-eyebrow">Jalan Hikmah V No. 48 - Surabaya Barat</p>
          <h1 className="gx-hero-title">KOST48 Surabaya</h1>
          <p className="gx-hero-headline">Hunian fleksibel dekat Pakuwon Mall / PTC</p>
          <p className="gx-hero-sub">
            Kamar nyaman dengan pilihan AC atau kipas, fasilitas harian lengkap, dan proses booking yang lebih jelas dari awal.
          </p>
          <div className="gx-hero-cta">
            <a className="gx-hero-btn-primary" href="#pilihan-kamar"><span aria-hidden="true">🔍</span> Cek Kamar Tersedia</a>
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

      <section className="gx-market-section" id="pilihan-kamar">
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
              {activeFacility.items.map((item) => (
                <div key={item.label} className="gx-facility-row">
                  <span className="gx-facility-icon" aria-hidden="true">{item.mark}</span>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.desc}</small>
                  </div>
                </div>
              ))}
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

      <section className="gx-social-proof-section" id="ulasan">
        <Container fluid="xl">
          <div className="gx-social-proof-head">
            <div className="gx-section-head">
              <div className="gx-label">Cerita penghuni</div>
              <h2>Ulasan ditampilkan hanya jika sudah terverifikasi.</h2>
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
                <strong>{socialProofQuery.isLoading ? '...' : occupantCount}</strong>
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

          {socialProofQuery.isLoading ? (
            <div className="gx-social-proof-state"><Spinner animation="border" size="sm" /> Memuat ulasan penghuni</div>
          ) : socialProofQuery.isError ? (
            <div className="gx-social-proof-state">Ulasan belum dapat dimuat saat ini.</div>
          ) : displayedReviews.length ? (
            <>
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
            </>
          ) : (
            <div className="gx-social-proof-state gx-social-proof-empty">
              <strong>Ulasan publik belum tersedia</strong>
              <span>Kami hanya menampilkan ulasan yang sudah terverifikasi dan memenuhi kriteria.</span>
            </div>
          )}
        </Container>
      </section>

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
              <a className="gx-btn-primary" href="#pilihan-kamar"><span aria-hidden="true">🔍</span> Lihat Pilihan Kamar</a>
              <a className="gx-btn-outline" href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer"><span aria-hidden="true">💬</span> Chat WhatsApp</a>
              <a className="gx-btn-outline" href={officialKost48Location.mapsUrl} target="_blank" rel="noreferrer"><span aria-hidden="true">📍</span> Buka Google Maps</a>
            </div>
          </div>
        </Container>
      </section>

      <a className="gx-mobile-booking" href="#pilihan-kamar" aria-label="Cek kamar tersedia">
        <strong>{roomsQuery.isLoading ? 'Cek kamar' : `${stats.bookable} kamar tersedia`}</strong>
        <span><span aria-hidden="true">🔍</span> Cek</span>
      </a>

      <GuestFooter />
    </div>
  );
}
