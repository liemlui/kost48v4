import { Card } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import StaffPerformanceCategoryCard from './StaffPerformanceCategoryCard';
import StaffUnifiedWorkQueue from './StaffUnifiedWorkQueue';
import { makeStaffWorkStats, getStaffMotivation } from '../../utils/staffWorkStats';
import type { ActionQueueItem } from '../command-center';
import type { AuthUser, Ticket } from '../../types';
import type { StaffRoutineKpiResponse, StaffRoutineTodayResponse } from '../../api/staffRoutines';
import { fetchMyStaffPerformance } from '../../api/staffPerformance';

type Props = {
  user: AuthUser | null;
  tickets: Ticket[];
  queueItems: ActionQueueItem[];
  onRefresh: () => void | Promise<void>;
  routineToday?: StaffRoutineTodayResponse | null;
  routineKpi?: StaffRoutineKpiResponse | null;
  routinesLoading?: boolean;
  onRoutineUpdated?: () => void | Promise<void>;
};

function safeUserCreatedAt(user: AuthUser | null): string | null {
  const raw = (user as any)?.createdAt;
  return typeof raw === 'string' ? raw : null;
}

function staffFirstName(user: AuthUser | null) {
  return user?.fullName?.trim()?.split(/\s+/)[0] || 'Staf';
}

export default function StaffMotivationDashboard({ user, tickets, queueItems, onRefresh, routineToday, routinesLoading, onRoutineUpdated }: Props) {
  const performanceQuery = useQuery({ queryKey: ['staff-performance-me-dashboard'], queryFn: () => fetchMyStaffPerformance(), staleTime: 60_000 });
  const stats = makeStaffWorkStats(tickets, queueItems, safeUserCreatedAt(user));
  const motivation = getStaffMotivation(stats);
  const daysText = stats.daysRecorded ? `${stats.daysRecorded} hari` : 'beberapa waktu';

  return (
    <div className="staff-motivation-dashboard staff-compact-surface">
      <Card className="staff-motivation-hero border-0 compact calmer">
        <Card.Body>
          <div className="staff-hero-copy">
            <span className="staff-hero-pill">Hari Ini</span>
            <h1>Selamat bekerja, {staffFirstName(user)}.</h1>
            <p>{motivation}</p>
            <div className="staff-thank-card compact">
              <span>🙏</span>
              <small>Terima kasih, kita sudah bekerja bersama selama {daysText}. Kerja rapi membuat penghuni lebih nyaman.</small>
            </div>
          </div>
        </Card.Body>
      </Card>

      <StaffPerformanceCategoryCard performance={performanceQuery.data} compact />

      <StaffUnifiedWorkQueue
        routines={routineToday ?? null}
        tickets={tickets}
        isLoading={routinesLoading}
        onUpdated={onRoutineUpdated ?? onRefresh}
      />
    </div>
  );
}
