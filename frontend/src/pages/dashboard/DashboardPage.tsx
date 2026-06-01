import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRoute } from '../../config/navigation';
import OwnerDashboard from './DashboardOwner';
import AdminDashboard from './DashboardAdmin';
import StaffDashboard from './DashboardStaff';

export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === 'OWNER') return <OwnerDashboard />;
  if (user?.role === 'ADMIN') return <AdminDashboard />;
  if (user?.role === 'STAFF') return <StaffDashboard />;
  return <Navigate to={getDefaultRoute(user?.role)} replace />;
}
