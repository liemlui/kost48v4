// Helpers/konstanta + 5 komponen presentational diekstrak dari PublicGuestDashboardPage.tsx (refactor 2026-06-19: AI-read).
// Halaman publik (read-only, tanpa state global). Pola mengikuti reportShared/dashboardShared.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { APP_VERSION } from '../../config/version';
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
import { formatRupiahWithoutSymbol } from '../../utils/formatCurrency';
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

export const NAV_LINKS = [
  { href: '#kamar', icon: '🛏️', label: 'Kamar' },
  { href: '#fasilitas', icon: '✨', label: 'Fasilitas' },
  { href: '#lokasi', icon: '📍', label: 'Lokasi' },
  { href: '#ulasan', icon: '⭐', label: 'Ulasan' },
  { href: '#faq', icon: '❓', label: 'FAQ' },
];

export const PUBLIC_EXTRA_LINKS = [
  { to: '/panduan', icon: '📖', label: 'Panduan' },
  { to: '/reviews', icon: '⭐', label: 'Ulasan Lengkap' },
];

export const GALLERY_ITEMS = [
  { id: 'profile', src: '/room-images/kost48-profile.webp', label: 'Profil KOST48' },
  { id: 'spanduk', src: '/room-images/spanduk-kost48-surabaya.webp', label: 'Spanduk KOST48' },
  { id: 'brosur-depan', src: '/room-images/brosur-depan.webp', label: 'Brosur - Halaman Depan' },
  { id: 'brosur-belakang', src: '/room-images/brosur-belakang.webp', label: 'Brosur - Halaman Belakang' },
];

export const FACILITY_GROUPS = [
  {
    id: 'umum',
    title: 'Umum',
    items: [
      { slug: 'parkir-luas', mark: '🅿️', label: 'Parkir luas', desc: 'Ruang parkir untuk mobil dan motor.' },
      { slug: 'dapur-bersama', mark: '🍳', label: 'Dapur bersama', desc: 'Area masak bersama untuk kebutuhan harian.' },
      { slug: 'air-pdam-tandon', mark: '💧', label: 'Air PDAM + tandon', desc: 'Pasokan air dibantu tandon cadangan.' },
      { slug: 'balkon-santai', mark: '🌅', label: 'Balkon santai', desc: 'Area terbuka untuk istirahat sejenak.' },
      { slug: 'area-jemur', mark: '🧺', label: 'Area jemur', desc: 'Beberapa titik jemur di area kos.' },
      { slug: 'taman', mark: '🌳', label: 'Taman & area hijau', desc: 'Lingkungan lebih teduh dan nyaman.' },
    ],
  },
  {
    id: 'kamar',
    title: 'Kamar',
    items: [
      { slug: 'kasur', mark: '🛏️', label: 'Kasur', desc: 'Tipe kasur menyesuaikan kamar yang dipilih.' },
      { slug: 'lemari-baju', mark: '🚪', label: 'Lemari baju', desc: 'Penyimpanan dasar tersedia di kamar.' },
      { slug: 'ac-kipas', mark: '❄️', label: 'AC / kipas', desc: 'Pilihan pendingin sesuai tipe kamar.' },
      { slug: 'kamar-mandi', mark: '🚿', label: 'Kamar mandi', desc: 'Pilihan kamar mandi dalam atau luar.' },
    ],
  },
  {
    id: 'tambahan',
    title: 'Tambahan',
    items: [
      { slug: 'wifi', mark: '📶', label: 'WiFi', desc: 'Bulanan Rp 50.000 · 2 Mingguan Rp 30.000 · Mingguan Rp 20.000 · Harian Rp 5.000 (per perangkat). Menjaga kualitas koneksi.' },
      { slug: 'galon-air', mark: '🚰', label: 'Galon air (Voila)', desc: 'Rp 20.000/galon. Beli langsung ke pengelola.' },
      { slug: 'deposit-hewan', mark: '🐾', label: 'Deposit hewan peliharaan', desc: 'Rp 100.000 (refundable, bila tidak ada kerusakan).' },
    ],
  },
];

