import { useMemo } from 'react';
import { Accordion, Alert, Button, Card, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicFaqs, type FaqItem } from '../../api/faqs';
import FreeRepairPolicyCard from '../../components/tenant/FreeRepairPolicyCard';

// R-17: konstan WA admin (sama dengan WifiOrderPage)
// D-25: nomor WA owner-settable via Settings (fallback env var → default)
const KOST_WHATSAPP_NUMBER = (import.meta.env.VITE_PUBLIC_ADMIN_WHATSAPP ?? '6285648887628').replace(/\D/g, '');
const WHATSAPP_URL = `https://wa.me/${KOST_WHATSAPP_NUMBER}`;
const KOST_WHATSAPP_DISPLAY = `0${KOST_WHATSAPP_NUMBER.slice(2)}`.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');

/** R-17: Aturan dasar kost yang tampil ketika FAQ masih kosong dari admin. */
function DefaultRulesCard() {
  return (
    <Card className="mb-3">
      <Card.Header><strong>Aturan Dasar KOST48</strong></Card.Header>
      <Accordion flush alwaysOpen={false}>
        <Accordion.Item eventKey="jam-tamu">
          <Accordion.Header>Jam Tamu &amp; Akses</Accordion.Header>
          <Accordion.Body>
            Tamu diperbolehkan berkunjung pukul <strong>07.00–21.00 WIB</strong>.
            Di luar jam tersebut, tamu tidak diizinkan masuk ke area kamar.
            Tamu wajib melapor kepada staf atau pengelola.
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="kebersihan">
          <Accordion.Header>Kebersihan &amp; Ketertiban</Accordion.Header>
          <Accordion.Body>
            Setiap penghuni wajib menjaga kebersihan kamar dan area bersama (koridor, kamar mandi,
            dapur, dan teras). Sampah dibuang ke tempat yang disediakan setiap hari.
            Keributan yang mengganggu tetangga tidak diizinkan.
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="larangan">
          <Accordion.Header>Larangan</Accordion.Header>
          <Accordion.Body>
            Dilarang keras membawa atau menggunakan narkoba, minuman keras, dan senjata tajam.
            Dilarang memelihara hewan peliharaan di kamar. Dilarang merokok di dalam kamar —
            area merokok tersedia di luar gedung.
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="pembayaran">
          <Accordion.Header>Pembayaran Sewa</Accordion.Header>
          <Accordion.Body>
            Tagihan sewa diterbitkan oleh admin sesuai jadwal. Bayar tunai atau transfer ke
            rekening pengelola, lalu unggah bukti transfer di menu <strong>Bayar Tagihan</strong>.
            Konfirmasi pembayaran oleh admin dilakukan maks. 1×24 jam kerja.
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="lokasi">
          <Accordion.Header>Lokasi &amp; Alamat</Accordion.Header>
          <Accordion.Body>
            KOST48 Surabaya berlokasi di <strong>Jl. Hikmah V No. 48, Surabaya Barat</strong> (area Pakuwon / PTC).
            Hubungi pengelola via WhatsApp untuk petunjuk arah lebih detail.
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </Card>
  );
}

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
      <h3 className="mb-1">Panduan &amp; Aturan Kos</h3>
      <p className="text-muted">Manual lengkap aturan, pembayaran, dan layanan KOST48. Klik tiap topik untuk membuka.</p>

      <FreeRepairPolicyCard />

      {faqsQuery.isLoading && <div className="text-center py-5"><Spinner animation="border" /></div>}

      {/* R-17: empty state yang lebih informatif — tampilkan aturan dasar + kontak WA */}
      {!faqsQuery.isLoading && grouped.length === 0 && (
        <>
          <Alert variant="info" className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div>
              <div className="fw-semibold">Panduan resmi sedang disiapkan</div>
              <div className="small">
                Admin akan segera mengisi panduan lengkap. Sementara itu, aturan dasar ada di bawah.
                Ada pertanyaan? Hubungi pengelola via WhatsApp:{' '}
                <strong>{KOST_WHATSAPP_DISPLAY}</strong>
              </div>
            </div>
            <Button as="a" href={WHATSAPP_URL} target="_blank" rel="noreferrer" variant="outline-primary" size="sm">
              Hubungi WA
            </Button>
          </Alert>
          <DefaultRulesCard />
        </>
      )}

      {grouped.map(([category, items]) => (
        <Card key={category} className="mb-3">
          <Card.Header><strong>{category}</strong></Card.Header>
          <Accordion flush alwaysOpen={false} defaultActiveKey={items[0] ? String(items[0].id) : undefined}>
            {items.map((faq) => (
              <Accordion.Item eventKey={String(faq.id)} key={faq.id}>
                <Accordion.Header>{faq.question}</Accordion.Header>
                <Accordion.Body style={{ whiteSpace: 'pre-line' }}>{faq.answer}</Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </Card>
      ))}

      {/* Kontak admin selalu tampil di bawah */}
      {!faqsQuery.isLoading && (
        <Card className="border-0 bg-light mt-2">
          <Card.Body className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-3">
            <div className="small text-muted">
              Ada pertanyaan lain? Pengelola siap membantu.
            </div>
            <Button as="a" href={WHATSAPP_URL} target="_blank" rel="noreferrer" variant="outline-success" size="sm">
              Chat WhatsApp {KOST_WHATSAPP_DISPLAY}
            </Button>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
