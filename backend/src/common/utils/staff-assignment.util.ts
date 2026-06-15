/**
 * F5-3 (AUD-5 / D-22.2): pemilihan staf round-robin berbasis beban untuk tiket SISTEM-AUTO.
 *
 * Perilaku (dorman saat 1 staf):
 * - 0 staf aktif  → undefined (tiket tanpa assignee).
 * - 1 staf aktif  → staf itu (round-robin dorman; semua ke dia).
 * - ≥2 staf aktif → staf dengan beban tiket aktif (OPEN/IN_PROGRESS/DONE) TERENDAH.
 *
 * Dipakai lintas modul (auto-ops, stays, room-transfer, loyalty redemption) agar tiket
 * sistem tak lagi selalu menumpuk ke staf-id-terkecil. Setara `tickets.service.pickStaffAssigneeTx`.
 *
 * Catatan: tiket cuci AC (AC_CLEANING) SENGAJA TIDAK memakai util ini — dibuat tanpa assignee
 * agar admin memilih staf internal atau menandai vendor luar (D-22.2).
 *
 * `db` boleh `PrismaService` atau `Prisma.TransactionClient` (cukup punya user.findMany & ticket.count).
 */
const ACTIVE_TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE'];

export async function pickRoundRobinStaffTx(db: any): Promise<number | undefined> {
  const staff = await db.user.findMany({
    where: { role: 'STAFF', isActive: true },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  if (staff.length === 0) return undefined;
  if (staff.length === 1) return staff[0].id;

  let bestId: number = staff[0].id;
  let bestLoad = Number.POSITIVE_INFINITY;
  for (const s of staff) {
    const load = await db.ticket.count({
      where: { assignedToId: s.id, status: { in: ACTIVE_TICKET_STATUSES as any } },
    });
    if (load < bestLoad) {
      bestLoad = load;
      bestId = s.id;
    }
  }
  return bestId;
}
