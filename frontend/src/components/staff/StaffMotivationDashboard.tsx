import { useMemo } from 'react';
import { Button, Card } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import StaffPerformanceCategoryCard from './StaffPerformanceCategoryCard';
import StaffUnifiedWorkQueue from './StaffUnifiedWorkQueue';
import StaffRoutineChecklist from './StaffRoutineChecklist';
import StaffActionLauncher from './StaffActionLauncher';
import StaffOperationalTaskBoard from './StaffOperationalTaskBoard';
import { listResource } from '../../api/resources';
import { makeStaffWorkStats, getStaffMotivation } from '../../utils/staffWorkStats';
import type { ActionQueueItem } from '../command-center';
import type { AuthUser, InventoryItem, MeterReading, Room, Ticket } from '../../types';
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

function getMonthRange() {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function safeUserCreatedAt(user: AuthUser | null): string | null {
  const raw = (user as any)?.createdAt;
  return typeof raw === 'string' ? raw : null;
}

function staffFirstName(user: AuthUser | null) {
  return user?.fullName?.trim()?.split(/\s+/)[0] || 'Staf';
}

/** Widget ringkas pengganti tabel meter di tab Hari Ini (R-21). */
function MeterSummaryWidget({ rooms }: { rooms: Room[] }) {
  const navigate = useNavigate();
  const { from, to } = useMemo(() => getMonthRange(), []);
  const meterQuery = useQuery({
    queryKey: ['staff-meter-summary', from, to],
    queryFn: () => listResource<MeterReading>('/meter-readings', { from, to, limit: 200 }),
    staleTime: 120_000,
  });

  const pending = useMemo(() => {
    const readings = meterQuery.data?.items ?? [];
    const recordedRoomIds = new Set(readings.map((r) => r.roomId));
    const total = rooms.length;
    const rec = rooms.filter((r) => recordedRoomIds.has(r.id)).length;
    return Math.max(0, total - rec);
  }, [meterQuery.data, rooms]);

  if (meterQuery.isLoading) return null;

  return (
    <div className="staff-meter-summary-widget">
      <div className="staff-meter-summary-info">
        <span className="staff-hero-pill compact">Meter</span>
        {pending > 0 ? (
          <span className="staff-meter-summary-text">
            <strong>{pending} kamar</strong> belum dicatat meter bulan ini
          </span>
        ) : (
          <span className="staff-meter-summary-text text-success">
            Semua kamar sudah dicatat meter bulan ini ✓
          </span>
        )}
      </div>
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={() => navigate('/rooms')}
        className="staff-meter-summary-btn"
      >
        Lihat Kamar
      </Button>
    </div>
  );
}

export default function StaffMotivationDashboard({ user, tickets, rooms = [], inventoryItems = [], queueItems, onRefresh, routineToday, routineKpi, routinesLoading, onRoutineUpdated }: Props) {
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
                <small>Terima kasih, {staffFirstName(user)}. Kita sudah saling kenal dan bekerja bersama {daysText} sejak kamu bergabung — setiap kerja rapimu bikin penghuni betah, dan itu sangat berarti untuk tim.</small>
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
                <strong>Checklist operasional</strong>
                <span>Rutin harian, mingguan, dan bulanan — tandai selesai sambil bekerja.</span>
              </div>
            </div>
            <div className="staff-checklist-disclosure-body">
              <StaffRoutineChecklist
                today={routineToday ?? null}
                isLoading={routinesLoading}
                onUpdated={onRoutineUpdated ?? onRefresh}
              />
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* R-21: Widget ringkas pengganti tabel meter. Tabel lengkap ada di tab Kamar & Stok. */}
      <MeterSummaryWidget rooms={rooms} />
    </div>
  );
}
