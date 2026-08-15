// FILE: StaysPage.tsx — daftar hunian aktif + histori check-in/check-out
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { listStays } from '../../api/stays';
import { rejectBooking } from '../../api/bookings';
import { expireReservedBooking, runPaymentSubmissionExpiryCheck } from '../../api/paymentSubmissions';
import { approveCheckoutRequest, listAdminCheckoutRequests, rejectCheckoutRequest } from '../../api/checkoutRequests';
import CurrencyDisplay from '../../components/common/CurrencyDisplay';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../components/common/ToastProvider';
import { useConfirm } from '../../components/common/ConfirmProvider';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import PageHeader from '../../components/common/PageHeader';
import PaginationControls from '../../components/common/PaginationControls';
import StatusBadge, { getStatusLabel } from '../../components/common/StatusBadge';
import { getBookingStatusLabel } from '../../utils/statusLabels';
import { ActionQueueTable, type ActionQueueItem, type AssistantItem } from '../../components/command-center';
import { AssistantInsightLine, EntityBadgeFilterBar } from '../../components/workspace';
import ApproveBookingModal from '../../components/stays/ApproveBookingModal';
import RejectBookingModal from '../../components/stays/RejectBookingModal';
import ApproveCheckoutModal from '../../components/checkout-requests/ApproveCheckoutModal';
import RejectCheckoutModal from '../../components/checkout-requests/RejectCheckoutModal';
import type { CheckoutRequest, PaginatedResponse, Stay } from '../../types';
import { resolveAbsoluteFileUrl } from '../../utils/resolveAbsoluteFileUrl';
import { buildTenantWaUrl } from '../../utils/whatsapp';
import { formatDateId, getBookingExpiryMeta } from '../../utils/bookingExpiry';
import {
  formatDateSafe,
  daysFromToday,
  isReservedBooking,
  isExpiredReservedBooking,
  isOperationalActiveStay,
  getDepositSettlementLabel,
  isCheckoutDueOrOverdue,
  getCheckoutReminderBadge,
  getBookingApprovalMeta,
  listAllActiveStaysForBookings,
} from './stayPredicates';


type StayViewFilter = 'ALL' | 'BOOKINGS' | 'CHECKOUT' | 'ACTIVE';

const STAY_CHART_COLORS = ['#2563eb', '#f59e0b', '#16a34a', '#ef4444', '#7c3aed', '#0ea5e9'];

type RentExpiryTone = 'danger' | 'warning' | 'info' | 'success' | 'muted';

type RentExpiryItem = {
  stay: Stay;
  daysLeft: number | null;
  remainingPercent: number;
  tone: RentExpiryTone;
  label: string;
};

function getRentExpiryItem(stay: Stay): RentExpiryItem {
  const daysLeft = daysFromToday(stay.plannedCheckOutDate);
  const checkIn = stay.checkInDate ? new Date(stay.checkInDate).getTime() : Number.NaN;
  const periodEnd = stay.plannedCheckOutDate ? new Date(stay.plannedCheckOutDate).getTime() : Number.NaN;
  const totalDays = Number.isFinite(checkIn) && Number.isFinite(periodEnd)
    ? Math.max(1, Math.round((periodEnd - checkIn) / 86_400_000))
    : 0;
  const remainingPercent = daysLeft === null || totalDays === 0
    ? 0
    : Math.max(0, Math.min(100, Math.round((daysLeft / totalDays) * 100)));

  if (daysLeft === null) return { stay, daysLeft, remainingPercent, tone: 'muted', label: 'Tanggal akhir belum ada' };
  if (daysLeft < 0) return { stay, daysLeft, remainingPercent, tone: 'danger', label: `Lewat ${Math.abs(daysLeft)} hari` };
  if (daysLeft === 0) return { stay, daysLeft, remainingPercent, tone: 'danger', label: 'Keluar hari ini' };
  if (daysLeft <= 3) return { stay, daysLeft, remainingPercent, tone: 'danger', label: `H-${daysLeft}` };
  if (daysLeft <= 10) return { stay, daysLeft, remainingPercent, tone: 'warning', label: `H-${daysLeft}` };
  if (daysLeft <= 30) return { stay, daysLeft, remainingPercent, tone: 'info', label: `H-${daysLeft}` };
  return { stay, daysLeft, remainingPercent, tone: 'success', label: `H-${daysLeft}` };
}

