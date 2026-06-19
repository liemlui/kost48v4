import type { ChatMsg } from '../../market-analysis/deepseek.client';

const BASE_RULES = [
  'Kamu asisten operasional KOST48 untuk Owner/Admin.',
  'Berikan draft rekomendasi saja. Jangan membuat/mengubah tiket, stok, kamar, expense, assignment, atau jurnal.',
  'Gunakan data snapshot saja. Jika data kurang, tulis warning dan jangan mengarang angka.',
  'Bahasa Indonesia, singkat, praktis, dan siap ditempel sebagai catatan admin.',
  'Output JSON saja tanpa markdown.',
].join('\n');

export function buildTicketActionPrompt(snapshot: Record<string, unknown>): ChatMsg[] {
  return [
    {
      role: 'system',
      content: [
        BASE_RULES,
        'Schema wajib:',
        JSON.stringify({
          summary: 'string',
          recommendedAction: 'ASSIGN_STAFF|CREATE_EXPENSE_DRAFT|REQUEST_PHOTO|CLOSE|KEEP_OPEN',
          priority: 'LOW|MEDIUM|HIGH',
          suggestedNote: 'string',
          riskFlags: ['string'],
        }, null, 2),
        'Jika tiket belum ada assignee dan masih OPEN, biasanya rekomendasikan ASSIGN_STAFF.',
        'Jika bukti/foto kurang, rekomendasikan REQUEST_PHOTO.',
        'Jika status DONE, hanya boleh rekomendasikan CLOSE bila checklist manusia tetap perlu cek.',
      ].join('\n'),
    },
    { role: 'user', content: JSON.stringify(snapshot, null, 2) },
  ];
}

export function buildInventoryReorderPrompt(snapshot: Record<string, unknown>): ChatMsg[] {
  return [
    {
      role: 'system',
      content: [
        BASE_RULES,
        'Schema wajib:',
        JSON.stringify({
          lowStockItems: [
            { inventoryItemId: 1, name: 'string', currentQty: 0, suggestedMinQty: 0, reason: 'string' },
          ],
          purchaseSuggestions: [
            { name: 'string', qty: 0, estimatedBudgetRupiah: 0, priority: 'LOW|MEDIUM|HIGH' },
          ],
          warnings: ['string'],
        }, null, 2),
        'Jangan menyarankan mutasi stok otomatis. Pembelian/movement tetap dibuat admin secara manual.',
      ].join('\n'),
    },
    { role: 'user', content: JSON.stringify(snapshot, null, 2) },
  ];
}

export function buildFieldReportReviewPrompt(snapshot: Record<string, unknown>): ChatMsg[] {
  return [
    {
      role: 'system',
      content: [
        BASE_RULES,
        'Schema wajib:',
        JSON.stringify({
          summary: 'string',
          recommendedDecision: 'APPROVE|REJECT|NEEDS_MORE_INFO',
          priority: 'LOW|MEDIUM|HIGH',
          suggestedAdminNote: 'string',
          suggestedMovement: { needed: false, movementType: 'ASSIGN_TO_ROOM|OUT|null', reason: 'string' },
          riskFlags: ['string'],
        }, null, 2),
        'Review final tetap lewat endpoint admin-review. Jangan auto-approve.',
      ].join('\n'),
    },
    { role: 'user', content: JSON.stringify(snapshot, null, 2) },
  ];
}
