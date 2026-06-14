import { useMemo } from 'react';
import { Accordion, Alert, Card, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicFaqs, type FaqItem } from '../../api/faqs';

/**
 * F4-12 — "Panduan / Aturan Kos" untuk tenant: manual book ringkas dari FAQ,
 * dikelompokkan per kategori (openness, tapi tak bikin pusing — accordion).
 */
export default function MyManualPage() {
  const faqsQuery = useQuery({ queryKey: ['public-faqs'], queryFn: fetchPublicFaqs });

  const grouped = useMemo(() => {
    const items = (faqsQuery.data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
    const map = new Map<string, FaqItem[]>();
    for (const item of items) {
      const key = item.category || 'Umum';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [faqsQuery.data]);

  return (
    <div className="container py-4">
      <h3 className="mb-1">Panduan & Aturan Kos</h3>
      <p className="text-muted">Manual lengkap aturan, pembayaran, dan layanan KOST48. Klik tiap topik untuk membuka.</p>

      {faqsQuery.isLoading && <div className="text-center py-5"><Spinner animation="border" /></div>}

      {!faqsQuery.isLoading && grouped.length === 0 && (
        <Alert variant="light" className="border text-center">
          Panduan belum tersedia. Hubungi admin bila ada pertanyaan.
        </Alert>
      )}

      {grouped.map(([category, items]) => (
        <Card key={category} className="mb-3">
          <Card.Header><strong>{category}</strong></Card.Header>
          <Accordion flush alwaysOpen={false}>
            {items.map((faq) => (
              <Accordion.Item eventKey={String(faq.id)} key={faq.id}>
                <Accordion.Header>{faq.question}</Accordion.Header>
                <Accordion.Body style={{ whiteSpace: 'pre-line' }}>{faq.answer}</Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </Card>
      ))}
    </div>
  );
}
