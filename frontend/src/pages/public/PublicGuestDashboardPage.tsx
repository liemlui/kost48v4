import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Accordion, Container, Modal, Spinner } from 'react-bootstrap';
import { Link, Navigate } from 'react-router-dom';
import { listPublicRooms } from '../../api/bookings';
import { fetchPublicFaqs } from '../../api/faqs';
import Kost48LogoMark from '../../components/common/Kost48LogoMark';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRoute } from '../../config/navigation';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import { officialKost48Faq, officialKost48Location } from '../../data/officialKost48Content';
import { getKost48FrontPhotoUrl } from '../../data/kost48Assets';
import { isPublicRoomBookable } from '../../utils/publicRoomDisplay';

const NAV_LINKS = [
  { href: '#fasilitas', label: 'Fasilitas' },
  { href: '#cek-kamar', label: 'Cek Kamar' },
  { href: '#faq', label: 'FAQ' },
  { href: '#hubungi-kami', label: 'Hubungi Kami' },
];

const FAQ_FILTERS = ['Semua', 'Lokasi', 'Tarif', 'Fasilitas', 'Aturan', 'Layanan'] as const;

const GALLERY_ITEMS = [
  { id: 'spanduk', src: '/room-images/spanduk-kost48-surabaya.webp', label: 'Spanduk Fasilitas Lengkap' },
  { id: 'brosur-depan', src: '/room-images/brosur-depan.webp', label: 'Brosur — Halaman Depan' },
  { id: 'brosur-belakang', src: '/room-images/brosur-belakang.webp', label: 'Brosur — Halaman Belakang' },
];

const FACILITY_GROUPS = [
  {
    id: 'umum',
    title: 'Fasilitas Umum',
    items: [
      { icon: '🚗', label: 'Parkir luas', desc: '6–8 mobil dan 5–20 motor' },
      { icon: '🍳', label: 'Dapur bersama', desc: 'Kitchen set lengkap' },
      { icon: '💧', label: 'Air PDAM + Tandon', desc: '2 tandon 650 liter' },
      { icon: '🌿', label: 'Balkon santai', desc: 'Area relaksasi lantai 2' },
      { icon: '👔', label: 'Area jemur', desc: 'Beberapa titik lokasi' },
      { icon: '🌱', label: 'Taman & area hijau', desc: 'Sirkulasi udara asri' },
      { icon: '🔧', label: 'Perawatan fasilitas', desc: 'Kran, lampu, kunci bisa dilaporkan' },
    ],
  },
  {
    id: 'kamar',
    title: 'Fasilitas Kamar',
    items: [
      { icon: '🛏️', label: 'Kasur', desc: 'Single 120×200 atau double 180×200' },
      { icon: '🗄️', label: 'Lemari baju', desc: '4 box standar per kamar' },
      { icon: '❄️', label: 'Pendingin', desc: 'AC atau kipas angin' },
      { icon: '🚿', label: 'Kamar mandi', desc: 'Dalam atau luar, shower + kloset duduk' },
    ],
  },
  {
    id: 'tambahan',
    title: 'Layanan Tambahan',
    items: [
      { icon: '📶', label: 'WiFi', desc: 'Rp 50.000/perangkat' },
      { icon: '💧', label: 'Galon air minum', desc: 'Rp 15.000/galon' },
      { icon: '📺', label: 'TV tambahan', desc: 'Rp 50.000/bulan' },
      { icon: '🛠️', label: 'Perbaikan dasar', desc: 'Dilaporkan langsung ke pengelola' },
    ],
  },
];

const MAPS_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5304.776378640393!2d112.67025188642698!3d-7.28650073405867!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd7fc338c5ea093%3A0x68545aa7b3330f0a!2sKost%2048%20Dekat%20PTC%20%2F%20Supermall%20-%20Kost%20Surabaya%20Barat!5e0!3m2!1sid!2sid!4v1625312629036!5m2!1sid!2sid';

/* ── Lightbox ─────────────────────────────────────────────────────── */

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <Modal show onHide={onClose} size="xl" centered dialogClassName="gx-lightbox-dialog" contentClassName="gx-lightbox-content">
      <Modal.Body className="gx-lightbox-body p-0">
        <button className="gx-lightbox-close" onClick={onClose} aria-label="Tutup">✕</button>
        <img src={src} alt="Brosur KOST48" className="gx-lightbox-img" />
      </Modal.Body>
    </Modal>
  );
}

