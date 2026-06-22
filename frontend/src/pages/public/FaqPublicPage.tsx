import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Accordion, Alert, Container, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { fetchPublicFaqs } from '../../api/faqs';
import EmptyState from '../../components/common/EmptyState';
import { HOME_FAQ_ITEMS } from './publicGuestShared';

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

  return (
    <div className="public-page-shell">
      <div className="container py-4 py-lg-5" style={{ maxWidth: 820 }}>
        <div className="mb-4">
          <div className="page-eyebrow">✦ Panduan & Aturan</div>
          <h1 className="mb-2">Panduan & FAQ KOST48</h1>
          <p className="text-muted" style={{ maxWidth: 600 }}>
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
            <Spinner animation="border" /> <span className="ms-2">Memuat FAQ...</span>
          </div>
        )}

        {query.isError && (
          <Alert variant="warning">
            Gagal memuat FAQ dari server. Berikut FAQ bawaan sebagai referensi sementara.
          </Alert>
        )}

        {!query.isLoading && !query.isError && faqByCategory.length === 0 && (
          <EmptyState
            icon="📖"
            title="FAQ belum tersedia"
            description="Belum ada pertanyaan yang ditambahkan oleh pengelola. Cek kembali nanti."
          />
        )}

        {!query.isLoading && faqByCategory.length > 0 && (
          <div className="gx-faq-page">
            <nav className="mb-4 d-flex flex-wrap gap-2" aria-label="Kategori FAQ">
              {faqByCategory.map(([category]) => (
                <a
                  key={category}
                  href={`#faq-${category.replace(/\s+/g, '-').toLowerCase()}`}
                  className="btn btn-outline-secondary btn-sm"
                  style={{ borderRadius: 999 }}
                >
                  {category}
                </a>
              ))}
            </nav>

            {faqByCategory.map(([category, items]) => (
              <section key={category} id={`faq-${category.replace(/\s+/g, '-').toLowerCase()}`} className="mb-5">
                <h2 className="fs-4 fw-bold mb-3 pb-2 border-bottom" style={{ borderColor: '#0ea5e9' }}>
                  {category}
                </h2>
                <Accordion className="gx-accordion" defaultActiveKey={items.length > 0 ? undefined : undefined}>
                  {items.map((item, idx) => (
                    <Accordion.Item eventKey={`${item.id}-${idx}`} key={item.id} className="gx-acc-item">
                      <Accordion.Header>
                        <span className="gx-acc-cat">{item.category}</span>
                        {item.question}
                      </Accordion.Header>
                      <Accordion.Body className="gx-acc-body">
                        {item.answer}
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>
        )}

        {query.isError && (
          <div className="mt-4">
            <h2 className="fs-4 fw-bold mb-3">FAQ Bawaan</h2>
            <Accordion className="gx-accordion" defaultActiveKey={undefined}>
              {HOME_FAQ_ITEMS.map((item, idx) => (
                <Accordion.Item eventKey={`fallback-${idx}`} key={idx} className="gx-acc-item">
                  <Accordion.Header>
                    <span className="gx-acc-cat">{item.category}</span>
                    {item.question}
                  </Accordion.Header>
                  <Accordion.Body className="gx-acc-body">
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
