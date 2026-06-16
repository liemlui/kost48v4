import { lazy } from 'react';
import { Spinner } from 'react-bootstrap';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import PublicGuestDashboardPage from '../public/PublicGuestDashboardPage';
import PublicRoomsPage from './PublicRoomsPage';

const ConfiguredResourcePage = lazy(() => import('../resources/ConfiguredResourcePage'));
const StaffRoomsPage = lazy(() => import('./StaffRoomsPage'));

export default function RoomsRouteEntry() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Spinner animation="border" />
      </div>
    );
  }

  if (user?.role === 'STAFF') {
    return (
      <AppLayout>
        <StaffRoomsPage />
      </AppLayout>
    );
  }

  if (user && ['OWNER', 'ADMIN'].includes(user.role)) {
    return (
      <AppLayout>
        <ConfiguredResourcePage resource="rooms" />
      </AppLayout>
    );
  }

  if (user?.role === 'TENANT') {
    return (
      <AppLayout>
        <PublicRoomsPage />
      </AppLayout>
    );
  }

  return <PublicGuestDashboardPage />;
}
