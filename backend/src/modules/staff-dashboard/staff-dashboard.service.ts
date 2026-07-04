import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

function wibStartOfDay(input = new Date()): Date {
  // WIB (UTC+7) — "hari ini" dalam kalender WIB sebagai UTC midnight
  const wib = new Date(input.getTime() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
}

@Injectable()
export class StaffDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async aggregate(user: CurrentUserPayload) {
    const today = wibStartOfDay();
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const [rooms, tickets, inventoryItems, routinesToday] = await Promise.all([
      // Rooms — kamar aktif
      this.prisma.room.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      }),

      // Tickets — OPEN dan IN_PROGRESS
      this.prisma.ticket.findMany({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] as any[] },
        },
        orderBy: { createdAt: 'desc' },
        take: 150,
      }),

      // Inventory items — aktif
      this.prisma.inventoryItem.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        take: 200,
      }),

      // Ringkasan rutinitas staff hari ini
      this.prisma.staffRoutineCompletion.findMany({
        where: {
          staffUserId: user.id,
          dueDate: {
            gte: today,
            lt: todayEnd,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    // Hitung ringkasan rutinitas
    const totalAssignments =
      await this.prisma.staffRoutineAssignment.count({
        where: {
          staffUserId: user.id,
          isActive: true,
        },
      });

    const completedCount = routinesToday.filter(
      (r) => r.status === 'DONE',
    ).length;
    const needHelpCount = routinesToday.filter(
      (r) => r.status === 'NEED_HELP',
    ).length;
    const inProgressCount = routinesToday.filter(
      (r) => r.status === 'IN_PROGRESS',
    ).length;

    // Hitung meter pending bulan ini
    const now = new Date();
    const monthFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const monthTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const meterReadings = await this.prisma.meterReading.findMany({
      where: {
        readingAt: {
          gte: new Date(monthFrom),
          lte: new Date(`${monthTo}T23:59:59Z`),
        },
      },
      select: { roomId: true },
      distinct: ['roomId'],
    });

    const meterPendingCount = Math.max(
      0,
      rooms.length - meterReadings.length,
    );

    return {
      rooms: { items: rooms },
      tickets: { items: tickets },
      inventoryItems: { items: inventoryItems },
      routineSummary: {
        total: totalAssignments,
        completed: completedCount,
        inProgress: inProgressCount,
        needHelp: needHelpCount,
        remaining: Math.max(0, totalAssignments - completedCount),
        completionPercent:
          totalAssignments > 0
            ? Math.round((completedCount / totalAssignments) * 100)
            : 100,
      },
      meterPendingCount,
    };
  }
}
