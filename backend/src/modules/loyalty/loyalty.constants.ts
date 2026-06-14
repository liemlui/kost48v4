// F4-9 Gamifikasi — nilai poin default (dossier 19). Bisa di-override via env;
// owner dapat menyesuaikan lewat panel admin di masa depan.
export const LOYALTY_POINTS = {
  RENEWAL: Number(process.env.LOYALTY_POINTS_RENEWAL ?? 100),
  ON_TIME_PAYMENT: Number(process.env.LOYALTY_POINTS_ON_TIME_PAYMENT ?? 50),
  VALIDATED_REPORT: Number(process.env.LOYALTY_POINTS_VALIDATED_REPORT ?? 30),
  ONBOARDING_QUEST: Number(process.env.LOYALTY_POINTS_ONBOARDING_QUEST ?? 200),
} as const;

export type EarnReason = keyof typeof LOYALTY_POINTS;

// F4-9: estimasi nilai 1 poin dalam Rupiah (setelan owner, env-override). Dipakai untuk
// menyarankan biaya poin sebuah reward dari nilai rupiahnya → owner fleksibel mengatur
// reward (mis. layanan in-house: pembersihan/cat ulang kamar, voucher WiFi).
export const LOYALTY_POINT_RUPIAH_VALUE = Number(process.env.LOYALTY_POINT_RUPIAH_VALUE ?? 100);

/** Saran biaya poin dari nilai rupiah reward = nilai / (rupiah per poin), minimal 1. */
export function suggestedPointCost(valueRupiah: number): number {
  const perPoint = LOYALTY_POINT_RUPIAH_VALUE > 0 ? LOYALTY_POINT_RUPIAH_VALUE : 100;
  const value = Number(valueRupiah);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.max(1, Math.round(value / perPoint));
}

/** Estimasi nilai rupiah dari sejumlah poin. */
export function pointsToRupiah(points: number): number {
  const perPoint = LOYALTY_POINT_RUPIAH_VALUE > 0 ? LOYALTY_POINT_RUPIAH_VALUE : 100;
  return Math.max(0, Math.round((Number(points) || 0) * perPoint));
}

/** Poin (selalu >= 0) untuk sebuah aktivitas perolehan. */
export function pointsForReason(reason: EarnReason): number {
  const value = LOYALTY_POINTS[reason];
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Saldo = Σ delta (ledger append-only). Pure, mudah diuji. */
export function computeLoyaltyBalance(points: Array<{ delta: number }>): number {
  return points.reduce((sum, p) => sum + (Number.isFinite(p.delta) ? Math.trunc(p.delta) : 0), 0);
}
