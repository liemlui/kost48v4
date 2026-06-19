import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { fetchStaffRoutineToday } from '../../api/staffRoutines';
import { fetchMyStaffPerformance } from '../../api/staffPerformance';
import { listResource } from '../../api/resources';
import type { InventoryItem, RoomItem } from '../../types';
import { getInventoryHealth, isInventoryPhysicalIssue } from '../../utils/inventoryHealth';
import { getNavigationLinks } from '../../config/navigation';

type StaffTicketLite = {
  id: number;
  status?: string | null;
  title?: string | null;
};

const PROBLEM_ITEM_STATUSES = new Set(['LOW_STOCK', 'OUT_OF_STOCK', 'DAMAGED', 'MISSING', 'NEEDS_REPAIR', 'PENDING_CHECK', 'MAINTENANCE']);
const ACTION_TICKET_STATUSES = new Set(['OPEN', 'IN_PROGRESS']);

function countBadge(value?: number | null) {
  const count = Number(value ?? 0);
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > 99 ? '99+' : String(count);
}

function problemRoomItems(items: RoomItem[]) {
  return items.filter((item) => PROBLEM_ITEM_STATUSES.has(String(item.status ?? '').toUpperCase())).length;
}

function problemWarehouseItems(items: InventoryItem[]) {
  return items.filter((item) => {
    const category = String(item.category ?? '').toUpperCase();
    if (category === 'BARANG_KAMAR' || item.isActive === false) return false;
    const health = getInventoryHealth(item);
    return health.status !== 'GOOD' || isInventoryPhysicalIssue(item.status);
  }).length;
}

function badgeTone(key: string, count: number) {
  if (!count) return '';
  if (key === 'rooms' || key === 'warehouse') return ' danger';
  if (key === 'report') return ' warning';
  return ' action';
}

export default function StaffTopWorkspaceNav() {
  const routineQuery = useQuery({ queryKey: ['staff-workspace-nav', 'routines'], queryFn: fetchStaffRoutineToday, staleTime: 45_000 });
  const ticketsQuery = useQuery({ queryKey: ['staff-workspace-nav', 'tickets'], queryFn: () => listResource<StaffTicketLite>('/tickets', { limit: 100 }), staleTime: 45_000 });
  const roomItemsQuery = useQuery({ queryKey: ['staff-workspace-nav', 'room-items'], queryFn: () => listResource<RoomItem>('/room-items', { limit: 250 }), staleTime: 60_000 });
  const inventoryQuery = useQuery({ queryKey: ['staff-workspace-nav', 'inventory'], queryFn: () => listResource<InventoryItem>('/inventory-items', { limit: 250 }), staleTime: 60_000 });
  const performanceQuery = useQuery({ queryKey: ['staff-workspace-nav', 'performance'], queryFn: () => fetchMyStaffPerformance(), staleTime: 60_000 });

  const counts = useMemo(() => {
    const routineRemaining = routineQuery.data?.summary?.remaining ?? 0;
    const actionTickets = (ticketsQuery.data?.items ?? []).filter((ticket) => ACTION_TICKET_STATUSES.has(String(ticket.status ?? '').toUpperCase())).length;
    const roomProblems = problemRoomItems(roomItemsQuery.data?.items ?? []);
    const warehouseProblems = problemWarehouseItems(inventoryQuery.data?.items ?? []);
    const performance = performanceQuery.data;
    const proofIssue = performance?.monthlyKpi?.proofCompletionRate != null && performance.monthlyKpi.proofCompletionRate < 100 ? 1 : 0;
    const improvementNotes = Math.max(0, Number(performance?.score?.negativeValue ?? 0));
    const reportIssues = Math.min(9, proofIssue + improvementNotes);

    return {
      today: routineRemaining + actionTickets,
      tickets: actionTickets,
      rooms: roomProblems,
      warehouse: warehouseProblems,
      report: reportIssues,
    };
  }, [routineQuery.data, ticketsQuery.data, roomItemsQuery.data, inventoryQuery.data, performanceQuery.data]);

  const navLinks = useMemo(() => getNavigationLinks('STAFF'), []);
  const links = useMemo(() => navLinks.map((link, idx) => {
    const keys = ['today', 'tickets', 'rooms', 'warehouse', 'report'] as const;
    const key = keys[idx] ?? 'today';
    const countMap: Record<string, number> = {
      today: counts.today,
      tickets: counts.tickets,
      rooms: counts.rooms,
      warehouse: counts.warehouse,
      report: counts.report,
    };
    return { to: link.to, label: link.label, count: countMap[key] ?? 0, key, hint: link.hint ?? link.label };
  }), [navLinks, counts]);

  return (
    <div className="staff-workspace-nav-wrap simple-only">
      <nav className="staff-workspace-tabs" aria-label="Menu kerja staf">
        {links.map((link) => {
          const badge = countBadge(link.count);
          return (
            <NavLink
              key={link.to}
              to={link.to}
              title={link.hint}
              className={({ isActive }) => `staff-workspace-tab ${isActive ? 'active' : ''}${badgeTone(link.key, link.count)}`}
            >
              <span>{link.label}</span>
              {badge ? <em>{badge}</em> : null}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
