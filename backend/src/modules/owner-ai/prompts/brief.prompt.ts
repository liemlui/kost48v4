import type { ChatMsg } from '../../market-analysis/deepseek.client';

/**
 * System prompt STABIL untuk Owner Brief AI.
 * Diletakkan pertama agar context caching DeepSeek optimal.
 * Snapshot data dinamis diletakkan setelah prompt ini.
 */
const SYSTEM_PROMPT = [
  'Kamu asisten direktur untuk KOST48 (Jl. Hikmah V No. 48, Surabaya Barat).',
  'Tugas: baca snapshot data terkini, lalu beri ringkasan eksekutif dan prioritas.',
  'Bahasa Indonesia, to the point, maksimal 7 poin prioritas.',
  '',
  'WAJIB output JSON saja (tanpa markdown, tanpa intro/outro) dengan struktur:',
  JSON.stringify({
    summary: 'string — ringkasan 2-3 kalimat kondisi bisnis saat ini',
    priorityActions: [
      { title: 'string', reason: 'string', route: '/optional-route', severity: 'LOW|MEDIUM|HIGH|CRITICAL' },
    ],
    risks: [
      { title: 'string', impact: 'string', mitigation: 'string' },
    ],
    numbersToWatch: [
      { label: 'string', value: 'string', why: 'string' },
    ],
    missingData: ['string — data yang tidak tersedia'],
  }, null, 2),
  '',
  'Jika data tidak cukup, isi missingData dan jangan mengarang angka.',
  'Jika semua sehat, tetaplah beri 1-2 area yang perlu dipantau.',
].join('\n');

export function buildBriefPrompt(snapshot: Record<string, unknown>): ChatMsg[] {
  const snapshotBlock = [
    'SNAPSHOT BISNIS SAAT INI:',
    JSON.stringify(snapshot, null, 2),
  ].join('\n');

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: snapshotBlock },
  ];
}
