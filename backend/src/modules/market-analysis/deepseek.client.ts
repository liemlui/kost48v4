// Klien DeepSeek (OpenAI-compatible) — TANPA dependensi npm baru (pakai global fetch Node 18+).
// Key dibaca dari env: DEEPSEEK_API_KEY (fallback AI_PROVIDER_KEY). Base/model bisa di-override.
// Fase G: upgrade ke model v4-flash, return usage, JSON mode, thinking toggle, hash helper.
// P5: circuit breaker — 5 consecutive failures → 30 detik open, auto-recover.

export type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };

export type DeepseekUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
};

export type DeepseekChatResult = {
  content: string;
  model: string;
  usage?: DeepseekUsage;
};

export type DeepseekChatOpts = {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  model?: string;
  json?: boolean;
  thinking?: 'disabled' | 'enabled';
};

// ── Circuit breaker state (P5) ────────────────────────────────────────────

const CB_MAX_FAILURES = 5;
const CB_OPEN_MS = 30_000; // 30 detik

let cbFailures = 0;
let cbOpenUntil = 0; // epoch ms

export function circuitBreakerState(): { open: boolean; failures: number; openUntil: number } {
  if (cbOpenUntil > 0 && Date.now() < cbOpenUntil) {
    return { open: true, failures: cbFailures, openUntil: cbOpenUntil };
  }
  if (cbOpenUntil > 0 && Date.now() >= cbOpenUntil) {
    // auto-transition to half-open (next call will decide)
    cbOpenUntil = 0;
  }
  return { open: false, failures: cbFailures, openUntil: 0 };
}

function cbSuccess() {
  cbFailures = 0;
  cbOpenUntil = 0;
}

function cbFailure() {
  cbFailures++;
  if (cbFailures >= CB_MAX_FAILURES) {
    cbOpenUntil = Date.now() + CB_OPEN_MS;
  }
}

// ── API ────────────────────────────────────────────────────────────────────

// Owner-request 2026-07-04: key bisa diisi via Settings→AI (tersimpan di OperationalSetting)
// dan di-set ke runtime tanpa restart. Env DEEPSEEK_API_KEY tetap jadi fallback.
let runtimeApiKey: string | undefined;

export function setDeepseekApiKey(key: string | null | undefined): void {
  const trimmed = typeof key === 'string' ? key.trim() : '';
  runtimeApiKey = trimmed || undefined;
}

export function deepseekApiKey(): string | undefined {
  return runtimeApiKey || process.env.DEEPSEEK_API_KEY || process.env.AI_PROVIDER_KEY || undefined;
}

export function deepseekConfigured(): boolean {
  return Boolean(deepseekApiKey());
}

export async function deepseekChat(
  messages: ChatMsg[],
  opts: DeepseekChatOpts = {},
): Promise<DeepseekChatResult> {
  // Circuit breaker gate
  const cb = circuitBreakerState();
  if (cb.open) {
    throw new Error(`DeepSeek API sementara tidak tersedia (circuit breaker terbuka — ${cb.failures} kegagalan berturut-turut). Coba lagi dalam ${Math.ceil((cb.openUntil - Date.now()) / 1000)} detik.`);
  }

  const key = deepseekApiKey();
  if (!key) throw new Error('API key DeepSeek belum diisi. Isi di Pengaturan → AI & Biaya (login OWNER), atau set DEEPSEEK_API_KEY di env backend.');
  const baseURL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
  const model = opts.model || process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.5,
    max_tokens: opts.maxTokens ?? 1400,
    stream: false,
  };

  if (opts.json) {
    body.response_format = { type: 'json_object' };
  }

  if (opts.thinking) {
    body.thinking = { type: opts.thinking };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);
  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      cbFailure();
      throw new Error(`DeepSeek API ${res.status}: ${text.slice(0, 300)}`);
    }
    const json: any = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      cbFailure();
      throw new Error('Respon DeepSeek tidak terbaca.');
    }
    cbSuccess();
    return {
      content,
      model: json.model || model,
      usage: json.usage
        ? {
            prompt_tokens: json.usage.prompt_tokens,
            completion_tokens: json.usage.completion_tokens,
            total_tokens: json.usage.total_tokens,
            prompt_cache_hit_tokens: json.usage.prompt_cache_hit_tokens,
            prompt_cache_miss_tokens: json.usage.prompt_cache_miss_tokens,
          }
        : undefined,
    };
  } catch (err: any) {
    // timeout / network error juga dihitung sebagai failure
    if (err?.name === 'AbortError') {
      cbFailure();
      throw new Error(`DeepSeek API timeout setelah ${opts.timeoutMs ?? 60_000}ms.`);
    }
    // sudah di-handle di atas (cbFailure dipanggil), tapi pastikan untuk unexpected errors
    if (!String(err?.message ?? '').startsWith('DeepSeek API')) {
      cbFailure();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
