const test = require('node:test');
const assert = require('node:assert/strict');
const {
  AiAgendaSweepService,
  startOfWibDay,
  wibDateKey,
} = require('../../dist/modules/auto-ops/sweeps/ai-agenda-sweep.service.js');

function makeHarness({ existingDraft = null, brief, owner = { id: 7 }, retention = 14 } = {}) {
  const created = [];
  const prisma = {
    aiDraft: {
      findFirst: async () => existingDraft,
      create: async ({ data }) => {
        created.push(data);
        return { id: 101, mode: data.mode };
      },
    },
    user: { findFirst: async () => owner },
    operationalSetting: { findUnique: async () => ({ aiDraftRetentionDays: retention }) },
  };
  const ownerAi = {
    generateBrief: async (actorId) => {
      ownerAi.lastActor = actorId;
      return brief;
    },
    lastActor: null,
  };
  const service = new AiAgendaSweepService(prisma, ownerAi);
  return { service, created, ownerAi };
}

const deepseekBrief = {
  mode: 'DEEPSEEK',
  model: 'deepseek-chat',
  usage: { total_tokens: 900 },
  snapshotHash: 'snap-1',
  promptHash: 'prompt-1',
  fallback: false,
  result: { summary: 'Okupansi 8/13.', priorityActions: [], risks: [], numbersToWatch: [] },
  warnings: [],
  missingData: [],
};

const ruleBrief = {
  mode: 'RULE_FALLBACK',
  model: 'rule-based',
  usage: undefined,
  snapshotHash: 'snap-1',
  promptHash: '',
  fallback: true,
  result: { summary: 'Ringkasan tanpa AI.' },
  warnings: ['Hasil ini tanpa AI (rule fallback).'],
  missingData: [],
};

const now = new Date('2026-10-22T03:00:00.000Z'); // 10:00 WIB

test('W-OWN-012: hari WIB & kunci tanggal dihitung benar', () => {
  const start = startOfWibDay(now);
  assert.equal(start.toISOString(), '2026-10-21T17:00:00.000Z'); // 00:00 WIB 22 Okt
  assert.equal(wibDateKey(now), '2026-10-22');
  // 23:30 UTC 21 Okt = 06:30 WIB 22 Okt → tetap hari yang sama
  assert.equal(wibDateKey(new Date('2026-10-21T23:30:00.000Z')), '2026-10-22');
});

test('W-OWN-012: agenda pertama hari itu membuat satu draft AiDraft', async () => {
  const { service, created, ownerAi } = makeHarness({ brief: deepseekBrief });
  const result = await service.runDailyAiAgenda({ now, source: 'TEST' });

  assert.equal(result.skipped, false);
  assert.equal(result.draftId, 101);
  assert.equal(result.dayKey, '2026-10-22');
  assert.equal(result.aiRequests, 1);
  assert.equal(created.length, 1);
  const draft = created[0];
  assert.equal(draft.feature, 'daily-agenda');
  assert.equal(draft.targetType, 'DAILY_AGENDA');
  assert.equal(draft.targetId, '2026-10-22');
  assert.equal(draft.mode, 'DEEPSEEK');
  assert.equal(draft.createdById, 7);
  assert.equal(ownerAi.lastActor, 7);
  assert.equal(draft.resultJson.summary, 'Okupansi 8/13.');
  // retensi mengikuti OperationalSetting.aiDraftRetentionDays
  assert.equal(draft.expiresAt.toISOString(), new Date(now.getTime() + 14 * 86_400_000).toISOString());
});

test('W-OWN-012: sweep kedua di hari yang sama tidak menambah draft', async () => {
  const { service, created } = makeHarness({ existingDraft: { id: 55 }, brief: deepseekBrief });
  const result = await service.runDailyAiAgenda({ now, source: 'TEST' });
  assert.equal(result.skipped, true);
  assert.equal(result.skippedReason, 'AGENDA_ALREADY_CREATED_TODAY');
  assert.equal(result.draftId, 55);
  assert.equal(created.length, 0);
});

test('W-OWN-012: AI mati/kunci kosong → draft fallback tetap tersimpan, 0 permintaan AI', async () => {
  const { service, created } = makeHarness({ brief: ruleBrief });
  const result = await service.runDailyAiAgenda({ now, source: 'TEST' });
  assert.equal(result.skipped, false);
  assert.equal(result.fallback, true);
  assert.equal(result.aiRequests, 0);
  assert.equal(created.length, 1);
  assert.equal(created[0].mode, 'RULE_FALLBACK');
  assert.equal(created[0].usageJson, undefined);
  assert.equal(created[0].resultJson.fallback, true);
});

test('W-OWN-012: actorId eksplisit dipakai saat sweep dipicu manual', async () => {
  const { service, ownerAi } = makeHarness({ brief: deepseekBrief });
  await service.runDailyAiAgenda({ now, actorUserId: 42, source: 'MANUAL' });
  assert.equal(ownerAi.lastActor, 42);
});
