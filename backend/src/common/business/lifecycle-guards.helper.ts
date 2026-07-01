import { CheckoutRequestStatus, RenewRequestStatus } from '../enums/app.enums';

/**
 * W-04: Helper domain lifecycle cross-block.
 * Centralisasi definisi status "aktif" untuk renew & checkout request
 * agar kedua service konsisten tanpa hardcode array literal duplikat.
 */

/** Status permintaan perpanjangan yang memblokir checkout. */
export const ACTIVE_RENEW_STATUSES: RenewRequestStatus[] = [
  RenewRequestStatus.PENDING,
  RenewRequestStatus.PENDING_DECISION,
  RenewRequestStatus.AWAITING_DP,
  RenewRequestStatus.DP_SECURED,
];

/** Status permintaan checkout yang memblokir perpanjangan. */
export const ACTIVE_CHECKOUT_STATUSES: CheckoutRequestStatus[] = [
  CheckoutRequestStatus.PENDING,
];

export function isActiveRenewRequestStatus(status: RenewRequestStatus): boolean {
  return ACTIVE_RENEW_STATUSES.includes(status);
}

export function isActiveCheckoutRequestStatus(status: CheckoutRequestStatus): boolean {
  return ACTIVE_CHECKOUT_STATUSES.includes(status);
}