/* ── Topbar ──────────────────────────────────────────────────────── */

function GuestTopbar({ scrolled }: { scrolled: boolean }) {
  const [iconBroken, setIconBroken] = useState(false);
  const [textBroken, setTextBroken] = useState(false);
  return (
    <header className={`gx-topbar${scrolled ? ' gx-topbar-solid' : ''}`}>
      <Link to="/" className="gx-brand" aria-label="KOST48 Beranda">
        {!iconBroken ? (
          <img src="/room-images/logo-kost48-sby.webp" alt="" aria-hidden="true" className="gx-logo-icon" onError={() => setIconBroken(true)} />
        ) : (
          <Kost48LogoMark size="small" />
        )}
        {!textBroken ? (
          <img src="/room-images/logo-kost48-surabaya.webp" alt="Kost 48 Surabaya" className="gx-logo-text-img" onError={() => setTextBroken(true)} />
        ) : (
          <span className="gx-brand-name">KOST48 Surabaya</span>
        )}
      </Link>
      <nav className="gx-nav" aria-label="Navigasi">
        {NAV_LINKS.map((l) => <a key={l.href} href={l.href} className="gx-nav-link">{l.label}</a>)}
      </nav>
      <div className="gx-nav-cta">
        <Link className="gx-btn-ghost" to="/rooms">Cek Kamar</Link>
        <a className="gx-btn-solid" href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
      </div>
    </header>
  );
}

/* ── Footer ──────────────────────────────────────────────────────── */

