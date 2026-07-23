import { lazy } from 'react';
import { NavLink } from 'react-router-dom';
import { PageLoadingSkeleton } from '../../components/common/SkeletonLoader';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import PublicRoomsPage from './PublicRoomsPage';

const ConfiguredResourcePage = lazy(() => import('../resources/ConfiguredResourcePage'));
const StaffRoomsPage = lazy(() => import('./StaffRoomsPage'));

export default function RoomsRouteEntry() {
  const { user, loading } = useAuth();

  // A7: hindari kedip full-page spinner saat auth resolve — pakai skeleton stabil.
  if (loading) {
    return <PageLoadingSkeleton label="Memuat kamar…" />;
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
        <div className="admin-sub-nav" aria-label="Sub-navigasi kamar & inventaris">
          <NavLink to="/rooms" end className={({ isActive }) =>
            `admin-sub-nav-link${isActive ? ' active' : ''}`}>Status Kamar</NavLink>
          <NavLink to="/meter-readings" className={({ isActive }) =>
            `admin-sub-nav-link${isActive ? ' active' : ''}`}>Catatan Meter</NavLink>
          <NavLink to="/inventory" className={({ isActive }) =>
            `admin-sub-nav-link${isActive ? ' active' : ''}`}>Inventaris</NavLink>
        </div>
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

  // Guest (tanpa login) → PublicRoomsPage dengan katalog dedicated, filter, kalender, compare
  return <PublicRoomsPage />;
}
