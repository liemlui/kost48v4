import client from './client';
import type { CheckoutRequest, InventoryItem, Invoice, PaymentSubmission, RenewRequest, Room, Stay, Ticket } from '../types';

export interface AdminDashboardAggregate {
  rooms: { items: Room[] };
  stays: { items: Stay[] };
  invoices: { items: Invoice[] };
  tickets: { items: Ticket[] };
  renewRequests: { items: RenewRequest[] };
  checkoutPending: { items: CheckoutRequest[] };
  checkoutApproved: { items: CheckoutRequest[] };
  paymentReview: { items: PaymentSubmission[]; meta: { totalItems: number } };
  inventoryItems: { items: InventoryItem[] };
  facilityGaps?: {
    items: Array<{
      roomId: number;
      code?: string | null;
      name?: string | null;
      status?: string | null;
      hasGap: boolean;
      acGap: boolean;
      missingCount: number;
    }>;
    meta: {
      totalItems: number;
      acGapItems: number;
    };
  };
}

export async function fetchAdminDashboardAggregate(): Promise<AdminDashboardAggregate> {
  const res = await client.get<{ data: AdminDashboardAggregate }>('/admin/dashboard/aggregate');
  return res.data.data;
}
