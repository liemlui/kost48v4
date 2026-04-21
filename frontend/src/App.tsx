import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { resourceConfigs } from './config/resources';
import { getDefaultRoute } from './config/navigation';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import MyAnnouncementsPage from './pages/portal/MyAnnouncementsPage';
import MyInvoicesPage from './pages/portal/MyInvoicesPage';
import MyBookingsPage from './pages/portal/MyBookingsPage';
import ProfilePage from './pages/profile/ProfilePage';
import MyStayPage from './pages/portal/MyStayPage';
import MyTicketsPage from './pages/portal/MyTicketsPage';
import SimpleCrudPage from './pages/resources/SimpleCrudPage';
import BookingPage from './pages/bookings/BookingPage';
import RoomDetailPage from './pages/rooms/RoomDetailPage';
import RoomsRouteEntry from './pages/rooms/RoomsRouteEntry';
import CheckInWizard from './pages/stays/CheckInWizard';
import StayDetailPage from './pages/stays/StayDetailPage';
import StaysPage from './pages/stays/StaysPage';
import TicketsPage from './pages/tickets/TicketsPage';

type Role = 'OWNER' | 'ADMIN' | 'STAFF' | 'TENANT';

function RequireRoles({ allowed, children }: { allowed: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  return allowed.includes(user.role as Role) ? <>{children}</> : <Navigate to={getDefaultRoute(user.role)} replace />;
}

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={getDefaultRoute(user?.role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/rooms" element={<RoomsRouteEntry />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/dashboard"
            element={(
              <RequireRoles allowed={['OWNER', 'ADMIN', 'STAFF']}>
                <DashboardPage />
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

          <Route path="/users" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><SimpleCrudPage config={resourceConfigs.users} /></RequireRoles>} />
          <Route path="/tenants" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><SimpleCrudPage config={resourceConfigs.tenants} /></RequireRoles>} />
          <Route path="/rooms/:id" element={<RequireRoles allowed={['OWNER', 'ADMIN', 'STAFF']}><RoomDetailPage /></RequireRoles>} />
          <Route path="/booking/:roomId" element={<RequireRoles allowed={['TENANT']}><BookingPage /></RequireRoles>} />
          <Route path="/stays" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><StaysPage /></RequireRoles>} />
          <Route path="/stays/check-in" element={<RequireRoles allowed={['ADMIN', 'OWNER']}><CheckInWizard /></RequireRoles>} />
          <Route path="/stays/:id" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><StayDetailPage /></RequireRoles>} />
          <Route path="/invoices" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><InvoicesPage /></RequireRoles>} />
          <Route path="/invoice-payments" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><SimpleCrudPage config={resourceConfigs['invoice-payments']} /></RequireRoles>} />
          <Route path="/invoices/:id" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><InvoiceDetailPage /></RequireRoles>} />
          <Route path="/announcements" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><SimpleCrudPage config={resourceConfigs.announcements} /></RequireRoles>} />
          <Route path="/meter-readings" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><SimpleCrudPage config={resourceConfigs['meter-readings']} /></RequireRoles>} />
          <Route path="/tickets" element={<RequireRoles allowed={['OWNER', 'ADMIN', 'STAFF']}><TicketsPage /></RequireRoles>} />
          <Route path="/inventory-items" element={<RequireRoles allowed={['OWNER', 'ADMIN', 'STAFF']}><SimpleCrudPage config={resourceConfigs['inventory-items']} /></RequireRoles>} />
          <Route path="/room-items" element={<RequireRoles allowed={['OWNER', 'ADMIN', 'STAFF']}><SimpleCrudPage config={resourceConfigs['room-items']} /></RequireRoles>} />
          <Route path="/inventory-movements" element={<RequireRoles allowed={['OWNER', 'ADMIN', 'STAFF']}><SimpleCrudPage config={resourceConfigs['inventory-movements']} /></RequireRoles>} />
          <Route path="/wifi-sales" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><SimpleCrudPage config={resourceConfigs['wifi-sales']} /></RequireRoles>} />
          <Route path="/expenses" element={<RequireRoles allowed={['OWNER', 'ADMIN']}><SimpleCrudPage config={resourceConfigs.expenses} /></RequireRoles>} />

          <Route path="/portal/announcements" element={<RequireRoles allowed={['TENANT']}><MyAnnouncementsPage /></RequireRoles>} />
          <Route path="/portal/stay" element={<RequireRoles allowed={['TENANT']}><MyStayPage /></RequireRoles>} />
          <Route path="/portal/bookings" element={<RequireRoles allowed={['TENANT']}><MyBookingsPage /></RequireRoles>} />
          <Route path="/portal/invoices" element={<RequireRoles allowed={['TENANT']}><MyInvoicesPage /></RequireRoles>} />
          <Route path="/portal/tickets" element={<RequireRoles allowed={['TENANT']}><MyTicketsPage /></RequireRoles>} />
        </Route>
      </Route>
    </Routes>
  );
}
