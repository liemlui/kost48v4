import { Alert, Button, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchAdminDashboardAggregate } from '../../api/adminDashboard';
import { fetchStaffDashboardAggregate } from '../../api/staffDashboard';
import { getResource, listResource } from '../../api/resources';
import { listMyRenewRequests } from '../../api/renewRequests';
import { PORTAL_QUERY_KEYS } from '../../api/portalQueryKeys';
import { ActionQueueTable, CompactMetrics } from '../../components/command-center';
import EmptyState from '../../components/common/EmptyState';
import { useBusinessHealthScore } from '../../hooks/useBusinessHealthScore';
import { useOperationalStressIndex } from '../../hooks/useOperationalStressIndex';
import { dedupeCommandItems } from '../../utils/commandCenterDedup';
import { formatDateOnly } from '../../utils/dateTime';
import { buildTenantDecisionQueue } from '../../utils/tenantDecisionQueue';
import { getOpenTenantInvoices, isTenantInvoiceOverdue } from '../../utils/tenantRules';
import { isExpiredAdminBooking, isReservedBookingPendingApproval } from '../../pages/dashboard/dashboardShared';
import type { TenantPortalStage } from '../../config/navigation';
import type { Invoice, RenewRequest, Stay, UserRole } from '../../types';
import type { PaginatedResponse } from '../../types';

function CepatLoading({ label }: { label: string }) {
  return (
    <div className="cepat-state" role="status" aria-live="polite">
      <Spinner animation="border" size="sm" />
      <span>{label}</span>
    </div>
  );
}

function CepatError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <Alert variant="warning" className="cepat-alert">
      <div className="fw-semibold">{title}</div>
      <div className="small mt-1">Mode Cepat tetap bisa dipakai setelah data berhasil dimuat. Coba lagi tanpa keluar akun.</div>
      <Button type="button" size="sm" variant="outline-warning" className="mt-2" onClick={onRetry}>
        Coba lagi
      </Button>
    </Alert>
  );
}

function OwnerCepatHome() {
  const aggregate = useQuery({
    queryKey: ['admin-dashboard-aggregate'],
    queryFn: fetchAdminDashboardAggregate,
    staleTime: 60_000,
    retry: 1,
  });

  const invoices = aggregate.data?.invoices.items ?? [];
  const rooms = aggregate.data?.rooms.items ?? [];
  const paymentReviewItems = aggregate.data?.paymentReview.items ?? [];
  const pendingPaymentReviewCount = aggregate.data?.paymentReview.meta?.totalItems ?? paymentReviewItems.length;
  const pendingRenewCount = aggregate.data?.renewRequests.items.length ?? 0;
  const pendingCheckoutRequestCount = aggregate.data?.checkoutPending.items.length ?? 0;
  const approvedCheckoutRequestCount = aggregate.data?.checkoutApproved.items.length ?? 0;

  const health = useBusinessHealthScore({
    invoices,
    rooms,
    paymentSubmissions: paymentReviewItems,
    pendingPaymentReviewCount,
    pendingRenewCount,
    pendingCheckoutRequestCount,
    approvedCheckoutRequestCount,
  });

  if (aggregate.isLoading) return <CepatLoading label="Memuat keputusan owner…" />;
  if (aggregate.isError) return <CepatError title="Data owner belum bisa dimuat" onRetry={() => void aggregate.refetch()} />;

  return (
    <>
      <section className="cepat-hero">
        <div>
          <span className="cepat-eyebrow">Agenda kerja</span>
          <h1>Keputusan owner hari ini</h1>
          <p>{health.headline} Skor {Math.round(health.score)}/100 ({health.grade}).</p>
        </div>
        <div className="cepat-score" aria-label={`Skor kesehatan bisnis ${Math.round(health.score)} dari 100`}>
          {Math.round(health.score)}
          <small>/100</small>
        </div>
      </section>

      <CompactMetrics metrics={health.metrics.slice(0, 6)} />

      <ActionQueueTable
        title="Yang perlu diputuskan"
        subtitle="Kartu ini berasal dari aturan yang sudah ada, bukan dari AI."
        items={health.queueItems}
        maxItems={6}
        collapsible={false}
      />
      <p className="cepat-note">Butuh data lengkap? Pindah ke Normal lewat saklar di header.</p>
    </>
  );
}

