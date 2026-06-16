import { Prisma } from '../../generated/prisma';

/**
 * Generate a sequential ticket number while holding a PostgreSQL transaction
 * advisory lock. Callers must pass a Prisma transaction client.
 */
export async function generateTicketNumberTx(db: any): Promise<string> {
  const year = new Date().getFullYear();
  // Pakai $executeRaw (bukan $queryRaw): pg_advisory_xact_lock mengembalikan `void`,
  // dan deserializer Prisma 7 menolak kolom 'void' (→ "Failed to deserialize column of
  // type 'void'") sehingga SELURUH pembuatan tiket 500. executeRaw tak men-deserialize hasil.
  await db.$executeRaw(
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
