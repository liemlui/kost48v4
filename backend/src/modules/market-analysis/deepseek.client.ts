// Klien DeepSeek (OpenAI-compatible) — TANPA dependensi npm baru (pakai global fetch Node 18+).
// Key dibaca dari env: DEEPSEEK_API_KEY (fallback AI_PROVIDER_KEY). Base/model bisa di-override.
// Riset web LIVE = fase lanjutan (perlu tool web-search terpisah); untuk kini model memakai
// pengetahuannya sendiri + jawaban owner.

export type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };

export function deepseekApiKey(): string | undefined {
  return process.env.DEEPSEEK_API_KEY || process.env.AI_PROVIDER_KEY || undefined;
}

export function deepseekConfigured(): boolean {
  return Boolean(deepseekApiKey());
}

export async function deepseekChat(
  messages: ChatMsg[],
  opts: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {},
): Promise<string> {
  const key = deepseekApiKey();
  if (!key) throw new Error('DEEPSEEK_API_KEY belum dikonfigurasi di .env backend.');
  const baseURL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);
  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0.5,
        max_tokens: opts.maxTokens ?? 1400,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`DeepSeek API ${res.status}: ${body.slice(0, 300)}`);
    }
    const json: any = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('Respon DeepSeek tidak terbaca.');
    return content;
  } finally {
    clearTimeout(timer);
  }
}