function GuestFooter() {
  return (
    <footer className="gx-footer">
      <Container fluid="xl">
        <div className="gx-footer-inner">
          <div className="gx-footer-brand">
            <img src="/room-images/logo-kost48-sby.webp" alt="Logo KOST48" className="gx-footer-logo-img" />
            <div>
              <img src="/room-images/logo-kost48-surabaya.webp" alt="Kost 48 Surabaya" className="gx-footer-text-img" />
              <small>Jl. Hikmah V No. 48 · Surabaya Barat 60216</small>
            </div>
          </div>
          <nav className="gx-footer-nav">
            {NAV_LINKS.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
            <Link to="/rooms">Katalog Kamar</Link>
            <Link to="/login">Masuk Portal</Link>
          </nav>
          <div className="gx-footer-links">
            <a href={officialKost48Location.mapsUrl} target="_blank" rel="noreferrer">📍 Google Maps</a>
            <a href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer">💬 WhatsApp</a>
          </div>
        </div>
        <p className="gx-footer-copy">
          © {new Date().getFullYear()} KOST48 Surabaya Barat &nbsp;·&nbsp; Kos nyaman dekat Pakuwon Mall / PTC
        </p>
      </Container>
    </footer>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */

export default function PublicGuestDashboardPage() {
  const { user } = useAuth();
  const { stage } = useTenantPortalStage();
  const [scrolled, setScrolled] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [faqFilter, setFaqFilter] = useState<string>('Semua');
  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const roomsQuery = useQuery({
    queryKey: ['guest-dashboard-public-rooms'],
    queryFn: () => listPublicRooms({ limit: 100, pricingTerm: 'MONTHLY' }),
    staleTime: 60_000,
  });

  const faqQuery = useQuery({
    queryKey: ['public-faqs'],
    queryFn: fetchPublicFaqs,
    staleTime: 5 * 60_000,
  });

  // API FAQ atau fallback ke static jika API belum di-seed
  const faqData = (faqQuery.data && faqQuery.data.length > 0) ? faqQuery.data : officialKost48Faq;

  const rooms = roomsQuery.data?.items ?? [];
  const stats = useMemo(() => ({
    bookable: rooms.filter((r) => isPublicRoomBookable(r)).length,
    checking: rooms.filter((r) => String(r.status ?? '').toUpperCase() === 'MAINTENANCE').length,
    occupied: rooms.filter((r) => String(r.status ?? '').toUpperCase() === 'OCCUPIED').length,
  }), [rooms]);

  const filteredFaq = useMemo(
    () => faqFilter === 'Semua' ? faqData : faqData.filter((q) => q.category === faqFilter),
    [faqFilter, faqData],
  );

  if (user) return <Navigate to={getDefaultRoute(user.role, stage)} replace />;

  return (
    <div className="gx-page">
      <GuestTopbar scrolled={scrolled} />
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={closeLightbox} />}

      {/* ══ HERO ══ */}
      <section className="gx-hero" id="top">
        <div className="gx-hero-bg" style={{ backgroundImage: `url(${getKost48FrontPhotoUrl()})` }} aria-hidden="true" />
        <div className="gx-hero-overlay" aria-hidden="true" />
        <div className="gx-hero-body">
          <div className="gx-hero-eyebrow">📍 Jalan Hikmah V No. 48 &nbsp;·&nbsp; Surabaya Barat</div>
          <h1 className="gx-hero-title">
            KOST48<br />
            <span>Surabaya</span>
          </h1>
          <p className="gx-hero-tagline">"Rumah kos sih, tapi terasa seperti rumah sendiri."</p>
          <p className="gx-hero-sub">Dekat Pakuwon Mall / PTC &nbsp;·&nbsp; Pilihan kamar AC & kipas &nbsp;·&nbsp; Booking transparan</p>
          <div className="gx-hero-cta">
            <Link className="gx-hero-btn-primary" to="/rooms">Cek Kamar Tersedia</Link>
            <a className="gx-hero-btn-ghost" href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer">💬 WhatsApp Admin</a>
            <a className="gx-hero-btn-ghost" href={officialKost48Location.mapsUrl} target="_blank" rel="noreferrer">📍 Lihat di Maps</a>
          </div>
        </div>
        <div className="gx-hero-scroll" aria-hidden="true"><span>↓</span><small>Jelajahi</small></div>
      </section>

      {/* ══ AVAILABILITY ══ */}
      <section className="gx-avail-section" id="cek-kamar">
        <Container fluid="xl">
          <div className="gx-avail-wrap">
            <div className="gx-avail-text">
              <div className="gx-label">Cek Kamar</div>
              <h2>Status kamar saat ini</h2>
              <p>Ketersediaan diambil langsung dari sistem. Booking diajukan lewat katalog kamar.</p>
              <Link className="gx-btn-outline" to="/rooms">Buka Katalog Kamar</Link>
            </div>
            <div className="gx-avail-stats">
              <div className="gx-stat gx-stat-green gx-stat-hero">
                <div className="gx-stat-num gx-stat-blink">{roomsQuery.isLoading ? <Spinner animation="border" size="sm" /> : stats.bookable}</div>
                <div className="gx-stat-label">Kamar Kosong</div>
                <div className="gx-stat-note">Siap diajukan booking sekarang</div>
              </div>
              <div className="gx-stat gx-stat-amber">
                <div className="gx-stat-num">{roomsQuery.isLoading ? <Spinner animation="border" size="sm" /> : stats.checking}</div>
                <div className="gx-stat-label">Sedang dicek</div>
                <div className="gx-stat-note">Dalam inspeksi staff</div>
              </div>
              <div className="gx-stat gx-stat-gray">
                <div className="gx-stat-num">{roomsQuery.isLoading ? <Spinner animation="border" size="sm" /> : stats.occupied}</div>
                <div className="gx-stat-label">Terisi</div>
                <div className="gx-stat-note">Referensi tipe & fasilitas</div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ══ PHOTO DIVIDER ══ */}
      <div className="gx-photo-divider" style={{ backgroundImage: `url(/room-images/kamar-a-1.webp)` }} aria-hidden="true" />

      {/* ══ FASILITAS ══ */}
      <section className="gx-content-section" id="fasilitas">
        <Container fluid="xl">
          <div className="gx-section-head">
            <div className="gx-label">Fasilitas</div>
            <h2>Fasilitas yang mendukung hidup sehari-hari.</h2>
            <p>Dirancang agar penghuni bisa fokus bekerja atau kuliah tanpa repot urusan harian.</p>
          </div>
          <div className="gx-facility-wrap">
            {FACILITY_GROUPS.map((group) => (
              <div key={group.id} className="gx-facility-group">
                <h3 className="gx-facility-group-title">{group.title}</h3>
                <div className="gx-facility-list">
                  {group.items.map((item) => (
                    <div key={item.label} className="gx-facility-row">
                      <span className="gx-facility-icon" aria-hidden="true">{item.icon}</span>
                      <div>
                        <strong>{item.label}</strong>
                        <small>{item.desc}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ══ BROSUR & SPANDUK ══ */}
      <section className="gx-gallery-section">
        <Container fluid="xl">
          <div className="gx-section-head">
            <div className="gx-label">Brosur & Spanduk</div>
            <h2>Informasi lengkap KOST48.</h2>
            <p>Klik gambar untuk melihat dalam ukuran penuh.</p>
          </div>
          <div className="gx-gallery-grid">
            {GALLERY_ITEMS.map((item) => (
              <button
                key={item.id}
                className="gx-gallery-item"
                onClick={() => setLightboxSrc(item.src)}
                aria-label={`Buka ${item.label} ukuran penuh`}
              >
                <img src={item.src} alt={item.label} className="gx-gallery-img" loading="lazy" />
                <div className="gx-gallery-overlay"><span>🔍 Lihat ukuran penuh</span></div>
                <div className="gx-gallery-label">{item.label}</div>
              </button>
            ))}
          </div>
        </Container>
      </section>

      {/* ══ FAQ dengan filter ══ */}
      <section className="gx-faq-section" id="faq">
        <Container fluid="xl">
          <div className="gx-section-head">
            <div className="gx-label">FAQ</div>
            <h2>Yang sering ditanyakan calon penghuni.</h2>
          </div>

          {/* Filter chips */}
          <div className="gx-faq-filters" role="group" aria-label="Filter pertanyaan">
            {FAQ_FILTERS.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`gx-faq-chip${faqFilter === cat ? ' active' : ''}`}
                onClick={() => setFaqFilter(cat)}
                aria-pressed={faqFilter === cat}
              >
                {cat}
                {cat !== 'Semua' && (
                  <span className="gx-faq-chip-count">
                    {faqData.filter((q) => q.category === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <Accordion key={faqFilter} className="gx-accordion" flush>
            {filteredFaq.map((item, i) => (
              <Accordion.Item key={item.question} eventKey={String(i)} className="gx-acc-item">
                <Accordion.Header className="gx-acc-header">
                  <span className="gx-acc-cat">{item.category}</span>
                  {item.question}
                </Accordion.Header>
                <Accordion.Body className="gx-acc-body">{item.answer}</Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>

          {filteredFaq.length === 0 && (
            <p className="text-muted text-center py-4">Belum ada pertanyaan dalam kategori ini.</p>
          )}
        </Container>
      </section>

      {/* ══ HUBUNGI KAMI ══ */}
      <section className="gx-contact-section" id="hubungi-kami">
        <Container fluid="xl">
          <div className="gx-contact-grid">
            <div className="gx-contact-info">
              <div className="gx-label">Hubungi Kami</div>
              <h2>Temukan kami atau hubungi via WhatsApp.</h2>
              <address className="gx-address">
                <strong>KOST48 Surabaya Barat</strong>
                <span>Jalan Hikmah V No. 48</span>
                <span>Kec. Sambikerep, Kel. Lontar</span>
                <span>Surabaya Barat · Kode Pos 60216</span>
              </address>
              <p className="gx-contact-near">Sekitar 7 menit berjalan kaki dari Pakuwon Mall / PTC.</p>
              <div className="gx-contact-actions">
                <a className="gx-btn-primary" href={officialKost48Location.mapsUrl} target="_blank" rel="noreferrer">📍 Buka Google Maps</a>
                <a className="gx-btn-outline" href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer">💬 Chat WhatsApp</a>
                <Link className="gx-btn-outline" to="/login">Masuk Portal</Link>
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
              <a href={officialKost48Location.mapsUrl} target="_blank" rel="noreferrer" className="gx-map-open">↗ Buka di Google Maps</a>
            </div>
          </div>
        </Container>
      </section>

      <GuestFooter />
    </div>
  );
}
