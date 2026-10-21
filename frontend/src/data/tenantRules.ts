/**
 * KOST48 — Sumber tunggal aturan penghuni (W-TNT-001).
 * =====================================================
 * Dipakai oleh halaman Panduan tenant (`MyManualPage`) dan wizard aturan.
 *
 * Prinsip:
 *  - Setiap ANGKA punya `source` yang menunjuk kode/dokumen kanonik. Jangan
 *    menambah angka baru di sini tanpa sumber; FAQ/DB bukan sumber aturan.
 *  - Angka yang bergantung data (deposit kamar/hewan) dibaca dari
 *    `TenantRuleContext`, bukan ditulis sebagai konstanta.
 *  - Teks sengaja tidak memuat klaim yang tidak ditegakkan kode (tamu
 *    Rp50.000/malam, denda merokok Rp200.000, refund 7 hari kerja,
 *    QRIS/e-wallet).
 */
import { formatRupiah } from '../utils/formatCurrency';

export type TenantRuleCategoryId =
  | 'hewan'
  | 'penghuni'
  | 'prabayar'
  | 'pembayaran'
  | 'deposit'
  | 'overstay'
  | 'checkout'
  | 'ktp';

export type TenantRuleContext = {
  /** `OperationalSetting.petDepositRupiah` — default backend 100.000. */
  petDepositRupiah: number;
  /** `OperationalSetting.extraOccupantFeePercent` — default backend 20. */
  extraOccupantPercent: number;
  /** `Room.code` kamar tenant (bila sudah punya masa sewa). */
  roomCode?: string | null;
  /** `Room.defaultDepositRupiah` / `Stay.depositAmountRupiah` kamar tenant. */
  roomDepositRupiah?: number | null;
};

/**
 * Fallback saat `/settings/public-config` belum termuat. Nilainya menyalin
 * default backend (`settings.service.ts` `getOperationalDefaults`), bukan
 * angka baru — UI akan memakai nilai server begitu tersedia.
 */
export const DEFAULT_TENANT_RULE_CONTEXT: TenantRuleContext = {
  petDepositRupiah: 100000,
  extraOccupantPercent: 20,
};

export type TenantRuleNumber = {
  label: string;
  value: (ctx: TenantRuleContext) => string;
  /** Rujukan kanonik — tampil sebagai tooltip/catatan kecil di UI. */
  source: string;
};

export type TenantRuleSection = {
  title: string;
  lines: string[];
};

export type TenantRuleCategory = {
  id: TenantRuleCategoryId;
  icon: string;
  title: string;
  summary: string;
  keywords: string[];
  numbers: TenantRuleNumber[];
  sections: TenantRuleSection[];
};

const pct = (ctx: TenantRuleContext) => `${ctx.extraOccupantPercent}% × tarif periode`;

