import { getResource, postAction } from './resources';

export type AutoOpsStatus = {
  enabled: boolean;
  now: string;
  intervalMinutes: number;
  deadlines: Record<string, number>;
  expiredCandidates: number;
  heldForPaymentReview: number;
  orphanReservedRooms: number;
  policy: string;
};

export type AutoOpsRunResult = {
  expiredBookings: number;
  heldForPaymentReview: number;
  releasedRooms: number;
  expiredStayIds: number[];
  releasedRoomIds: number[];
};

export async function fetchAutoOpsStatus() {
  return getResource<AutoOpsStatus>('/auto-ops/status');
}

export async function runAutoOps() {
  return postAction<AutoOpsRunResult>('/auto-ops/run');
}
