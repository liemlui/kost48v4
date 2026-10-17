/**
 * Jembatan antara keluaran AI dan tautan UI (AIDL-03).
 *
 * Kontrak keamanan: `route` dari AI adalah string bebas (temuan A-1). Fungsi ini
 * membuang rute mentah dan hanya meneruskan `safeRoute` hasil allowlist
 * deterministik (`utils/decisionRoutes.ts`). UI tidak boleh menerima/memakai
 * `route` mentah dari sini — itu sebabnya tipe hasil tidak memuat field `route`.
 */
import { resolveDecisionRoute } from './decisionRoutes';

export type AiPrioritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AiPriorityActionInput = {
  title: string;
  reason: string;
  severity: AiPrioritySeverity;
  route?: string;
};

export type SafeAiPriorityAction = {
  title: string;
  reason: string;
  severity: AiPrioritySeverity;
  /** Hanya terisi bila lolos allowlist; tidak pernah berisi string mentah dari AI. */
  safeRoute?: string;
};

export function toSafeAiPriorityActions(
  actions: readonly AiPriorityActionInput[] | null | undefined,
): SafeAiPriorityAction[] {
  if (!Array.isArray(actions)) return [];
  return actions.map((action) => ({
    title: String(action.title ?? '').trim(),
    reason: String(action.reason ?? '').trim(),
    severity: action.severity,
    safeRoute: resolveDecisionRoute(action.route),
  }));
}
