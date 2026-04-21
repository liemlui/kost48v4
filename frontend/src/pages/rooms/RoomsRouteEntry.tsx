import { Spinner } from 'react-bootstrap';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { resourceConfigs } from '../../config/resources';
import SimpleCrudPage from '../resources/SimpleCrudPage';
import PublicRoomsPage from './PublicRoomsPage';

export default function RoomsRouteEntry() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Spinner animation="border" />
      </div>
    );
  }

  if (user && ['OWNER', 'ADMIN', 'STAFF'].includes(user.role)) {
    return (
      <AppLayout>
        <SimpleCrudPage config={resourceConfigs.rooms} />
      </AppLayout>
    );
  }

  return <PublicRoomsPage />;
}