export const TENANT_RULE_CATEGORIES: TenantRuleCategory[] = [
  {
    id: 'hewan',
    icon: '🐾',
    title: 'Hewan peliharaan',
    summary: 'Diizinkan dengan pemberitahuan; ada deposit terpisah yang refundable.',
    keywords: ['hewan', 'peliharaan', 'kucing', 'anjing', 'pet', 'deposit hewan'],
    numbers: [
      {
        label: 'Deposit hewan',
        value: (ctx) => formatRupiah(ctx.petDepositRupiah),
        source: 'Pengaturan → petDepositRupiah (settings.service.ts)',
      },
      {
        label: 'Sifat',
        value: () => 'Refundable',
        source: 'keuangan.md §7 — deposit adalah dana titip, bukan revenue',
      },
    ],
    sections: [
      {
        title: 'Cara membawa hewan',
        lines: [
          'Beri tahu pengelola saat booking atau check-in — jangan diam-diam.',
          'Deposit hewan dibayar sekali bersama deposit kamar, bukan biaya bulanan.',
          'Hewan tidak boleh mengganggu penghuni lain; keluhan berulang dapat membatasi izin.',
        ],
      },
      {
        title: 'Kapan deposit hewan kembali',
        lines: [
          'Dikembalikan saat checkout bila tidak ada kerusakan akibat hewan.',
          'Bila ada kerusakan, potongan dicatat dan sisanya dikembalikan.',
          'Deposit hewan bukan biaya sewa.',
        ],
      },
    ],
  },
  {
    id: 'penghuni',
    icon: '👥',
    title: 'Jumlah penghuni',
    summary: 'Batas gratis 2 orang (STANDARD) atau 4 orang (LARGE); kelebihan +20% per kepala.',
    keywords: ['penghuni', 'orang', 'kapasitas', 'surcharge', 'tambahan', 'extra', 'kepala'],
    numbers: [
      {
        label: 'Gratis STANDARD',
        value: () => '2 orang',
        source: 'pricing.helper.ts ROOM_MAX_FREE_OCCUPANTS',
      },
      {
        label: 'Maks STANDARD',
        value: () => '4 orang',
        source: 'pricing.helper.ts ROOM_MAX_OCCUPANTS',
      },
      {
        label: 'Gratis LARGE',
        value: () => '4 orang',
        source: 'pricing.helper.ts ROOM_MAX_FREE_OCCUPANTS',
      },
      {
        label: 'Maks LARGE',
        value: () => '6 orang',
        source: 'pricing.helper.ts ROOM_MAX_OCCUPANTS',
      },
      {
        label: 'Kepala ekstra',
        value: pct,
        source: 'keuangan.md §8 — keputusan owner D-24',
      },
      {
        label: 'Pembulatan',
        value: () => 'Rp 5.000 ke atas',
        source: 'pricing.helper.ts PRICING_ROUND_TO',
      },
    ],
    sections: [
      {
        title: 'Batas gratis dan batas maksimal',
        lines: [
          'Kamar STANDARD: 2 orang tanpa biaya tambahan, maksimal 4 orang.',
          'Kamar LARGE: 4 orang tanpa biaya tambahan, maksimal 6 orang.',
          'Lebih dari 2 kepala ekstra tidak bisa dipesan sistem (kamar tidak layak huni).',
        ],
      },
      {
        title: 'Cara menghitung surcharge',
        lines: [
          'Surcharge = tarif periode × persentase × jumlah kepala ekstra, dibulatkan ke atas ke Rp5.000.',
          'Contoh: tarif periode Rp1.000.000 dan 1 kepala ekstra → Rp200.000.',
          'Surcharge masuk ke sewa periode itu, sehingga ikut menentukan DP 30%.',
        ],
      },
      {
        title: 'Yang wajib dicatat',
        lines: [
          'Jumlah penghuni dikonfirmasi ke pengelola dan dicatat di kontrak.',
          'Perubahan jumlah penghuni setelah check-in diatur lewat pengelola, bukan otomatis.',
        ],
      },
    ],
  },
  {
    id: 'prabayar',
    icon: '📆',
    title: 'Prabayar & diskon',
    summary: 'Bayar di muka 1–24 bulan; harga bulanan dikunci, diskon untuk 6/12 bulan.',
    keywords: ['prabayar', 'di muka', 'diskon', 'tahunan', 'semester', 'bulanan', 'mingguan', 'rent-lock'],
    numbers: [
      {
        label: '2 minggu',
        value: () => '0,75× tarif bulanan',
        source: 'pricing.helper.ts PRICING_MULTIPLIERS',
      },
      {
        label: '6 bulan',
        value: () => '5,7× tarif bulanan',
        source: 'keuangan.md §2 — SMESTERLY',
      },
      {
        label: '1 tahun',
        value: () => '11× tarif bulanan',
        source: 'keuangan.md §2 — YEARLY',
      },
      {
        label: 'Rentang prabayar',
        value: () => '1–24 bulan',
        source: 'keuangan.md §10 — D-18',
      },
      {
        label: 'Pembulatan',
        value: () => 'Rp 5.000 ke atas',
        source: 'pricing.helper.ts PRICING_ROUND_TO',
      },
    ],
    sections: [
      {
        title: 'Cara kerja',
        lines: [
          'Kamu boleh membayar di muka kapan saja, tidak harus menunggu kontrak habis.',
          'Harga bulanan dikunci selama kontrak tidak putus (rent-lock D-16).',
          'Prabayar diblokir bila masih ada tagihan terbit/sebagian.',
        ],
      },
      {
        title: 'Diskon jangka panjang',
        lines: [
          '6 bulan: tarif bulanan × 5,7 — efektif sekitar 5% lebih murah per bulan.',
          '1 tahun: tarif bulanan × 11 — efektif sekitar 8,3% lebih murah per bulan.',
          'Diskon hanya berlaku untuk prabayar penuh, bukan cicilan.',
        ],
      },
      {
        title: 'Listrik & air',
        lines: [
          'Sewa 2 minggu: listrik & air sudah termasuk (all-in).',
          'Bulanan, 6 bulan, dan 1 tahun: listrik & air dihitung dari meter sesuai setting kamar.',
        ],
      },
    ],
  },
  {
    id: 'pembayaran',
    icon: '💳',
    title: 'Pembayaran & DP',
    summary: 'DP 30% mengunci kamar; pelunasan sekali bayar; bukti transfer diperiksa admin.',
    keywords: ['bayar', 'pembayaran', 'dp', 'uang muka', 'pelunasan', 'transfer', 'tunai', 'bukti', 'jatuh tempo'],
    numbers: [
      {
        label: 'DP',
        value: () => '30% × tarif periode',
        source: 'keuangan.md §7 — G-4/B',
      },
      {
        label: 'Pelunasan',
        value: () => 'sisa sewa + deposit',
        source: 'keuangan.md §7 — NO-PARTIAL (D-02)',
      },
      {
        label: 'Jatuh tempo tagihan',
        value: () => '24 jam setelah terbit',
        source: 'auto-ops.constants.ts INVOICE_DUE_AFTER_HOURS',
      },
      {
        label: 'Batas booking',
        value: () => '3 jam',
        source: 'auto-ops.constants.ts BOOKING_REVIEW_DEADLINE_HOURS',
      },
    ],
    sections: [
      {
        title: 'DP (uang muka)',
        lines: [
          'DP = 30% dari tarif periode.',
          'DP adalah bagian dari sewa, bukan biaya tambahan.',
          'DP hangus bila booking dibatalkan atau gagal dilunasi.',
        ],
      },
      {
        title: 'Pelunasan & no-partial',
        lines: [
          'Pembayaran sah hanya DP 30% persis atau pelunasan penuh (sisa sewa + deposit).',
          'Tidak ada cicilan.',
          'Tagihan perpanjangan dan utilitas wajib lunas penuh.',
        ],
      },
      {
        title: 'Cara membayar',
        lines: [
          'Transfer bank atau tunai ke pengelola.',
          'Untuk transfer, unggah bukti di portal; admin memeriksa sebelum pembayaran tercatat.',
          'Tidak ada QRIS atau e-wallet — pembayaran selalu lewat bukti transfer manual.',
        ],
      },
      {
        title: 'Jatuh tempo',
        lines: [
          'Semua tagihan jatuh tempo 24 jam setelah terbit (default; tenggat pastinya tertera di invoice).',
          'Tidak ada denda keterlambatan otomatis, tetapi tunggakan menghambat perpanjangan dan checkout.',
        ],
      },
    ],
  },
  {
    id: 'deposit',
    icon: '🔒',
    title: 'Deposit jaminan',
    summary: 'Dana titip per kamar (+ hewan), refundable, menutup tagihan terbuka saat checkout.',
    keywords: ['deposit', 'jaminan', 'dana titipan', 'refund', 'potongan', 'settlement'],
    numbers: [
      {
        label: 'Deposit kamar',
        value: (ctx) =>
          ctx.roomDepositRupiah != null
            ? formatRupiah(ctx.roomDepositRupiah)
            : 'mengikuti kamar yang dipilih',
        source: 'Room.defaultDepositRupiah — keuangan.md §7 (D-05)',
      },
      {
        label: 'Deposit hewan',
        value: (ctx) => formatRupiah(ctx.petDepositRupiah),
        source: 'Pengaturan → petDepositRupiah',
      },
      {
        label: 'Sifat',
        value: () => 'Refundable',
        source: 'keuangan.md §7 — dana titip (liability), bukan revenue',
      },
    ],
    sections: [
      {
        title: 'Apa itu deposit jaminan',
        lines: [
          'Dana titip yang dibayar saat masuk, bukan biaya sewa.',
          'Nominalnya mengikuti kamar yang dipilih; rincian tampil di tagihan awal.',
        ],
      },
      {
        title: 'Apa yang memotong deposit',
        lines: [
          'Tagihan terbuka saat checkout — termasuk sewa dan utilitas.',
          'Kerusakan akibat kelalaian penghuni, dengan catatan yang jelas.',
          'Biaya overstay/pembersihan bila ada.',
        ],
      },
      {
        title: 'Sisa dan kekurangan',
        lines: [
          'Sisa deposit dikembalikan setelah semua kewajiban selesai.',
          'Bila deposit tidak cukup, kekurangan menjadi piutangmu.',
          'Deposit diproses setelah inspeksi kamar dan pelunasan; waktu proses mengikuti antrean pengelola.',
        ],
      },
      {
        title: 'Deposit hewan',
        lines: [
          'Terpisah dari deposit kamar.',
          'Dikembalikan bila tidak ada kerusakan akibat hewan.',
        ],
      },
    ],
  },
  {
    id: 'overstay',
    icon: '⏰',
    title: 'Lewat tanggal keluar (overstay)',
    summary: 'Kamar dilepas pukul 12.00 WIB di hari-H; checkout paksa pukul 12.00 WIB di H+1.',
    keywords: ['overstay', 'lewat', 'telat', 'checkout paksa', 'evict', 'barang', 'denda'],
    numbers: [
      {
        label: 'Pengingat',
        value: () => 'H-10 · H-7 · H-3 · H-1 · hari-H',
        source: 'maintenance-sweep.service.ts REMINDER_THRESHOLDS',
      },
      {
        label: 'Kamar dilepas',
        value: () => '12.00 WIB hari-H',
        source: 'stay-sweep.service.ts runNoonRelease',
      },
      {
        label: 'Checkout paksa',
        value: () => '12.00 WIB H+1',
        source: 'stay-sweep.service.ts runOverstayForcedCheckout',
      },
      {
        label: 'Batas ambil barang',
        value: () => '30 hari',
        source: 'hunian.md Dossier 12 — B3',
      },
    ],
    sections: [
      {
        title: 'Apa yang terjadi',
        lines: [
          'Pengingat dikirim mulai H-10 sampai hari-H.',
          'Pada hari-H pukul 12.00 WIB, kamar dilepas ke penghuni baru bila belum ada DP perpanjangan.',
          'Pada H+1 pukul 12.00 WIB, sistem melakukan checkout paksa bila kamu masih tinggal.',
        ],
      },
      {
        title: 'Tagihan & deposit',
        lines: [
          'Tagihan yang belum lunas tetap menjadi tanggung jawabmu.',
          'Biaya overstay/pembersihan dapat dipotong dari deposit.',
          'Bila deposit tidak cukup, sisanya menjadi piutang.',
        ],
      },
      {
        title: 'Barangmu',
        lines: [
          'Barang yang tertinggal disimpan 30 hari sejak checkout.',
          'Setelah 30 hari, barang dinyatakan ditinggal (ABANDONED).',
        ],
      },
      {
        title: 'Kalau masih ada tunggakan',
        lines: [
          'Checkout otomatis tidak dijalankan; admin mendapat peringatan dan menindaklanjuti manual.',
        ],
      },
    ],
  },
  {
    id: 'checkout',
    icon: '🚪',
    title: 'Checkout',
    summary: 'Ajukan dari portal minimal H+1; lunasi tagihan non-meter; inspeksi lalu deposit diproses.',
    keywords: ['checkout', 'keluar', 'pindah', 'inspeksi', 'kunci', 'tagihan final'],
    numbers: [
      {
        label: 'Pengajuan',
        value: () => 'minimal H+1 dari hari ini',
        source: 'CheckoutRequestModal.tsx',
      },
      {
        label: 'Batas pengajuan',
        value: () => '≤ tanggal rencana keluar',
        source: 'hunian.md Dossier 12',
      },
      {
        label: 'Blokir checkout',
        value: () => 'tagihan non-meter',
        source: 'checkoutReadiness.ts getBlockingOpenInvoices',
      },
    ],
    sections: [
      {
        title: 'Syarat',
        lines: [
          'Semua tagihan non-meter lunas atau dibatalkan.',
          'Tagihan meter (listrik/air) tidak memblokir — dipotong dari deposit saat settlement.',
          'Kembalikan kunci dan kosongkan barang pribadi.',
        ],
      },
      {
        title: 'Urutan proses',
        lines: [
          'Buka Panduan Kos Saya → Ajukan Keluar.',
          'Pilih tanggal keluar dan tulis alasan.',
          'Admin meninjau; persetujuan belum berarti kamu sudah keluar.',
          'Admin menghitung tagihan final, inspeksi kamar, lalu memproses deposit.',
        ],
      },
      {
        title: 'Keluar lebih awal',
        lines: [
          'Sewa yang sudah dibayar hangus untuk sisa periode (tidak ada refund prorata).',
          'Deposit tetap dikembalikan normal setelah kewajiban selesai.',
        ],
      },
    ],
  },
  {
    id: 'ktp',
    icon: '🪪',
    title: 'KTP & data pribadi',
    summary: 'Satu foto KTP untuk verifikasi identitas; akses terbatas; data dihapus saat checkout.',
    keywords: ['ktp', 'identitas', 'pdp', 'privasi', 'foto', 'verifikasi'],
    numbers: [
      {
        label: 'Foto KTP',
        value: () => '1 file',
        source: 'tenants.controller.ts POST :id/ktp/upload',
      },
      {
        label: 'Yang memverifikasi',
        value: () => 'OWNER/ADMIN',
        source: 'tenants.controller.ts verifyKtp @Roles',
      },
      {
        label: 'Data KTP setelah checkout',
        value: () => 'dihapus otomatis',
        source: 'stays.service.ts cleanupTenantKtpOnCheckout',
      },
    ],
    sections: [
      {
        title: 'Kenapa perlu',
        lines: [
          'Foto KTP dipakai untuk mencocokkan identitas penghuni.',
          'Verifikasi dilakukan manual oleh pengelola — tidak ada janji waktu proses.',
        ],
      },
      {
        title: 'Siapa yang bisa melihat',
        lines: [
          'Hanya OWNER dan ADMIN yang bisa membuka dan memverifikasi foto KTP.',
          'Data tidak dibagikan ke pihak lain.',
        ],
      },
      {
        title: 'Kapan dihapus',
        lines: [
          'Foto KTP dihapus otomatis setelah checkout terakhir (tidak ada masa sewa lain).',
          'OWNER juga bisa menghapus data KTP lebih awal lewat permintaan PDP.',
        ],
      },
    ],
  },
];

