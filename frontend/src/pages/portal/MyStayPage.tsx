// FILE: MyStayPage.tsx — dashboard penghuni: status sewa, info kamar, aksi
import ActiveStayContent from '../../components/portal/stay/ActiveStayContent';
import FeatureErrorBoundary from '../../components/common/FeatureErrorBoundary';
import { type ReactNode, useEffect, useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Accordion, Alert, Button, Card, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import SafeImage from '../../components/common/SafeImage';
import { getResource, listResource } from '../../api/resources';
import { decideRenewRequest, listMyRenewRequests } from '../../api/renewRequests';
import { listMyCheckoutRequests } from '../../api/checkoutRequests';
import { listMyPaymentSubmissions } from '../../api/paymentSubmissions';
import { getProfileCompleteness } from '../../api/tenants';
import { getMeterReadingsByRoom } from '../../api/meterReadings';
import { getMyRoomUtilityTelemetry, type TenantRoomUtilityTelemetry } from '../../api/iot';
import { fetchPublicConfig } from '../../api/settings';
import CheckoutRequestModal from '../../components/checkout-requests/CheckoutRequestModal';
import RenewRequestModal from '../../components/tenant/RenewRequestModal';
import MeterCycleModal from '../../components/stays/MeterCycleModal';
import StayHistoryTimeline, { type StayJourneyStep } from '../../components/stays/StayHistoryTimeline';
import SatisfactionSurveyCard from '../../components/tenant/SatisfactionSurveyCard';
import LeaseProgressHero from '../../components/portal/stay/LeaseProgressHero';
import StayQuickActions from '../../components/portal/stay/StayQuickActions';
import StayAnnouncementBanner from '../../components/portal/stay/StayAnnouncementBanner';
import { useAuth } from '../../context/AuthContext';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import type { PaginatedResponse } from '../../types';
import type { CheckoutRequest, Invoice, MeterReading, RenewRequest, RoomItem, Stay, Ticket } from '../../types';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { getDaysUntilTenantDate, getOpenTenantInvoices, getPendingReviewInvoiceIds, getPrimaryTenantInvoice, isTenantInvoiceOverdue } from '../../utils/tenantRules';
import { isPayableInvoiceStatus, TENANT_PAYMENT_REVIEW_MESSAGE, tenantPricingTermLabel } from '../../utils/tenantCopy';
import { getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import {
  PROFILE_FIELD_LABELS, formatDate, toDateKey, getMeterWindow, getLatestUtilityReading, formatRoomFloorLabel,
  friendlyItemStatus, inventoryStatusClass, getRoomFacilitySummary, getRoomFacilities, getInventoryItems, getRoomCoverImage, getRoomPriceFacts,
} from './myStayShared';
import { acCapacityLabel, roomBathroomLabel, roomSizeLabel, roomMaxOccupants } from '../../utils/roomFacilitySpec';
import { formatAcHoursEstimate } from '../../utils/acUsageEstimate';

// AJ-01 (C05-01): 404 dari /stays/me/current = "tidak punya stay" (hasil valid), bukan error.
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

// ═══════════════════════════════════════════════════════════
//  COMPONENT: ActiveStayContent
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════

export default function MyStayPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stage } = useTenantPortalStage();
  const userId = user?.id;
  const tenantId = user?.tenantId;

  const query = useQuery({
    queryKey: ['portal-stay', { userId, tenantId }],
    queryFn: async () => {
      // AJ-01: 404 = hasil valid null agar staleTime berlaku & refetchOnMount tidak loop (C05-01).
      try {
        return await getResource<Stay>('/stays/me/current');
      } catch (err: unknown) {
        if (isNotFoundError(err)) return null;
        throw err;
      }
    },
    enabled: Boolean(userId) && stage === 'occupied',
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 30_000,
  });

  // TEN-PROFILE-NOTIF: nudge "Lengkapi Profil" bila data onboarding belum lengkap.
  const completenessQuery = useQuery({
    queryKey: ['portal-profile-completeness', tenantId],
    queryFn: getProfileCompleteness,
    enabled: Boolean(tenantId),
    staleTime: 60_000,
  });

  const stay = query.data;
  const stayBelongsToUser = stay ? stay.tenantId === tenantId : false;

  if (stay && !stayBelongsToUser && import.meta.env.DEV) {
    console.warn('[MyStayPage] stay tenantId mismatch', { stayTenantId: stay.tenantId, currentUserTenantId: tenantId });
  }

  const roomStatusOccupied = stay && stayBelongsToUser
    ? (stay.room?.status ?? '').toUpperCase() === 'OCCUPIED'
    : false;

  return (
    <FeatureErrorBoundary>
    <div>
      {!(stage === 'occupied' && stay && stayBelongsToUser && roomStatusOccupied) ? (
        <PageHeader
          eyebrow="Portal Penghuni"
          title="Panduan Kos Saya"
          description="Kamar, tagihan, laporan, dan aksi penting."
        />
      ) : null}

      {completenessQuery.data && !completenessQuery.data.isComplete ? (
        <Alert variant="warning" className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <strong>📋 Lengkapi profil ({completenessQuery.data.completionPercent}%)</strong>
            <div className="small mb-0">
              {completenessQuery.data.missingFields.length} data belum diisi:{' '}
              {completenessQuery.data.missingFields.map((f) => PROFILE_FIELD_LABELS[f] ?? f).join(', ')}.
            </div>
          </div>
          <Button variant="warning" size="sm" onClick={() => navigate('/profile')}>Lengkapi Sekarang</Button>
        </Alert>
      ) : null}

      {stage !== 'occupied' ? (
        <EmptyState
          icon="🏠"
          title="Kamu belum memiliki masa sewa aktif"
          description="Pilih kamar atau lanjutkan pemesanan yang sedang berjalan."
          action={{
            label: stage === 'booking' ? 'Buka Pemesanan Saya' : 'Lihat Kamar',
            onClick: () => navigate(stage === 'booking' ? '/portal/bookings' : '/rooms'),
          }}
        />
      ) : null}

      {stage === 'occupied' && query.isLoading ? (
        <div className="py-5 text-center"><Spinner animation="border" /></div>
      ) : null}

      {stage === 'occupied' && query.isError ? (() => {
        const err = query.error as any;
        const status = err?.response?.status ?? err?.response?.data?.statusCode;
        if (status === 404) {
          return (
            <EmptyState
              icon="🏠"
              title="Kamu belum memiliki masa sewa aktif"
              description="Kalau sedang booking, buka Pemesanan Saya."
              action={{ label: 'Buka Pemesanan Saya', onClick: () => navigate('/portal/bookings') }}
            />
          );
        }
        return (
          <Alert variant="danger" className="mt-4">
            <div className="fw-semibold">Gagal memuat data masa sewa</div>
            <div className="small mt-1">{getApiErrorMessage(err, 'Terjadi kesalahan saat mengambil data. Silakan coba lagi.')}</div>
          </Alert>
        );
      })() : null}

      {stage === 'occupied' && !query.isLoading && !query.isError && !stay ? (
        <EmptyState
          icon="🏠"
          title="Kamu belum memiliki masa sewa aktif"
          description="Kalau sedang booking, buka Pemesanan Saya."
          action={{ label: 'Buka Pemesanan Saya', onClick: () => navigate('/portal/bookings') }}
        />
      ) : null}

      {stay && !stayBelongsToUser ? (
        <EmptyState
          icon="🔒"
          title="Kamu belum memiliki masa sewa aktif"
          description="Pilih kamar dari katalog publik untuk mulai booking."
          action={{ label: 'Lihat Kamar', onClick: () => navigate('/rooms') }}
        />
      ) : null}

      {stay && stayBelongsToUser && !roomStatusOccupied ? (
        <EmptyState
          icon="📅"
          title="Pemesanan kamu masih diproses"
          description="Selesaikan pembayaran awal dari Pemesanan Saya sebelum masuk ke panduan masa sewa."
          action={{ label: 'Buka Pemesanan Saya', onClick: () => navigate('/portal/bookings') }}
        />
      ) : null}

      {stay && stayBelongsToUser && roomStatusOccupied ? (
        <ActiveStayContent stay={stay} />
      ) : null}
    </div>
    </FeatureErrorBoundary>
  );
}
