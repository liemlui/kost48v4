/**
 * KOST48 — Sumber tunggal aturan penghuni (W-TNT-001).
 * =====================================================
 * Dipakai halaman Panduan tenant + wizard aturan.
 *
 * Gaya bahasa: kalimat pendek, kata sehari-hari, angka sesedikit mungkin.
 * Angka yang mahal dihafal diganti CONTOH HITUNG dari data kamar tenant
 * (`TenantRuleContext`), mis. "tambah 1 orang = Rp200.000 per periode".
 *
 * Prinsip:
 *  - Setiap angka punya `source` kanonik (dirujuk di UI sebagai tooltip).
 *  - Rumus memakai helper yang sama dengan backend (`utils/pricing.ts`),
 *    bukan hitungan baru.
 *  - Tidak memuat klaim yang tidak ditegakkan kode (tamu Rp50.000/malam,
 *    denda merokok Rp200.000, refund 7 hari, QRIS/e-wallet).
 */
import { formatRupiah } from '../utils/formatCurrency';
import {
  ROOM_MAX_FREE_OCCUPANTS,
  ROOM_MAX_OCCUPANTS,
  calculateOccupantSurcharge,
  roundUpToNearest,
} from '../utils/pricing';

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
  roomCode?: string | null;
  /** `Room.defaultDepositRupiah` / `Stay.depositAmountRupiah`. */
  roomDepositRupiah?: number | null;
  /** `Stay.agreedRentAmountRupiah` — tarif periode yang disepakati. */
  rentRupiah?: number | null;
  /** `Room.roomSize` — STANDARD atau LARGE. */
  roomSize?: string | null;
  /** `Stay.occupantCount`. */
  occupantCount?: number | null;
};

/** Fallback = default backend (`settings.service.ts`), bukan angka baru. */
export const DEFAULT_TENANT_RULE_CONTEXT: TenantRuleContext = {
  petDepositRupiah: 100000,
  extraOccupantPercent: 20,
};

export type TenantRuleNumber = {
  label: string;
  value: (ctx: TenantRuleContext) => string;
  /** Rujukan kanonik — tampil sebagai tooltip di UI. */
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
  /** Contoh hitung untuk kamar tenant (kosong bila data belum ada). */
  examples?: (ctx: TenantRuleContext) => string[];
  sections: TenantRuleSection[];
};

// ── helper bahasa + hitung (semua memakai rumus kanonik) ───────────────────

const rupiah = (value: number | null | undefined) =>
  value != null && Number.isFinite(value) ? formatRupiah(value) : null;

const sizeLabel = (size?: string | null) =>
  String(size ?? '').toUpperCase() === 'LARGE' ? 'LARGE' : 'STANDARD';

const freeOccupants = (ctx: TenantRuleContext) => ROOM_MAX_FREE_OCCUPANTS[sizeLabel(ctx.roomSize)];
const maxOccupants = (ctx: TenantRuleContext) => ROOM_MAX_OCCUPANTS[sizeLabel(ctx.roomSize)];

const surchargeFor = (ctx: TenantRuleContext, extraHeads: number) =>
  ctx.rentRupiah != null && extraHeads > 0
    ? calculateOccupantSurcharge(ctx.rentRupiah, sizeLabel(ctx.roomSize), freeOccupants(ctx) + extraHeads)
    : null;

const dpFor = (ctx: TenantRuleContext) =>
  ctx.rentRupiah != null ? Math.round((ctx.rentRupiah * 30) / 100) : null;

const termPrice = (monthly: number | null | undefined, multiplier: number) =>
  monthly != null && Number.isFinite(monthly) ? roundUpToNearest(monthly * multiplier) : null;

