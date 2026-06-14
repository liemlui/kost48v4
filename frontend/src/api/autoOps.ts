import { getResource, postAction } from './resources';

export type AutoOpsStatus = {
  enabled: boolean;
  now: string;
  intervalMinutes: number;
  deadlines: Record<string, number>;
  expiredCandidates?: number;
  heldForPaymentReview?: number;
  orphanReservedRooms?: number;
  expiredBookings?: number;
  expiredBookingCandidates?: number;
  paymentPendingReview?: number;
  pendingReviewCount?: number;
  orphanReservedRoomCount?: number;
  reservedOrphans?: number;
  policy: string;
  accountingAutoClosePolicy?: unknown;
};

export type AutoOpsRunResult = {
  expiredBookings?: number;
  cancelledBookings?: number;
  expiredBookingCount?: number;
  heldForPaymentReview?: number;
  pendingReviewHeld?: number;
  paymentReviewHeldCount?: number;
  releasedRooms?: number;
  orphanReleasedRooms?: number;
  releasedRoomCount?: number;
  expiredStayIds?: Array<number | string>;
  expiredBookingIds?: Array<number | string>;
  cancelledBookingIds?: Array<number | string>;
  releasedRoomIds?: Array<number | string>;
  releasedRoomsIds?: Array<number | string>;
  orphanReleasedRoomIds?: Array<number | string>;
  recurringExpenseDrafts?: unknown;
  automaticDepreciation?: unknown;
  accountingAutoClose?: unknown;
};

export async function fetchAutoOpsStatus() {
  return getResource<AutoOpsStatus>('/auto-ops/status');
}

export async function runAutoOps() {
  return postAction<AutoOpsRunResult>('/auto-ops/run');
}
