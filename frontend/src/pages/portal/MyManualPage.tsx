/**
 * KOST48 — Panduan & Aturan Kos (MyManualPage)
 * ==============================================
 * 7 tab terstruktur: Aturan, Perpanjangan, Checkout, kWh Meter, Cara Bayar, WiFi, Kontak.
 * Konten di bawah adalah DRAFT AI — silakan review & edit oleh owner.
 */
import PageHeader from '../../components/common/PageHeader';
import { useState, useMemo } from 'react';
import { Accordion, Alert, Button, Card, Nav, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicFaqs, type FaqItem } from '../../api/faqs';
import FreeRepairPolicyCard from '../../components/tenant/FreeRepairPolicyCard';

const KOST_WHATSAPP_NUMBER = (import.meta.env.VITE_PUBLIC_ADMIN_WHATSAPP ?? '6285648887628').replace(/\D/g, '');
const WHATSAPP_URL = `https://wa.me/${KOST_WHATSAPP_NUMBER}`;
const KOST_WHATSAPP_DISPLAY = `0${KOST_WHATSAPP_NUMBER.slice(2)}`.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');

// ══════════════════════════════════════════════════════════════════════════════
// KONTEN PANDUAN (DRAFT AI — REVIEW OWNER SEBELUM PUBLISH)
// ══════════════════════════════════════════════════════════════════════════════

