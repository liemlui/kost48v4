import { useState } from 'react';
import { Button, Card, Collapse } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import StaffPerformanceCategoryCard from './StaffPerformanceCategoryCard';
import StaffUnifiedWorkQueue from './StaffUnifiedWorkQueue';
import StaffRoutineChecklist from './StaffRoutineChecklist';
import StaffActionLauncher from './StaffActionLauncher';
import StaffOperationalTaskBoard from './StaffOperationalTaskBoard';
import { makeStaffWorkStats, getStaffMotivation } from '../../utils/staffWorkStats';
import type { ActionQueueItem } from '../command-center';
import type { AuthUser, InventoryItem, Room, Ticket } from '../../types';
import type { StaffRoutineKpiResponse, StaffRoutineTodayResponse } from '../../api/staffRoutines';
import { fetchMyStaffPerformance } from '../../api/staffPerformance';

type Props = {
  user: AuthUser | null;
  tickets: Ticket[];
  rooms?: Room[];
  inventoryItems?: InventoryItem[];
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

export default function StaffMotivationDashboard({ user, tickets, rooms = [], inventoryItems = [], queueItems, onRefresh, routineToday, routineKpi, routinesLoading, onRoutineUpdated }: Props) {
  const [showChecklistDetail, setShowChecklistDetail] = useState(false);
  const performanceQuery = useQuery({ queryKey: ['staff-performance-me-dashboard'], queryFn: () => fetchMyStaffPerformance(), staleTime: 60_000 });
  const stats = makeStaffWorkStats(tickets, queueItems, safeUserCreatedAt(user));
  const motivation = getStaffMotivation(stats);
  const daysText = stats.daysRecorded ? `${stats.daysRecorded} hari` : 'hari ini';

  return (
    <div className="staff-motivation-dashboard staff-compact-surface">
      <Card className="staff-motivation-hero border-0 compact calmer staff-day-hero-card">
        <Card.Body>
          <div className="staff-day-hero-layout">
            <div className="staff-hero-copy">
              <span className="staff-hero-pill">Hari Ini</span>
              <h1>Selamat bekerja, {staffFirstName(user)}.</h1>
              <p>{motivation}</p>
              <div className="staff-thank-card compact">
                <span>🙏</span>
                <small>Terima kasih, kita sudah bekerja bersama selama {daysText}. Kerja rapi membuat penghuni lebih nyaman.</small>
              </div>
            </div>
            <div className="staff-day-hero-actions" aria-label="Aksi cepat staff">
              <strong>Aksi cepat</strong>
              <span>Catat kondisi lapangan, meter, atau kebutuhan stok dari satu tombol.</span>
              <StaffActionLauncher singleButton compact onCreated={onRefresh} />
            </div>
          </div>
        </Card.Body>
      </Card>

      <StaffOperationalTaskBoard
        tickets={tickets}
        rooms={rooms}
        inventoryItems={inventoryItems}
        routineToday={routineToday ?? null}
        routineKpi={routineKpi ?? null}
        isLoading={routinesLoading}
        onRefresh={onRefresh}
      />

      <StaffUnifiedWorkQueue
        routines={routineToday ?? null}
        tickets={tickets}
        isLoading={routinesLoading}
        onUpdated={onRoutineUpdated ?? onRefresh}
      />

      <div className="staff-secondary-panels">
        <StaffPerformanceCategoryCard performance={performanceQuery.data} compact />
        <Card className="staff-checklist-disclosure border-0">
          <Card.Body>
            <div className="staff-checklist-disclosure-head">
              <div>
                <strong>Checklist tambahan</strong>
                <span>Detail rutin harian/mingguan/bulanan. Daftar kerja utama tetap jadi titik awal agar alurnya rapi.</span>
              </div>
              <Button
                size="sm"
                variant="outline-primary"
                aria-expanded={showChecklistDetail}
                onClick={() => setShowChecklistDetail((value) => !value)}
              >
                {showChecklistDetail ? 'Sembunyikan' : 'Buka detail'}
              </Button>
            </div>
            <Collapse in={showChecklistDetail}>
              <div className="staff-checklist-disclosure-body">
                <StaffRoutineChecklist
                  today={routineToday ?? null}
                  isLoading={routinesLoading}
                  onUpdated={onRoutineUpdated ?? onRefresh}
                />
              </div>
            </Collapse>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
