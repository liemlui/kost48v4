import { Alert } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import StaffMotivationDashboard from '../../components/staff/StaffMotivationDashboard';
import { fetchStaffRoutineToday, fetchMyStaffRoutineKpi } from '../../api/staffRoutines';
import { fetchStaffDashboardAggregate } from '../../api/staffDashboard';
import { useOperationalStressIndex } from '../../hooks/useOperationalStressIndex';
import { dedupeCommandItems } from '../../utils/commandCenterDedup';
import { HeroSkeleton, StatCardSkeleton, TableSkeleton } from '../../components/common/SkeletonLoader';
import { ACTION_QUERY_OPTIONS, MEDIUM_FRESH_QUERY_OPTIONS } from './dashboardShared';

function StaffDashboardSkeleton() {
  return (
    <div className="staff-simple-mode" role="status" aria-label="Memuat beranda kerja" aria-busy="true">
      <HeroSkeleton />
      <div className="staff-kpi-strip mb-3">
        {Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <TableSkeleton rows={5} cols={3} />
    </div>
  );
}

export default function StaffDashboard() {
  const { user } = useAuth();

  // Aggregate: 1 panggilan → data berat (tickets, rooms, inventoryItems, routineSummary, meterPending)
  const aggregateQuery = useQuery({
    queryKey: ['dashboard-staff', 'aggregate'],
    queryFn: fetchStaffDashboardAggregate,
    staleTime: 60_000,
    retry: 1,
    retryDelay: 1000,
  });
  const routineTodayQuery = useQuery({ queryKey: ['dashboard-staff', 'routines-today'], queryFn: fetchStaffRoutineToday, ...ACTION_QUERY_OPTIONS });
  const routineKpiQuery = useQuery({ queryKey: ['dashboard-staff', 'routine-kpi'], queryFn: fetchMyStaffRoutineKpi, ...MEDIUM_FRESH_QUERY_OPTIONS });

  const aggregate = aggregateQuery.data;
  const tickets = aggregate?.tickets?.items ?? [];
  const rooms = aggregate?.rooms?.items ?? [];
  const inventoryItems = aggregate?.inventoryItems?.items ?? [];
  const opsStress = useOperationalStressIndex({ tickets, rooms });
  const queueItems = dedupeCommandItems([...opsStress.queueItems]);

  const refreshDashboard = () => {
    void Promise.all([aggregateQuery.refetch(), routineTodayQuery.refetch(), routineKpiQuery.refetch()]);
  };

  if (aggregateQuery.isLoading) return <StaffDashboardSkeleton />;
  if (aggregateQuery.isError) return <Alert variant="danger">Gagal memuat beranda kerja. Muat ulang halaman.</Alert>;

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