const GUIDE_TABS = [
  {
    key: 'aturan',
    icon: '📋',
    title: 'Aturan Kos',
    sections: [
      {
        heading: 'Jam Tamu & Akses',
        body: `• Tamu diperbolehkan berkunjung pukul 07.00–22.00 WIB.\n• Tamu wajib lapor ke staf/pengelola saat datang.\n• Tamu tidak diizinkan masuk area kamar di luar jam berkunjung.\n• Tamu yang menginap HARUS izin 1 hari sebelumnya — dikenakan biaya Rp50.000/malam.`,
      },
      {
        heading: 'Kebersihan & Ketertiban',
        body: `• Setiap penghuni wajib menjaga kebersihan kamar masing-masing.\n• Area bersama (koridor, dapur, kamar mandi luar, teras) — gotong royong bersih setiap Minggu pagi.\n• Sampah harap dibuang ke tempat sampah yang disediakan setiap hari.\n• Dilarang membuat keributan yang mengganggu penghuni lain — jam tenang 22.00–06.00 WIB.\n• Musik/audio harap pakai headphone setelah jam 22.00.`,
      },
      {
        heading: 'Larangan',
        body: `• DILARANG KERAS: narkoba, minuman keras, senjata tajam, senjata api.\n• Dilarang merokok di dalam kamar — area merokok tersedia di teras luar.\n• Dilarang memelihara hewan peliharaan di dalam kamar.\n• Dilarang memodifikasi instalasi listrik/air tanpa izin pengelola.\n• Dilarang mengecat dinding atau membuat lubang permanen tanpa izin.\n• Dilarang meminjamkan kunci kamar kepada non-penghuni.`,
      },
      {
        heading: 'Parkir',
        body: `• Parkir motor tersedia di area parkir depan (gratis untuk penghuni).\n• Parkir mobil terbatas — koordinasi dengan pengelola.\n• Jangan memarkir kendaraan di depan pintu darurat atau akses koridor.\n• Kunci stang/ganda untuk keamanan kendaraan — pengelola tidak bertanggung jawab atas kehilangan.`,
      },
      {
        heading: 'Keamanan',
        body: `• Kunci kamar sendiri setiap keluar — jangan titip kunci ke sembarang orang.\n• CCTV beroperasi 24 jam di area koridor dan pintu masuk.\n• Laporkan orang mencurigakan ke staf atau pengelola segera.\n• Smart lock gerbang utama menggunakan kode akses — JANGAN bagikan kode ke non-penghuni.`,
      },
      {
        heading: 'Hak & Kewajiban',
        body: `HAK PENGHUNI:\n• Mendapatkan fasilitas sesuai yang tercantum di inventaris kamar.\n• Mendapatkan perbaikan gratis untuk kerusakan wajar (lampu, kran, shower, kloset, stop kontak, kebocoran).\n• Mendapatkan jatah listrik sesuai kontrak dan konfigurasi kamar yang tampil di portal.\n• Mendapatkan akses portal penghuni 24 jam untuk bayar, lapor, pantau meter.\n\nKEWAJIBAN PENGHUNI:\n• Membayar sewa tepat waktu sesuai jatuh tempo.\n• Menjaga fasilitas kos — kerusakan akibat kelalaian ditanggung penghuni.\n• Melapor ke pengelola jika ada masalah (kerusakan, gangguan, darurat).\n• Mengikuti aturan yang berlaku — pelanggaran berulang dapat berakibat pemutusan sewa.`,
      },
    ],
  },
  {
    key: 'perpanjangan',
    icon: '🔄',
    title: 'Perpanjang Sewa',
    sections: [
      {
        heading: 'Timeline Perpanjangan',
        body: `H-30 sebelum akhir sewa:\n  → Kamu mendapat notifikasi di portal.\n  → Buka menu "Panduan Kos Saya" → klik tombol "Perpanjang".\n  → Pilih durasi perpanjangan (1 bulan / 3 bulan / 6 bulan / 1 tahun).\n  → Tagihan DP (Down Payment 30% dari total sewa) diterbitkan.\n\nDP (30%) harus dibayar maksimal H-1 sebelum akhir sewa.\n\nH-7 setelah DP lunas:\n  → Tagihan pelunasan (sisa 70%) diterbitkan.\n  → Bayar pelunasan sebelum masa sewa baru dimulai.\n\nSETELAH LUNAS:\n  → Status sewa otomatis diperpanjang.\n  → Tidak ada biaya tambahan atau denda.`,
      },
      {
        heading: 'Catatan Penting',
        body: `• DP 30% bersifat HANGUS jika kamu batal setelah DP dibayar.\n• Perpanjangan TIDAK bisa dicicil — bayar tepat nominal (DP atau pelunasan penuh).\n• Jika belum perpanjang sampai H-1, kamar akan dibuka untuk penghuni baru.\n• Tarif perpanjangan mengikuti tarif kontrak kamu (bukan tarif publik terbaru).`,
      },
      {
        heading: 'Durasi & Diskon',
        body: `• Bulanan: tarif normal\n• 3 bulan: tarif normal × 3\n• 6 bulan: tarif normal × 5,7 (diskon 5%)\n• 1 tahun: tarif normal × 11 (diskon 1 bulan gratis! 🎉)`,
      },
    ],
  },
  {
    key: 'checkout',
    icon: '🚪',
    title: 'Checkout / Pindah',
    sections: [
      {
        heading: 'Syarat Checkout',
        body: `• Semua tagihan LUNAS (sewa + listrik + WiFi + lainnya).\n• Tidak ada tiket kerusakan yang belum selesai.\n• Kembalikan kunci kamar ke pengelola.\n• Bersihkan kamar dari barang pribadi — kosongkan seluruhnya.`,
      },
      {
        heading: 'Proses Checkout',
        body: `1. Buka menu "Panduan Kos Saya" → klik "Ajukan Keluar".\n2. Pilih tanggal rencana keluar.\n3. Admin akan menghitung tagihan final (listrik + sewa sisa).\n4. Lunasi tagihan final.\n5. Admin inspeksi kamar — pastikan tidak ada kerusakan.\n6. Kunci dikembalikan.\n7. Deposit jaminan dikembalikan (refund) dalam 7 hari kerja.\n\n⏱️ Estimasi total proses: 3–7 hari kerja setelah pengajuan.`,
      },
      {
        heading: 'Deposit Jaminan',
        body: `• Deposit jaminan adalah uang jaminan yang dibayar saat pertama masuk.\n• Deposit DIKEMBALIKAN PENUH saat checkout jika tidak ada kerusakan.\n• Kerusakan akibat kelalaian penghuni akan dipotong dari deposit.\n• Nominal deposit per kamar: Rp300.000–Rp600.000 (tergantung tipe kamar).\n• BUKAN uang sewa — tidak bisa dipakai untuk bayar sewa bulan terakhir.`,
      },
      {
        heading: 'Pindah Kamar',
        body: `• Bisa pindah antar kamar KOST48 (jika tersedia).\n• Ajukan via staf atau pengelola.\n• Selisih tarif disesuaikan.\n• Deposit mengikuti kamar baru.`,
      },
    ],
  },
  {
    key: 'kwh',
    icon: '⚡',
    title: 'Listrik & kWh Meter',
    sections: [
      {
        heading: 'Cara Kerja',
        body: `Kamar menggunakan pencatatan meter resmi. Jika meter otomatis tersedia dan sudah dipetakan ke kamarmu, pembaruan sensor juga dapat dipantau di portal.\nData sensor bersifat monitoring; nominal tagihan tetap mengikuti catatan meter yang ditinjau pengelola.`,
      },
      {
        heading: 'Jatah & Tarif',
        body: `• Besar jatah listrik gratis dan tarif kelebihan dapat berbeda menurut kontrak/kamar.\n• Nilai yang berlaku selalu ditampilkan pada halaman energi dan rincian tagihan.\n• Siklus mengikuti periode sewa/tagihan aktif, bukan otomatis awal bulan kalender.`,
      },
      {
        heading: 'Cara Catat Meter',
        body: `1. Buka menu "Panduan Kos Saya" → klik tombol "Catat Meter".\n2. Masukkan angka yang tertera di meteran listrik kamarmu.\n3. Foto meteran sebagai bukti (opsional).\n4. Klik "Simpan" — pemakaian otomatis dihitung.\n\n📸 Tips: Pastikan angka dan seluruh layar meter terbaca jelas pada foto.\n\n⏰ Tombol pencatatan dibuka mulai H-10 sampai tanggal akhir sewa yang tampil di portal.`,
      },
      {
        heading: 'Pantau Pemakaian Terkini',
        body: `Di dashboard "Panduan Kos Saya", kamu bisa melihat:\n• Pembacaan sensor terbaru, bila perangkat otomatis tersedia.\n• Pemakaian periode aktif dan simulasi biaya berdasarkan data yang tersedia.\n• Riwayat yang sudah tersimpan pada sistem.\n• Status koneksi serta kesegaran data meter.\n\nPortal memeriksa pembaruan secara berkala; ini bukan jaminan sensor mengirim nilai baru pada setiap pemeriksaan.`,
      },
      {
        heading: 'Hemat Listrik 💡',
        body: `• Matikan AC saat tidak di kamar.\n• Cabut charger setelah penuh.\n• Gunakan lampu LED hemat energi.\n• Matikan peralatan elektronik saat tidur.\n\nRata-rata pemakaian normal: 30–60 kWh/bulan (dengan AC).`,
      },
    ],
  },
  {
    key: 'bayar',
    icon: '💳',
    title: 'Cara Bayar',
    sections: [
      {
        heading: 'Metode Pembayaran',
        body: `• Transfer bank (BCA / Mandiri — nomor rekening dari pengelola).\n• Tunai ke pengelola (minta nota/kwitansi).\n• QRIS / GoPay / DANA / ShopeePay (konfirmasi ke pengelola).`,
      },
      {
        heading: 'Langkah Bayar + Upload Bukti',
        body: `1. Buka menu "Bayar Tagihan".\n2. Pilih tagihan yang mau dibayar.\n3. Klik "Bayar & Kirim Bukti".\n4. Transfer sesuai nominal yang tertera (tepat, tidak kurang).\n5. Upload foto/screenshot bukti transfer.\n6. Kirim — admin akan verifikasi maksimal 1×24 jam.\n\n✅ Status "Sedang Diperiksa" → admin sedang cek bukti.\n✅ Status "Selesai" → pembayaran diterima.`,
      },
      {
        heading: 'Jenis Tagihan',
        body: `• Tagihan Sewa (bulanan / sesuai kontrak).\n• Tagihan Listrik (pemakaian di atas jatah yang berlaku pada kontrak/kamar).\n• Tagihan WiFi (Rp50.000/bulan/perangkat — opsional).\n• Tagihan Kerusakan (jika ada, atas kelalaian penghuni).`,
      },
      {
        heading: 'Jatuh Tempo & Keterlambatan',
        body: `• Tagihan sewa: jatuh tempo sesuai tanggal check-in setiap bulan.\n• Tagihan listrik: jatuh tempo 7 hari setelah diterbitkan.\n• TIDAK ada denda keterlambatan.\n• Namun tagihan yang menunggak dapat menghambat proses perpanjangan/checkout.\n• Jika menunggak >30 hari, pengelola berhak memutus sewa.`,
      },
    ],
  },
  {
    key: 'wifi',
    icon: '📶',
    title: 'WiFi',
    sections: [
      {
        heading: 'Cara Pesan',
        body: `1. Buka menu "Pesan WiFi".\n2. Klik "Tambah Perangkat".\n3. Masukkan nama perangkat (contoh: "Laptop Andi" atau "HP Samsung").\n4. Lakukan pembayaran Rp50.000.\n5. Admin akan mengaktifkan WiFi untuk perangkat kamu dalam 1×24 jam.`,
      },
      {
        heading: 'Biaya & Ketentuan',
        body: `• Rp50.000/bulan/perangkat.\n• Maksimal 3 perangkat per kamar.\n• Kecepatan stabil untuk browsing, streaming, dan video call.\n• WiFi khusus penghuni KOST48 — tidak bisa dipakai non-penghuni.`,
      },
      {
        heading: 'Cara Koneksi',
        body: `Setelah diaktifkan admin:\n1. Buka WiFi di perangkat kamu.\n2. Pilih SSID "KOST48".\n3. Masukkan password dari admin.\n4. Selesai — perangkatmu sudah terhubung!`,
      },
    ],
  },
  {
    key: 'kontak',
    icon: '📞',
    title: 'Kontak Penting',
    sections: [
      {
        heading: 'Pengelola KOST48',
        body: `WhatsApp: ${KOST_WHATSAPP_DISPLAY}\nTelepon: (akan diisi owner)\n\nJam operasional: 08.00–20.00 WIB\nDarurat di luar jam operasional: tetap bisa WA.`,
      },
      {
        heading: 'Darurat',
        body: `• Ambulans: 119 / 118\n• Polisi: 110\n• Pemadam Kebakaran: 113\n• Rumah Sakit terdekat: (isi sesuai lokasi)\n• Kantor Polisi terdekat: (isi sesuai lokasi)`,
      },
      {
        heading: 'Fasilitas Sekitar',
        body: `• Pakuwon Mall / PTC: 5 menit naik motor\n• Indomaret: 2 menit jalan kaki\n• Alfamart: 3 menit jalan kaki\n• SPBU: 5 menit\n• Masjid terdekat: 3 menit jalan kaki`,
      },
    ],
  },
];

