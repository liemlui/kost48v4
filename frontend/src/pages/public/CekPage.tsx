import { useEffect, useState } from 'react';
import { Badge, Card, Container, ListGroup, Nav } from 'react-bootstrap';
import OkupansiPage from './OkupansiPage';

/**
 * /cek — SATU halaman untuk checklist go-live + data yang perlu owner siapkan
 * + ubah ketersediaan kamar (dulu terpisah di /okupansi; rute itu kini dialihkan).
 *
 * Isinya sengaja TIDAK memuat kredensial/PII: hanya status, angka agregat, dan langkah.
 * Potret data: 22 Okt 2026 (dihitung dari DB produksi). Perbarui angka saat berubah.
 * Sumber kebenaran antrean: docs/ANTREAN.md.
 */

type Status = 'selesai' | 'sebagian' | 'belum' | 'keputusan';

const STATUS_BADGE: Record<Status, { bg: string; text?: string; label: string }> = {
  selesai: { bg: 'success', label: 'Selesai' },
  sebagian: { bg: 'warning', text: 'dark', label: 'Sebagian' },
  belum: { bg: 'secondary', label: 'Belum' },
  keputusan: { bg: 'info', text: 'dark', label: 'Perlu keputusan owner' },
};

type Item = { label: string; detail: string; status: Status };

const SECTIONS: Array<{ title: string; note?: string; items: Item[] }> = [
  {
    title: '1. Data yang perlu Anda siapkan (penentu go-live)',
    note: 'Potret 22 Okt 2026 dari DB produksi: 13 kamar, 13 data penghuni, 11 hunian aktif.',
    items: [
      { label: 'Foto kamar F1 & F2 (asli)', detail: 'Belum ada di server. Katalog F1/F2 masih memakai foto kamar lain dari fallback — unggah lewat Admin → Kamar → F1/F2.', status: 'belum' },
      { label: 'Foto/scan KTP 13 penghuni', detail: '0 dari 13 tersimpan. Unggah lewat profil tenant atau menu KTP admin.', status: 'belum' },
      { label: 'Verifikasi KTP', detail: '0 dari 13 terverifikasi. Selama gate KTP aktif di produksi, aktivasi hunian menunggu verifikasi.', status: 'belum' },
      { label: 'Setoran deposit hunian aktif', detail: '1 dari 11 hunian sudah tercatat (kamar D Rp200.000); 10 hunian masih Rp0. Aturan baru: AC Rp200.000, non-AC Rp100.000.', status: 'sebagian' },
      { label: 'Email penghuni', detail: '12 dari 13 terisi. Satu data tanpa email tidak bisa memakai portal/lupa password.', status: 'sebagian' },
      { label: 'Tanggal masuk + tarif kontrak + meter listrik awal', detail: 'Untuk 13 kamar. Angka ini yang dipakai membuat hunian & tagihan pertama.', status: 'belum' },
      { label: 'Saldo awal kas & bank (opening balance)', detail: 'Butuh angka riil per tanggal cutover; diisi di Akuntansi → Saldo Awal.', status: 'keputusan' },
      { label: 'Rekening transfer untuk bukti bayar', detail: 'Nomor rekening tujuan yang ditampilkan ke penghuni saat membayar.', status: 'belum' },
      { label: 'Satu baris FAQ produksi (kapasitas kamar)', detail: 'Baris “Satu kamar bisa untuk berapa orang?” masih versi lama; edit lewat Admin → FAQ (seed tidak menimpa).', status: 'belum' },
      { label: 'PIN owner yang kuat', detail: 'PIN dipakai untuk membuka panel ketersediaan di halaman ini.', status: 'keputusan' },
      { label: 'Rotasi JWT secret & password database', detail: 'Ditunda atas keputusan owner; sebaiknya dilakukan sebelum data penghuni asli dipakai penuh.', status: 'keputusan' },
    ],
  },
  {
    title: '2. Yang sudah beres',
    items: [
      { label: 'Aplikasi live', detail: 'kost48surabaya.com — SPA + API satu origin; build yang berjalan tertera di atas.', status: 'selesai' },
      { label: 'Pendaftaran akun penghuni', detail: '/register aktif (rate limit 5/10 menit); 11 akun tenant aktif dengan password awal Tenant#2026.', status: 'selesai' },
      { label: 'Katalog & tarif', detail: '13 kamar; tarif bulanan + harian/mingguan/2-mingguan terisi; deposit AC 200rb / non-AC 100rb.', status: 'selesai' },
      { label: 'Aturan tenant di app', detail: '8 kategori aturan + kalkulator “hitungan untukmu” di Portal → Panduan.', status: 'selesai' },
      { label: 'Backup harian + uji restore', detail: 'Dump DB + arsip app, retensi 14 hari, satu uji restore berhasil (20 Okt 2026).', status: 'selesai' },
      { label: 'Deploy & rollback', detail: 'Paket prebuilt, backup app+DB sebelum extract, smoke dari server.', status: 'selesai' },
    ],
  },
  {
    title: '3. Teknis yang belum selesai',
    items: [
      { label: 'Cron AutoOps di cPanel', detail: 'Pengingat kontrak, sweep booking, dan pengumuman terjadwal belum berjalan otomatis.', status: 'belum' },
      { label: 'PostgreSQL 9.6 (end-of-life)', detail: 'Tanyakan versi lebih baru ke hosting.', status: 'keputusan' },
      { label: 'Overlap proses Passenger', detail: 'Setelah restart bisa ada 2 proses hidup; pantau RAM 512 MB.', status: 'belum' },
      { label: 'Sisa aplikasi lama di server', detail: 'Beberapa direktori/arsip lama masih memakai kuota disk.', status: 'belum' },
    ],
  },
];