export const TRUST_ITEMS = [
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
    desc: 'Listrik pascabayar: pakai dulu, bayar sesuai meter. Ada jatah listrik gratis tiap bulan, dan saat keluar tidak ada sisa saldo yang hangus — tagihan meter terakhir dipotong dari deposit.',
  },
];

export const HOME_FAQ_ITEMS = [
  {
    category: 'Tarif',
    question: 'Berapa tarif kamarnya?',
    answer: 'Tarif kamar berkisar Rp 850.000 – Rp 1.800.000 per bulan, tergantung ukuran kamar, kamar mandi dalam/luar, pendingin AC/kipas, dan perabotan. Lihat detail di halaman Cek Kamar.',
  },
  {
    category: 'Fasilitas',
    question: 'Fasilitasnya apa saja?',
    answer: 'Fasilitas umum: parkir luas, dapur bersama, air PDAM + tandon 650L, balkon santai, area jemur, taman. Fasilitas kamar: kasur busa tebal, lemari, gantungan baju, AC atau kipas, kamar mandi dalam/luar sesuai tipe.',
  },
  {
    category: 'Lokasi',
    question: 'Di mana lokasi KOST48?',
    answer: 'KOST48 berada di Jalan Hikmah V No. 48, Surabaya Barat. Sekitar 7 menit berjalan kaki dari Pakuwon Mall / PTC.',
  },
  {
    category: 'Aturan',
    question: 'Satu kamar untuk berapa orang?',
    answer: '2 orang gratis, maksimal 4 orang per kamar. Penghuni tambahan (ke-3 dan ke-4) dikenakan biaya sebesar 20% dari tarif kamar per kepala per bulan, dan wajib dikonfirmasi ke pengelola.',
  },
  {
    category: 'Fasilitas',
    question: 'Apakah tersedia WiFi?',
    answer: 'Ya, tersedia WiFi tambahan dengan tarif per perangkat: Bulanan Rp 50.000 · 2 Mingguan Rp 30.000 · Mingguan Rp 20.000 · Harian Rp 5.000. Tarif per-perangkat menjaga kualitas koneksi tetap stabil untuk semua penghuni.',
  },
  {
    category: 'Tarif',
    question: 'Bagaimana sistem listrik?',
    answer: 'Listrik pascabayar (bukan token) — pakai dulu, bayar sesuai meter. Jatah gratis 30 kWh/bulan; kelebihan Rp 2.500/kWh. Saat keluar tidak ada token yang hangus — tagihan meter terakhir dipotong dari deposit.',
  },
  {
    category: 'Aturan',
    question: 'Apakah kos bebas keluar masuk?',
    answer: 'Jam keluar masuk dibebaskan — tidak ada jam malam. Namun penghuni wajib menjaga ketertiban, norma, dan keamanan lingkungan kos.',
  },
  {
    category: 'Aturan',
    question: 'Apakah boleh membawa hewan peliharaan?',
    answer: 'Boleh, asalkan tidak merusak fasilitas. Wajib membayar deposit jaminan Rp 100.000 (dikembalikan jika tidak ada kerusakan) dan dikonfirmasi ke pengelola saat booking.',
  },
];

export function resolvePublicMarketingAssetUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('/uploads/room-images/')) return resolveAbsoluteFileUrl(url) ?? url;
  return url;
}

export const EXTRA_FAQ_ITEMS = [
  {
    category: 'Aturan',
    question: 'Apakah boleh untuk pasutri (pasangan suami istri)?',
    answer: 'Diperbolehkan. Wajib membawa surat nikah, bukti foto pernikahan, atau kartu keluarga.',
  },
  {
    category: 'Aturan',
    question: 'Apakah boleh membawa pasangan?',
    answer: 'Boleh menginap dengan pacar asalkan orang tua pihak wanita datang mengantar dan berbicara langsung dengan ibu kos. Membawa selingkuhan tidak diperbolehkan dan dapat dilaporkan ke pihak berwenang.',
  },
  {
    category: 'Layanan',
    question: 'Apakah ada layanan galon air?',
    answer: 'Ada. Galon air merek Voila tersedia seharga Rp 20.000 per galon, dibeli langsung ke pengelola.',
  },
  {
    category: 'Booking',
    question: 'Bagaimana cara booking kamar?',
    answer: 'Pilih kamar dari katalog, ajukan booking, bayar DP 30% sebagai tanda jadi, lalu admin memverifikasi dan mengunci kamar untuk Anda. Lengkapi pelunasan sesuai jadwal.',
  },
];

