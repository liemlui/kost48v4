/**
 * KOST48 — Panduan & Aturan Kos (MyManualPage)
 * ==============================================
 * Tab: Aturan Kos (8 kategori dari SATU sumber `data/tenantRules.ts`), Panduan Cepat
 * (wizard 4 pertanyaan), kWh Meter, Cara Bayar, WiFi, Kontak.
 * Angka aturan dibaca dari `TenantRuleContext` (data kamar + `/settings/public-config`),
 * bukan konstanta halaman. Konten disinkronkan dengan `docs/domain/` pada 2026-10-21.
 */
import PageHeader from '../../components/common/PageHeader';
import { useMemo, useState } from 'react';
import { Accordion, Alert, Badge, Button, Card, Form, Nav, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicFaqs, type FaqItem } from '../../api/faqs';
import { fetchPublicConfig } from '../../api/settings';
import { getResource } from '../../api/resources';
import { PORTAL_QUERY_KEYS } from '../../api/portalQueryKeys';
import FreeRepairPolicyCard from '../../components/tenant/FreeRepairPolicyCard';
import DepositRulesCard from '../../components/tenant/DepositRulesCard';
import TenantRulesWizard from '../../components/tenant/TenantRulesWizard';
import {
  DEFAULT_TENANT_RULE_CONTEXT,
  TENANT_RULE_CATEGORIES,
  filterTenantRuleCategories,
  type TenantRuleContext,
} from '../../data/tenantRules';
import type { Stay } from '../../types';

const KOST_WHATSAPP_NUMBER = (import.meta.env.VITE_PUBLIC_ADMIN_WHATSAPP ?? '6285648887628').replace(/\D/g, '');
const WHATSAPP_URL = `https://wa.me/${KOST_WHATSAPP_NUMBER}`;
const KOST_WHATSAPP_DISPLAY = `0${KOST_WHATSAPP_NUMBER.slice(2)}`.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');

// ══════════════════════════════════════════════════════════════════════════════
// TAB PENDUKUNG (bukan aturan yang mengikat; dipertahankan dari panduan lama)
// ══════════════════════════════════════════════════════════════════════════════

