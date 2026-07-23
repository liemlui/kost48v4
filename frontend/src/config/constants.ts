/**
 * Shared business constants — sumber kebenaran untuk nilai yang dipakai di banyak tempat.
 * Jangan hardcode nilai-nilai ini di komponen; impor dari sini.
 */

/** Rasio DP (down payment) terhadap total sewa — 30% */
export const DP_RATIO = 0.3;

/** Harga default WiFi per perangkat per bulan (fallback jika OperationalSetting belum tersedia) */
export const WIFI_DEFAULT_PRICE_RUPIAH = 50_000;