export const MAPS_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5304.776378640393!2d112.67025188642698!3d-7.28650073405867!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd7fc338c5ea093%3A0x68545aa7b3330f0a!2sKost%2048%20Dekat%20PTC%20%2F%20Supermall%20-%20Kost%20Surabaya%20Barat!5e0!3m2!1sid!2sid!4v1625312629036!5m2!1sid!2sid';

export const CATALOG_BATCH_SIZE = 8;

export function getTodayDateInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function formatCompactRupiah(value: number) {
  if (!value) return 'Tanya admin';
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  }
  return `Rp ${Math.round(value / 1_000).toLocaleString('id-ID')} rb`;
}

export function formatMonthlyRange(minimum: number, maximum: number) {
  if (!minimum || !maximum) return 'Tanya admin';
  if (minimum === maximum) return formatCompactRupiah(minimum);
  return `${formatCompactRupiah(minimum)} - ${formatCompactRupiah(maximum)}`;
}

export function buildWhatsAppUrl(message: string) {
  return `${officialKost48Location.whatsappUrl}?text=${encodeURIComponent(message)}`;
}

export function buildRoomWhatsAppUrl(room: PublicRoom) {
  const roomName = room.code || room.name || `Kamar ${room.id}`;
  return buildWhatsAppUrl(`Halo Admin KOST48, saya tertarik dengan ${roomName}. Boleh tanya ketersediaan dan estimasi siap huni?`);
}

export function getRoomCover(room: PublicRoom) {
  const apiImage = (room.images ?? [])
    .map((url) => resolveKost48MarketingImageUrl(url))
    .find(Boolean);
  return apiImage || getKost48RoomCover(room.code, room.name) || '/room-images/kamar-a-1.webp';
}

export function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
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

export function GuestTopbar({ scrolled }: { scrolled: boolean }) {
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
        {PUBLIC_EXTRA_LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="gx-nav-link">
            <span aria-hidden="true" className="gx-nav-ico">{l.icon}</span> {l.label}
          </Link>
        ))}
      </nav>
      <div className="gx-nav-cta">
        <Link to="/login" className="gx-btn-ghost"><span aria-hidden="true">🔑</span> Masuk Portal</Link>
        <Link to="/rooms" className="gx-btn-solid"><span aria-hidden="true">🔍</span> Cek Kamar</Link>
      </div>
    </header>
  );
}

// PUB-ICON: ikon status kamar per tone (badge ketersediaan publik).
export function roomStatusIcon(tone: string): string {
  if (tone === 'is-occupied') return '🔴';
  if (tone === 'is-maintenance') return '🧹';
  if (tone === 'is-limited') return '🟡';
  return '🟢';
}

// PUB-ROOM-CATEGORY: label + ikon kategori kamar untuk badge katalog.
export function categoryBadge(cat?: string | null): { label: string; icon: string } | null {
  const c = String(cat ?? '').toUpperCase();
  if (c === 'DELUXE') return { label: 'Deluxe', icon: '💎' };
  if (c === 'ECONOMY') return { label: 'Ekonomi', icon: '🏷️' };
  if (c === 'STANDARD') return { label: 'Standar', icon: '🛋️' };
  return null;
}

