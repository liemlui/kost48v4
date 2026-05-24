import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { listResource, getResource } from '../api/resources';
import { listMyTenantBookings } from '../api/bookings';
import { listMyPaymentSubmissions } from '../api/paymentSubmissions';
import { getBookingExpiryMeta, parseDateSafe } from '../utils/bookingExpiry';
import { getDeadlineMeta } from '../utils/dateTime';
import type { Invoice, Stay } from '../types';
import { TENANT_PAYMENT_REVIEW_MESSAGE, isPendingReviewStatus } from '../utils/tenantCopy';

export type PaymentUrgencyVariant = 'danger' | 'warning' | 'info';

export interface PaymentUrgency {
  type: 'PAYMENT_UNDER_REVIEW' | 'INVOICE_OVERDUE' | 'BOOKING_PAYMENT_DEADLINE' | 'INVOICE_DUE_SOON' | 'STAY_ENDING_SOON';
  label: string;
  detail?: string;
  variant: PaymentUrgencyVariant;
  to: string;
  priority: number;
}

/** Return midnight-normalized today in local timezone */
function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Days from today midnight to target midnight (negative = past) */
function daysDelta(date: Date): number {
  const today = todayMidnight();
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Hours remaining from now to target timestamp */
function hoursRemaining(date: Date): number {
  const now = Date.now();
  const diffMs = date.getTime() - now;
  return Math.ceil(diffMs / (1000 * 60 * 60));
}

function daysLabel(days: number): string {
  if (days === 0) return 'hari ini';
  if (days === 1) return 'H-1';
  if (days === 2) return 'H-2';
  if (days >= 3) return `H-${days}`;
  return 'Hari ini';
}

function parseEndpointDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isNotFoundError(error: unknown): boolean {
  const maybe = error as {
    response?: { status?: number; data?: { statusCode?: number } };
    status?: number;
  };
  return (
    maybe?.response?.status === 404 ||
    maybe?.response?.data?.statusCode === 404 ||
    maybe?.status === 404
  );
}

function isIssuedOrPartial(status: string): boolean {
  return status === 'ISSUED' || status === 'PARTIAL';
}

export function usePaymentUrgency(): {
  urgency: PaymentUrgency | null;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const isTenant = user?.role === 'TENANT';
  const userId = user?.id;

  // --- Invoices ---
  const invoicesQuery = useQuery({
    queryKey: ['payment-urgency', 'invoices', { userId }],
    queryFn: () => listResource<Invoice>('/invoices/my'),
    enabled: isTenant && Boolean(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  // --- Bookings ---
  const bookingsQuery = useQuery({
    queryKey: ['payment-urgency', 'bookings', { userId }],
    queryFn: () => listMyTenantBookings({ limit: 50 }),
    enabled: isTenant && Boolean(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  // --- Current Stay ---
  const stayQuery = useQuery({
    queryKey: ['payment-urgency', 'stay', { userId }],
    queryFn: () => getResource<Stay>('/stays/me/current'),
    enabled: isTenant && Boolean(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  // --- Payment submissions ---
  const submissionsQuery = useQuery({
    queryKey: ['payment-urgency', 'payment-submissions', { userId }],
    queryFn: () => listMyPaymentSubmissions(),
    enabled: isTenant && Boolean(userId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const urgency = useMemo<PaymentUrgency | null>(() => {
    if (!isTenant) return null;
    if (invoicesQuery.isLoading || bookingsQuery.isLoading || stayQuery.isLoading || submissionsQuery.isLoading) return null;
    if (invoicesQuery.isError && bookingsQuery.isError && stayQuery.isError && submissionsQuery.isError) return null;

    // P0: Bukti pembayaran sudah dikirim dan sedang diperiksa
    {
      const submissions = submissionsQuery.data?.items ?? [];
      const pendingSubmission = submissions.find((submission) => isPendingReviewStatus(submission.status));
      if (pendingSubmission) {
        return {
          type: 'PAYMENT_UNDER_REVIEW',
          label: 'Bukti sedang diperiksa',
          detail: TENANT_PAYMENT_REVIEW_MESSAGE,
          variant: 'info',
          to: pendingSubmission.invoiceId ? `/portal/invoices/${pendingSubmission.invoiceId}` : '/portal/invoices',
          priority: 0,
        };
      }
    }

    // P1: Invoice overdue
    {
      const invoices = invoicesQuery.data?.items ?? [];
      let worstOverdueDays = 0;
      let worstInvoice: Invoice | null = null;

      for (const inv of invoices) {
        if (!isIssuedOrPartial(inv.status)) continue;
        const dueDate = parseEndpointDate(inv.dueDate);
        if (!dueDate) continue;
        const delta = daysDelta(dueDate);
        if (delta < 0 && delta < worstOverdueDays) {
          worstOverdueDays = delta;
          worstInvoice = inv;
        }
      }

      if (worstInvoice) {
        const dueMeta = getDeadlineMeta(worstInvoice.dueDate, 'Jatuh tempo');
        return {
          type: 'INVOICE_OVERDUE',
          label: dueMeta.hasDate ? dueMeta.relativeLabel : 'Tagihan terlambat',
          detail: dueMeta.hasDate ? `${worstInvoice.invoiceNumber ?? 'Tagihan'} · jatuh tempo ${dueMeta.absoluteLabel}` : worstInvoice.invoiceNumber ?? undefined,
          variant: 'danger',
          to: '/portal/invoices',
          priority: 1,
        };
      }
    }

    // P2: Booking payment deadline (expiresAt within 24 hours, payment still unpaid)
    {
      const bookings = bookingsQuery.data?.items ?? [];
      for (const booking of bookings) {
        // Exclude cancelled/expired bookings; only consider approved bookings with invoice
        const bookingStatus = (booking.status ?? '').toUpperCase();
        if (bookingStatus === 'CANCELLED' || bookingStatus === 'EXPIRED') continue;
        // Booking must be approved (has invoice) to have a payment deadline
        const hasInitialInvoice = Number(booking.invoiceCount ?? 0) > 0 || Boolean(booking.latestInvoiceId);
        if (!hasInitialInvoice) continue;
        // Room already occupied means booking is already active (payment completed)
        if (booking.room?.status === 'OCCUPIED') continue;

        const expiryMeta = getBookingExpiryMeta(booking.expiresAt);
        if (expiryMeta.isExpired) continue;

        // Check if within 24 hours (using actual timestamps, not midnight-normalized)
        const expiryDate = parseDateSafe(booking.expiresAt);
        if (!expiryDate) continue;
        const hrs = hoursRemaining(expiryDate);
        if (hrs > 24 || hrs <= 0) continue;

        // Check if payment is still needed
        const remaining = booking.invoiceRemainingAmountRupiah;
        const isPaid = booking.latestInvoiceStatus === 'PAID' || booking.latestInvoiceStatus === 'CANCELLED' || (remaining != null && remaining <= 0);
        if (isPaid) continue;

        const variant = hrs <= 6 ? ('danger' as const) : ('warning' as const);
        const deadlineMeta = getDeadlineMeta(expiryDate, 'Batas bayar');

        return {
          type: 'BOOKING_PAYMENT_DEADLINE',
          label: hrs <= 1 ? 'Bayar segera' : deadlineMeta.relativeLabel,
          detail: `${booking.room?.code ?? 'Booking'} · batas ${deadlineMeta.absoluteLabel}`,
          variant,
          to: '/portal/bookings',
          priority: 2,
        };
      }
    }

    // P3: Invoice due soon (today to today+3)
    {
      const invoices = invoicesQuery.data?.items ?? [];
      let closestDays = Infinity;
      let closestInvoice: Invoice | null = null;

      for (const inv of invoices) {
        if (!isIssuedOrPartial(inv.status)) continue;
        const dueDate = parseEndpointDate(inv.dueDate);
        if (!dueDate) continue;
        const delta = daysDelta(dueDate);
        if (delta >= 0 && delta <= 3 && delta < closestDays) {
          closestDays = delta;
          closestInvoice = inv;
        }
      }

      if (closestInvoice) {
        const dueMeta = getDeadlineMeta(closestInvoice.dueDate, 'Jatuh tempo');
        return {
          type: 'INVOICE_DUE_SOON',
          label: dueMeta.hasDate ? dueMeta.relativeLabel : closestDays === 0 ? 'Jatuh tempo hari ini' : `Tagihan ${daysLabel(closestDays)}`,
          detail: dueMeta.hasDate ? `${closestInvoice.invoiceNumber ?? 'Tagihan'} · ${dueMeta.absoluteLabel}` : closestInvoice.invoiceNumber ?? undefined,
          variant: 'warning',
          to: '/portal/invoices',
          priority: 3,
        };
      }
    }

    // P4: Masa sewa/kontrak mendekati tanggal renew/keluar (within 10 days)
    {
      const stay = stayQuery.data;
      const stayError = stayQuery.error;
      if (stayError && isNotFoundError(stayError)) {
        // No active stay, skip
      } else if (stay) {
        if (stay.status === 'ACTIVE') {
          const checkoutDate = parseEndpointDate(stay.plannedCheckOutDate);
          if (checkoutDate) {
            const delta = daysDelta(checkoutDate);
            if (delta >= 0 && delta <= 10) {
              const variant = delta <= 3 ? ('warning' as const) : ('info' as const);
              const endMeta = getDeadlineMeta(checkoutDate, 'Akhir masa sewa');
              const label = endMeta.hasDate ? endMeta.relativeLabel : delta === 0 ? 'Masa sewa renew/keluar hari ini' : `Masa sewa ${daysLabel(delta)}`;
              return {
                type: 'STAY_ENDING_SOON',
                label,
                detail: endMeta.hasDate ? `${stay.room?.code ?? 'Kamar'} · akhir masa sewa ${endMeta.absoluteLabel}` : stay.room?.code ?? undefined,
                variant,
                to: '/portal/stay',
                priority: 4,
              };
            }
          }
        }
      }
    }

    return null;
  }, [isTenant, invoicesQuery.data, invoicesQuery.isLoading, invoicesQuery.isError, bookingsQuery.data, bookingsQuery.isLoading, bookingsQuery.isError, stayQuery.data, stayQuery.isLoading, stayQuery.isError, submissionsQuery.data, submissionsQuery.isLoading, submissionsQuery.isError]);

  const isLoading = isTenant && (invoicesQuery.isLoading || bookingsQuery.isLoading || stayQuery.isLoading || submissionsQuery.isLoading);

  return { urgency, isLoading };
}