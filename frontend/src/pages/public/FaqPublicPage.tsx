import { useEffect, useMemo } from 'react';
import '../../styles/public-area';
import { useQuery } from '@tanstack/react-query';
import { Accordion, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { fetchPublicFaqs } from '../../api/faqs';
import { HOME_FAQ_ITEMS, EXTRA_FAQ_ITEMS, GuestFooter, GuestTopbar } from './publicGuestShared';

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
    <div className="public-page-shell e3-bg-surface">
      <GuestTopbar scrolled={false} />
      <div className="container py-4 py-lg-5 e3-maxw-820">
        <div className="mb-4">
          <div className="page-eyebrow">✦ Panduan</div>
          <h1 className="mb-2 e3-text-gray-900">Panduan & FAQ KOST48</h1>
          <p className="e3-maxw-600 k48-text-soft">
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
            <Spinner animation="border" /> <span className="ms-2 k48-text-muted-strong">Memuat FAQ...</span>
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
                  className="btn btn-outline-secondary btn-sm e3-rounded-pill k48-text-muted-strong k48-border-muted"
                >
                  {category}
                </a>
              ))}
            </nav>

            {faqByCategory.map(([category, items]) => (
              <section key={category} id={`faq-${category.replace(/\s+/g, '-').toLowerCase()}`} className="mb-5">
                <h2 className="fs-5 fw-bold mb-3 pb-2 border-bottom e3-text-gray-900 k48-border-accent">
                  {category}
                </h2>
                <Accordion className="gx-accordion">
                  {items.map((item, idx) => (
                    <Accordion.Item eventKey={`${item.id}-${idx}`} key={item.id} className="gx-acc-item">
                      <Accordion.Header>
                        <span className="gx-acc-cat e3-bg-blue-100 e3-text-blue-800">{item.category}</span>
                        <span className="e3-text-gray-900">{item.question}</span>
                      </Accordion.Header>
                      <Accordion.Body className="k48-text-muted-strong" style={{ lineHeight: 1.7, fontSize: '.9rem' }}>
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
            <h2 className="fs-5 fw-bold mb-3 e3-text-gray-900">Pertanyaan Umum</h2>
            <Accordion className="gx-accordion">
              {STATIC_FAQS.map((item, idx) => (
                <Accordion.Item eventKey={`static-${idx}`} key={idx} className="gx-acc-item">
                  <Accordion.Header>
                    <span className="gx-acc-cat" style={{ background: '#dbeafe', color: '#1e40af' }}>{item.category}</span>
                    <span className="k48-text-muted-strong">{item.question}</span>
                  </Accordion.Header>
                  <Accordion.Body className="k48-text-muted-strong" style={{ fontSize: '.9rem', lineHeight: 1.7 }}>
                    {item.answer}
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          </div>
        )}
      </div>
      <GuestFooter />
    </div>
  );
}