const URUTAN = [
  'Unggah foto F1/F2 + lengkapi email penghuni yang kosong.',
  'Kumpulkan: tanggal masuk, tarif kontrak, meter listrik awal, dan deposit per penghuni.',
  'Isi saldo awal kas/bank di Akuntansi.',
  'Buat hunian (check-in) 13 kamar, unggah + verifikasi KTP.',
  'Terbitkan tagihan pertama, cek portal tenant bisa dibuka.',
  'Pasang cron AutoOps, lalu rotasi JWT secret & password database.',
];

export default function CekPage() {
  const [tab, setTab] = useState<'checklist' | 'ketersediaan'>('checklist');
  const [build, setBuild] = useState<{ version?: string; buildId?: string } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/version.json', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => { if (alive) setBuild(data); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const totals = SECTIONS.flatMap((section) => section.items).reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { selesai: 0, sebagian: 0, belum: 0, keputusan: 0 } as Record<Status, number>,
  );

  return (
    <Container className="py-3" style={{ maxWidth: 820 }}>
      <h1 className="h4 mb-1">Checklist Go-Live &amp; Ketersediaan</h1>
      <p className="text-muted small mb-3">
        Satu halaman untuk menyiapkan go-live: daftar data yang masih kurang, status teknis, dan pengubah ketersediaan kamar.
        Tidak memuat password, NIK, atau data pribadi penghuni. Potret data 22 Oktober 2026.
      </p>

      <div className="mb-3 small text-muted">
        Build berjalan: <code>{build?.buildId ?? 'memuat…'}</code>
        {build?.version ? <> · versi <code>{build.version}</code></> : null}
      </div>

      <Nav variant="tabs" activeKey={tab} onSelect={(key) => setTab((key as typeof tab) || 'checklist')} className="mb-3">
        <Nav.Item>
          <Nav.Link eventKey="checklist">Checklist &amp; data kurang</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="ketersediaan">Ketersediaan kamar</Nav.Link>
        </Nav.Item>
      </Nav>

      {tab === 'ketersediaan' ? (
        <OkupansiPage embedded />
      ) : (
        <>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <Badge bg="success">Selesai {totals.selesai}</Badge>
            <Badge bg="warning" text="dark">Sebagian {totals.sebagian}</Badge>
            <Badge bg="secondary">Belum {totals.belum}</Badge>
            <Badge bg="info" text="dark">Perlu keputusan {totals.keputusan}</Badge>
          </div>

          {SECTIONS.map((section) => (
            <Card key={section.title} className="mb-3">
              <Card.Header className="fw-semibold">{section.title}</Card.Header>
              {section.note ? <Card.Body className="py-2 text-muted small border-bottom">{section.note}</Card.Body> : null}
              <ListGroup variant="flush">
                {section.items.map((item) => {
                  const badge = STATUS_BADGE[item.status];
                  return (
                    <ListGroup.Item key={item.label}>
                      <div className="d-flex align-items-start justify-content-between gap-2">
                        <div>
                          <div className="fw-semibold">{item.label}</div>
                          <div className="text-muted small">{item.detail}</div>
                        </div>
                        <Badge bg={badge.bg} text={badge.text} className="text-nowrap">
                          {badge.label}
                        </Badge>
                      </div>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            </Card>
          ))}

          <Card className="mb-3">
            <Card.Header className="fw-semibold">Urutan yang disarankan</Card.Header>
            <Card.Body>
              <ol className="mb-0 small ps-3">
                {URUTAN.map((step) => <li key={step} className="mb-1">{step}</li>)}
              </ol>
            </Card.Body>
          </Card>

          <p className="text-muted small mb-0">
            Status di atas potret manual; bila berbeda dengan antrean kerja internal, <code>docs/ANTREAN.md</code> yang berlaku.
          </p>
        </>
      )}
    </Container>
  );
}
