import { getResource, postAction } from './resources';

// F2-3b: refund untuk tenant yang kalah first-paid-wins padahal sudah transfer.
export type LossRefund = {
  id: number;
  lossRefundAmountRupiah: number;
  lossRefundNote?: string | null;
  cancelReason?: string | null;
  updatedAt: string;
  room?: { code?: string | null; name?: string | null } | null;
  tenant?: { id: number; fullName: string; phone?: string | null } | null;
};

export async function listPendingLossRefunds(): Promise<LossRefund[]> {
  const data = await getResource<LossRefund[]>('/stays/loss-refunds/pending');
  return Array.isArray(data) ? data : [];
}

export async function processLossRefund(
  id: number,
  payload: { note?: string; proofUrl?: string },
): Promise<unknown> {
  return postAction(`/stays/${id}/loss-refund/process`, payload as Record<string, unknown>);
}
