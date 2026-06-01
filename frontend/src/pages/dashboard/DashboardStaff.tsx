import { Alert } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import StaffMotivationDashboard from '../../components/staff/StaffMotivationDashboard';
import { listResource } from '../../api/resources';
import { fetchStaffRoutineToday, fetchMyStaffRoutineKpi } from '../../api/staffRoutines';
import { useOperationalStressIndex } from '../../hooks/useOperationalStressIndex';
import { dedupeCommandItems } from '../../utils/commandCenterDedup';
import type { InventoryItem, Room, Ticket } from '../../types';
import { ACTION_QUERY_OPTIONS, MEDIUM_FRESH_QUERY_OPTIONS, LoadingDashboard } from './dashboardShared';

export default function StaffDashboard() {
  const { user } = useAuth();
  const ticketsQuery = useQuery({ queryKey: ['dashboard-staff', 'tickets'], queryFn: () => listResource<Ticket>('/tickets', { limit: 150 }), ...ACTION_QUERY_OPTIONS });
  const roomsQuery = useQuery({ queryKey: ['dashboard-staff', 'rooms'], queryFn: () => listResource<Room>('/rooms', { limit: 150 }), ...MEDIUM_FRESH_QUERY_OPTIONS });
  const inventoryItemsQuery = useQuery({ queryKey: ['dashboard-staff', 'inventory-items'], queryFn: () => listResource<InventoryItem>('/inventory-items', { limit: 200, isActive: 'true' }), ...MEDIUM_FRESH_QUERY_OPTIONS });
  const routineTodayQuery = useQuery({ queryKey: ['dashboard-staff', 'routines-today'], queryFn: fetchStaffRoutineToday, ...ACTION_QUERY_OPTIONS });
  const routineKpiQuery = useQuery({ queryKey: ['dashboard-staff', 'routine-kpi'], queryFn: fetchMyStaffRoutineKpi, ...MEDIUM_FRESH_QUERY_OPTIONS });

  const tickets = ticketsQuery.data?.items ?? [];
  const rooms = roomsQuery.data?.items ?? [];
  const inventoryItems = inventoryItemsQuery.data?.items ?? [];
  const opsStress = useOperationalStressIndex({ tickets, rooms });
  const queueItems = dedupeCommandItems([...opsStress.queueItems]);

  const refreshDashboard = () => {
    void Promise.all([ticketsQuery.refetch(), roomsQuery.refetch(), inventoryItemsQuery.refetch(), routineTodayQuery.refetch(), routineKpiQuery.refetch()]);
  };

  if (ticketsQuery.isLoading || roomsQuery.isLoading) return <LoadingDashboard />;
  if (ticketsQuery.isError || roomsQuery.isError) return <Alert variant="danger">Gagal memuat beranda kerja. Muat ulang halaman.</Alert>;

  return (
    <div className="staff-simple-mode">
      <StaffMotivationDashboard
        user={user}
        tickets={tickets}
        rooms={rooms}
        inventoryItems={inventoryItems}
        queueItems={queueItems}
        onRefresh={refreshDashboard}
        routineToday={routineTodayQuery.data}
        routineKpi={routineKpiQuery.data}
        routinesLoading={routineTodayQuery.isLoading || routineKpiQuery.isLoading}
        onRoutineUpdated={refreshDashboard}
      />
    </div>
  );
}
