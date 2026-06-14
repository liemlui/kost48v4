import { Prisma } from '../../generated/prisma';

/**
 * Generate a sequential ticket number while holding a PostgreSQL transaction
 * advisory lock. Callers must pass a Prisma transaction client.
 */
export async function generateTicketNumberTx(db: any): Promise<string> {
  const year = new Date().getFullYear();
  await db.$queryRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`ticket-number-${year}`}))`,
  );

  const prefix = `TIC-${year}-`;
  const count = await db.ticket.count({
    where: { ticketNumber: { startsWith: prefix } },
  });
  let sequence = count + 1;

  while (true) {
    const candidate = `${prefix}${String(sequence).padStart(4, '0')}`;
    const exists = await db.ticket.findUnique({
      where: { ticketNumber: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    sequence += 1;
  }
}
