export type OccupancyStayWindow = {
  status: string;
  checkInDate: Date;
  plannedCheckOutDate: Date | null;
  actualCheckOutDate: Date | null;
  initialMetersPromotedAt: Date;
};

export function isStayOccupiedOnDate(
  stay: OccupancyStayWindow,
  date: Date,
  todayBoundary: Date,
): boolean {
  const promotedDate = new Date(Date.UTC(
    stay.initialMetersPromotedAt.getUTCFullYear(),
    stay.initialMetersPromotedAt.getUTCMonth(),
    stay.initialMetersPromotedAt.getUTCDate(),
  ));
  const occupancyStart = new Date(Math.max(stay.checkInDate.getTime(), promotedDate.getTime()));
  const fallbackPlannedEnd = stay.status === 'COMPLETED'
    ? stay.plannedCheckOutDate
    : stay.status === 'ACTIVE' && stay.plannedCheckOutDate && stay.plannedCheckOutDate > todayBoundary
      ? stay.plannedCheckOutDate
      : null;
  const occupancyEnd = stay.actualCheckOutDate ?? fallbackPlannedEnd;

  return date >= occupancyStart && (!occupancyEnd || date < occupancyEnd);
}