function AdminCepatHome() {
  const aggregate = useQuery({
    queryKey: ['admin-dashboard-aggregate'],
    queryFn: fetchAdminDashboardAggregate,
    staleTime: 60_000,
    retry: 1,
  });

  const rooms = aggregate.data?.rooms.items ?? [];
  const stays = aggregate.data?.stays.items ?? [];
  const invoices = aggregate.data?.invoices.items ?? [];
  const tickets = aggregate.data?.tickets.items ?? [];
  const paymentReviewItems = aggregate.data?.paymentReview.items ?? [];
  const pendingPaymentReviewCount = aggregate.data?.paymentReview.meta?.totalItems ?? paymentReviewItems.length;
  const pendingRenewCount = aggregate.data?.renewRequests.items.length ?? 0;
  const pendingCheckoutRequestCount = aggregate.data?.checkoutPending.items.length ?? 0;
  const approvedCheckoutRequestCount = aggregate.data?.checkoutApproved.items.length ?? 0;
  const pendingApprovalCount = stays.filter((stay) => isReservedBookingPendingApproval(stay) && !isExpiredAdminBooking(stay)).length;

  const ops = useOperationalStressIndex({
    tickets,
    rooms,
    pendingCheckoutRequestCount,
    approvedCheckoutRequestCount,
    pendingRenewCount,
    pendingApprovalCount,
  });
  const health = useBusinessHealthScore({
    invoices,
    rooms,
    paymentSubmissions: paymentReviewItems,
    pendingPaymentReviewCount,
    pendingRenewCount,
    pendingCheckoutRequestCount,
    approvedCheckoutRequestCount,
  });
  const queueItems = dedupeCommandItems([...health.queueItems, ...ops.queueItems]);

  if (aggregate.isLoading) return <CepatLoading label="Memuat urutan kerja admin…" />;
  if (aggregate.isError) return <CepatError title="Data admin belum bisa dimuat" onRetry={() => void aggregate.refetch()} />;

  return (
    <>
      <section className="cepat-hero">
        <div>
          <span className="cepat-eyebrow">Urutan kerja</span>
          <h1>Yang perlu dikerjakan hari ini</h1>
          <p>{queueItems.length} kartu dari aturan deterministik. Tidak ada permintaan AI di role ini.</p>
        </div>
        <div className="cepat-score" aria-label={`Skor beban kerja ${Math.round(ops.score)} dari 100`}>
          {Math.round(ops.score)}
          <small>/100</small>
        </div>
      </section>

      <CompactMetrics metrics={ops.metrics} />

      <ActionQueueTable
        title="Antrean kerja admin"
        subtitle="Kartu booking, pembayaran, perpanjangan, keluar, dan operasional."
        items={queueItems}
        maxItems={8}
        collapsible={false}
      />
      <p className="cepat-note">Butuh data lengkap? Pindah ke Normal lewat saklar di header.</p>
    </>
  );
}

function StaffCepatHome() {
  const aggregate = useQuery({
    queryKey: ['dashboard-staff', 'aggregate'],
    queryFn: fetchStaffDashboardAggregate,
    staleTime: 60_000,
    retry: 1,
  });

  const tickets = aggregate.data?.tickets?.items ?? [];
  const rooms = aggregate.data?.rooms?.items ?? [];
  const ops = useOperationalStressIndex({ tickets, rooms });
  const queueItems = dedupeCommandItems([...ops.queueItems]);

  if (aggregate.isLoading) return <CepatLoading label="Memuat tugas staff…" />;
  if (aggregate.isError) return <CepatError title="Data staff belum bisa dimuat" onRetry={() => void aggregate.refetch()} />;

  return (
    <>
      <section className="cepat-hero">
        <div>
          <span className="cepat-eyebrow">Tugas hari ini</span>
          <h1>Kerjakan satu per satu</h1>
          <p>{queueItems.length} tugas aktif dari tiket dan kamar yang perlu dicek.</p>
        </div>
        <div className="cepat-score" aria-label={`Skor beban kerja ${Math.round(ops.score)} dari 100`}>
          {Math.round(ops.score)}
          <small>/100</small>
        </div>
      </section>

      <CompactMetrics metrics={ops.metrics} />

      <ActionQueueTable
        title="Tugas staff"
        subtitle="Tiket lama, tiket baru, dan kamar yang sedang diperbaiki."
        items={queueItems}
        maxItems={8}
        collapsible={false}
      />
      <p className="cepat-note">Butuh data lengkap? Pindah ke Normal lewat saklar di header.</p>
    </>
  );
}

const ACTIVE_RENEW_STATUSES = ['PENDING', 'PENDING_DECISION', 'AWAITING_DP', 'DP_SECURED'];

