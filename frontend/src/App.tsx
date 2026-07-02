import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { PageLoadingSkeleton } from './components/common/SkeletonLoader';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import PwaRouteBoundary from './components/pwa/PwaRouteBoundary';
import { getDefaultRoute } from './config/navigation';
import { resolveRouteTitle } from './config/routeTitles';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { useTenantPortalStage } from './hooks/useTenantPortalStage';
import { useAuth } from './context/AuthContext';
import { useToast } from './components/common/ToastProvider';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import TenantBookingGate from './components/tenant/TenantBookingGate';

// F2-11 (V-1): code-split halaman publik (dashboard tamu, katalog, detail, booking)
// agar bundle utama lebih ramping; semua dirender di dalam <Suspense> App.
const PublicGuestDashboardPage = lazy(() => import('./pages/public/PublicGuestDashboardPage'));
const GuestBookingPage = lazy(() => import('./pages/bookings/GuestBookingPage'));
const RoomsRouteEntry = lazy(() => import('./pages/rooms/RoomsRouteEntry'));
const PublicRoomDetailPage = lazy(() => import('./pages/rooms/PublicRoomDetailPage'));
const FaqPublicPage = lazy(() => import('./pages/public/FaqPublicPage'));
const ReviewsPublicPage = lazy(() => import('./pages/public/ReviewsPublicPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const OwnerDashboardPage = lazy(() => import('./pages/dashboard/OwnerDashboardPage'));
const AdminDashboardPage = lazy(() => import('./pages/dashboard/DashboardAdmin'));
const MarketAnalysisPage = lazy(() => import('./pages/marketing/MarketAnalysisPage'));
const RenewRequestsAdminPage = lazy(() => import('./pages/renew-requests/RenewRequestsAdminPage'));
const InvoiceDetailPage = lazy(() => import('./pages/invoices/InvoiceDetailPage'));
const InvoicesPage = lazy(() => import('./pages/invoices/InvoicesPage'));
const AncillaryRevenuePage = lazy(() => import('./pages/finance/AncillaryRevenuePage'));
const LossRefundsPage = lazy(() => import('./pages/finance/LossRefundsPage'));
const AccountingSetupPage = lazy(() => import('./pages/finance/AccountingSetupPage'));
const AssetRegisterPage = lazy(() => import('./pages/finance/AssetRegisterPage'));
const PaymentReviewPage = lazy(() => import('./pages/payments/PaymentReviewPage'));
const ReminderPreviewPage = lazy(() => import('./pages/reminders/ReminderPreviewPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'));
const MyAnnouncementsPage = lazy(() => import('./pages/portal/MyAnnouncementsPage'));
const TenantAnnouncementDetailPage = lazy(() => import('./pages/portal/TenantAnnouncementDetailPage'));
const MyInvoicesPage = lazy(() => import('./pages/portal/MyInvoicesPage'));
const TenantInvoiceDetailPage = lazy(() => import('./pages/portal/TenantInvoiceDetailPage'));
const MyBookingsPage = lazy(() => import('./pages/portal/MyBookingsPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const MyStayPage = lazy(() => import('./pages/portal/MyStayPage'));
const MyTicketsPage = lazy(() => import('./pages/portal/MyTicketsPage'));
const MyLoyaltyPage = lazy(() => import('./pages/portal/MyLoyaltyPage'));
const MyManualPage = lazy(() => import('./pages/portal/MyManualPage'));
const LoyaltyAdminPage = lazy(() => import('./pages/loyalty/LoyaltyAdminPage'));
const WifiOrderPage = lazy(() => import('./pages/portal/WifiOrderPage'));
// R-13: stub halaman /portal/checkout dan /portal/renewal (fitur ada di MyStayPage via modal)
const CheckoutPortalPage = lazy(() => import('./pages/portal/CheckoutPortalPage'));
const RenewalPortalPage = lazy(() => import('./pages/portal/RenewalPortalPage'));
const ConfiguredResourcePage = lazy(() => import('./pages/resources/ConfiguredResourcePage'));
const InventoryShellPage = lazy(() => import('./pages/resources/InventoryShellPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const BookingPage = lazy(() => import('./pages/bookings/BookingPage'));
const RoomDetailPage = lazy(() => import('./pages/rooms/RoomDetailPage'));
const CheckInWizard = lazy(() => import('./pages/stays/CheckInWizard'));
const StayDetailPage = lazy(() => import('./pages/stays/StayDetailPage'));
const StaysPage = lazy(() => import('./pages/stays/StaysPage'));
const TicketsPage = lazy(() => import('./pages/tickets/TicketsPage'));
const StaffRoutinesAdminPage = lazy(() => import('./pages/staff-routines/StaffRoutinesAdminPage'));
const StaffMonthlyReportPage = lazy(() => import('./pages/staff/StaffMonthlyReportPage'));
const StaffWarehousePage = lazy(() => import('./pages/staff/StaffWarehousePage'));
const AdminStaffPerformancePage = lazy(() => import('./pages/admin/AdminStaffPerformancePage'));
const AdminSurveysPage = lazy(() => import('./pages/admin/AdminSurveysPage'));
const OwnerSettingsPage = lazy(() => import('./pages/settings/OwnerSettingsPage'));
const ServiceInterestsPage = lazy(() => import('./pages/services/ServiceInterestsPage'));
const MeterReadingsPage = lazy(() => import('./pages/rooms/MeterReadingsPage'));
const AcMaintenancePage = lazy(() => import('./pages/operations/AcMaintenancePage'));

type Role = 'OWNER' | 'ADMIN' | 'STAFF' | 'TENANT';

/**
 * Pesan toast yang akan ditampilkan saat role tertentu mencoba akses route terlarang.
 * R-20 (STAFF) + R-29 (OWNER/ADMIN) — semua skenario cross-role.
 */
function getDeniedMessage(role: string, targetPath: string): string {
  // OWNER/ADMIN/STAFF coba akses portal tenant (R-29)
  if ((role === 'OWNER' || role === 'ADMIN' || role === 'STAFF') && targetPath.startsWith('/portal')) {
    return 'Area portal penghuni hanya dapat diakses dengan akun Penghuni.';
  }
  // STAFF coba akses area keuangan
  if (role === 'STAFF' && (
    targetPath.startsWith('/invoices') ||
    targetPath.startsWith('/finance') ||
    targetPath.startsWith('/invoice-payments') ||
    targetPath.startsWith('/payment-submissions') ||
    targetPath.startsWith('/expenses') ||
    targetPath.startsWith('/ancillary-revenue') ||
    targetPath.startsWith('/wifi-sales') ||
    targetPath.startsWith('/loss-refunds') ||
    targetPath.startsWith('/reports')
  )) {
    return 'Halaman keuangan ini hanya dapat diakses oleh Admin atau Owner.';
  }
  // STAFF coba akses area admin/manajemen
  if (role === 'STAFF' && (
    targetPath.startsWith('/stays') ||
    targetPath.startsWith('/tenants') ||
    targetPath.startsWith('/users') ||
    targetPath.startsWith('/settings') ||
    targetPath.startsWith('/reminders') ||
    targetPath.startsWith('/inventory') ||
    targetPath.startsWith('/staff-routines') ||
    targetPath.startsWith('/staff-performance') ||
    targetPath.startsWith('/renew-requests') ||
    targetPath.startsWith('/announcements') ||
    targetPath.startsWith('/meter-readings') ||
    targetPath.startsWith('/additional-services') ||
    targetPath.startsWith('/service-interests') ||
    targetPath.startsWith('/loyalty') ||
    targetPath.startsWith('/market-analysis') ||
    targetPath.startsWith('/owner-dashboard') ||
    targetPath.startsWith('/admin-dashboard')
  )) {
    return 'Halaman ini hanya dapat diakses oleh Admin atau Owner.';
  }
  // TENANT coba akses area operasional
  if (role === 'TENANT' && (
    targetPath.startsWith('/dashboard') ||
    targetPath.startsWith('/stays') ||
    targetPath.startsWith('/invoices') ||
    targetPath.startsWith('/tickets') ||
    targetPath.startsWith('/rooms/') ||
    targetPath.startsWith('/finance') ||
    targetPath.startsWith('/staff')
  )) {
    return 'Halaman ini hanya dapat diakses oleh staf atau admin.';
  }
  // Fallback generic
  return 'Anda tidak memiliki akses ke halaman ini.';
}

function RequireRoles({ allowed, children }: { allowed: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  const { stage, isLoading: isStageLoading } = useTenantPortalStage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDenied = !!user && !allowed.includes(user.role as Role);

  // Tampilkan toast lalu redirect — satu kali saat isDenied terdeteksi (R-20 + R-29).
  // X-05: jangan toast bila pathname = defaultRoute (redirect sudah terjadi / StrictMode double).
  const deniedRef = useRef(false);
  useEffect(() => {
    if (!isDenied || !user || isStageLoading) return;
    const defaultRoute = getDefaultRoute(user.role, stage);
    if (pathname === defaultRoute) {
      navigate(defaultRoute, { replace: true });
      return; // jangan toast — user sudah di route seharusnya
    }
    if (deniedRef.current) return; // cegah double-invoke StrictMode
    deniedRef.current = true;
    const message = getDeniedMessage(user.role, pathname);
    toast(message, 'warning', 5000);
    navigate(defaultRoute, { replace: true });
  }, [isDenied, user, stage, isStageLoading, pathname, toast, navigate]);

  if (!user) return null;
  // Tunggu stage selesai dimuat sebelum redirect (hindari redirect prematur ke /rooms saat loading)
  // L-01: skeleton saat TENANT stage loading, hindari layar putih kosong.
  if (isStageLoading && user.role === 'TENANT') return <PageLoadingSkeleton />;
  if (isDenied) return null; // useEffect akan navigate
  return <>{children}</>;
}


function TenantBookingRouteGuard({ children }: { children: ReactNode }) {
  const { stage, isLoading } = useTenantPortalStage();
  // L-01: skeleton saat menentukan stage, hindari flash layar putih sebelum gate/booking.
  if (isLoading) return <PageLoadingSkeleton />;
  if (stage !== 'browsing') return <TenantBookingGate mode="booking-route" />;
  return <>{children}</>;
}

// FASE B-2: redirect lama → tab Mutasi shell, pertahankan query (itemId/movementType/dll) untuk prefill.
function InventoryMovementsRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/inventory/mutasi${search}`} replace />;
}

function RootEntry() {
  const { user } = useAuth();
  const { stage } = useTenantPortalStage();
  if (!user) return <PublicGuestDashboardPage />;
  return <Navigate to={getDefaultRoute(user.role, stage)} replace />;
}

// AUDIT-OWNER (A2): sinkronkan document.title dengan rute aktif (app-wide).
function RouteTitleSync() {
  const { pathname } = useLocation();
  useDocumentTitle(resolveRouteTitle(pathname));
  return null;
}

export default function App() {
  return (
    <PwaRouteBoundary>
      <RouteTitleSync />
      <Suspense fallback={<PageLoadingSkeleton />}>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/rooms" element={<RoomsRouteEntry />} />
        <Route path="/rooms/:roomId/detail" element={<PublicRoomDetailPage />} />
        <Route path="/booking/:roomId" element={<GuestBookingPage />} />
        <Route path="/panduan" element={<FaqPublicPage />} />
        <Route path="/reviews" element={<ReviewsPublicPage />} />
        <Route path="/" element={<RootEntry />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
          <Route
            path="/dashboard"
            element={(
              <RequireRoles allowed={['ADMIN', 'STAFF']}>
                <DashboardPage />
              </RequireRoles>
            )}
          />

          <Route
            path="/owner-dashboard"
            element={(
              <RequireRoles allowed={['OWNER']}>
                <OwnerDashboardPage />
              </RequireRoles>
            )}
          />
          {/* OWN-ROUTE-SPLIT/GUARD: mode admin OWNER punya route nyata sendiri, terpisah dari /dashboard (ADMIN/STAFF). */}
          <Route
            path="/admin-dashboard"
            element={(
              <RequireRoles allowed={['OWNER']}>
                <AdminDashboardPage />
              </RequireRoles>
            )}
          />
          <Route
            path="/market-analysis"
            element={(
              <RequireRoles allowed={['OWNER']}>
                <MarketAnalysisPage />
              </RequireRoles>
            )}
          />

          <Route
            path="/profile"
            element={(
              <RequireRoles allowed={['OWNER', 'ADMIN', 'STAFF', 'TENANT']}>
                <ProfilePage />
              </RequireRoles>
            )}
          />
          {/* R4: /portal/profile dihapus — redundant, /profile sudah mencakup TENANT */}

          <Route path="/renew-requests" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><RenewRequestsAdminPage /></RequireRoles>} />
          <Route path="/loss-refunds" element={<RequireRoles allowed={['OWNER']}><LossRefundsPage /></RequireRoles>} />
          <Route path="/users" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><ConfiguredResourcePage resource="users" /></RequireRoles>} />
          <Route path="/tenants" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><ConfiguredResourcePage resource="tenants" /></RequireRoles>} />
          <Route path="/rooms/:id" element={<RequireRoles allowed={['OWNER', 'ADMIN', 'STAFF']}><RoomDetailPage /></RequireRoles>} />
          <Route path="/portal/booking/:roomId" element={<RequireRoles allowed={['TENANT']}><TenantBookingRouteGuard><BookingPage /></TenantBookingRouteGuard></RequireRoles>} />
          <Route path="/stays" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><StaysPage /></RequireRoles>} />
          <Route path="/stays/check-in" element={<RequireRoles allowed={['ADMIN', 'OWNER']}><CheckInWizard /></RequireRoles>} />
          <Route path="/stays/:id" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><StayDetailPage /></RequireRoles>} />
          <Route path="/invoices" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><InvoicesPage /></RequireRoles>} />
          <Route path="/invoice-payments" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><ConfiguredResourcePage resource="invoice-payments" /></RequireRoles>} />
          <Route path="/payment-submissions/review" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><PaymentReviewPage /></RequireRoles>} />
          <Route path="/invoices/:id" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><InvoiceDetailPage /></RequireRoles>} />
          <Route path="/announcements" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><ConfiguredResourcePage resource="announcements" /></RequireRoles>} />
          <Route path="/meter-readings" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><MeterReadingsPage /></RequireRoles>} />
          <Route path="/ac-maintenance" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><AcMaintenancePage /></RequireRoles>} />
          <Route path="/additional-services" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><ConfiguredResourcePage resource="additionalServices" /></RequireRoles>} />
          <Route path="/service-interests" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><ServiceInterestsPage /></RequireRoles>} />
          <Route path="/tickets" element={<RequireRoles allowed={['OWNER', 'ADMIN', 'STAFF']}><TicketsPage /></RequireRoles>} />
          <Route path="/staff-routines" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><StaffRoutinesAdminPage /></RequireRoles>} />
          <Route path="/staff-performance" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><AdminStaffPerformancePage /></RequireRoles>} />
          <Route path="/surveys" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><AdminSurveysPage /></RequireRoles>} />
          <Route path="/staff-report" element={<RequireRoles allowed={['STAFF']}><StaffMonthlyReportPage /></RequireRoles>} />
          <Route path="/staff-warehouse" element={<RequireRoles allowed={['STAFF']}><StaffWarehousePage /></RequireRoles>} />
          {/* FASE B-2: shell Inventaris terpadu (Gudang | Barang Kamar | Mutasi). */}
          <Route path="/inventory" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><InventoryShellPage /></RequireRoles>}>
            <Route index element={<Navigate to="/inventory/gudang" replace />} />
            <Route path="gudang" element={<ConfiguredResourcePage resource="inventory-items" hideAreaMenu />} />
            <Route path="barang-kamar" element={<ConfiguredResourcePage resource="room-items" hideAreaMenu />} />
            <Route path="mutasi" element={<ConfiguredResourcePage resource="inventory-movements" hideAreaMenu />} />
          </Route>
          {/* Redirect route lama → shell (preservasi query untuk deep-link prefill mutasi). */}
          <Route path="/inventory-items" element={<Navigate to="/inventory/gudang" replace />} />
          <Route path="/room-items" element={<Navigate to="/inventory/barang-kamar" replace />} />
          <Route path="/inventory-movements" element={<InventoryMovementsRedirect />} />
          <Route path="/wifi-sales" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><ConfiguredResourcePage resource="wifi-sales" /></RequireRoles>} />
          <Route path="/ancillary-revenue" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><AncillaryRevenuePage /></RequireRoles>} />
          <Route path="/finance/accounting-setup" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><AccountingSetupPage /></RequireRoles>} />
          <Route path="/finance/assets" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><AssetRegisterPage /></RequireRoles>} />
          <Route path="/expenses" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><ConfiguredResourcePage resource="expenses" /></RequireRoles>} />
          <Route path="/reminders" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><ReminderPreviewPage /></RequireRoles>} />
          <Route path="/reports" element={<RequireRoles allowed={['OWNER']}><ReportsPage /></RequireRoles>} />
          <Route path="/settings" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><OwnerSettingsPage /></RequireRoles>} />
          <Route path="/notifications" element={<RequireRoles allowed={['OWNER', 'ADMIN', 'STAFF', 'TENANT']}><NotificationsPage /></RequireRoles>} />

          <Route path="/portal/announcements" element={<RequireRoles allowed={['TENANT']}><MyAnnouncementsPage /></RequireRoles>} />
          <Route path="/portal/announcements/:id" element={<RequireRoles allowed={['TENANT']}><TenantAnnouncementDetailPage /></RequireRoles>} />
          <Route path="/portal/stay" element={<RequireRoles allowed={['TENANT']}><MyStayPage /></RequireRoles>} />
          <Route path="/portal/bookings" element={<RequireRoles allowed={['TENANT']}><MyBookingsPage /></RequireRoles>} />
          <Route path="/portal/invoices" element={<RequireRoles allowed={['TENANT']}><MyInvoicesPage /></RequireRoles>} />
          <Route path="/portal/invoices/:id" element={<RequireRoles allowed={['TENANT']}><TenantInvoiceDetailPage /></RequireRoles>} />
          <Route path="/portal/tickets" element={<RequireRoles allowed={['TENANT']}><MyTicketsPage /></RequireRoles>} />
          <Route path="/portal/loyalty" element={<RequireRoles allowed={['TENANT']}><MyLoyaltyPage /></RequireRoles>} />
          <Route path="/portal/manual" element={<RequireRoles allowed={['TENANT']}><MyManualPage /></RequireRoles>} />
          {/* R-13: route /portal/checkout & /portal/renewal — stub informatif, redirect ke /portal/stay */}
          <Route path="/portal/checkout" element={<RequireRoles allowed={['TENANT']}><CheckoutPortalPage /></RequireRoles>} />
          <Route path="/portal/renewal" element={<RequireRoles allowed={['TENANT']}><RenewalPortalPage /></RequireRoles>} />
          <Route path="/loyalty" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><LoyaltyAdminPage /></RequireRoles>} />
          {/* R-17: redirect /portal/guide lama → /portal/manual */}
          <Route path="/portal/guide" element={<Navigate to="/portal/manual" replace />} />
          <Route path="/portal/wifi" element={<RequireRoles allowed={['TENANT']}><WifiOrderPage /></RequireRoles>} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        </Routes>
      </Suspense>
    </PwaRouteBoundary>
  );
}
