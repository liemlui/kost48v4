import { lazy, Suspense, type ReactNode } from 'react';
import { Spinner } from 'react-bootstrap';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import PwaRouteBoundary from './components/pwa/PwaRouteBoundary';
import { getDefaultRoute } from './config/navigation';
import { useTenantPortalStage } from './hooks/useTenantPortalStage';
import { useAuth } from './context/AuthContext';
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
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const OwnerDashboardPage = lazy(() => import('./pages/dashboard/OwnerDashboardPage'));
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
const ConfiguredResourcePage = lazy(() => import('./pages/resources/ConfiguredResourcePage'));
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
const OwnerSettingsPage = lazy(() => import('./pages/settings/OwnerSettingsPage'));

type Role = 'OWNER' | 'ADMIN' | 'STAFF' | 'TENANT';

function RequireRoles({ allowed, children }: { allowed: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  const { stage } = useTenantPortalStage();
  if (!user) return null;
  return allowed.includes(user.role as Role) ? <>{children}</> : <Navigate to={getDefaultRoute(user.role, stage)} replace />;
}


function TenantBookingRouteGuard({ children }: { children: ReactNode }) {
  const { stage, isLoading } = useTenantPortalStage();
  if (isLoading) return null;
  if (stage !== 'browsing') return <TenantBookingGate mode="booking-route" />;
  return <>{children}</>;
}

function RootEntry() {
  const { user } = useAuth();
  const { stage } = useTenantPortalStage();
  if (!user) return <PublicGuestDashboardPage />;
  return <Navigate to={getDefaultRoute(user.role, stage)} replace />;
}

export default function App() {
  return (
    <PwaRouteBoundary>
      <Suspense
        fallback={(
          <div className="min-vh-100 d-flex align-items-center justify-content-center">
            <Spinner animation="border" />
          </div>
        )}
      >
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/rooms" element={<RoomsRouteEntry />} />
        <Route path="/rooms/:roomId/detail" element={<PublicRoomDetailPage />} />
        <Route path="/booking/:roomId" element={<GuestBookingPage />} />
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
          <Route
            path="/portal/profile"
            element={(
              <RequireRoles allowed={['TENANT']}>
                <ProfilePage />
              </RequireRoles>
            )}
          />

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
          <Route path="/meter-readings" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><ConfiguredResourcePage resource="meter-readings" /></RequireRoles>} />
          <Route path="/tickets" element={<RequireRoles allowed={['OWNER', 'ADMIN', 'STAFF']}><TicketsPage /></RequireRoles>} />
          <Route path="/staff-routines" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><StaffRoutinesAdminPage /></RequireRoles>} />
          <Route path="/staff-performance" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><AdminStaffPerformancePage /></RequireRoles>} />
          <Route path="/staff-report" element={<RequireRoles allowed={['STAFF']}><StaffMonthlyReportPage /></RequireRoles>} />
          <Route path="/staff-warehouse" element={<RequireRoles allowed={['STAFF']}><StaffWarehousePage /></RequireRoles>} />
          <Route path="/inventory-items" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><ConfiguredResourcePage resource="inventory-items" /></RequireRoles>} />
          <Route path="/room-items" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><ConfiguredResourcePage resource="room-items" /></RequireRoles>} />
          <Route path="/inventory-movements" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><ConfiguredResourcePage resource="inventory-movements" /></RequireRoles>} />
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
          <Route path="/loyalty" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><LoyaltyAdminPage /></RequireRoles>} />
          <Route path="/portal/wifi" element={<RequireRoles allowed={['TENANT']}><WifiOrderPage /></RequireRoles>} />
          </Route>
        </Route>
        </Routes>
      </Suspense>
    </PwaRouteBoundary>
  );
}
