import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Accordion, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { fetchPublicFaqs } from '../../api/faqs';
import Kost48LogoMark from '../../components/common/Kost48LogoMark';
import { HOME_FAQ_ITEMS, EXTRA_FAQ_ITEMS } from './publicGuestShared';

const CATEGORY_ORDER = ['Aturan', 'Tarif', 'Booking', 'Pembayaran', 'Perpanjangan', 'Checkout & Deposit', 'Fasilitas', 'Lokasi', 'KTP & Privasi', 'Keluhan & Poin', 'Umum'];

function sortByCategory(items: Array<{ id: number; category: string; question: string; answer: string; sortOrder: number }>) {
  return [...items].sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a.category);
    const idxB = CATEGORY_ORDER.indexOf(b.category);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.sortOrder - b.sortOrder;
  });
}

const STATIC_FAQS = [...HOME_FAQ_ITEMS, ...EXTRA_FAQ_ITEMS];

function FaqTopbar() {
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  return (
    <header className="rm-topbar" style={{ position: 'sticky', top: 0, zIndex: 20 }}>
      <button type="button" className="rm-topbar-brand" onClick={() => navigate('/')}>
        {!logoError ? (
          <img className="rm-topbar-logo" src="/room-images/logo-kost48-sby.webp" alt="" aria-hidden="true" onError={() => setLogoError(true)} />
        ) : (
          <Kost48LogoMark size="small" />
        )}
        <div className="rm-topbar-brand-text">
          <span>KOST<span className="gx-brand-accent">48</span> Surabaya</span>
          <small>Surabaya Barat</small>
        </div>
      </button>
      <nav className="rm-topbar-nav" aria-label="Navigasi">
        <button type="button" onClick={() => navigate('/')}>🏠 Beranda</button>
        <button type="button" onClick={() => navigate('/rooms')}>🔍 Katalog Kamar</button>
        <button type="button" onClick={() => navigate('/reviews')}>⭐ Ulasan</button>
      </nav>
      <div className="rm-topbar-user">
        <Link to="/rooms" className="btn btn-sm btn-primary">Cek Kamar</Link>
      </div>
    </header>
  );
}

export default function FaqPublicPage() {
  const query = useQuery({
    queryKey: ['public-faqs'],
    queryFn: fetchPublicFaqs,
    staleTime: 5 * 60_000,
  });

  const faqByCategory = useMemo(() => {
    const items = query.data ?? [];
    if (!items.length) return [];
    const sorted = sortByCategory(items);
    const map = new Map<string, typeof sorted>();
    for (const item of sorted) {
      const cat = item.category || 'Umum';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  }, [query.data]);

  const showStatic = !query.isLoading && (query.isError || faqByCategory.length === 0);

  return (
    <div className="public-page-shell" style={{ background: '#f8fafc' }}>
      <FaqTopbar />
      <div className="container py-4 py-lg-5" style={{ maxWidth: 820 }}>
        <div className="mb-4">
          <div className="page-eyebrow">✦ Panduan & Aturan</div>
          <h1 className="mb-2" style={{ color: '#0f172a' }}>Panduan & FAQ KOST48</h1>
          <p style={{ color: '#475569', maxWidth: 600 }}>
            Semua aturan, tata cara, dan informasi penting tentang KOST48 dalam satu halaman — mulai dari tarif,
            booking, perpanjangan, hingga checkout.
          </p>
          <div className="d-flex gap-2 flex-wrap mt-3">
            <Link to="/rooms" className="btn btn-primary btn-sm">🔍 Lihat Kamar</Link>
            <Link to="/" className="btn btn-outline-secondary btn-sm">🏠 Beranda</Link>
          </div>
        </div>

        {query.isLoading && (
          <div className="py-5 text-center">
            <Spinner animation="border" /> <span className="ms-2" style={{ color: '#374151' }}>Memuat FAQ...</span>
          </div>
        )}

        {query.isError && (
          <Alert variant="warning" className="small">
            Tidak dapat memuat FAQ dari server. Menampilkan FAQ bawaan sebagai referensi.
          </Alert>
        )}

        {/* FAQ dari database */}
        {!query.isLoading && faqByCategory.length > 0 && (
          <div className="gx-faq-page">
            <nav className="mb-4 d-flex flex-wrap gap-2" aria-label="Kategori FAQ">
              {faqByCategory.map(([category]) => (
                <a
                  key={category}
                  href={`#faq-${category.replace(/\s+/g, '-').toLowerCase()}`}
                  className="btn btn-outline-secondary btn-sm"
                  style={{ borderRadius: 999, color: '#374151', borderColor: '#cbd5e1' }}
                >
                  {category}
                </a>
              ))}
            </nav>

            {faqByCategory.map(([category, items]) => (
              <section key={category} id={`faq-${category.replace(/\s+/g, '-').toLowerCase()}`} className="mb-5">
                <h2 className="fs-5 fw-bold mb-3 pb-2 border-bottom" style={{ color: '#0f172a', borderColor: '#0ea5e9' }}>
                  {category}
                </h2>
                <Accordion className="gx-accordion">
                  {items.map((item, idx) => (
                    <Accordion.Item eventKey={`${item.id}-${idx}`} key={item.id} className="gx-acc-item">
                      <Accordion.Header>
                        <span className="gx-acc-cat" style={{ background: '#dbeafe', color: '#1e40af' }}>{item.category}</span>
                        <span style={{ color: '#0f172a' }}>{item.question}</span>
                      </Accordion.Header>
                      <Accordion.Body style={{ color: '#374151', fontSize: '.9rem', lineHeight: 1.7 }}>
                        {item.answer}
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>
        )}

        {/* Fallback statis saat DB kosong atau error */}
        {showStatic && (
          <div>
            <h2 className="fs-5 fw-bold mb-3" style={{ color: '#0f172a' }}>Pertanyaan Umum</h2>
            <Accordion className="gx-accordion">
              {STATIC_FAQS.map((item, idx) => (
                <Accordion.Item eventKey={`static-${idx}`} key={idx} className="gx-acc-item">
                  <Accordion.Header>
                    <span className="gx-acc-cat" style={{ background: '#dbeafe', color: '#1e40af' }}>{item.category}</span>
                    <span style={{ color: '#0f172a' }}>{item.question}</span>
                  </Accordion.Header>
                  <Accordion.Body style={{ color: '#374151', fontSize: '.9rem', lineHeight: 1.7 }}>
                    {item.answer}
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
}