export const TENANT_RULE_CATEGORIES: TenantRuleCategory[] = [
  {
    id: 'hewan',
    icon: '🐾',
    title: 'Hewan peliharaan',
    summary: 'Boleh, asal lapor dan bayar deposit yang kembali saat keluar.',
    keywords: ['hewan', 'peliharaan', 'kucing', 'anjing', 'pet', 'deposit hewan'],
    numbers: [
      {
        label: 'Deposit hewan',
        value: (ctx) => formatRupiah(ctx.petDepositRupiah),
        source: 'Pengaturan → petDepositRupiah',
      },
    ],
    examples: (ctx) => [
      `Bawa 1 kucing: siapkan ${formatRupiah(ctx.petDepositRupiah)} saat masuk. Kembali penuh kalau tidak ada kerusakan.`,
    ],
    sections: [
      {
        title: 'Cara membawa hewan',
        lines: [
          'Bilang ke pengelola saat booking atau check-in.',
          'Deposit dibayar sekali, bukan biaya bulanan.',
          'Hewan tidak boleh mengganggu penghuni lain.',
        ],
      },
      {
        title: 'Kapan depositnya kembali',
        lines: [
          'Saat keluar, kalau tidak ada kerusakan akibat hewan.',
          'Kalau ada kerusakan, potongannya dicatat dan sisanya kembali.',
        ],
      },
    ],
  },
  {
    id: 'penghuni',
    icon: '👥',
    title: 'Jumlah penghuni',
    summary: 'Kamar STANDARD untuk 2 orang, LARGE untuk 4 orang. Tambah orang ada biaya.',
    keywords: ['penghuni', 'orang', 'kapasitas', 'tambahan', 'extra', 'kepala', 'biaya tambahan'],
    numbers: [
      {
        label: 'Tanpa biaya tambahan',
        value: (ctx) => `${freeOccupants(ctx)} orang (kamar ${sizeLabel(ctx.roomSize)})`,
        source: 'pricing.helper.ts ROOM_MAX_FREE_OCCUPANTS',
      },
      {
        label: 'Tambahan per orang',
        value: (ctx) => {
          const amount = surchargeFor(ctx, 1);
          return amount != null ? `${formatRupiah(amount)} / periode` : '20% tarif periode';
        },
        source: 'keuangan.md §8 — D-24',
      },
    ],
    examples: (ctx) => {
      const lines: string[] = [];
      const free = freeOccupants(ctx);
      const extra = Math.max(0, Number(ctx.occupantCount ?? 0) - free);
      const oneMore = surchargeFor(ctx, 1);
      const room = ctx.roomCode ? `Kamar ${ctx.roomCode}` : 'Kamar kamu';
      if (oneMore != null) {
        lines.push(`${room} (${sizeLabel(ctx.roomSize)}) nyaman untuk ${free} orang. Tambah 1 orang = ${formatRupiah(oneMore)} per periode.`);
      }
      if (extra > 0) {
        const amount = surchargeFor(ctx, extra);
        lines.push(`Kamu sekarang ${ctx.occupantCount} orang: ${extra} orang tambahan = ${amount != null ? formatRupiah(amount) : 'biaya tambahan'} per periode.`);
      }
      return lines;
    },
    sections: [
      {
        title: 'Batas kamar',
        lines: [
          'STANDARD: 2 orang tanpa biaya tambahan, maksimal 4.',
          'LARGE: 4 orang tanpa biaya tambahan, maksimal 6.',
          'Lebih dari itu kamar tidak layak huni.',
        ],
      },
      {
        title: 'Cara menghitung biaya tambahan',
        lines: [
          '20% dari tarif periode, untuk setiap orang tambahan.',
          'Dibulatkan ke atas ke kelipatan Rp5.000.',
          'Biaya masuk ke sewa periode itu, jadi ikut menentukan DP.',
        ],
      },
      {
        title: 'Catat di kontrak',
        lines: [
          'Jumlah penghuni dicatat di kontrak.',
          'Perubahan jumlah orang diatur lewat pengelola.',
        ],
      },
    ],
  },
  {
    id: 'prabayar',
    icon: '📆',
    title: 'Bayar di muka',
    summary: 'Bayar beberapa bulan sekaligus lebih hemat, dan harga bulananmu dikunci.',
    keywords: ['prabayar', 'di muka', 'diskon', 'tahunan', 'semester', 'bulanan', 'mingguan'],
    numbers: [
      {
        label: 'Hemat 6 bulan',
        value: () => 'sekitar 5%',
        source: 'keuangan.md §2 — SMESTERLY 5,7×',
      },
      {
        label: 'Hemat 1 tahun',
        value: () => 'sekitar 8%',
        source: 'keuangan.md §2 — YEARLY 11×',
      },
    ],
    examples: (ctx) => {
      const six = termPrice(ctx.rentRupiah, 5.7);
      const twelve = termPrice(ctx.rentRupiah, 11);
      const lines: string[] = [];
      if (six != null && ctx.rentRupiah != null) {
        lines.push(`6 bulan: ${formatRupiah(six)} — hemat ${formatRupiah(ctx.rentRupiah * 6 - six)} dibanding bayar bulanan.`);
      }
      if (twelve != null && ctx.rentRupiah != null) {
        lines.push(`1 tahun: ${formatRupiah(twelve)} — hemat ${formatRupiah(ctx.rentRupiah * 12 - twelve)} dibanding bayar bulanan.`);
      }
      return lines;
    },
    sections: [
      {
        title: 'Cara kerja',
        lines: [
          'Boleh bayar di muka kapan saja, 1–24 bulan.',
          'Harga bulanan dikunci selama kontrak tidak putus.',
          'Tidak bisa prabayar kalau masih ada tagihan.',
        ],
      },
      {
        title: 'Hematnya',
        lines: [
          '6 bulan: tarif bulanan × 5,7.',
          '1 tahun: tarif bulanan × 11 — seperti dapat 1 bulan gratis.',
          'Hanya untuk bayar penuh, bukan cicilan.',
        ],
      },
      {
        title: 'Listrik & air',
        lines: [
          'Sewa 2 minggu: sudah termasuk.',
          'Bulanan ke atas: dihitung dari meter.',
        ],
      },
    ],
  },
  {
    id: 'pembayaran',
    icon: '💳',
    title: 'Pembayaran & uang muka',
    summary: 'Uang muka (DP) mengunci kamar; sisanya dilunasi sekali bayar.',
    keywords: ['bayar', 'pembayaran', 'dp', 'uang muka', 'pelunasan', 'transfer', 'tunai', 'bukti'],
    numbers: [
      {
        label: 'Uang muka (DP)',
        value: (ctx) => {
          const dp = dpFor(ctx);
          return dp != null ? formatRupiah(dp) : '30% tarif periode';
        },
        source: 'keuangan.md §7 — G-4/B',
      },
    ],
    examples: (ctx) => {
      const dp = dpFor(ctx);
      if (dp == null || ctx.rentRupiah == null) return [];
      const rest = ctx.rentRupiah - dp;
      const deposit = rupiah(ctx.roomDepositRupiah);
      return [
        `DP kamar kamu: ${formatRupiah(dp)} — bagian dari sewa, bukan biaya tambahan.`,
        `Pelunasan: ${formatRupiah(rest)}${deposit ? ` + deposit ${deposit}` : ' + deposit'}.`,
      ];
    },
    sections: [
      {
        title: 'Uang muka (DP)',
        lines: [
          '30% dari tarif periode; kamar terkunci setelah bukti transfer diperiksa.',
          'Hangus kalau booking dibatalkan atau gagal dilunasi.',
        ],
      },
      {
        title: 'Pelunasan',
        lines: [
          'Sekali bayar: sisa sewa + deposit. Tidak ada cicilan.',
          'Tagihan perpanjangan dan listrik wajib lunas penuh.',
        ],
      },
      {
        title: 'Cara bayar',
        lines: [
          'Transfer bank atau tunai ke pengelola.',
          'Unggah bukti transfer di portal; admin memeriksa dulu.',
          'Tidak ada QRIS atau e-wallet.',
        ],
      },
      {
        title: 'Tenggat',
        lines: [
          'Semua tagihan jatuh tempo 24 jam setelah terbit.',
          'Tidak ada denda otomatis, tapi tunggakan menghambat perpanjangan dan keluar.',
        ],
      },
    ],
  },
  {
    id: 'deposit',
    icon: '🔒',
    title: 'Deposit jaminan',
    summary: 'Uang titip yang kembali saat keluar, setelah semua tagihan beres.',
    keywords: ['deposit', 'jaminan', 'dana titipan', 'refund', 'potongan'],
    numbers: [
      {
        label: 'Deposit kamar',
        value: (ctx) => rupiah(ctx.roomDepositRupiah) ?? 'mengikuti kamar pilihanmu',
        source: 'Room.defaultDepositRupiah — keuangan.md §7 (D-05)',
      },
      {
        label: 'Deposit hewan',
        value: (ctx) => formatRupiah(ctx.petDepositRupiah),
        source: 'Pengaturan → petDepositRupiah',
      },
    ],
    examples: (ctx) => {
      const deposit = rupiah(ctx.roomDepositRupiah);
      if (!deposit) return [];
      const room = ctx.roomCode ? `Kamar ${ctx.roomCode}` : 'Kamar kamu';
      return [`${room}: deposit ${deposit} — kembali saat keluar kalau tidak ada kerusakan atau tunggakan.`];
    },
    sections: [
      {
        title: 'Apa ini',
        lines: [
          'Bukan biaya sewa; ini uang titip yang dikembalikan.',
          'Nominalnya mengikuti kamar yang kamu pilih.',
        ],
      },
      {
        title: 'Dipakai untuk apa',
        lines: [
          'Menutup tagihan terbuka saat keluar — termasuk sewa dan listrik.',
          'Kerusakan akibat kelalaian, selalu dengan catatan.',
        ],
      },
      {
        title: 'Sisa dan kekurangan',
        lines: [
          'Sisa kembali setelah semua kewajiban beres.',
          'Kalau kurang, sisanya jadi utangmu.',
          'Diproses setelah inspeksi kamar dan pelunasan.',
        ],
      },
    ],
  },
  {
    id: 'overstay',
    icon: '⏰',
    title: 'Lewat tanggal keluar',
    summary: 'Kalau tidak memperpanjang, kamar diambil alih dan kamu harus segera keluar.',
    keywords: ['overstay', 'lewat', 'telat', 'checkout paksa', 'barang', 'denda'],
    numbers: [
      {
        label: 'Kamar dilepas',
        value: () => 'pukul 12.00, hari terakhir',
        source: 'stay-sweep.service.ts runNoonRelease',
      },
      {
        label: 'Checkout paksa',
        value: () => 'pukul 12.00, besoknya',
        source: 'stay-sweep.service.ts runOverstayForcedCheckout',
      },
    ],
    sections: [
      {
        title: 'Yang terjadi',
        lines: [
          'Kamu diingatkan mulai 10 hari sebelum masa sewa habis.',
          'Di hari terakhir pukul 12.00, kamar dilepas ke penghuni baru.',
          'Besoknya pukul 12.00, sistem mengeluarkanmu secara paksa.',
        ],
      },
      {
        title: 'Tagihannya',
        lines: [
          'Tetap berjalan; biaya overstay/pembersihan bisa dipotong dari deposit.',
          'Kalau deposit kurang, sisanya jadi utangmu.',
          'Kalau masih menunggak, admin menindaklanjuti manual.',
        ],
      },
      {
        title: 'Barangmu',
        lines: [
          'Disimpan 30 hari setelah keluar.',
          'Setelah itu dinyatakan ditinggal.',
        ],
      },
    ],
  },
  {
    id: 'checkout',
    icon: '🚪',
    title: 'Keluar (checkout)',
    summary: 'Ajukan dari portal, lunasi tagihan, inspeksi, lalu deposit diproses.',
    keywords: ['checkout', 'keluar', 'pindah', 'inspeksi', 'kunci', 'tagihan akhir'],
    numbers: [
      {
        label: 'Ajukan',
        value: () => 'minimal besok (H+1)',
        source: 'CheckoutRequestModal.tsx',
      },
      {
        label: 'Batas',
        value: () => '≤ tanggal rencana keluar',
        source: 'hunian.md Dossier 12',
      },
    ],
    sections: [
      {
        title: 'Syarat',
        lines: [
          'Tagihan non-listrik lunas; tagihan listrik/air dipotong dari deposit.',
          'Kembalikan kunci dan kosongkan barang pribadi.',
        ],
      },
      {
        title: 'Urutan',
        lines: [
          'Buka Panduan Kos Saya → Ajukan Keluar → pilih tanggal dan alasan.',
          'Admin meninjau, menghitung tagihan akhir, lalu inspeksi kamar.',
          'Persetujuan admin belum berarti kamu sudah keluar.',
        ],
      },
      {
        title: 'Keluar lebih awal',
        lines: [
          'Sisa sewa hangus; tidak ada pengembalian prorata.',
          'Deposit tetap kembali normal setelah kewajiban beres.',
        ],
      },
    ],
  },
  {
    id: 'ktp',
    icon: '🪪',
    title: 'KTP & data pribadi',
    summary: 'Satu foto KTP untuk verifikasi; datanya dihapus saat kamu keluar.',
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
    ],
    sections: [
      {
        title: 'Kenapa perlu',
        lines: [
          'Untuk mencocokkan identitas penghuni.',
          'Diverifikasi manual oleh pengelola.',
        ],
      },
      {
        title: 'Siapa yang bisa lihat',
        lines: [
          'Hanya OWNER dan ADMIN.',
          'Tidak dibagikan ke pihak lain.',
        ],
      },
      {
        title: 'Kapan dihapus',
        lines: [
          'Otomatis setelah kamu keluar (tidak ada masa sewa lain).',
          'OWNER juga bisa menghapus lebih awal lewat permintaan PDP.',
        ],
      },
    ],
  },
];