function TabContent({ tab }: { tab: typeof GUIDE_TABS[number] }) {
  return (
    <Accordion flush alwaysOpen={false} defaultActiveKey={tab.sections[0]?.heading ?? undefined}>
      {tab.sections.map((section, i) => (
        <Accordion.Item eventKey={section.heading} key={i}>
          <Accordion.Header>{section.heading}</Accordion.Header>
          <Accordion.Body style={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>
            {section.body}
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

export default function MyManualPage() {
  const [activeTab, setActiveTab] = useState(GUIDE_TABS[0].key);
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
    <div>
      <PageHeader
        eyebrow="Portal Penghuni"
        title="Panduan & Aturan Kos"
        description="Semua yang perlu kamu tahu tentang tinggal di KOST48 — aturan, pembayaran, listrik, dan lainnya."
      />

      <div className="container py-4">
        <FreeRepairPolicyCard />

        {/* ── 7 TAB UTAMA ── */}
        <Card className="mb-3">
          <Card.Header className="p-0">
            <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k || GUIDE_TABS[0].key)} className="flex-nowrap" style={{ overflowX: 'auto', flexWrap: 'nowrap', whiteSpace: 'nowrap', scrollbarWidth: 'thin' }}>
              {GUIDE_TABS.map((tab) => (
                <Nav.Item key={tab.key}>
                  <Nav.Link eventKey={tab.key} className="px-3 py-2" style={{ fontSize: '.9rem', fontWeight: activeTab === tab.key ? 600 : 400 }}>
                    {tab.icon} {tab.title}
                  </Nav.Link>
                </Nav.Item>
              ))}
            </Nav>
          </Card.Header>
          <Card.Body>
            <TabContent tab={GUIDE_TABS.find((t) => t.key === activeTab) || GUIDE_TABS[0]} />
          </Card.Body>
        </Card>

        {/* ── FAQ ADMIN (jika ada) ── */}
        {faqsQuery.isLoading && <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>}

        {!faqsQuery.isLoading && grouped.length > 0 && (
          <Card className="mb-3 border-top-0">
            <Card.Header><strong>📖 FAQ Tambahan dari Pengelola</strong></Card.Header>
            {grouped.map(([category, items]) => (
              <Accordion flush alwaysOpen={false} key={category} defaultActiveKey={items[0] ? String(items[0].id) : undefined}>
                <Accordion.Item eventKey={category}>
                  <Accordion.Header>{category}</Accordion.Header>
                  <Accordion.Body>
                    {items.map((faq, i) => (
                      <div key={faq.id} style={{ marginBottom: i < items.length - 1 ? 12 : 0 }}>
                        <strong>{faq.question}</strong>
                        <p className="mb-0 mt-1" style={{ whiteSpace: 'pre-line' }}>{faq.answer}</p>
                      </div>
                    ))}
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            ))}
          </Card>
        )}

        {/* ── KONTAK WHATSAPP ── */}
        <Card className="border-0 bg-primary bg-opacity-10 mt-2">
          <Card.Body className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-3">
            <div>
              <strong>📞 Butuh bantuan?</strong>
              <div className="small text-muted">Pengelola siap membantu via WhatsApp.</div>
            </div>
            <Button as="a" href={WHATSAPP_URL} target="_blank" rel="noreferrer" variant="success" size="sm">
              💬 Chat WhatsApp {KOST_WHATSAPP_DISPLAY}
            </Button>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