function RentExpiryOverview({ items, onOpen }: { items: Stay[]; onOpen: (stayId: number) => void }) {
  const expiryItems = useMemo(
    () => items
      .map(getRentExpiryItem)
      .sort((left, right) => (left.daysLeft ?? Number.POSITIVE_INFINITY) - (right.daysLeft ?? Number.POSITIVE_INFINITY)),
    [items],
  );

  const overviewData = useMemo(() => {
    const buckets = [
      { name: 'Lewat target', color: '#dc2626', match: (item: RentExpiryItem) => item.daysLeft !== null && item.daysLeft < 0 },
      { name: 'H-0 s/d H-3', color: '#ef4444', match: (item: RentExpiryItem) => item.daysLeft !== null && item.daysLeft >= 0 && item.daysLeft <= 3 },
      { name: 'H-4 s/d H-10', color: '#f59e0b', match: (item: RentExpiryItem) => item.daysLeft !== null && item.daysLeft >= 4 && item.daysLeft <= 10 },
      { name: 'H-11 s/d H-30', color: '#2563eb', match: (item: RentExpiryItem) => item.daysLeft !== null && item.daysLeft >= 11 && item.daysLeft <= 30 },
      { name: '> H-30', color: '#16a34a', match: (item: RentExpiryItem) => item.daysLeft !== null && item.daysLeft > 30 },
      { name: 'Tanpa tanggal akhir', color: '#94a3b8', match: (item: RentExpiryItem) => item.daysLeft === null },
    ];
    return buckets
      .map((bucket) => ({ name: bucket.name, color: bucket.color, value: expiryItems.filter(bucket.match).length }))
      .filter((bucket) => bucket.value > 0);
  }, [expiryItems]);

  if (!expiryItems.length) return null;

  return (
    <Card className="content-card border-0 mb-3 rent-expiry-overview">
      <Card.Body>
        <div className="rent-expiry-overview-head">
          <div>
            <div className="panel-title">Pantauan akhir masa sewa</div>
            <div className="panel-subtitle">Setiap donut menunjukkan sisa periode tenant. Urutan paling kiri paling mendesak.</div>
          </div>
          <div className="rent-expiry-order-note">Urut: tanggal akhir terdekat</div>
        </div>
        <div className="rent-expiry-overview-content">
          <div className="rent-expiry-summary">
            <div className="rent-expiry-summary-donut">
              <ResponsiveContainer width="100%" height={132}>
                <PieChart>
                  <Pie data={overviewData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={39} outerRadius={58} paddingAngle={2} stroke="none">
                    {overviewData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${Number(value ?? 0)} tenant`, String(name ?? '')]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="rent-expiry-summary-center"><strong>{expiryItems.length}</strong><span>Aktif</span></div>
            </div>
            <div className="rent-expiry-legend">
              {overviewData.map((entry) => <span key={entry.name}><i style={{ background: entry.color }} />{entry.name}: {entry.value}</span>)}
            </div>
          </div>
          <div className="rent-expiry-tenant-scroll" aria-label="Pantauan masa sewa per tenant">
            {expiryItems.map((item) => {
              const ringData = [
                { name: 'Sisa periode', value: item.remainingPercent, color: item.tone === 'danger' ? '#ef4444' : item.tone === 'warning' ? '#f59e0b' : item.tone === 'info' ? '#2563eb' : item.tone === 'success' ? '#16a34a' : '#94a3b8' },
                { name: 'Periode berjalan', value: 100 - item.remainingPercent, color: '#e8eef7' },
              ];
              return (
                <button
                  key={item.stay.id}
                  type="button"
                  className={`rent-expiry-tenant-card is-${item.tone}`}
                  onClick={() => onOpen(item.stay.id)}
                  aria-label={`Buka masa sewa ${item.stay.tenant?.fullName ?? item.stay.tenantId}, ${item.label}`}
                >
                  <div className="rent-expiry-mini-donut">
                    <PieChart width={72} height={72}>
                      <Pie data={ringData} dataKey="value" cx="50%" cy="50%" innerRadius={21} outerRadius={30} stroke="none">
                        {ringData.map((segment) => <Cell key={segment.name} fill={segment.color} />)}
                      </Pie>
                    </PieChart>
                    <span>{item.daysLeft === null ? '-' : item.daysLeft < 0 ? `+${Math.abs(item.daysLeft)}` : item.daysLeft}</span>
                  </div>
                  <div className="rent-expiry-tenant-copy">
                    <strong>{item.stay.tenant?.fullName ?? `Penghuni #${item.stay.tenantId}`}</strong>
                    <span>Kamar {item.stay.room?.code ?? item.stay.roomId} · {formatDateSafe(item.stay.plannedCheckOutDate)}</span>
                    <em>{item.label}</em>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════
//  COMPONENT: StayAnalyticsPanel
// ═══════════════════════════════════════════════════════════

function StayAnalyticsPanel({ items, operationalActive, reservedBookings, checkoutDue, pendingApproval, waitingPayment }: {
  items: any[];
  operationalActive: any[];
  reservedBookings: any[];
  checkoutDue: any[];
  pendingApproval: number;
  waitingPayment: number;
}) {
  const statusData = [
    { name: 'Aktif', value: operationalActive.length, color: '#16a34a' },
    { name: 'Booking', value: reservedBookings.length, color: '#f59e0b' },
    { name: 'Selesai', value: items.filter((s) => s.status === 'COMPLETED').length, color: '#2563eb' },
    { name: 'Dibatalkan', value: items.filter((s) => s.status === 'CANCELLED').length, color: '#94a3b8' },
  ].filter((d) => d.value > 0);

  const flowData = [
    { label: 'Perlu setujui', value: pendingApproval, color: '#ef4444' },
    { label: 'Menunggu bayar', value: waitingPayment, color: '#f97316' },
    { label: 'Aktif', value: operationalActive.length, color: '#16a34a' },
    { label: 'Checkout dekat', value: checkoutDue.length, color: '#f59e0b' },
  ];

  const pricingData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((s) => {
      const term = s.pricingTerm ?? 'MONTHLY';
      counts[term] = (counts[term] ?? 0) + 1;
    });
    const labels: Record<string, string> = { MONTHLY: 'Bulanan', WEEKLY: 'Mingguan', DAILY: 'Harian', BIWEEKLY: 'Dua minggu', SEMESTER: 'Semester', YEARLY: 'Tahunan' };
    return Object.entries(counts).map(([key, value], i) => ({ label: labels[key] ?? key, value, color: STAY_CHART_COLORS[i % STAY_CHART_COLORS.length] }));
  }, [items]);

  const total = statusData.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  return (
    <Row className="g-3 mb-3 stay-analytics-row">
      <Col md={4}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Status Penghuni</div>
            <div className="panel-subtitle mb-2">Komposisi masa sewa saat ini</div>
            <div className="stay-analytics-donut-wrap">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">
                    {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${Number(value ?? 0)} masa sewa`, String(name ?? '')]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="stay-analytics-donut-center"><strong>{total}</strong><span>Total</span></div>
            </div>
            <div className="stay-analytics-legend">
              {statusData.map((d) => <span key={d.name}><i style={{ background: d.color }} />{d.name}: {d.value}</span>)}
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Booking Flow</div>
            <div className="panel-subtitle mb-2">Jumlah di tiap tahap proses</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart layout="vertical" data={flowData} margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
                <CartesianGrid horizontal={false} stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={110} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`${Number(value ?? 0)}`, 'Jumlah']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} background={{ fill: 'rgba(148,163,184,0.10)' }}>
                  {flowData.map((d) => <Cell key={d.label} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Tipe Pembayaran</div>
            <div className="panel-subtitle mb-2">Masa sewa berdasarkan periode harga</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart layout="vertical" data={pricingData} margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
                <CartesianGrid horizontal={false} stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={90} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`${Number(value ?? 0)} masa sewa`, '']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} background={{ fill: 'rgba(148,163,184,0.10)' }}>
                  {pricingData.map((d) => <Cell key={d.label} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

// ═══════════════════════════════════════════════════════════
//  COMPONENT: StaysPage — Main
// ═══════════════════════════════════════════════════════════

export default function StaysPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFromUrl = searchParams.get('status') || undefined;
  const filterFromUrl: StayViewFilter = statusFromUrl === 'BOOKINGS'
    ? 'BOOKINGS'
    : statusFromUrl === 'CHECKOUT'
      ? 'CHECKOUT'
      : statusFromUrl === 'ALL'
        ? 'ALL'
        : 'ACTIVE';
  const [statusFilter, setStatusFilter] = useState<StayViewFilter>(filterFromUrl);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<Stay | null>(null);
  const [rejectBookingTarget, setRejectBookingTarget] = useState<Stay | null>(null);
  const [approveTarget, setApproveTarget] = useState<CheckoutRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CheckoutRequest | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const PAGE_SIZE = 5;

  const isBookingsMode = statusFilter === 'BOOKINGS';
  const isCheckoutMode = statusFilter === 'CHECKOUT';
  const isActionableMode = isBookingsMode || isCheckoutMode;
  const apiStatusFilter = statusFilter === 'ACTIVE' ? 'ACTIVE' : undefined;

  const expireMutation = useMutation({
    mutationFn: async (stayId?: number) => (stayId ? expireReservedBooking(stayId) : runPaymentSubmissionExpiryCheck()),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-submissions'] }),
      ]);
    },
    onError: (err: unknown) => {
      toast(getApiErrorMessage(err, 'Gagal menjalankan kedaluwarsa booking.'), 'danger');
    },
  });

  const rejectBookingMutation = useMutation({
    mutationFn: async ({ stayId, reviewNotes }: { stayId: number; reviewNotes: string }) =>
      rejectBooking(stayId, { reviewNotes }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-submissions'] }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            typeof query.queryKey?.[0] === 'string' &&
            String(query.queryKey[0]).startsWith('dashboard-'),
        }),
      ]);
      setRejectBookingTarget(null);
    },
    onError: (err: unknown) => {
      toast(getApiErrorMessage(err, 'Gagal menolak booking.'), 'danger');
    },
  });

  const checkoutRequestsQuery = useQuery({
    queryKey: ['admin-checkout-requests', 'PENDING'],
    queryFn: () => listAdminCheckoutRequests({ status: 'PENDING' }),
    enabled: isActionableMode,
    staleTime: 30_000,
  });

  const approvedCheckoutRequestsQuery = useQuery({
    queryKey: ['admin-checkout-requests', 'APPROVED'],
    queryFn: () => listAdminCheckoutRequests({ status: 'APPROVED' }),
    enabled: isActionableMode,
    staleTime: 30_000,
  });

  const pendingCheckoutRequests = useMemo(() => {
    if (!checkoutRequestsQuery.data?.items) return [];
    return checkoutRequestsQuery.data.items.filter((r) => r.status === 'PENDING');
  }, [checkoutRequestsQuery.data]);

  const approvedCheckoutRequests = useMemo(() => {
    if (!approvedCheckoutRequestsQuery.data?.items) return [];
    return approvedCheckoutRequestsQuery.data.items.filter((r) => r.status === 'APPROVED');
  }, [approvedCheckoutRequestsQuery.data]);

  const approveCrMutation = useMutation({
    mutationFn: async ({ id, reviewNotes }: { id: number; reviewNotes?: string }) => approveCheckoutRequest(id, { reviewNotes }),
    onSuccess: async () => {
      setApproveTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-checkout-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
      ]);
    },
    onError: (err: unknown) => {
      toast(getApiErrorMessage(err, 'Gagal menyetujui pengajuan keluar.'), 'danger');
    },
  });

  const rejectCrMutation = useMutation({
    mutationFn: async ({ id, reviewNotes }: { id: number; reviewNotes: string }) =>
      rejectCheckoutRequest(id, { reviewNotes }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-checkout-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['stays'] }),
      ]);
      setRejectTarget(null);
    },
    onError: (err: unknown) => {
      toast(getApiErrorMessage(err, 'Gagal menolak pengajuan keluar.'), 'danger');
    },
  });

  const query = useQuery({
    queryKey: ['stays', statusFilter, isActionableMode ? 'bookings-all' : page],
    queryFn: () => (
      isActionableMode
        ? listAllActiveStaysForBookings()
        : listStays({ status: apiStatusFilter, page, limit: PAGE_SIZE })
    ),
  });

  // Ringkasan rent expiry harus mencakup semua tenant aktif, bukan hanya lima
  // baris pada halaman tabel saat ini.
  const rentExpiryQuery = useQuery({
    queryKey: ['stays', 'rent-expiry-overview'],
    queryFn: () => listStays({ status: 'ACTIVE', page: 1, limit: 200 }),
    enabled: statusFilter === 'ACTIVE',
    staleTime: 30_000,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const rentExpiryItems = useMemo(
    () => (rentExpiryQuery.data?.items ?? []).filter((item) => isOperationalActiveStay(item)),
    [rentExpiryQuery.data],
  );
  const reservedBookings = useMemo(() => items.filter((item) => isReservedBooking(item) && !isExpiredReservedBooking(item)), [items]);
  const operationalActive = useMemo(() => items.filter((item) => isOperationalActiveStay(item)), [items]);
  const checkoutDue = useMemo(() => operationalActive.filter((item) => isCheckoutDueOrOverdue(item)), [operationalActive]);

  const filteredItems = useMemo(() => {
    if (statusFilter === 'BOOKINGS') return [...reservedBookings, ...checkoutDue];
    if (statusFilter === 'CHECKOUT') return checkoutDue;
    if (statusFilter === 'ACTIVE') return operationalActive;
    return items;
  }, [checkoutDue, items, operationalActive, reservedBookings, statusFilter]);

  const handleStatusFilterChange = (filter: StayViewFilter) => {
    setStatusFilter(filter);
    const nextParams = new URLSearchParams(searchParams);
    if (filter === 'ALL') {
      nextParams.delete('status');
    } else {
      nextParams.set('status', filter);
    }
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    if (statusFilter !== filterFromUrl) {
      setStatusFilter(filterFromUrl);
    }
  }, [filterFromUrl, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const checkoutSoonCount = checkoutDue.length;
  const pendingCheckoutRequestCount = pendingCheckoutRequests.length;
  const approvedCheckoutRequestCount = approvedCheckoutRequests.length;
  const checkoutActionableCount = checkoutSoonCount + pendingCheckoutRequestCount + approvedCheckoutRequestCount;
  const expiredBookingsCount = items.filter((item) => isReservedBooking(item) && isExpiredReservedBooking(item)).length;
  const pendingApprovalCount = reservedBookings.filter((item) => getBookingApprovalMeta(item).isPendingApproval).length;
  const waitingPaymentCount = reservedBookings.filter((item) => !getBookingApprovalMeta(item).isPendingApproval).length;
  const meta = query.data?.meta;
  const paginatedFilteredItems = isActionableMode
    ? filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : filteredItems;
  const bookingsTotalItems = isActionableMode ? filteredItems.length : 0;
  const bookingsTotalPages = isActionableMode ? Math.max(1, Math.ceil(bookingsTotalItems / PAGE_SIZE)) : 1;
  const visibleItems = isActionableMode ? paginatedFilteredItems : filteredItems;
  const tableCountText = isActionableMode
    ? `Menampilkan ${visibleItems.length} dari ${bookingsTotalItems} item butuh tindakan`
    : `Menampilkan ${filteredItems.length} dari ${meta?.totalItems ?? items.length} data`;
  const firstPendingApprovalBooking = reservedBookings.find((item) => getBookingApprovalMeta(item).isPendingApproval);
  const firstExpiredBooking = items.find((item) => isReservedBooking(item) && isExpiredReservedBooking(item));
  const firstCheckoutDue = checkoutDue[0];
  const firstPendingCheckoutRequest = pendingCheckoutRequests[0];
  const firstApprovedCheckoutRequest = approvedCheckoutRequests[0];

  const assistantItems: AssistantItem[] = [
    pendingApprovalCount ? {
      id: 'booking-approval',
      severity: 'HIGH',
      title: `${pendingApprovalCount} booking menunggu keputusan`,
      message: 'Setujui hanya jika tarif, deposit, dan meter awal sudah jelas. Booking belum mengunci kamar.',
      source: 'Booking',
      count: pendingApprovalCount,
      actionLabel: firstPendingApprovalBooking ? 'Buka booking' : undefined,
      actionTo: firstPendingApprovalBooking ? `/stays/${firstPendingApprovalBooking.id}` : undefined,
    } : null,
    pendingCheckoutRequestCount ? {
      id: 'checkout-pending',
      severity: 'HIGH',
      title: `${pendingCheckoutRequestCount} pengajuan keluar menunggu review`,
      message: 'Review dulu. Persetujuan belum melepas kamar.',
      source: 'Pengajuan keluar',
      count: pendingCheckoutRequestCount,
      actionLabel: firstPendingCheckoutRequest ? 'Review pengajuan' : undefined,
      actionTo: firstPendingCheckoutRequest ? `/stays/${firstPendingCheckoutRequest.stayId}` : undefined,
    } : null,
    approvedCheckoutRequestCount ? {
      id: 'checkout-approved',
      severity: 'BLOCKER',
      title: `${approvedCheckoutRequestCount} rencana keluar sudah disetujui tapi belum final`,
      message: 'Buka detail, cek tagihan, lalu finalkan keluar.',
      source: 'Masa sewa',
      count: approvedCheckoutRequestCount,
      actionLabel: firstApprovedCheckoutRequest ? 'Buka detail' : undefined,
      actionTo: firstApprovedCheckoutRequest ? `/stays/${firstApprovedCheckoutRequest.stayId}` : undefined,
    } : null,
    expiredBookingsCount ? {
      id: 'booking-expired',
      severity: 'WARNING',
      title: `${expiredBookingsCount} booking reserved sudah kedaluwarsa`,
      message: 'Jalankan expiry check atau review booking agar kamar tidak tertahan tidak produktif.',
      source: 'Booking',
      count: expiredBookingsCount,
      actionLabel: firstExpiredBooking ? 'Buka booking' : undefined,
      actionTo: firstExpiredBooking ? `/stays/${firstExpiredBooking.id}` : undefined,
    } : null,
    checkoutSoonCount ? {
      id: 'checkout-soon',
      severity: 'MEDIUM',
      title: `${checkoutSoonCount} masa sewa mendekati akhir`,
      message: 'Follow-up renew/keluar agar tenant dan operasional siap sebelum tanggal akhir masa sewa.',
      source: 'Masa sewa',
      count: checkoutSoonCount,
      actionLabel: firstCheckoutDue ? 'Buka masa sewa' : undefined,
      actionTo: firstCheckoutDue ? `/stays/${firstCheckoutDue.id}` : undefined,
    } : null,
  ].filter(Boolean) as AssistantItem[];
  const primaryAssistantItem = isCheckoutMode
    ? assistantItems.find((item) => ['checkout-pending', 'checkout-approved', 'checkout-soon'].includes(String(item.id))) ?? assistantItems[0]
    : assistantItems[0];

  const actionableCount = reservedBookings.length + checkoutSoonCount + pendingCheckoutRequestCount + approvedCheckoutRequestCount;
  const stayFilters = [
    { id: 'ALL', label: 'Semua', count: items.filter((item) => item.status === 'ACTIVE' && !isExpiredReservedBooking(item)).length, tone: 'info' as const },
    { id: 'BOOKINGS', label: 'Perlu Tindak Lanjut', count: actionableCount, tone: actionableCount ? 'warning' as const : 'success' as const },
    { id: 'CHECKOUT', label: 'Checkout', count: checkoutActionableCount, tone: checkoutActionableCount ? 'warning' as const : 'info' as const },
    { id: 'ACTIVE', label: 'Aktif', count: operationalActive.length, tone: 'success' as const },
  ];
  const hasCheckoutQueueItems = isActionableMode && (pendingCheckoutRequests.length > 0 || approvedCheckoutRequests.length > 0);

  const actionQueueItems: ActionQueueItem[] = [
    ...approvedCheckoutRequests.map((cr) => ({
      id: `approved-${cr.id}`,
      priority: 'BLOCKER' as const,
      type: 'Final keluar',
      subject: cr.stay?.tenant?.fullName ?? `Masa sewa #${cr.stayId}`,
      issue: 'Disetujui, tetapi kamar belum dilepas. Final keluar masih terpisah.',
      age: cr.reviewedAt ? `Disetujui ${formatDateSafe(cr.reviewedAt)}` : undefined,
      recommendedAction: 'Buka detail',
      actionTo: `/stays/${cr.stayId}`,
    })),
    ...pendingCheckoutRequests.map((cr) => ({
      id: `pending-${cr.id}`,
      priority: 'HIGH' as const,
      type: 'Review keluar',
      subject: cr.stay?.tenant?.fullName ?? `Masa sewa #${cr.stayId}`,
      issue: `Tenant mengajukan keluar pada ${formatDateSafe(cr.requestedCheckOutDate)}.`,
      age: cr.createdAt ? `Diajukan ${formatDateSafe(cr.createdAt)}` : undefined,
      recommendedAction: 'Review',
      actionTo: `/stays/${cr.stayId}`,
    })),
    ...reservedBookings.slice(0, 4).map((stay) => {
      const expiryMeta = getBookingExpiryMeta(stay.expiresAt);
      const approvalMeta = getBookingApprovalMeta(stay);
      return {
        id: `booking-${stay.id}`,
        priority: expiryMeta.isExpired ? 'WARNING' as const : approvalMeta.isPendingApproval ? 'MEDIUM' as const : 'INFO' as const,
        type: 'Booking',
        subject: stay.tenant?.fullName ?? `Tenant #${stay.tenantId}`,
        issue: approvalMeta.helper,
        age: expiryMeta.helperText,
        recommendedAction: approvalMeta.isPendingApproval ? 'Setujui booking' : 'Buka detail',
        actionTo: `/stays/${stay.id}`,
      };
    }),
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Masa Sewa & Penghuni"
        title="Masa Sewa & Penghuni"
        description="Booking, masa sewa aktif, perpanjangan, keluar, dan data penghuni dalam satu area."
        actionLabel="Check-in Baru"
        onAction={() => navigate('/stays/check-in')}
      />

      <div className="admin-sub-nav" aria-label="Sub-navigasi huni">
        <NavLink to="/stays?status=BOOKINGS" className={({ isActive }) => `admin-sub-nav-link${isActive || statusFilter === 'BOOKINGS' ? ' active' : ''}`}>Booking</NavLink>
        <NavLink to="/stays?status=ACTIVE" className={({ isActive }) => `admin-sub-nav-link${isActive || statusFilter === 'ACTIVE' ? ' active' : ''}`}>Aktif</NavLink>
        <NavLink to="/stays?status=CHECKOUT" className={({ isActive }) => `admin-sub-nav-link${isActive || statusFilter === 'CHECKOUT' ? ' active' : ''}`}>Checkout</NavLink>
        <NavLink to="/tenants?ktpStatus=PENDING_REVIEW" className="admin-sub-nav-link">Data Penghuni</NavLink>
        <NavLink to="/renew-requests" className="admin-sub-nav-link">Perpanjangan</NavLink>
        <NavLink to="/stays/assist" className={({ isActive }) => `admin-sub-nav-link${isActive ? ' active' : ''}`}>🤝 Bantu Penghuni</NavLink>
      </div>

      <AssistantInsightLine
        title="Asisten Lifecycle"
        tone={primaryAssistantItem?.severity === 'BLOCKER' || primaryAssistantItem?.severity === 'HIGH' ? 'warning' : primaryAssistantItem ? 'info' : 'success'}
        message={primaryAssistantItem ? `${primaryAssistantItem.title}. ${primaryAssistantItem.message}` : 'Tidak ada blocker besar.'}
        actionLabel={primaryAssistantItem?.actionLabel}
        actionTo={primaryAssistantItem?.actionTo}
        onAction={primaryAssistantItem?.onAction}
      />

      {pendingApprovalCount > 0 || pendingCheckoutRequestCount > 0 ? (
        <Alert variant="warning" className="perlu-tindakan-alert">
          <strong>⚠️ Perlu Tindakan:</strong>{' '}
          {pendingApprovalCount > 0 ? `${pendingApprovalCount} booking perlu disetujui. ` : ''}
          {pendingCheckoutRequestCount > 0 ? `${pendingCheckoutRequestCount} checkout perlu direview.` : ''}
        </Alert>
      ) : null}

      {statusFilter === 'ACTIVE' ? (
        <RentExpiryOverview items={rentExpiryItems} onOpen={(stayId) => navigate(`/stays/${stayId}`)} />
      ) : null}

      {items.length > 0 && (
        <>
        <button
          type="button"
          className="analytics-toggle-btn mb-2"
          onClick={() => setAnalyticsOpen((prev) => !prev)}
          aria-expanded={analyticsOpen}
        >
          📊 {analyticsOpen ? 'Sembunyikan' : 'Lihat'} Analitik {analyticsOpen ? '▲' : '▼'}
        </button>
        {analyticsOpen ? (
        <StayAnalyticsPanel
          items={items}
          operationalActive={operationalActive}
          reservedBookings={reservedBookings}
          checkoutDue={checkoutDue}
          pendingApproval={pendingApprovalCount}
          waitingPayment={waitingPaymentCount}
        />
        ) : null}
        </>
      )}

      <Card className="content-card border-0">
        <Card.Body>
          <div className="table-meta align-items-start">
            <div>
              <div className="panel-title">{isBookingsMode ? 'Perlu tindak lanjut' : isCheckoutMode ? 'Alur checkout' : statusFilter === 'ACTIVE' ? 'Masa sewa aktif' : 'Semua masa sewa'}</div>
              <div className="panel-subtitle">{isCheckoutMode ? 'Fokus ke pengajuan keluar, finalisasi, dan masa sewa yang mendekati akhir.' : 'Filter hanya menyaring daftar. Aksi utama ada di tabel.'}</div>
            </div>
            <EntityBadgeFilterBar
              ariaLabel="Filter daftar masa sewa"
              activeId={statusFilter}
              onChange={(id) => handleStatusFilterChange(id as StayViewFilter)}
              filters={stayFilters}
            />
          </div>

          {query.isLoading ? <div className="py-5 text-center"><Spinner animation="border" /></div> : null}
          {query.isError ? <Alert variant="danger">Gagal mengambil data masa sewa. Silakan coba lagi.</Alert> : null}
          {!query.isLoading && !query.isError && visibleItems.length === 0 && !hasCheckoutQueueItems ? (
            <EmptyState
              icon={isBookingsMode || isCheckoutMode ? '🗓️' : '🏠'}
              title={isCheckoutMode ? 'Tidak ada item checkout yang perlu ditindaklanjuti' : statusFilter === 'BOOKINGS' ? 'Tidak ada item yang perlu ditindaklanjuti' : 'Belum ada data masa sewa'}
              description={isCheckoutMode
                ? 'Belum ada pengajuan keluar pending/final dan belum ada masa sewa aktif yang mendekati akhir.'
                : statusFilter === 'BOOKINGS'
                  ? 'Semua booking sudah ditangani dan tidak ada masa sewa yang mendekati tanggal perpanjangan/keluar.'
                  : 'Coba ubah filter atau mulai check-in penghuni baru.'}
              action={isBookingsMode || isCheckoutMode ? undefined : { label: 'Check-in Baru', onClick: () => navigate('/stays/check-in') }}
            />
          ) : null}

          {isActionableMode && pendingCheckoutRequests.length > 0 ? (
            <>
              <h6 className="fw-semibold mt-3 mb-2">🔔 Pengajuan Keluar — Review Admin</h6>
              <Table hover responsive className="mb-3 responsive-data-table">
                <thead>
                  <tr>
                    <th>Penghuni</th>
                    <th>Kamar</th>
                    <th>Tgl Diajukan</th>
                    <th>Alasan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCheckoutRequests.map((cr) => (
                    <tr key={`cr-${cr.id}`}>
                      <td data-label="Penghuni">
                        <div className="fw-semibold">{cr.stay?.tenant?.fullName ?? '-'}</div>
                        <div className="small text-muted">{cr.stay?.tenant?.phone ?? ''}</div>
                      </td>
                      <td data-label="Kamar">
                        <div className="fw-semibold">{cr.stay?.room?.code ?? '-'}</div>
                        <div className="small text-muted">Masa sewa #{cr.stayId}</div>
                      </td>
                      <td data-label="Tgl Diajukan">
                        <div>{formatDateSafe(cr.requestedCheckOutDate)}</div>
                        {cr.createdAt ? <div className="small text-muted">Diajukan {formatDateSafe(cr.createdAt)}</div> : null}
                      </td>
                      <td data-label="Alasan">
                        <div>{cr.checkoutReason || cr.requestNotes || '-'}</div>
                        {cr.requestNotes && cr.checkoutReason !== cr.requestNotes ? (
                          <div className="small text-muted">Catatan: {cr.requestNotes}</div>
                        ) : null}
                      </td>
                      <td data-label="Aksi">
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setApproveTarget(cr)}
                            disabled={approveCrMutation.isPending}
                          >
                            Review
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => setRejectTarget(cr)}
                            disabled={rejectCrMutation.isPending}
                          >
                            Tolak
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <hr className="my-1" />
            </>
          ) : null}

          {isActionableMode && approvedCheckoutRequests.length > 0 ? (
            <>
              <h6 className="fw-semibold mt-4 mb-2">✅ Pengajuan Keluar Disetujui</h6>
              <p className="small text-muted mb-2">
                Belum final. Buka detail untuk cek tagihan dan lepas kamar.
              </p>
              <Table hover responsive className="mb-3 responsive-data-table">
                <thead>
                  <tr>
                    <th>Penghuni</th>
                    <th>Kamar</th>
                    <th>Tgl Keluar Diajukan</th>
                    <th>Alasan</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedCheckoutRequests.map((cr) => (
                    <tr key={`approved-cr-${cr.id}`}>
                      <td data-label="Penghuni">
                        <div className="fw-semibold">{cr.stay?.tenant?.fullName ?? '-'}</div>
                        <div className="small text-muted">{cr.stay?.tenant?.phone ?? ''}</div>
                      </td>
                      <td data-label="Kamar">
                        <div className="fw-semibold">{cr.stay?.room?.code ?? '-'}</div>
                        <div className="small text-muted">Masa sewa #{cr.stayId}</div>
                      </td>
                      <td data-label="Tgl Keluar Diajukan">
                        <div>{formatDateSafe(cr.requestedCheckOutDate)}</div>
                        {cr.reviewedAt ? <div className="small text-muted">Disetujui {formatDateSafe(cr.reviewedAt)}</div> : null}
                      </td>
                      <td data-label="Alasan">
                        <div>{cr.checkoutReason || cr.requestNotes || '-'}</div>
                      </td>
                      <td data-label="Status">
                        <StatusBadge status="APPROVED" customLabel="Disetujui, belum final" />
                      </td>
                      <td data-label="Aksi">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => navigate(`/stays/${cr.stayId}`)}
                        >
                          Buka Detail
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <hr className="my-1" />
            </>
          ) : null}

          {isBookingsMode && visibleItems.length > 0 ? (
            <h6 className="fw-semibold mt-3 mb-2">Booking / masa sewa butuh tindak lanjut</h6>
          ) : null}

          {isCheckoutMode && visibleItems.length > 0 ? (
            <h6 className="fw-semibold mt-3 mb-2">Masa sewa mendekati keluar</h6>
          ) : null}

          {!query.isLoading && !query.isError && visibleItems.length > 0 && isBookingsMode ? (
            <>
              <Table hover responsive className="mb-0 responsive-data-table">
                <thead>
                  <tr>
                    <th>Penghuni</th>
                    <th>Kamar</th>
                    <th>Check-in</th>
                    <th>Masa sewa</th>
                    <th>Masa Berlaku</th>
                    <th>Status / Risiko</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => {
                    const expiryMeta = getBookingExpiryMeta(item.expiresAt);
                    const approvalMeta = getBookingApprovalMeta(item);
                    const canApprove = approvalMeta.isPendingApproval && !expiryMeta.isExpired;
                    const bookingStatusResult = getBookingStatusLabel({
                      isReserved: isReservedBooking(item),
                      isExpired: expiryMeta.isExpired,
                      hasInvoice: !approvalMeta.isPendingApproval,
                      isCancelled: item.status === 'CANCELLED',
                      isCompleted: item.status === 'COMPLETED',
                      isActiveOccupied: item.status === 'ACTIVE' && item.room?.status === 'OCCUPIED',
                    });
                    const showExpirySubBadge = expiryMeta.variant === 'DANGER' || expiryMeta.variant === 'WARNING';
                    return (
                      <tr key={item.id}>
                        <td data-label="Penghuni">
                          <div className="fw-semibold">{item.tenant?.fullName ?? `Penghuni #${item.tenantId}`}</div>
                          {item.tenant?.identityNumber && user?.role !== 'STAFF' ? (
                            <div className="small text-muted font-monospace">NIK: {item.tenant.identityNumber}</div>
                          ) : null}
                          <div className="small text-muted">{item.bookingSource ? `Sumber: ${getStatusLabel(item.bookingSource)}` : item.stayPurpose ? getStatusLabel(item.stayPurpose) : 'Tanpa keterangan tambahan'}</div>
                        </td>
                        <td data-label="Kamar">
                          <div className="fw-semibold">{item.room?.code ?? `Kamar #${item.roomId}`}</div>
                          <div className="small text-muted">{item.room?.name || 'Nama kamar belum tersedia'}{item.room?.floor ? ` · Lantai ${item.room.floor}` : ''}</div>
                        </td>
                        <td data-label="Check-in">
                          <div className="fw-semibold">{formatDateSafe(item.checkInDate)}</div>
                          <div className="small text-muted">Akhir masa sewa: {formatDateSafe(item.plannedCheckOutDate)}</div>
                        </td>
                        <td data-label="Masa sewa">
                          <div className="fw-semibold">{item.pricingTerm ? getStatusLabel(item.pricingTerm) : '-'}</div>
                          <div className="small text-muted">Dana titipan <CurrencyDisplay amount={item.depositAmountRupiah} showZero={false} /></div>
                        </td>
                        <td data-label="Masa Berlaku">
                          <div className="fw-semibold">{formatDateSafe(item.expiresAt)}</div>
                          <div className="small text-muted">{expiryMeta.helperText}</div>
                        </td>
                        <td data-label="Status / Risiko">
                          <div className="d-flex flex-wrap gap-2 align-items-center">
                            <StatusBadge status={bookingStatusResult.variant} customLabel={bookingStatusResult.label} />
                            {showExpirySubBadge ? (
                              <StatusBadge status={expiryMeta.variant} customLabel={expiryMeta.badgeLabel} />
                            ) : null}
                          </div>
                          <div className="small text-muted mt-2">
                            {approvalMeta.helper}
                            {item.latestInvoiceNumber ? ` Tagihan: ${item.latestInvoiceNumber}${item.latestInvoiceStatus ? ` (${getStatusLabel(item.latestInvoiceStatus)})` : ''}.` : ''}
                          </div>
                          {approvalMeta.isPendingApproval ? (
                            <div className="small text-warning mt-1">Belum mengunci kamar sampai pembayaran valid.</div>
                          ) : null}
                        </td>
                        <td data-label="Aksi">
                          <div className="d-flex gap-2">
                            {canApprove ? (
                              <>
                                <Button size="sm" onClick={() => setSelectedBooking(item)}>
                                  Setujui
                                </Button>
                                <Button size="sm" variant="outline-danger" onClick={() => setRejectBookingTarget(item)}>
                                  Tolak
                                </Button>
                              </>
                            ) : null}
                            {expiryMeta.isExpired ? (
                              <Button
                                size="sm"
                                variant="outline-danger"
                                disabled={expireMutation.isPending}
                                onClick={async () => {
                                  const ok = await confirm({
                                    title: 'Jalankan Kedaluwarsa',
                                    message: `Batalkan booking ${item.tenant?.fullName ?? `#${item.id}`} yang sudah lewat tenggat dan lepas kamarnya?`,
                                    confirmLabel: 'Jalankan',
                                    variant: 'danger',
                                  });
                                  if (ok) expireMutation.mutate(item.id);
                                }}
                              >
                                {expireMutation.isPending ? 'Memproses...' : 'Jalankan Kedaluwarsa'}
                              </Button>
                            ) : null}
                            {!canApprove && !expiryMeta.isExpired ? (
                              <Button size="sm" variant="outline-secondary" onClick={() => navigate(`/stays/${item.id}`)}>
                                Detail
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              <div className="mt-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={bookingsTotalPages}
                  totalItems={bookingsTotalItems}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  isLoading={query.isLoading}
                />
              </div>
            </>
          ) : null}

          {!query.isLoading && !query.isError && visibleItems.length > 0 && isCheckoutMode ? (
            <>
              <Table hover responsive className="mb-0 responsive-data-table">
                <thead>
                  <tr>
                    <th>Penghuni</th>
                    <th>Kamar</th>
                    <th>Target Keluar</th>
                    <th>Status / Reminder</th>
                    <th>Dana titipan</th>
                    <th style={{ width: 140 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => {
                    const reminderBadge = getCheckoutReminderBadge(item);
                    const daysLeft = daysFromToday(item.plannedCheckOutDate);
                    const checkoutBadge = daysLeft === null
                      ? null
                      : daysLeft < 0
                        ? { status: 'DANGER', label: `Terlambat ${Math.abs(daysLeft)} hari` }
                        : daysLeft === 0
                          ? { status: 'WARNING', label: 'Keluar hari ini' }
                          : reminderBadge
                            ? { status: reminderBadge.status, label: reminderBadge.label }
                            : { status: 'INFO', label: `H-${daysLeft}` };
                    return (
                      <tr key={item.id}>
                        <td data-label="Penghuni">
                          <div className="fw-semibold">{item.tenant?.fullName ?? `Penghuni #${item.tenantId}`}</div>
                          <div className="small text-muted">{item.bookingSource ? `Sumber: ${getStatusLabel(item.bookingSource)}` : item.stayPurpose ? getStatusLabel(item.stayPurpose) : 'Tanpa keterangan tambahan'}</div>
                        </td>
                        <td data-label="Kamar">
                          <div className="fw-semibold">{item.room?.code ?? `Kamar #${item.roomId}`}</div>
                          <div className="small text-muted">{item.room?.name || 'Nama kamar belum tersedia'}</div>
                        </td>
                        <td data-label="Target Keluar">
                          <div className="fw-semibold">{formatDateSafe(item.plannedCheckOutDate)}</div>
                          <div className="small text-muted">Check-in: {formatDateSafe(item.checkInDate)}</div>
                        </td>
                        <td data-label="Status / Reminder">
                          <div className="d-flex flex-wrap gap-2 align-items-center">
                            <StatusBadge status={item.status} />
                            {checkoutBadge ? <StatusBadge status={checkoutBadge.status} customLabel={checkoutBadge.label} /> : null}
                          </div>
                          {daysLeft !== null && daysLeft <= 7 && item.tenant?.phone ? (
                            <a
                              className="small mt-2 d-inline-flex align-items-center gap-1"
                              href={buildTenantWaUrl(item.tenant.phone, `Halo ${item.tenant.fullName}, pengingat dari KOST48 Surabaya: masa sewa kamar ${item.room?.code ?? ''} kamu berakhir ${formatDateSafe(item.plannedCheckOutDate)}. Mohon konfirmasi perpanjangan atau jadwal keluar. Terima kasih.`)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              💬 Kirim reminder WA
                            </a>
                          ) : null}
                          <div className="small text-muted mt-2">Pantau tagihan, deposit, dan kesiapan lepas kamar sebelum final checkout.</div>
                        </td>
                        <td data-label="Dana titipan">
                          <CurrencyDisplay amount={item.depositAmountRupiah} showZero={false} />
                          {item.depositStatus && item.depositStatus !== 'HELD' ? (
                            <div className="small text-muted mt-1">
                              {getDepositSettlementLabel(item)}
                            </div>
                          ) : null}
                        </td>
                        <td data-label="Aksi">
                          <Button size="sm" variant="outline-primary" onClick={() => navigate(`/stays/${item.id}`)}>
                            Buka Detail
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              <div className="mt-3">
                <PaginationControls
                  currentPage={page}
                  totalPages={bookingsTotalPages}
                  totalItems={bookingsTotalItems}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                  isLoading={query.isLoading}
                />
              </div>
            </>
          ) : null}

          {!query.isLoading && !query.isError && visibleItems.length > 0 && !isActionableMode ? (
            <Table hover responsive className="mb-0 responsive-data-table">
              <thead>
                <tr>
                  <th>Penghuni</th>
                  <th>Kamar</th>
                  <th>Status</th>
                  <th>Check-in</th>
                  <th>Masa sewa</th>
                  <th>Dana titipan</th>
                  <th style={{ width: 140 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const reminderBadge = getCheckoutReminderBadge(item);
                  const isReservedBookingRow = item.room?.status === 'RESERVED';
                  const expiryMeta = getBookingExpiryMeta(item.expiresAt);
                  const approvalMeta = getBookingApprovalMeta(item);
                  const onOpen = () => navigate(`/stays/${item.id}`);
                  return (
                    <tr
                      key={item.id}
                      className="clickable-row"
                      onClick={onOpen}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onOpen();
                        }
                      }}
                    >
                      <td data-label="Penghuni">
                        <div className="fw-semibold">{item.tenant?.fullName ?? `Penghuni #${item.tenantId}`}</div>
                        <div className="small text-muted">{item.bookingSource ? `Sumber: ${getStatusLabel(item.bookingSource)}` : item.stayPurpose ? getStatusLabel(item.stayPurpose) : 'Tanpa keterangan tambahan'}</div>
                      </td>
                      <td data-label="Kamar">
                        <div className="fw-semibold">{item.room?.code ?? `Kamar #${item.roomId}`}</div>
                        <div className="small text-muted">{item.room?.name || 'Nama kamar belum tersedia'}</div>
                      </td>
                      <td data-label="Status">
                        <div className="d-flex flex-column gap-2">
                          <StatusBadge status={item.status} />
                          {reminderBadge ? <StatusBadge status={reminderBadge.status} customLabel={reminderBadge.label} /> : null}
                        </div>
                      </td>
                      <td data-label="Check-in">
                        <div>{item.checkInDate ? formatDateSafe(item.checkInDate) : 'Belum Check-in'}</div>
                        {isReservedBookingRow ? <div className="small text-muted">Berakhir {formatDateSafe(item.expiresAt)} · {expiryMeta.helperText}</div> : null}
                      </td>
                      <td data-label="Masa sewa">
                        <div className="fw-semibold">{item.pricingTerm ? getStatusLabel(item.pricingTerm) : '-'}</div>
                        <div className="small text-muted">Akhir masa sewa: {formatDateSafe(item.plannedCheckOutDate)}</div>
                      </td>
                      <td data-label="Dana titipan">
                        <CurrencyDisplay amount={item.depositAmountRupiah} showZero={false} />
                        {item.depositStatus && item.depositStatus !== 'HELD' ? (
                          <div className="small text-muted mt-1">
                            {getDepositSettlementLabel(item)}
                          </div>
                        ) : null}
                      </td>
                      <td data-label="Aksi" onClick={(event) => event.stopPropagation()}>
                        {isReservedBookingRow && approvalMeta.isPendingApproval ? (
                          <div className="d-flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => setSelectedBooking(item)}>Review</Button>
                            <Button size="sm" variant="outline-danger" onClick={() => setRejectBookingTarget(item)}>Tolak</Button>
                          </div>
                        ) : isReservedBookingRow ? (
                          <Button size="sm" variant="outline-secondary" onClick={() => navigate(`/stays/${item.id}`)}>Detail</Button>
                        ) : (
                          <div className="row-arrow-cell">›</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          ) : null}

          {!isActionableMode ? (
            <div className="mt-3">
              <PaginationControls
                currentPage={page}
                totalPages={meta?.totalPages ?? 1}
                totalItems={meta?.totalItems ?? items.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                isLoading={query.isLoading}
              />
            </div>
          ) : null}
        </Card.Body>
      </Card>

      <ApproveBookingModal show={Boolean(selectedBooking)} onHide={() => setSelectedBooking(null)} booking={selectedBooking} />

      <RejectBookingModal
        show={Boolean(rejectBookingTarget)}
        onHide={() => setRejectBookingTarget(null)}
        booking={rejectBookingTarget}
        onSubmit={(reviewNotes) => {
          rejectBookingMutation.mutate({ stayId: rejectBookingTarget!.id, reviewNotes });
        }}
        isSubmitting={rejectBookingMutation.isPending}
      />

      <ApproveCheckoutModal
        show={Boolean(approveTarget)}
        checkoutRequest={approveTarget}
        onHide={() => setApproveTarget(null)}
        onSubmit={(reviewNotes) => {
          approveCrMutation.mutate({ id: approveTarget!.id, reviewNotes });
        }}
        isSubmitting={approveCrMutation.isPending}
      />

      <RejectCheckoutModal
        show={Boolean(rejectTarget)}
        onHide={() => setRejectTarget(null)}
        onSubmit={(reviewNotes) => {
          rejectCrMutation.mutate({ id: rejectTarget!.id, reviewNotes });
        }}
        isSubmitting={rejectCrMutation.isPending}
      />
    </div>
  );
}
