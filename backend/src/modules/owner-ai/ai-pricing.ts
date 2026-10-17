/**
 * Harga resmi AI (USD per 1 juta token) + estimasi biaya per panggilan.
 *
 * Sumber angka awal: tabel resmi DeepSeek yang diberikan owner 18 Okt 2026
 * (https://api-docs.deepseek.com/quick_start/pricing). Angka TIDAK dikarang:
 * setiap nilai di DEFAULT_AI_PRICING berasal dari tabel itu. Refresh via AI
 * harus lolos validateAiPricing sebelum disimpan; bila gagal, tabel default
 * tetap dipakai.
 *
 * Catatan batas:
 * - Jam sibuk: 01:00–04:00 dan 06:00–10:00 UTC, Senin–Jumat. Hari libur Tiongkok
 *   TIDAK dimodelkan (tidak ada kalender libur di repo); hari itu dihitung sibuk
 *   bila jatuh pada jam tersebut. Ini batas yang harus disebut di UI.
 * - Biaya adalah estimasi token × harga; bukan tagihan resmi DeepSeek.
 */

export type AiPriceTier = {
  offPeak: number;
  peak: number;
};

export type AiModelPricing = {
  cacheHitInputUsdPer1M: AiPriceTier;
  cacheMissInputUsdPer1M: AiPriceTier;
  outputUsdPer1M: AiPriceTier;
};

export type AiPricing = {
  version: number;
  currency: 'USD';
  updatedAt: string;
  source: string;
  sourceUrl: string;
  models: Record<string, AiModelPricing>;
};

export const AI_PRICING_SOURCE_URL = 'https://api-docs.deepseek.com/quick_start/pricing';

export const AI_PRICING_MODEL_KEYS = ['deepseek-flash', 'deepseek-v4-pro'] as const;

/** Alias model lama → kunci harga resmi. */
export function normalizeAiModelKey(model?: string | null): string | null {
  const value = String(model ?? '').trim().toLowerCase();
  if (!value) return null;
  if (value === 'deepseek-flash' || value === 'deepseek-v4-flash' || value === 'deepseek-v4-flash-vision-exp') return 'deepseek-flash';
  if (value === 'deepseek-v4-pro' || value === 'deepseek-pro') return 'deepseek-v4-pro';
  return null;
}

const tier = (offPeak: number, peak: number): AiPriceTier => ({ offPeak, peak });

export const DEFAULT_AI_PRICING: AiPricing = {
  version: 1,
  currency: 'USD',
  updatedAt: '2026-10-18T00:00:00.000Z',
  source: 'owner-table-2026-10-18',
  sourceUrl: AI_PRICING_SOURCE_URL,
  models: {
    'deepseek-flash': {
      cacheHitInputUsdPer1M: tier(0.003, 0.006),
      cacheMissInputUsdPer1M: tier(0.15, 0.3),
      outputUsdPer1M: tier(0.6, 1.2),
    },
    'deepseek-v4-pro': {
      cacheHitInputUsdPer1M: tier(0.022, 0.044),
      cacheMissInputUsdPer1M: tier(0.66, 1.32),
      outputUsdPer1M: tier(1.98, 3.96),
    },
  },
};

/** Jam sibuk menurut tabel resmi: 01–04 dan 06–10 UTC, Senin–Jumat. */
export function isAiPeakUtc(date: Date): boolean {
  const day = date.getUTCDay(); // 0 Minggu, 6 Sabtu
  if (day === 0 || day === 6) return false;
  const hour = date.getUTCHours();
  return (hour >= 1 && hour < 4) || (hour >= 6 && hour < 10);
}

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000;

function parseTier(value: unknown): AiPriceTier | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (!isFiniteNonNegative(row.offPeak) || !isFiniteNonNegative(row.peak)) return null;
  if (row.peak < row.offPeak) return null;
  return { offPeak: row.offPeak, peak: row.peak };
}

/**
 * Validasi + normalisasi harga dari sumber luar (AI). Hanya field yang dikenal
 * yang disimpan; model asing ditolak. Mengembalikan null bila bentuk/angka tidak sah.
 */