/** Cari kategori yang cocok (judul, ringkasan, isi, contoh, angka). */
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
      ...category.numbers.flatMap((n) => [n.label, n.value(ctx)]),
      ...(category.examples?.(ctx) ?? []),
      ...category.sections.flatMap((s) => [s.title, ...s.lines]),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// WIZARD 4 PERTANYAAN — memilih cabang aturan; tidak menyimpan data pribadi
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
    help: 'Kami tampilkan bagian yang paling berguna untukmu.',
    options: [
      { value: 'penghuni', label: 'Sudah penghuni', hint: 'Perpanjangan, keluar, overstay' },
      { value: 'calon', label: 'Masih calon', hint: 'DP, deposit, cara bayar' },
    ],
  },
  {
    key: 'pet',
    question: 'Bawa hewan peliharaan?',
    help: 'Boleh, asal lapor dan bayar deposit yang kembali.',
    options: [
      { value: 'ya', label: 'Ya, bawa hewan', hint: 'Ada deposit hewan' },
      { value: 'tidak', label: 'Tidak', hint: 'Tanpa deposit hewan' },
    ],
  },
  {
    key: 'occupants',
    question: 'Berapa orang akan tinggal?',
    help: 'Kamar STANDARD muat 2 orang, LARGE 4 orang — tanpa biaya tambahan.',
    options: [
      { value: '1-2', label: '1–2 orang', hint: 'Tanpa biaya tambahan' },
      { value: '3-4', label: '3–4 orang', hint: 'STANDARD kena biaya tambahan' },
      { value: '5-6', label: '5–6 orang', hint: 'Hanya kamar LARGE' },
    ],
  },
  {
    key: 'term',
    question: 'Rencana bayar berapa lama?',
    help: 'Term menentukan harga dan apakah listrik/air termasuk.',
    options: [
      { value: 'MONTHLY', label: '1 bulan', hint: 'Listrik & air dari meter' },
      { value: 'BIWEEKLY', label: '2 minggu', hint: 'Sudah termasuk listrik & air' },
      { value: 'SMESTERLY', label: '6 bulan', hint: 'Lebih hemat ±5%' },
      { value: 'YEARLY', label: '1 tahun', hint: 'Hemat 1 bulan' },
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

const occupantHeadcount: Record<TenantRulesWizardOccupants, number> = {
  '1-2': 2,
  '3-4': 4,
  '5-6': 6,
};

function termNote(term: TenantRulesWizardTerm, ctx: TenantRuleContext): string {
  const monthly = ctx.rentRupiah;
  const six = termPrice(monthly, 5.7);
  const twelve = termPrice(monthly, 11);
  if (term === 'SMESTERLY' && six != null) return `6 bulan: ${formatRupiah(six)} — listrik & air dari meter.`;
  if (term === 'YEARLY' && twelve != null) return `1 tahun: ${formatRupiah(twelve)} — listrik & air dari meter.`;
  if (term === 'BIWEEKLY') return '2 minggu: listrik & air sudah termasuk.';
  return 'Bulanan: listrik & air dihitung dari meter.';
}

function occupantNote(occupants: TenantRulesWizardOccupants, ctx: TenantRuleContext): string[] {
  const heads = occupantHeadcount[occupants];
  const free = freeOccupants(ctx);
  const extra = Math.max(0, heads - free);
  const amount = extra > 0 ? surchargeFor(ctx, extra) : null;

  if (extra === 0) return [`${heads} orang: tanpa biaya tambahan di kamar ${sizeLabel(ctx.roomSize)}.`];
  if (amount != null) {
    return [`${heads} orang di kamar ${sizeLabel(ctx.roomSize)}: ${extra} orang tambahan = ${formatRupiah(amount)} per periode.`];
  }
  return [
    `${heads} orang di kamar STANDARD: ${extra} orang tambahan kena biaya 20% tarif periode per orang.`,
    'Kamar LARGE masih tanpa biaya tambahan sampai 4 orang.',
  ];
}

function byId(id: TenantRuleCategoryId): TenantRuleCategory {
  const found = TENANT_RULE_CATEGORIES.find((category) => category.id === id);
  if (!found) throw new Error(`Kategori aturan tidak ditemukan: ${id}`);
  return found;
}

/** Fungsi murni: tidak menyentuh storage/API dan tidak menyimpan jawaban. */
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
    const dp = dpFor(ctx);
    highlights.push(dp != null ? `Kamar dikunci setelah DP ${formatRupiah(dp)} dibayar.` : 'Kamar dikunci setelah DP 30% dibayar.');
  } else {
    highlights.push('Pengingat perpanjangan mulai 10 hari sebelum masa sewa habis.');
  }
  if (pet === 'ya') {
    highlights.push(`Deposit hewan ${formatRupiah(ctx.petDepositRupiah)} — kembali kalau tidak ada kerusakan.`);
  }
  highlights.push(...occupantNote(occupants, ctx));
  highlights.push(termNote(term, ctx));

  const notes: TenantRulesWizardResult['notes'] = {
    hewan:
      pet === 'ya'
        ? [`Deposit hewan ${formatRupiah(ctx.petDepositRupiah)} dibayar bersama deposit kamar.`, 'Kembali penuh kalau tidak ada kerusakan.']
        : ['Tanpa hewan: tidak ada deposit hewan.'],
    penghuni: occupantNote(occupants, ctx),
    prabayar: [termNote(term, ctx)],
    pembayaran:
      dpFor(ctx) != null
        ? [
            `DP kamu: ${formatRupiah(dpFor(ctx) as number)} — bagian dari sewa, bukan biaya tambahan.`,
            'Sisanya dilunasi sekali bayar bersama deposit.',
          ]
        : ['DP 30% dari tarif periode; sisanya dilunasi sekali bayar bersama deposit.'],
    deposit: [
      rupiah(ctx.roomDepositRupiah)
        ? `Deposit kamar${ctx.roomCode ? ` ${ctx.roomCode}` : ''}: ${rupiah(ctx.roomDepositRupiah)}.`
        : 'Deposit mengikuti kamar yang kamu pilih.',
      'Dipakai menutup tagihan terbuka saat keluar; sisanya kembali.',
    ],
    overstay: ['Kamar dilepas pukul 12.00 di hari terakhir; checkout paksa besoknya pukul 12.00.'],
    checkout: [
      stage === 'penghuni'
        ? 'Ajukan keluar dari Panduan Kos Saya, minimal besok (H+1).'
        : 'Nanti saat keluar: ajukan minimal besok (H+1) dan lunasi tagihan non-listrik.',
    ],
    ktp: ['Satu foto KTP untuk verifikasi; dihapus otomatis saat kamu keluar.'],
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
