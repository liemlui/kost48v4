import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getResource } from '../api/resources';
import { listMyTenantBookings } from '../api/bookings';
import { PORTAL_QUERY_KEYS } from '../api/portalQueryKeys';
import type { Stay } from '../types';
import { getActionableTenantBookings } from '../utils/tenantBookingRules';

export type TenantPortalStage = 'browsing' | 'booking' | 'occupied';

function isNotFoundError(error: unknown): boolean {
  const maybe = error as {
    response?: {
      status?: number;
      data?: {
        statusCode?: number;
      };
    };
    status?: number;
  };

  return (
    maybe?.response?.status === 404 ||
    maybe?.response?.data?.statusCode === 404 ||
    maybe?.status === 404
  );
}

export function useTenantPortalStage() {
  const { user } = useAuth();
  const isTenant = user?.role === 'TENANT';
  const userId = user?.id;
  const tenantId = user?.tenantId;

  const stayQuery = useQuery({
    // T-06: key bersama dengan MyStayPage/ActiveStayContent/usePaymentUrgency agar
    // `/stays/me/current` hanya diambil sekali per kunjungan (lihat api/portalQueryKeys.ts).
    queryKey: PORTAL_QUERY_KEYS.currentStay,
    queryFn: async () => {
      // AE-01: tangkap 404 sebagai hasil valid (null) agar staleTime bekerja
      // dan refetchOnMount tidak memicu loop tak terbatas.
      try {
        return await getResource<Stay>('/stays/me/current');
      } catch (err: unknown) {
        if (isNotFoundError(err)) return null;
        throw err;
      }
    },
    enabled: isTenant && Boolean(userId),
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const bookingsQuery = useQuery({
    // T-06: key disamakan dengan usePaymentUrgency (limit 50) supaya tidak ada dua
    // permintaan berbeda untuk `/tenant/bookings/my`.
    queryKey: PORTAL_QUERY_KEYS.myBookings,
    queryFn: () => listMyTenantBookings({ limit: 50 }),
    enabled: isTenant && Boolean(userId),
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const stayNotFound = isNotFoundError(stayQuery.error);

  const stage = useMemo<TenantPortalStage>(() => {
    if (!isTenant) return 'browsing';

    const stay = stayQuery.data;
    if (stay) {
      const roomStatus = (stay.room?.status ?? '').toUpperCase();
      return roomStatus === 'OCCUPIED' ? 'occupied' : 'booking';
    }

    const actionableBookingCount = getActionableTenantBookings(bookingsQuery.data?.items ?? []).length;
    if (actionableBookingCount > 0) return 'booking';

    return 'browsing';
  }, [isTenant, stayQuery.data, bookingsQuery.data]);

  /** True while stage is still being determined (initial fetch in progress).
   *  AI-01b: bookingsQuery bersifat supplementary — jangan blokir render portal
   *  bila bookingsQuery gagal (503/drift DB). Cukup tunggu stayQuery settle. */
  const isStageLoading =
    isTenant &&
    stayQuery.isLoading;

  const hasStayHistory = isTenant && (bookingsQuery.data?.items?.length ?? 0) > 0;

  return {
    stage,
    isLoading: isStageLoading,
    hasStayHistory,

    isError:
      isTenant &&
      !stayNotFound &&
      (stayQuery.isError || bookingsQuery.isError),

    error:
      !stayNotFound && stayQuery.error
        ? stayQuery.error
        : bookingsQuery.error ?? null,

    refetch: async () => {
      await Promise.all([stayQuery.refetch(), bookingsQuery.refetch()]);
    },
  };
}