function TenantCepatHome({ stage }: { stage: TenantPortalStage }) {
  const navigate = useNavigate();

  const stayQuery = useQuery({
    queryKey: PORTAL_QUERY_KEYS.currentStay,
    queryFn: async () => {
      try {
        return await getResource<Stay>('/stays/me/current');
      } catch (error) {
        const status = (error as { response?: { status?: number; data?: { statusCode?: number } }; status?: number })?.response?.status
          ?? (error as { response?: { data?: { statusCode?: number } } })?.response?.data?.statusCode
          ?? (error as { status?: number })?.status;
        if (status === 404) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 30_000,
  });

  const invoicesQuery = useQuery<PaginatedResponse<Invoice>>({
    queryKey: PORTAL_QUERY_KEYS.myInvoices,
    queryFn: () => listResource<Invoice>('/invoices/my'),
    staleTime: 60_000,
    retry: false,
  });

  const renewsQuery = useQuery<PaginatedResponse<RenewRequest>>({
    queryKey: PORTAL_QUERY_KEYS.myRenewRequests,
    queryFn: () => listMyRenewRequests(),
    retry: false,
  });

  const stay = stayQuery.data ?? null;
  const invoices = invoicesQuery.data?.items ?? [];
  const renews = renewsQuery.data?.items ?? [];
  const overdueInvoice = getOpenTenantInvoices(invoices).find((invoice) => isTenantInvoiceOverdue(invoice)) ?? null;
  const pendingRenewRequest = stay
    ? renews.find((renew) => renew.stayId === stay.id && ACTIVE_RENEW_STATUSES.includes(renew.status))
    : undefined;
  const pendingDecisionRequest = pendingRenewRequest?.status === 'PENDING_DECISION' ? pendingRenewRequest : null;
  const queueItems = buildTenantDecisionQueue({ overdueInvoice, pendingDecisionRequest });

  if (stayQuery.isLoading) return <CepatLoading label="Memuat masa sewa…" />;

  if (stayQuery.isError) {
    return <CepatError title="Data masa sewa belum bisa dimuat" onRetry={() => void stayQuery.refetch()} />;
  }

  if (!stay) {
    const target = stage === 'booking' ? '/portal/bookings' : '/rooms';
    return (
      <EmptyState
        icon={stage === 'booking' ? '📋' : '🏠'}
        title={stage === 'booking' ? 'Pemesananmu masih berjalan' : 'Belum ada masa sewa aktif'}
        description={stage === 'booking'
          ? 'Lanjutkan pemesanan dari halaman Pemesanan Saya, atau lihat katalog kamar.'
          : 'Lihat kamar yang tersedia, lalu mulai pemesanan. Mode Cepat akan menampilkan langkah berikutnya setelah kamu punya masa sewa.'}
        action={{
          label: stage === 'booking' ? 'Buka Pemesanan Saya' : 'Lihat Kamar',
          onClick: () => navigate(target),
        }}
      />
    );
  }

  const roomLabel = stay.room?.code ? `Kamar ${stay.room.code}` : `Kamar #${stay.roomId}`;
  const checkoutLabel = stay.plannedCheckOutDate ? formatDateOnly(stay.plannedCheckOutDate) : null;

  return (
    <>
      <section className="cepat-hero">
        <div>
          <span className="cepat-eyebrow">Masa sewa aktif</span>
          <h1>{roomLabel}</h1>
          <p>
            {checkoutLabel ? `Rencana keluar ${checkoutLabel}. ` : ''}
            {queueItems.length ? 'Ada langkah yang menunggu keputusanmu.' : 'Tidak ada keputusan mendesak hari ini.'}
          </p>
        </div>
        <div className="cepat-score" aria-label={`${queueItems.length} langkah menunggu`}>
          {queueItems.length}
          <small>langkah</small>
        </div>
      </section>

      {invoicesQuery.isLoading || renewsQuery.isLoading ? (
        <CepatLoading label="Memuat tagihan dan perpanjangan…" />
      ) : (
        <ActionQueueTable
          title="Yang perlu kamu kerjakan"
          subtitle="Hanya keputusan yang memang menunggu; angka berasal dari tagihan dan pengajuanmu."
          items={queueItems}
          maxItems={3}
          collapsible={false}
        />
      )}

      {invoicesQuery.isError || renewsQuery.isError ? (
        <CepatError
          title="Sebagian data belum bisa dimuat"
          onRetry={() => {
            void invoicesQuery.refetch();
            void renewsQuery.refetch();
          }}
        />
      ) : null}

      <p className="cepat-note">Butuh data lengkap? Pindah ke Normal lewat saklar di header.</p>
    </>
  );
}

export default function CepatHome({ role, stage }: { role: UserRole; stage: TenantPortalStage }) {
  if (role === 'OWNER') return <OwnerCepatHome />;
  if (role === 'ADMIN') return <AdminCepatHome />;
  if (role === 'STAFF') return <StaffCepatHome />;
  return <TenantCepatHome stage={stage} />;
}
