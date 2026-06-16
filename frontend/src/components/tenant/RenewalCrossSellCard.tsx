import { useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { useMutation } from '@tanstack/react-query';
import { createResource } from '../../api/resources';

// Cross-sell saat perpanjangan (permintaan owner: "setiap perpanjangan tawarkan sekalian order
// WiFi / cleaning"). Penghuni klik "Saya minat" → buat tiket portal (kategori sesuai) agar admin
// menindaklanjuti penawaran. Reuse flow tiket yang sudah ada (tanpa endpoint/skema baru).

type Offer = { key: string; icon: string; title: string; desc: string; category: string };

const OFFERS: Offer[] = [
  { key: 'WIFI', icon: '📶', title: 'Paket WiFi', desc: 'Internet cepat khusus di kamarmu.', category: 'WIFI' },
  { key: 'CLEANING', icon: '🧹', title: 'Cleaning Service', desc: 'Bersih-bersih kamar berkala.', category: 'CLEANING' },
];

export default function RenewalCrossSellCard() {
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const mutation = useMutation({
    mutationFn: (offer: Offer) =>
      createResource('/tickets/portal', {
        title: `Minat tambah ${offer.title} (penawaran perpanjangan)`,
        description: `Penghuni tertarik layanan ${offer.title}. Mohon admin tindak lanjuti detail & harga.`,
        category: offer.category,
      }),
    onSuccess: (_data, offer) => setSent((prev) => ({ ...prev, [offer.key]: true })),
  });

  return (
    <Card className="border-0 mb-3" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #eff6ff 100%)' }}>
      <Card.Body>
        <div className="fw-semibold">✨ Sekalian tambah layanan?</div>
        <div className="text-muted small mb-2">
          Opsional saat perpanjang. Klik "Saya minat" — admin menghubungi untuk detail &amp; harga (tidak otomatis menambah tagihan).
        </div>
        <div className="d-flex flex-wrap gap-2">
          {OFFERS.map((offer) => (
            <div key={offer.key} className="border rounded p-2 px-3 bg-white" style={{ minWidth: 190 }}>
              <div className="fw-semibold"><span aria-hidden>{offer.icon}</span> {offer.title}</div>
              <div className="text-muted small mb-2">{offer.desc}</div>
              {sent[offer.key] ? (
                <span className="text-success small fw-semibold">✓ Terkirim — admin akan menghubungi</span>
              ) : (
                <Button size="sm" variant="outline-primary" disabled={mutation.isPending} onClick={() => mutation.mutate(offer)}>
                  Saya minat
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}
