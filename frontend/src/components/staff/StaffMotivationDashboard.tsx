import { useMemo } from 'react';
import { Card } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Gauge, ListChecks, TrendingUp } from 'lucide-react';
import StaffPerformanceCategoryCard from './StaffPerformanceCategoryCard';
import StaffUnifiedWorkQueue from './StaffUnifiedWorkQueue';
import StaffRoutineChecklist from './StaffRoutineChecklist';
import StaffActionLauncher from './StaffActionLauncher';
import StaffOperationalTaskBoard from './StaffOperationalTaskBoard';
import StatCard from '../common/StatCard';
import { listResource } from '../../api/resources';
import { computeStaffBoard } from '../../utils/staffBoardStats';
import type { ActionQueueItem } from '../command-center';
import type { AuthUser, InventoryItem, MeterReading, Room, Ticket } from '../../types';
import type { StaffRoutineKpiResponse, StaffRoutineTodayResponse } from '../../api/staffRoutines';
import { fetchMyStaffPerformance } from '../../api/staffPerformance';

type StatVariant = 'default' | 'danger' | 'warning' | 'success' | 'info';

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

function staffFirstName(user: AuthUser | null) {
  return user?.fullName?.trim()?.split(/\s+/)[0] || 'Staf';
}

function greetingByHour(hour: number) {
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}

function perfVariant(tone?: string): StatVariant {
  if (tone === 'danger') return 'danger';
  if (tone === 'warning') return 'warning';
  if (tone === 'success') return 'success';
  return 'info';
}

/** Hitung jumlah kamar yang belum dicatat meter bulan ini (untuk KPI tile). */
function useStaffMeterPending(rooms: Room[]) {
  const { from, to } = useMemo(getMonthRange, []);
  const meterQuery = useQuery({
    queryKey: ['staff-meter-summary', from, to],
    queryFn: () => listResource<MeterReading>('/meter-readings', { from, to, limit: 200 }),
    staleTime: 120_000,
  });
  const pending = useMemo(() => {
    const readings = meterQuery.data?.items ?? [];
    const recordedRoomIds = new Set(readings.map((r) => r.roomId));
    const rec = rooms.filter((r) => recordedRoomIds.has(r.id)).length;
    return Math.max(0, rooms.length - rec);
  }, [meterQuery.data, rooms]);
  return { pending, isLoading: meterQuery.isLoading };
}

export default function StaffMotivationDashboard({ user, tickets, rooms = [], inventoryItems = [], onRefresh, routineToday, routineKpi, routinesLoading, onRoutineUpdated }: Props) {
  const navigate = useNavigate();
  const performanceQuery = useQuery({ queryKey: ['staff-performance-me-dashboard'], queryFn: () => fetchMyStaffPerformance(), staleTime: 60_000 });
  const board = useMemo(
    () => computeStaffBoard({ tickets, rooms, inventoryItems, routineToday }),
    [tickets, rooms, inventoryItems, routineToday],
  );
  const { pending: meterPending, isLoading: meterLoading } = useStaffMeterPending(rooms);

  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const greeting = greetingByHour(now.getHours());
  const glanceParts = [
    `${board.todayCount} tugas hari ini`,
    board.urgentCount ? `${board.urgentCount} perlu perhatian` : 'semua aman',
  ];

  const perf = performanceQuery.data;
  const perfScore = Math.min(100, Math.max(0, perf?.score.final ?? 0));

  const scrollToQueue = () => document.getElementById('staff-work-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="staff-motivation-dashboard staff-compact-surface">
      <Card className="staff-motivation-hero border-0 compact calmer staff-hero-ringkas">
        <Card.Body>
          <div className="staff-hero-ringkas-layout">
            <div className="staff-hero-ringkas-copy">
              <span className="staff-hero-pill compact">{dateLabel} · {greeting}</span>
              <h1>Halo, {staffFirstName(user)} 👋</h1>
              <p className="staff-hero-glance">{glanceParts.join(' · ')}</p>
              <small className="staff-hero-thanks">Terima kasih sudah menjaga kost tetap rapi — setiap kerja rapimu bikin penghuni betah.</small>
            </div>
            <div className="staff-hero-ringkas-actions" aria-label="Aksi cepat staff">
              <StaffActionLauncher singleButton compact onCreated={onRefresh} />
            </div>
          </div>
        </Card.Body>
      </Card>

      <div className="staff-kpi-strip" aria-label="Ringkasan kerja hari ini">
        <StatCard
          title="Tugas hari ini"
          value={board.todayCount}
          subtitle="Checklist & tiket belum mulai"
          icon={<ListChecks size={20} aria-hidden />}
          variant={board.todayCount ? 'info' : 'success'}
          onClick={scrollToQueue}
        />
        <StatCard
          title="Selesai hari ini"
          value={board.completedToday}
          subtitle={`${board.progress}% dari beban hari ini`}
          icon={<CheckCircle2 size={20} aria-hidden />}
          variant="success"
        />
        <StatCard
          title="Perlu bantuan"
          value={board.urgentCount}
          subtitle={board.urgentCount ? 'Kendala, stok habis, atau kamar' : 'Tidak ada yang mendesak'}
          icon={<AlertTriangle size={20} aria-hidden />}
          variant={board.urgentCount ? 'danger' : 'success'}
          onClick={board.urgentCount ? scrollToQueue : undefined}
        />
        <StatCard
          title="Meter belum dicatat"
          value={meterPending}
          subtitle={meterPending ? 'Kamar bulan ini' : 'Semua kamar tercatat ✓'}
          icon={<Gauge size={20} aria-hidden />}
          variant={meterPending ? 'warning' : 'success'}
          onClick={() => navigate('/rooms')}
          loading={meterLoading}
        />
        <StatCard
          title="Kinerja bulan ini"
          value={perfScore}
          subtitle={perf?.category?.label ?? 'Belum ada data'}
          icon={<TrendingUp size={20} aria-hidden />}
          variant={perfVariant(perf?.category?.tone)}
          onClick={() => navigate('/staff-report')}
          loading={performanceQuery.isLoading}
        />
      </div>

      <StaffOperationalTaskBoard
        board={board}
        isLoading={routinesLoading}
      />

      <StaffUnifiedWorkQueue
        routines={routineToday ?? null}
        tickets={tickets}
        isLoading={routinesLoading}
        onUpdated={onRoutineUpdated ?? onRefresh}
      />

      <div className="staff-bento-row staff-secondary-panels">
        <StaffPerformanceCategoryCard performance={performanceQuery.data} compact />
        <StaffRoutineChecklist
          today={routineToday ?? null}
          isLoading={routinesLoading}
          onJumpToWorkQueue={scrollToQueue}
        />
      </div>
    </div>
  );
}
