import { Badge, Card, Container, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';

/**
 * /cek — checklist go-live & status singkat untuk owner.
 *
 * Halaman statis (tanpa panggilan API, tanpa login) supaya bisa dibuka cepat dari HP.
 * Isinya sengaja TIDAK memuat kredensial/PII: hanya status dan langkah.
 * Perbarui daftar ini secara manual saat item selesai.
 * Sumber kebenaran antrean: docs/ANTREAN.md. Bila halaman ini berbeda dengan antrean
 * internal, antrean internal yang berlaku — perbarui halaman ini setiap antrean berubah.
 */

type Status = 'selesai' | 'sebagian' | 'belum' | 'keputusan';

const STATUS_BADGE: Record<Status, { bg: string; text?: string; label: string }> = {
  selesai: { bg: 'success', label: 'Selesai' },
  sebagian: { bg: 'warning', text: 'dark', label: 'Sebagian' },
  belum: { bg: 'secondary', label: 'Belum' },
  keputusan: { bg: 'info', text: 'dark', label: 'Perlu keputusan owner' },
};

const SECTIONS: Array<{
  title: string;
  note?: string;
  items: Array<{ label: string; detail: string; status: Status }>;
}> = [
  {
    title: '1. Deployment & teknis',
    note: 'Status 25 September 2026.',
    items: [
      { label: 'Aplikasi live', detail: 'kost48surabaya.com — versi 1.3.0, Passenger menyajikan SPA + API', status: 'selesai' },
      { label: 'Database produksi', detail: 'Database baru, 13 kamar, 38 akun COA', status: 'selesai' },
      { label: 'HTTPS & header cache', detail: 'PWA: /sw.js dan /version.json no-store', status: 'selesai' },
      { label: 'Gate KTP', detail: 'Mekanisme tersedia, tetapi gerbang KTP di produksi ditunda atas keputusan owner 23 Sep — wajib ditinjau sebelum onboarding penghuni nyata', status: 'keputusan' },
      { label: 'Deploy commit lokal terbaru', detail: 'Menunggu rencana rilis: artefak, target, langkah rollback, dan uji sesudah deploy', status: 'belum' },
      { label: 'Backup pra-deploy', detail: 'Database + aplikasi lama tersimpan di folder backups', status: 'selesai' },
    ],
  },
  {
    title: '2. Akun & akses',
    items: [
      { label: 'Akun OWNER', detail: 'Sudah bisa login; password sementara ada di file di server', status: 'sebagian' },
      { label: '13 akun portal penghuni', detail: '12 punya akun portal; GUNAWAN (F1) tanpa akun karena akan keluar', status: 'selesai' },
      { label: 'Akun STAFF', detail: 'Belum dibuat — opsional bila ada staf', status: 'belum' },
    ],
  },
  {
    title: '3. Fondasi akuntansi',
    items: [
      { label: 'Bagan akun (COA)', detail: '38 akun standar sudah tersedia', status: 'selesai' },
      { label: 'Periode OPEN', detail: 'Periode bulan berjalan sudah dibuka', status: 'selesai' },
      { label: 'Kas & bank', detail: 'Kas Tunai + Bank Utama (saldo awal 0)', status: 'selesai' },
      { label: 'Saldo awal (opening balance)', detail: 'Butuh angka kas + saldo bank riil per tanggal cutover', status: 'keputusan' },
      { label: 'Transaksi pertama', detail: 'Terisi otomatis saat invoice/pembayaran pertama', status: 'belum' },
    ],
  },
  {
    title: '4. Onboarding penghuni',
    note: 'Urutan wajib: tenant → KTP → verifikasi → hunian. Jangan lompat.',
    items: [
      { label: 'Data 13 penghuni', detail: 'Nama, NIK, HP, dan sewa yang disepakati sudah tersimpan', status: 'selesai' },
      { label: 'Hunian (check-in)', detail: 'Belum dibuat — menunggu bulan masuk & angka meter listrik', status: 'belum' },
      { label: 'Verifikasi KTP', detail: 'Wajib sebelum kamar bisa diaktifkan (gate aktif)', status: 'belum' },
      { label: 'Meter listrik awal', detail: 'Butuh 13 angka kWh hasil cek fisik', status: 'belum' },
      { label: 'Tagihan pertama', detail: 'Dibuat setelah hunian aktif', status: 'belum' },
    ],
  },
  {
    title: '5. Operasional harian',
    items: [
      { label: 'Ubah ketersediaan kamar', detail: 'Halaman /okupansi (PIN owner) — sudah diuji berfungsi', status: 'selesai' },
      { label: 'Kron AutoOps', detail: 'Belum dipasang; pengingat & pengumuman terjadwal belum jalan', status: 'belum' },
      { label: 'Status kamar di katalog', detail: 'Terisi 12 kamar, tersedia 1 kamar (lihat /okupansi)', status: 'sebagian' },
      { label: 'Jumlah proses Passenger', detail: 'Saat ini 2 proses hidup (overlap restart) — perlu diukur/dirapikan bila RAM ketat', status: 'belum' },
    ],
  },
  {
    title: '6. Keamanan & pemeliharaan',
    items: [
      { label: 'Rotasi JWT secret & password database', detail: 'Ditunda atas keputusan owner — WAJIB sebelum data penghuni asli diisi', status: 'keputusan' },
      { label: 'Ganti PIN owner', detail: 'PIN saat ini masih nilai lama yang lemah', status: 'keputusan' },
      { label: 'Ganti password OWNER & 13 tenant', detail: 'Password awal bersifat sementara', status: 'belum' },
      { label: 'Versi PostgreSQL', detail: 'Server memakai 9.6 yang sudah end-of-life — tanyakan ke hosting', status: 'keputusan' },
      { label: 'Bersihkan sisa aplikasi lama', detail: 'Dua direktori + arsip besar masih memakai kuota disk', status: 'belum' },
    ],
  },
  {
    title: '7. Dua mode: Cepat & Normal (agenda AI)',
    note: 'Arah 25 September 2026: halaman Normal tetap seperti sekarang; halaman baru "Mode Cepat" menyusun arahan kerja — AI hanya untuk owner dan dihitung terjadwal, biaya ditampilkan hanya ke owner.',
    items: [
      { label: 'Keputusan dua mode', detail: 'Sudah ditetapkan owner 25 Sep: halaman Cepat berdampingan dengan Normal, halaman Normal tidak diubah', status: 'sebagian' },
      { label: 'Kartu keputusan tanpa AI (aturan biasa)', detail: 'Fondasi untuk semua role; tetap tampil walau AI mati atau kuota habis', status: 'belum' },
      { label: 'Halaman Mode Cepat + pilihan setelah login', detail: 'Owner & admin memilih Cepat atau Normal; staff & tenant langsung masuk Cepat', status: 'belum' },
      { label: 'Tautan rekomendasi bisa diklik', detail: 'AI sudah mengirim tautan lokasi tindakan, tetapi belum ditampilkan sebagai tombol', status: 'sebagian' },
      { label: 'Agenda AI otomatis 1x sehari + info biaya', detail: 'Dihitung terjadwal lalu disimpan; membuka halaman tidak memanggil AI', status: 'belum' },
      { label: 'Catat pemakaian & harga AI', detail: 'Prasyarat sebelum angka biaya boleh ditampilkan; saat ini yang jujur hanya kuota', status: 'belum' },
      { label: 'Kirim ringkasan ke WhatsApp & cetak', detail: 'Untuk owner & admin; tanpa NIK, foto, atau alamat', status: 'belum' },
      { label: 'Tinjauan pemakaian setelah 30 hari', detail: 'Menentukan apakah isi kartu perlu diperbaiki; bukan menambah fitur', status: 'belum' },
    ],
  },
];

export default function CekPage() {
  const totals = SECTIONS.flatMap((section) => section.items).reduce(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    { selesai: 0, sebagian: 0, belum: 0, keputusan: 0 } as Record<Status, number>,
  );

  return (
    <Container className="py-3" style={{ maxWidth: 760 }}>
      <h1 className="h4 mb-1">Checklist Go-Live KOST48</h1>
      <p className="text-muted small">
        Ringkasan status persiapan produksi. Halaman ini tidak memuat password, NIK, atau data pribadi penghuni.
        Diperbarui manual; bila berbeda dengan antrean kerja internal, antrean internal yang berlaku.
      </p>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Badge bg="success">Selesai {totals.selesai}</Badge>
        <Badge bg="warning" text="dark">Sebagian {totals.sebagian}</Badge>
        <Badge bg="secondary">Belum {totals.belum}</Badge>
        <Badge bg="info" text="dark">Perlu keputusan {totals.keputusan}</Badge>
      </div>

      {SECTIONS.map((section) => (
        <Card key={section.title} className="mb-3">
          <Card.Header className="fw-semibold">{section.title}</Card.Header>
          {section.note && <Card.Body className="py-2 text-muted small border-bottom">{section.note}</Card.Body>}
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
        <Card.Header className="fw-semibold">Urutan yang disarankan berikutnya</Card.Header>
        <Card.Body>
          <ol className="mb-0 small">
            <li>Ganti PIN owner (murah dan cepat).</li>
            <li>Siapkan 4 data: bulan masuk, meter listrik awal, saldo kas/bank, dan deposit per penghuni.</li>
            <li>Isi saldo awal di menu Akuntansi.</li>
            <li>Buat hunian (check-in) 13 kamar + verifikasi KTP.</li>
            <li>Pasang kron AutoOps di cPanel.</li>
            <li>Rotasi JWT secret &amp; password database sebelum data penghuni asli dipakai.</li>
          </ol>
          <p className="text-muted small mb-0 mt-2">
            Jalur paralel: bagian 7 (dua mode Cepat &amp; Normal) berjalan tanpa menunggu item di atas — mulai dari kartu
            keputusan tanpa AI, lalu menampilkan tautan rekomendasi AI sebagai tombol pada halaman Mode Cepat.
          </p>
        </Card.Body>
      </Card>

      <div className="text-center small">
        <Link to="/okupansi">Ubah ketersediaan kamar</Link>
      </div>
    </Container>
  );
}
