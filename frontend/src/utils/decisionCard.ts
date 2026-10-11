import { isDateExpired } from './bookingExpiry';

export type DecisionCardSourceRef = {
  /** Label yang dibaca pengguna, mis. "Ringkasan keuangan 30 hari". */
  label: string;
  /** Endpoint atau nama snapshot asal angka — wajib nyata, bukan karangan. */
  ref: string;
};

/**
 * 5 field keputusan kartu (AIDL-01 / AIDL-01a).
 *
 * Semuanya OPSIONAL dengan sengaja: kartu lama yang belum mengisinya tetap sah,
 * dan karena itu 4 consumer lama tidak perlu diubah. Kontrak lengkapnya —
 * termasuk alasan tiap field — ada di `docs/product/portal-owner-admin.md` §10
 * tabel "Field yang masih perlu ditambahkan".
 */
export type DecisionCardFields = {
  /** Mengapa hal ini terjadi (boleh disusun AI). */
  sebab?: string;
  /** Apa yang berubah bila dilakukan atau diabaikan (kaitan uang/okupansi). */
  dampak?: string;
  /** Snapshot/endpoint asal angka — kartu tidak boleh mengarang angka. */
  sourceRefs?: DecisionCardSourceRef[];
  /** Masa berlaku kartu; mencegah kartu basi tampil sebagai fakta. */
  expiresAt?: string | null;
  /** `true` bila kartu berasal dari jalur rule-based, bukan AI. */
  fallback?: boolean;
};

export type DecisionCardItem = DecisionCardFields & {
  id: string | number;
  priority?: string;
  type?: string;
  subject?: string;
  issue?: string;
  recommendedAction?: string;
  actionTo?: string;
  dedupKey?: string;
  ruleId?: string;
  entityType?: string;
  entityId?: string | number | null;
};

export type DecisionCardMeta = DecisionCardItem & {
  /** Ref bersih (label + ref tidak kosong), urutan dipertahankan. */
  sourceRefs: DecisionCardSourceRef[];
  /** Kartu tanpa AI tetap tampil — jangan ada jalur tanpa kartu. */
  effectiveFallback: boolean;
  /** `true` bila `expiresAt` sudah lewat (atau tidak ada, lalu dianggap tak kedaluwarsa). */
  isExpired: boolean;
  /** `true` bila kartu punya nilai keputusan yang bisa ditampilkan kepada pengguna. */
  hasDecisionContext: boolean;
};

const teks = (nilai?: string | null): string | undefined => {
  if (typeof nilai !== 'string') return undefined;
  const bersih = nilai.trim();
  return bersih.length > 0 ? bersih : undefined;
};

const refBersih = (refs?: DecisionCardSourceRef[] | null): DecisionCardSourceRef[] => {
  if (!Array.isArray(refs)) return [];
  return refs
    .filter((r): r is DecisionCardSourceRef => !!r && typeof r === 'object')
    .map((r) => ({ label: teks(r.label) ?? '', ref: teks(r.ref) ?? '' }))
    .filter((r) => r.label.length > 0 && r.ref.length > 0);
};

/**
 * Satu-satunya tempat normalisasi kartu keputusan. Jangan salin logika ini ke
 * halaman: `AIDL-01b` (mesin kartu aturan) memakainya, dan setiap penyalinan
 * akan menyimpang dari kontrak.
 */
export function normalizeDecisionCard(item: DecisionCardItem): DecisionCardMeta {
  const sourceRefs = refBersih(item.sourceRefs);
  const sebab = teks(item.sebab);
  const dampak = teks(item.dampak);
  const expiresAt = teks(item.expiresAt) ?? null;

  return {
    ...item,
    sebab,
    dampak,
    sourceRefs,
    expiresAt,
    fallback: item.fallback === true,
    // Bila AI tidak dipakai (eksplisit atau belum ada penanda), kartu tetap sah
    // dan ditandai sebagai hasil jalur rule-based.
    effectiveFallback: item.fallback !== false,
    isExpired: isDateExpired(expiresAt),
    hasDecisionContext: Boolean(sebab || dampak || sourceRefs.length > 0),
  };
}

export function normalizeDecisionCards(items: DecisionCardItem[]): DecisionCardMeta[] {
  return items.map(normalizeDecisionCard);
}