const SUPPORT_TABS = [
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
        body: `• Matikan AC saat tidak di kamar.\n• Cabut charger setelah penuh.\n• Gunakan lampu LED hemat energi.\n• Matikan peralatan elektronik saat tidur.`,
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
        body: `• Transfer bank (BCA / Mandiri — nomor rekening dari pengelola).\n• Tunai ke pengelola (minta nota/kwitansi).\n• Bukti transfer diunggah di portal untuk diverifikasi admin.`,
      },
      {
        heading: 'Langkah Bayar + Upload Bukti',
        body: `1. Buka menu "Bayar Tagihan".\n2. Pilih tagihan yang mau dibayar.\n3. Klik "Bayar & Kirim Bukti".\n4. Transfer sesuai nominal yang tertera (tepat, tidak kurang).\n5. Upload foto/screenshot bukti transfer.\n6. Kirim — admin akan memverifikasi bukti sebelum pembayaran tercatat.\n\n✅ Status "Sedang Diperiksa" → admin sedang cek bukti.\n✅ Status "Selesai" → pembayaran diterima.`,
      },
      {
        heading: 'Jenis Tagihan',
        body: `• Tagihan Sewa (bulanan / sesuai kontrak).\n• Tagihan Listrik (pemakaian di atas jatah yang berlaku pada kontrak/kamar).\n• Tagihan WiFi (sesuai paket yang dipilih — opsional).\n• Tagihan Kerusakan (jika ada, atas kelalaian penghuni).`,
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
        body: `1. Buka menu "Pesan WiFi".\n2. Pilih paket yang tersedia — tarif dan ketentuan tampil di halaman itu.\n3. Klik "Pesan Sekarang" atau hubungi pengelola via WhatsApp.\n4. Pengelola akan menghubungi untuk konfirmasi dan instruksi pembayaran.\n5. Layanan diaktifkan setelah pembayaran dikonfirmasi pengelola.`,
      },
      {
        heading: 'Biaya & Ketentuan',
        body: `• Tarif dan ketentuan mengikuti paket yang tampil di halaman Pesan WiFi.\n• Jumlah perangkat mengikuti ketentuan paket yang dipilih.\n• Kecepatan stabil untuk browsing, streaming, dan video call.\n• WiFi khusus penghuni KOST48 — tidak bisa dipakai non-penghuni.`,
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

const TABS = [
  { key: 'aturan', icon: '📋', title: 'Aturan Kos' },
  { key: 'panduan', icon: '🧭', title: 'Panduan Cepat' },
  ...SUPPORT_TABS.map((t) => ({ key: t.key, icon: t.icon, title: t.title })),
];

function TabContent({ tab }: { tab: typeof SUPPORT_TABS[number] }) {
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

function isNotFoundError(error: unknown): boolean {
  const maybe = error as { response?: { status?: number; data?: { statusCode?: number } }; status?: number };
  return (
    maybe?.response?.status === 404 ||
    maybe?.response?.data?.statusCode === 404 ||
    maybe?.status === 404
  );
}

function readInitialTab(): { tab: string; category?: string } {
  const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
  if (TENANT_RULE_CATEGORIES.some((category) => category.id === hash)) {
    return { tab: 'aturan', category: hash };
  }
  if (TABS.some((tab) => tab.key === hash)) return { tab: hash };
  return { tab: 'aturan' };
}

export default function MyManualPage() {
  const initial = useMemo(readInitialTab, []);
  const [activeTab, setActiveTab] = useState(initial.tab);
  const [search, setSearch] = useState('');

  const faqsQuery = useQuery({ queryKey: ['public-faqs'], queryFn: fetchPublicFaqs });

  // Sumber angka: konstanta pengelola + data kamar tenant (bukan angka tetap).
  const publicConfigQuery = useQuery({
    queryKey: PORTAL_QUERY_KEYS.publicConfig,
    queryFn: fetchPublicConfig,
  });
  const stayQuery = useQuery({
    queryKey: PORTAL_QUERY_KEYS.currentStay,
    queryFn: async () => {
      try {
        return await getResource<Stay>('/stays/me/current');
      } catch (err: unknown) {
        if (isNotFoundError(err)) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: 30_000,
  });

  const stay = stayQuery.data ?? null;
  const ruleContext: TenantRuleContext = useMemo(
    () => ({
      petDepositRupiah: publicConfigQuery.data?.petDepositRupiah ?? DEFAULT_TENANT_RULE_CONTEXT.petDepositRupiah,
      extraOccupantPercent:
        publicConfigQuery.data?.extraOccupantFeePercent ?? DEFAULT_TENANT_RULE_CONTEXT.extraOccupantPercent,
      roomCode: stay?.room?.code ?? null,
      roomDepositRupiah: stay?.depositAmountRupiah ?? stay?.room?.defaultDepositRupiah ?? null,
    }),
    [publicConfigQuery.data, stay],
  );

  const filteredCategories = useMemo(
    () => filterTenantRuleCategories(search, ruleContext),
    [search, ruleContext],
  );

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

  const activeSupportTab = SUPPORT_TABS.find((t) => t.key === activeTab);

  return (
    <div>
      <PageHeader
        eyebrow="Portal Penghuni"
        title="Panduan & Aturan Kos"
        description="Semua yang perlu kamu tahu tentang tinggal di KOST48 — aturan, pembayaran, listrik, dan lainnya."
      />

      <div className="container py-4">
        <FreeRepairPolicyCard />

        <Card className="mb-3">
          <Card.Header className="p-0">
            <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'aturan')} className="flex-nowrap" style={{ overflowX: 'auto', flexWrap: 'nowrap', whiteSpace: 'nowrap', scrollbarWidth: 'thin' }}>
              {TABS.map((tab) => (
                <Nav.Item key={tab.key}>
                  <Nav.Link eventKey={tab.key} className="px-3 py-2" style={{ fontSize: '.9rem', fontWeight: activeTab === tab.key ? 600 : 400 }}>
                    {tab.icon} {tab.title}
                  </Nav.Link>
                </Nav.Item>
              ))}
            </Nav>
          </Card.Header>
          <Card.Body>
            {activeTab === 'aturan' ? (
              <>
                <DepositRulesCard
                  roomCode={ruleContext.roomCode}
                  roomDepositRupiah={ruleContext.roomDepositRupiah}
                  petDepositRupiah={ruleContext.petDepositRupiah}
                  className="mb-3"
                />

                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                  <div>
                    <strong>8 aturan yang mengikatmu</strong>
                    <div className="text-muted small">Setiap angka diambil dari data kamar dan Pengaturan pengelola.</div>
                  </div>
                  <Badge bg="light" text="dark">{filteredCategories.length} dari {TENANT_RULE_CATEGORIES.length} kategori</Badge>
                </div>

                <Form.Control
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari aturan — mis. hewan, DP, deposit, overstay, checkout"
                  aria-label="Cari aturan"
                  className="mb-3"
                />

                {filteredCategories.length === 0 ? (
                  <Alert variant="info" className="mb-0">
                    Tidak ada aturan yang cocok dengan “{search}”.{' '}
                    <Button variant="link" size="sm" className="p-0 align-baseline" onClick={() => setSearch('')}>
                      Tampilkan semua
                    </Button>
                  </Alert>
                ) : (
                  <Accordion flush defaultActiveKey={initial.category} alwaysOpen={false}>
                    {filteredCategories.map((category) => (
                      <Accordion.Item eventKey={category.id} key={category.id}>
                        <Accordion.Header>
                          <span className="me-2" aria-hidden>{category.icon}</span>
                          <span>
                            {category.title}
                            <span className="d-block text-muted fw-normal" style={{ fontSize: '.78rem' }}>{category.summary}</span>
                          </span>
                        </Accordion.Header>
                        <Accordion.Body>
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            {category.numbers.map((number) => (
                              <div key={number.label} className="tenant-rule-number" title={`Sumber: ${number.source}`}>
                                <span>{number.label}</span>
                                <strong>{number.value(ruleContext)}</strong>
                              </div>
                            ))}
                          </div>
                          {category.sections.map((section) => (
                            <div key={section.title} className="mb-2">
                              <strong className="d-block mb-1">{section.title}</strong>
                              <ul className="mb-0 ps-3">
                                {section.lines.map((line) => <li key={line}>{line}</li>)}
                              </ul>
                            </div>
                          ))}
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                )}

                <div className="mt-3">
                  <Button variant="outline-primary" size="sm" onClick={() => setActiveTab('panduan')}>
                    🧭 Bantu pilih aturan (4 pertanyaan)
                  </Button>
                </div>
              </>
            ) : null}

            {activeTab === 'panduan' ? (
              <TenantRulesWizard context={ruleContext} onSkip={() => setActiveTab('aturan')} />
            ) : null}

            {activeSupportTab ? <TabContent tab={activeSupportTab} /> : null}
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
