/**
 * Allowlist rute untuk kartu keputusan (AIDL-01b).
 *
 * Kenapa ini ada: keluaran AI memuat `route` berupa **string bebas**, dan UI
 * belum memvalidasinya sebelum `navigate` (temuan A-1 di
 * `docs/audit/ai-agenda-recon-2026-09-25.md`; aturan "Batas keamanan" di
 * `docs/product/portal-owner-admin.md` §10.2). Kartu yang boleh berasal dari AI
 * TIDAK boleh menavigasi ke string mentah dari LLM.
 *
 * Cara pakai: rute kartu yang datang dari luar kode (AI/aksi eksternal) WAJIB
 * lewat `resolveDecisionRoute()`. Rute yang ditulis tangan di kode (produsen
 * aturan hari ini) tidak perlu — tetapi boleh, dan hasilnya sama.
 *
 * Batas yang disengaja: daftar ini **dirawat tangan**, bukan diturunkan dari
 * router. Kalau rute baru dipakai kartu, tambahkan di sini dan tambahkan test —
 * jangan melebarkan fungsi ini menjadi "apa saja yang dimulai dengan /".
 */

/** Rute + rute detail yang memang dipakai kartu keputusan hari ini. */
export const DECISION_CARD_ROUTES: readonly string[] = [
  '/invoices',
  '/invoices/:id',
  '/payment-submissions/review',
  '/renew-requests',
  '/reports',
  '/rooms',
  '/rooms/:id',
  '/stays',
  '/tenants',
  '/tickets',
];

export const DECISION_CARD_RULES: readonly string[] = [
  'invoice-overdue',
  'payment-review',
  'payment-review-sla',
  'checkout-final',
  'checkout-final-sla',
  'checkout-review',
  'checkout-review-sla',
  'renew-pending',
  'renew-meter-sla',
  'room-available',
  'room-maintenance',
  'booking-review-sla',
  'booking-payment-waiting',
  'ktp-review',
  'ticket-old',
  'ticket-open',
  'business-stable',
  'ops-stable',
  // TENANT (AIDL-01b, keputusan owner 11 Okt 2026 P11-a). Rutenya ditulis tangan
  // di kode, jadi tidak memperlebar allowlist rute untuk kartu dari AI.
  'tenant-invoice-overdue',
  'tenant-renew-pending-decision',
  'tenant-checkout-in-progress',
];

const bersihkan = (nilai?: string | null): string => (typeof nilai === 'string' ? nilai.trim() : '');

/**
 * Cocokkan path konkret dengan pola allowlist. Segmen `:nama` menerima satu
 * segmen aman (huruf/angka/underscore/strip), sehingga `/invoices/:id` menerima
 * `/invoices/12` tetapi tidak menerima `/invoices/12/extra` atau segmen kosong.
 */
function cocokPola(path: string, pola: string): boolean {
  const bagianPath = path.split('/');
  const bagianPola = pola.split('/');
  if (bagianPath.length !== bagianPola.length) return false;
  return bagianPola.every((segmen, index) => (
    segmen.startsWith(':')
      ? /^[A-Za-z0-9_-]+$/.test(bagianPath[index] ?? '')
      : segmen === bagianPath[index]
  ));
}

const bagianRute = (kandidat: string): { path: string; query: string } | null => {
  const potong = kandidat.split('#')[0];
  const tanya = potong.indexOf('?');
  const path = tanya === -1 ? potong : potong.slice(0, tanya);
  const query = tanya === -1 ? '' : potong.slice(tanya + 1);
  return path.startsWith('/') ? { path, query } : null;
};

/** Apakah rute ini cocok dengan salah satu pola allowlist? (path saja, tanpa query) */
export function isDecisionRouteAllowed(kandidat?: string | null): boolean {
  const teks = bersihkan(kandidat);
  if (!teks) return false;
  const bagian = bagianRute(teks);
  if (!bagian) return false;
  return DECISION_CARD_ROUTES.some((pola) => cocokPola(bagian.path, pola));
}

/**
 * Ubah kandidat rute (bisa berasal dari AI) menjadi rute yang aman, atau
 * `undefined` bila tidak dikenali. Tidak pernah mengembalikan string mentah
 * yang belum lolos allowlist — itu inti fungsinya.
 */
export function resolveDecisionRoute(kandidat?: string | null): string | undefined {
  const teks = bersihkan(kandidat);
  if (!teks) return undefined;
  // tolak apa pun yang mencoba keluar dari jalur rute internal
  if (teks.includes('//') || teks.includes('\\') || teks.includes('..')) return undefined;
  const bagian = bagianRute(teks);
  if (!bagian) return undefined;
  if (!DECISION_CARD_ROUTES.some((pola) => cocokPola(bagian.path, pola))) return undefined;
  // query dipertahankan hanya sebatas bentuk yang dipakai kartu (mis. ?status=BOOKINGS)
  if (bagian.query && !/^[A-Za-z0-9_=&%-]+$/.test(bagian.query)) return undefined;
  return bagian.query ? `${bagian.path}?${bagian.query}` : bagian.path;
}

/** Apakah `ruleId` termasuk aturan kartu yang dikenal? */
export function isDecisionRuleKnown(ruleId?: string | null): boolean {
  const teks = bersihkan(ruleId);
  return teks.length > 0 && DECISION_CARD_RULES.includes(teks);
}