export function validateAiPricing(value: unknown): AiPricing | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const rawModels = raw.models;
  if (!rawModels || typeof rawModels !== 'object') return null;

  const models: Record<string, AiModelPricing> = {};
  for (const [key, rowValue] of Object.entries(rawModels as Record<string, unknown>)) {
    const modelKey = normalizeAiModelKey(key);
    if (!modelKey) continue;
    if (!rowValue || typeof rowValue !== 'object') continue;
    const row = rowValue as Record<string, unknown>;
    const cacheHit = parseTier(row.cacheHitInputUsdPer1M);
    const cacheMiss = parseTier(row.cacheMissInputUsdPer1M);
    const output = parseTier(row.outputUsdPer1M);
    if (!cacheHit || !cacheMiss || !output) continue;
    models[modelKey] = {
      cacheHitInputUsdPer1M: cacheHit,
      cacheMissInputUsdPer1M: cacheMiss,
      outputUsdPer1M: output,
    };
  }

  if (!AI_PRICING_MODEL_KEYS.every((key) => Boolean(models[key]))) return null;

  const version = typeof raw.version === 'number' && Number.isInteger(raw.version) && raw.version > 0
    ? raw.version
    : 1;
  const updatedAt = typeof raw.updatedAt === 'string' && !Number.isNaN(new Date(raw.updatedAt).getTime())
    ? new Date(raw.updatedAt).toISOString()
    : new Date().toISOString();
  const source = typeof raw.source === 'string' && raw.source.trim() ? raw.source.trim().slice(0, 120) : 'ai-refresh';
  const sourceUrl = typeof raw.sourceUrl === 'string' && raw.sourceUrl.trim()
    ? raw.sourceUrl.trim().slice(0, 300)
    : AI_PRICING_SOURCE_URL;

  return { version, currency: 'USD', updatedAt, source, sourceUrl, models };
}

/** Ambil JSON dari keluaran AI (bisa dibungkus ```json). */
export function parseAiPricingJson(text: string): unknown {
  const raw = String(text ?? '').trim();
  if (!raw) return null;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fence?.[1] ?? raw).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first < 0 || last <= first) return null;
    try {
      return JSON.parse(candidate.slice(first, last + 1));
    } catch {
      return null;
    }
  }
}

export type AiUsageLike = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
};

const numberOrZero = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;

export type AiCostEstimate = {
  priced: boolean;
  usd: number | null;
  modelKey: string | null;
  peak: boolean;
  cacheHitTokens: number;
  cacheMissTokens: number;
  outputTokens: number;
};

/** Estimasi biaya satu panggilan. priced=false bila model/usage tidak bisa dihitung. */
export function estimateAiCostUsd(input: {
  model?: string | null;
  usage?: AiUsageLike | null;
  at: Date;
  pricing?: AiPricing;
}): AiCostEstimate {
  const pricing = input.pricing ?? DEFAULT_AI_PRICING;
  const modelKey = normalizeAiModelKey(input.model);
  const price = modelKey ? pricing.models[modelKey] : undefined;
  const usage = input.usage ?? {};
  const promptTokens = numberOrZero(usage.prompt_tokens);
  const outputTokens = numberOrZero(usage.completion_tokens);
  const cacheHitTokens = numberOrZero(usage.prompt_cache_hit_tokens);
  const cacheMissTokens = numberOrZero(usage.prompt_cache_miss_tokens) || Math.max(0, promptTokens - cacheHitTokens);
  const peak = isAiPeakUtc(input.at);

  if (!price || !promptTokens || !outputTokens) {
    return { priced: false, usd: null, modelKey, peak, cacheHitTokens, cacheMissTokens, outputTokens };
  }

  const hitRate = peak ? price.cacheHitInputUsdPer1M.peak : price.cacheHitInputUsdPer1M.offPeak;
  const missRate = peak ? price.cacheMissInputUsdPer1M.peak : price.cacheMissInputUsdPer1M.offPeak;
  const outRate = peak ? price.outputUsdPer1M.peak : price.outputUsdPer1M.offPeak;
  const usd = (cacheHitTokens * hitRate + cacheMissTokens * missRate + outputTokens * outRate) / 1_000_000;

  return { priced: true, usd, modelKey, peak, cacheHitTokens, cacheMissTokens, outputTokens };
}

/** Bentuk aman untuk AuditLog.meta.ai: hanya fitur/model/angka usage, tanpa prompt/secret. */
export function buildAiUsageAuditMeta(input: {
  feature: string;
  model?: string | null;
  usage?: AiUsageLike | null;
  at: Date;
  pricing?: AiPricing;
}) {
  const usage = input.usage ?? null;
  const safeUsage = usage ? {
    prompt_tokens: numberOrZero(usage.prompt_tokens),
    completion_tokens: numberOrZero(usage.completion_tokens),
    total_tokens: numberOrZero(usage.total_tokens),
    prompt_cache_hit_tokens: numberOrZero(usage.prompt_cache_hit_tokens),
    prompt_cache_miss_tokens: numberOrZero(usage.prompt_cache_miss_tokens),
  } : null;
  const estimate = estimateAiCostUsd({ model: input.model, usage, at: input.at, pricing: input.pricing });

  return {
    ai: {
      feature: input.feature,
      mode: 'DEEPSEEK',
      model: input.model ?? null,
      usage: safeUsage,
      estimatedCostUsd: estimate.usd,
      priced: estimate.priced,
      peak: estimate.peak,
      at: input.at.toISOString(),
    },
  };
}

/** Ringkas teks halaman harga resmi untuk prompt AI (tanpa tag HTML). */
export function extractPricingPageExcerpt(html: string, maxLength = 5000): string {
  const text = String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
  const index = text.search(/deepseek-flash/i);
  const start = index >= 0 ? Math.max(0, index - 500) : 0;
  return text.slice(start, start + maxLength);
}