/** Cari kategori yang cocok dengan kata kunci (judul, ringkasan, isi, angka). */
export function filterTenantRuleCategories(
  query: string,
  ctx: TenantRuleContext = DEFAULT_TENANT_RULE_CONTEXT,
): TenantRuleCategory[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return TENANT_RULE_CATEGORIES;

  return TENANT_RULE_CATEGORIES.filter((category) => {
    const haystack = [
      category.title,
      category.summary,
      ...category.keywords,
      ...category.numbers.flatMap((n) => [n.label, n.value(ctx), n.source]),
      ...category.sections.flatMap((s) => [s.title, ...s.lines]),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// WIZARD 4 PERTANYAAN — hanya memilih cabang aturan; tidak menyimpan data pribadi
// ══════════════════════════════════════════════════════════════════════════════

export type TenantRulesWizardStage = 'penghuni' | 'calon';
export type TenantRulesWizardPet = 'ya' | 'tidak';
export type TenantRulesWizardOccupants = '1-2' | '3-4' | '5-6';
export type TenantRulesWizardTerm = 'MONTHLY' | 'BIWEEKLY' | 'SMESTERLY' | 'YEARLY';

export type TenantRulesWizardAnswers = {
  stage?: TenantRulesWizardStage;
  pet?: TenantRulesWizardPet;
  occupants?: TenantRulesWizardOccupants;
  term?: TenantRulesWizardTerm;
};

export type TenantRulesWizardQuestion = {
  key: keyof TenantRulesWizardAnswers;
  question: string;
  help: string;
  options: { value: string; label: string; hint: string }[];
};

export const TENANT_RULES_WIZARD_QUESTIONS: TenantRulesWizardQuestion[] = [
  {
    key: 'stage',
    question: 'Kamu sudah penghuni atau masih calon?',
    help: 'Menentukan bagian yang paling relevan untukmu sekarang.',
    options: [
      { value: 'penghuni', label: 'Sudah penghuni', hint: 'Perpanjangan, checkout, overstay' },
      { value: 'calon', label: 'Masih calon', hint: 'DP, deposit, cara bayar' },
    ],
  },
  {
    key: 'pet',
    question: 'Apakah kamu membawa hewan peliharaan?',
    help: 'Hewan diizinkan dengan pemberitahuan dan deposit terpisah.',
    options: [
      { value: 'ya', label: 'Ya, bawa hewan', hint: 'Ada deposit hewan' },
      { value: 'tidak', label: 'Tidak', hint: 'Tanpa deposit hewan' },
    ],
  },
  {
    key: 'occupants',
    question: 'Berapa orang akan tinggal di kamar?',
    help: 'Batas gratis berbeda untuk kamar STANDARD dan LARGE.',
    options: [
      { value: '1-2', label: '1–2 orang', hint: 'Tanpa surcharge' },
      { value: '3-4', label: '3–4 orang', hint: 'STANDARD kena surcharge' },
      { value: '5-6', label: '5–6 orang', hint: 'Hanya kamar LARGE' },
    ],
  },
  {
    key: 'term',
    question: 'Rencana bayar berapa lama?',
    help: 'Term menentukan pengali tarif dan apakah listrik/air termasuk.',
    options: [
      { value: 'MONTHLY', label: '1 bulan', hint: 'Listrik & air dari meter' },
      { value: 'BIWEEKLY', label: '2 minggu', hint: '0,75× · all-in' },
      { value: 'SMESTERLY', label: '6 bulan', hint: '5,7× · hemat ±5%' },
      { value: 'YEARLY', label: '1 tahun', hint: '11× · hemat 1 bulan' },
    ],
  },
];

export type TenantRulesWizardResult = {
  summary: string;
  highlights: string[];
  /** Semua 8 kategori, yang paling relevan lebih dulu. */
  categories: TenantRuleCategory[];
  notes: Partial<Record<TenantRuleCategoryId, string[]>>;
};

const STAGE_LABEL: Record<TenantRulesWizardStage, string> = {
  penghuni: 'sudah penghuni',
  calon: 'masih calon',
};

const PET_LABEL: Record<TenantRulesWizardPet, string> = {
  ya: 'bawa hewan',
  tidak: 'tanpa hewan',
};

const OCCUPANT_LABEL: Record<TenantRulesWizardOccupants, string> = {
  '1-2': '1–2 orang',
  '3-4': '3–4 orang',
  '5-6': '5–6 orang',
};

const TERM_LABEL: Record<TenantRulesWizardTerm, string> = {
  MONTHLY: '1 bulan',
  BIWEEKLY: '2 minggu',
  SMESTERLY: '6 bulan',
  YEARLY: '1 tahun',
};

const TERM_NOTE: Record<TenantRulesWizardTerm, string[]> = {
  MONTHLY: ['Bulanan: tarif ×1; listrik & air dihitung dari meter.'],
  BIWEEKLY: ['2 minggu: tarif bulanan × 0,75; listrik & air sudah termasuk.'],
  SMESTERLY: ['6 bulan: tarif bulanan × 5,7; listrik & air dihitung dari meter.'],
  YEARLY: ['1 tahun: tarif bulanan × 11; listrik & air dihitung dari meter.'],
};

const OCCUPANT_NOTE: Record<TenantRulesWizardOccupants, (ctx: TenantRuleContext) => string[]> = {
  '1-2': () => ['1–2 orang: tanpa surcharge di kamar STANDARD maupun LARGE.'],
  '3-4': (ctx) => [
    `Kamar STANDARD: 1–2 kepala ekstra × ${ctx.extraOccupantPercent}% tarif periode.`,
    'Kamar LARGE: masih tanpa surcharge sampai 4 orang.',
  ],
  '5-6': () => [
    'Hanya kamar LARGE (maksimal 6 orang) yang bisa menampung 5–6 orang.',
    'Kamar STANDARD maksimal 4 orang.',
  ],
};

function byId(id: TenantRuleCategoryId): TenantRuleCategory {
  const found = TENANT_RULE_CATEGORIES.find((category) => category.id === id);
  if (!found) throw new Error(`Kategori aturan tidak ditemukan: ${id}`);
  return found;
}

/**
 * Hasil wizard = aturan + angka yang berlaku untuk kombinasi jawaban.
 * Fungsi murni: tidak menyentuh storage/API dan tidak menyimpan jawaban.
 */
export function buildTenantRulesWizardResult(
  answers: TenantRulesWizardAnswers,
  ctx: TenantRuleContext = DEFAULT_TENANT_RULE_CONTEXT,
): TenantRulesWizardResult {
  const stage = answers.stage ?? 'calon';
  const pet = answers.pet ?? 'tidak';
  const occupants = answers.occupants ?? '1-2';
  const term = answers.term ?? 'MONTHLY';

  const summary = `${STAGE_LABEL[stage]} · ${PET_LABEL[pet]} · ${OCCUPANT_LABEL[occupants]} · bayar ${TERM_LABEL[term]}`;

  const highlights: string[] = [];
  if (stage === 'calon') {
    highlights.push('Kamu sedang memesan kamar: mulai dari DP 30% dan deposit jaminan.');
  } else {
    highlights.push('Kamu sudah menghuni: pengingat perpanjangan mulai H-10; checkout diajukan dari Panduan Kos Saya.');
  }
  if (pet === 'ya') {
    highlights.push(`Bawa hewan: siapkan deposit hewan ${formatRupiah(ctx.petDepositRupiah)} (refundable).`);
  }
  if (occupants === '5-6') {
    highlights.push('5–6 orang hanya bisa di kamar LARGE (maksimal 6).');
  } else if (occupants === '3-4') {
    highlights.push('3–4 orang: kamar LARGE tanpa surcharge; kamar STANDARD kena surcharge per kepala ekstra.');
  } else {
    highlights.push('1–2 orang: tanpa surcharge di kedua ukuran kamar.');
  }
  highlights.push(TERM_NOTE[term][0]);
  if (ctx.roomDepositRupiah != null) {
    highlights.push(
      `Deposit kamar${ctx.roomCode ? ` ${ctx.roomCode}` : ''}: ${formatRupiah(ctx.roomDepositRupiah)} (refundable).`,
    );
  }

  const notes: TenantRulesWizardResult['notes'] = {
    hewan:
      pet === 'ya'
        ? [
            `Deposit hewan ${formatRupiah(ctx.petDepositRupiah)} dibayar bersama deposit kamar.`,
            'Refundable bila tidak ada kerusakan akibat hewan.',
          ]
        : ['Kamu tidak membawa hewan — tidak ada deposit hewan.'],
    penghuni: OCCUPANT_NOTE[occupants](ctx),
    prabayar: TERM_NOTE[term],
    pembayaran:
      stage === 'calon'
        ? [
            'DP 30% mengunci kamar setelah bukti transfer diperiksa admin.',
            'Pelunasan sekali bayar: sisa sewa + deposit.',
          ]
        : ['Perpanjangan juga memakai DP 30% dan pelunasan sekali bayar.'],
    deposit: [
      ctx.roomDepositRupiah != null
        ? `Deposit kamar${ctx.roomCode ? ` ${ctx.roomCode}` : ''}: ${formatRupiah(ctx.roomDepositRupiah)}.`
        : 'Deposit mengikuti kamar yang kamu pilih.',
      'Menutup tagihan terbuka saat checkout; sisa dikembalikan, kekurangan menjadi piutang.',
    ],
    overstay: [
      'Kamar dilepas pukul 12.00 WIB di hari-H; checkout paksa pukul 12.00 WIB di H+1.',
    ],
    checkout: [
      stage === 'penghuni'
        ? 'Ajukan keluar dari Panduan Kos Saya minimal H+1 sebelum tanggal yang kamu inginkan.'
        : 'Saatnya keluar nanti: ajukan minimal H+1 dan lunasi tagihan non-meter.',
    ],
    ktp: ['Satu foto KTP untuk verifikasi; data dihapus otomatis setelah checkout.'],
  };

  const order: TenantRuleCategoryId[] =
    stage === 'calon'
      ? ['pembayaran', 'deposit', 'penghuni', 'prabayar', 'hewan', 'ktp', 'checkout', 'overstay']
      : ['deposit', 'checkout', 'pembayaran', 'overstay', 'penghuni', 'prabayar', 'hewan', 'ktp'];

  return {
    summary,
    highlights,
    categories: order.map(byId),
    notes,
  };
}