// PUB-FACILITY-SHOW: ikon fasilitas ringkas di kartu kamar (cocokkan kata kunci).
export function amenityIcon(label: string): string {
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

// PUB-CALENDAR-CHECKOUT: format tanggal singkat (id-ID) untuk proyeksi kosong.
export function formatRoomShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

export function RoomPreviewCard({ room }: { room: PublicRoom }) {
  const availability = getPublicRoomAvailabilityDisplay(room);
  const amenities = [
    getPublicRoomCoolingLabel(room),
    `KM ${getPublicRoomBathroomLabel(room)}`,
    ...getPublicRoomVisibleAmenities(room, 3),
  ].slice(0, 4);
  const rate = getBestPublicRoomRate(room, 'MONTHLY');
  // R-06: deteksi kamar terisi untuk visual berbeda
  const isOccupied = availability.tone === 'is-occupied' || availability.tone === 'is-full';
  const isAvailable = availability.canBook && availability.tone !== 'is-maintenance';

  return (
    <article className={`gx-room-card${isOccupied ? ' gx-room-card-occupied' : ''}${isAvailable ? ' gx-room-card-available' : ''}`}>
      <div className="gx-room-image-wrap">
        <img src={getRoomCover(room)} alt={`${room.name || room.code || 'Kamar KOST48'} — ${getPublicRoomCoolingLabel(room)}, KM ${getPublicRoomBathroomLabel(room)}`} className="gx-room-image" loading="lazy" />
        <span className={`gx-room-status ${availability.tone}`}><span aria-hidden="true">{roomStatusIcon(availability.tone)}</span> {availability.label}</span>
        {/* R-06: chip TERISI besar di atas foto untuk kamar occupied */}
        {isOccupied && (
          <span className="gx-room-occupied-chip" aria-label="Kamar sedang terisi">Terisi</span>
        )}
        {/* R-06: badge TERSEDIA hijau kecil untuk kamar available */}
        {isAvailable && (
          <span className="gx-room-available-badge" aria-label="Kamar tersedia">Tersedia</span>
        )}
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
          {/* PUB-CALENDAR-CHECKOUT: proyeksi kamar akan kosong (kamar terisi). */}
          {!availability.canBook && room.projectedAvailableDate ? (
            <p className="gx-room-soon">🗓️ Perkiraan kosong {formatRoomShortDate(room.projectedAvailableDate)}{room.projectedAvailableReason === 'short-term' ? ' (sewa jangka pendek)' : ''} — bisa pesan duluan.</p>
          ) : null}
        </div>
        <strong className="gx-room-price">Mulai {formatCompactRupiah(rate)} / bulan</strong>
        <div className="gx-room-amenities" aria-label="Fasilitas ringkas">
          {amenities.map((item) => (
            <span key={item}><span aria-hidden="true">{amenityIcon(item)}</span> {item}</span>
          ))}
        </div>
        <div className="gx-room-actions">
          <Link className="gx-room-action-secondary" to={`/rooms/${room.id}/detail`} state={{ room }}>Lihat Info</Link>
          {availability.canBook ? (
            <Link className="gx-room-action-primary" to={`/booking/${room.id}`} state={{ room }}><span aria-hidden="true">📝</span> Ajukan Booking</Link>
          ) : (
            // PUB-BTN-COLOR: kamar belum bisa dibooking → "Tanya" pakai gaya outline (bukan tombol utama).
            // R-06: kamar terisi bisa diklik ke detail (state penuh), tombol WA tetap tersedia.
            <a className="gx-room-action-secondary" href={buildRoomWhatsAppUrl(room)} target="_blank" rel="noreferrer"><span aria-hidden="true">💬</span> Tanya Ketersediaan</a>
          )}
        </div>
      </div>
    </article>
  );
}

export function RoomPreviewSkeleton() {
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

// R-07: Sticky shortcut nav — hanya tampil di mobile, muncul setelah scroll melewati hero
export function MobileShortcutNav({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <nav
      className="gx-section-shortcuts"
      aria-label="Pintasan navigasi halaman"
    >
      {NAV_LINKS.map((l) => (
        <a key={l.href} href={l.href} className="gx-shortcut-link">{l.label}</a>
      ))}
      {PUBLIC_EXTRA_LINKS.map((l) => (
        <Link key={l.to} to={l.to} className="gx-shortcut-link">{l.label}</Link>
      ))}
    </nav>
  );
}

export function GuestFooter() {
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
            <a href="#kamar">Katalog Kamar</a>
            {PUBLIC_EXTRA_LINKS.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
            <Link to="/login">Masuk Portal</Link>
          </nav>
          <div className="gx-footer-links">
            <a href={officialKost48Location.mapsUrl} target="_blank" rel="noreferrer">Google Maps</a>
            <a href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
        </div>
        <p className="gx-footer-copy">
          KOST48 Surabaya Barat — Kos nyaman dekat Pakuwon Mall / PTC.{' '}
          <span className="gx-footer-version">v{APP_VERSION}</span>
        </p>
      </Container>
    </footer>
  );
}
