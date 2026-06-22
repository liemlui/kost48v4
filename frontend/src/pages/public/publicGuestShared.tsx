// Helpers/konstanta + 5 komponen presentational diekstrak dari PublicGuestDashboardPage.tsx (refactor 2026-06-19: AI-read).
// Halaman publik (read-only, tanpa state global). Pola mengikuti reportShared/dashboardShared.
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

export const NAV_LINKS = [
  { href: '#kamar', icon: '🛏️', label: 'Kamar' },
  { href: '#fasilitas', icon: '✨', label: 'Fasilitas' },
  { href: '#lokasi', icon: '📍', label: 'Lokasi' },
  { href: '#ulasan', icon: '⭐', label: 'Ulasan' },
  { href: '#faq', icon: '❓', label: 'FAQ' },
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
      { slug: 'wifi', mark: '📶', label: 'WiFi', desc: 'Rp 50.000 per perangkat.' },
      { slug: 'galon-air', mark: '🚰', label: 'Galon air', desc: 'Rp 15.000 per galon.' },
      { slug: 'tv-tambahan', mark: '📺', label: 'TV tambahan', desc: 'Rp 50.000 per bulan.' },
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
    desc: 'Listrik pascabayar: pakai dulu, bayar sesuai meter. Ada 30 kWh gratis tiap bulan, dan saat keluar tidak ada sisa saldo yang hangus — tagihan meter terakhir dipotong dari deposit.',
  },
];

export const HOME_FAQ_ITEMS = [
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

export function resolvePublicMarketingAssetUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('/uploads/room-images/')) return resolveAbsoluteFileUrl(url) ?? url;
  return url;
}

export const EXTRA_FAQ_ITEMS = [
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
        <Link to="/panduan" className="gx-nav-link">
          <span aria-hidden="true" className="gx-nav-ico">📖</span> Panduan
        </Link>
        <Link to="/login" className="gx-nav-link gx-nav-login" style={{ marginLeft: 'auto', fontWeight: 600 }}>
          <span aria-hidden="true" className="gx-nav-ico">🔑</span> Masuk Portal
        </Link>
      </nav>
      <div className="gx-nav-cta">
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
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
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
      <a href="#kamar" className="gx-shortcut-link">Kamar</a>
      <a href="#fasilitas" className="gx-shortcut-link">Fasilitas</a>
      <a href="#lokasi" className="gx-shortcut-link">Lokasi</a>
      <a href="#ulasan" className="gx-shortcut-link">Ulasan</a>
      <a href="#faq" className="gx-shortcut-link">FAQ</a>
      <Link to="/panduan" className="gx-shortcut-link">Panduan</Link>
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
            <Link to="/panduan">Panduan</Link>
            <Link to="/reviews">Ulasan</Link>
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
