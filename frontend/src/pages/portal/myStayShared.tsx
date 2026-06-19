// Helper murni (format/fasilitas/inventaris/harga) diekstrak dari MyStayPage.tsx (refactor 2026-06-19: AI-read).
// Semua pure function (tanpa hook/state). getRoomPriceFacts pakai JSX -> file .tsx.
import { type ReactNode, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Accordion, Alert, Button, Card, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
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
import { listActiveAdditionalServices, createServiceInterest, listMyServiceInterests } from '../../api/additionalServices';
import { getMeterReadingsByRoom } from '../../api/meterReadings';
import CheckoutRequestModal from '../../components/checkout-requests/CheckoutRequestModal';
import RenewRequestModal from '../../components/tenant/RenewRequestModal';
import MeterCycleModal from '../../components/stays/MeterCycleModal';
import StayHistoryTimeline from '../../components/stays/StayHistoryTimeline';
import RenewalCrossSellCard from '../../components/tenant/RenewalCrossSellCard';
import SatisfactionSurveyCard from '../../components/tenant/SatisfactionSurveyCard';
import { useAuth } from '../../context/AuthContext';
import { useTenantPortalStage } from '../../hooks/useTenantPortalStage';
import type { PaginatedResponse } from '../../types';
import type { CheckoutRequest, Invoice, MeterReading, RenewRequest, RoomItem, Stay, Ticket } from '../../types';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { getDaysUntilTenantDate, getOpenTenantInvoices, getPendingReviewInvoiceIds, getPrimaryTenantInvoice, isTenantInvoiceOverdue } from '../../utils/tenantRules';
import { isPayableInvoiceStatus, TENANT_PAYMENT_REVIEW_MESSAGE, tenantPricingTermLabel } from '../../utils/tenantCopy';
import { formatDateTimeWib, getDeadlineMeta } from '../../utils/dateTime';
import { compactText } from '../../utils/readabilityRules';
import { getInvoiceTotalAmount } from '../../utils/invoiceTotals';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import { getKost48RoomCover } from '../../data/kost48Assets';

// TEN-PROFILE-NOTIF: label Indonesia untuk field profil yang belum lengkap.
export const PROFILE_FIELD_LABELS: Record<string, string> = {
  gender: 'jenis kelamin',
  birthDate: 'tanggal lahir',
  originCity: 'kota asal',
  occupation: 'pekerjaan',
  companyOrCampus: 'perusahaan/kampus',
  emergencyContactName: 'kontak darurat (nama)',
  emergencyContactPhone: 'kontak darurat (telepon)',
};

// ── helpers ───────────────────────────────────────────────────────────────────

export function formatDate(value?: string | null) {
  return formatDateTimeWib(value);
}

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentMeterWindow() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    startKey: toDateKey(start),
    endKey: toDateKey(end),
  };
}

export function getLatestUtilityReading(readings: MeterReading[], utilityType: 'ELECTRICITY' | 'WATER') {
  return readings
    .filter((reading) => String(reading.utilityType).toUpperCase() === utilityType)
    .sort((a, b) => new Date(b.readingAt).getTime() - new Date(a.readingAt).getTime())[0] ?? null;
}

export function formatEndHelper(value?: string | null) {
  const meta = getDeadlineMeta(value, 'Akhir masa sewa');
  if (!meta.hasDate) return 'Belum diisi';
  return meta.relativeLabel;
}

export function formatRoomFloorLabel(floor?: string | number | null): string | null {
  if (floor === null || floor === undefined || floor === '') return null;
  const s = String(floor).trim();
  return /^lantai\s/i.test(s) ? s : `Lantai ${s}`;
}

export function friendlyItemStatus(status?: string | null): string {
  const s = (status ?? '').toUpperCase().trim();
  if (s === 'GOOD') return 'Baik';
  if (s === 'DAMAGED') return 'Rusak';
  if (s === 'MISSING') return 'Hilang';
  if (s === 'NEEDS_REPAIR' || s === 'MAINTENANCE') return 'Perlu dicek';
  if (!s || /^[A-Z_]+$/.test(s)) return 'Terpasang';
  return status ?? 'Terpasang';
}

export function inventoryStatusClass(status?: string | null): string {
  const s = (status ?? '').toUpperCase().trim();
  if (s === 'GOOD') return 'inv-status-good';
  if (s === 'DAMAGED' || s === 'MISSING') return 'inv-status-bad';
  if (s === 'NEEDS_REPAIR' || s === 'MAINTENANCE') return 'inv-status-check';
  return 'inv-status-normal';
}

export function getRoomFacilitySummary(stay: Stay) {
  const room = stay.room;
  const floorLabel = formatRoomFloorLabel(room?.floor);
  const roomBits = [room?.name, floorLabel, tenantPricingTermLabel(stay.pricingTerm)]
    .filter(Boolean) as string[];
  return {
    roomInfo: roomBits.length ? roomBits.join(' · ') : 'Detail kamar aktif',
  };
}

export function getRoomFacilities(stay: Stay) {
  return (stay.room?.facilities ?? [])
    .filter((f: any) => f.publicVisible !== false)
    .map((f: any) => ({
      id: `facility-${f.id}`,
      name: (f.name ?? '') as string,
    }))
    .filter((f) => f.name.trim() !== '');
}

export function getInventoryItems(roomItems: RoomItem[], stayRoomId: number | string | undefined) {
  if (!stayRoomId) return [];
  return roomItems
    .filter((item) => Number(item.roomId) === Number(stayRoomId))
    .map((item) => ({
      id: `room-item-${item.id}`,
      name: (item as any).item?.name ?? `Barang #${item.itemId}`,
      qty: item.qty ?? 1,
      status: item.status ?? '',
    }));
}

export function getRoomCoverImage(stay: Stay) {
  const localCover = getKost48RoomCover(stay.room?.code, stay.room?.name);
  const firstImage = stay.room?.images?.[0];
  const resolved = firstImage ? resolveAbsoluteFileUrl(firstImage) : null;
  return localCover ?? resolved;
}

export function getRoomPriceFacts(stay: Stay): { label: string; value: ReactNode }[] {
  const room = stay.room;
  const agreedRent = stay.agreedRentAmountRupiah ?? room?.monthlyRateRupiah ?? 0;
  return [
    { label: 'Sewa disepakati', value: <CurrencyDisplay amount={agreedRent} showZero={false} /> },
    { label: 'Deposit titipan', value: <CurrencyDisplay amount={stay.depositAmountRupiah ?? room?.defaultDepositRupiah} showZero={false} /> },
    { label: 'Listrik / kWh', value: <CurrencyDisplay amount={room?.electricityTariffPerKwhRupiah ?? stay.electricityTariffPerKwhRupiah} showZero={false} /> },
    { label: 'Air / m³', value: <CurrencyDisplay amount={room?.waterTariffPerM3Rupiah ?? stay.waterTariffPerM3Rupiah} showZero={false} /> },
  ];
}

// ── constants ─────────────────────────────────────────────────────────────────

export const TENANT_SERVICE_IDEAS = [
  { label: 'WiFi tambahan', helper: 'Untuk kerja, kuliah, atau streaming.' },
  { label: 'Laundry', helper: 'Bantu hemat waktu penghuni.' },
  { label: 'Cleaning kamar', helper: 'Bantuan bersih-bersih berkala.' },
  { label: 'Air galon', helper: 'Pengingat dan layanan isi ulang.' },
  { label: 'Parkir tambahan', helper: 'Untuk kendaraan ekstra.' },
  { label: 'Pindah kamar', helper: 'Minat upgrade atau pindah kamar.' },
];
