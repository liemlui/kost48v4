/**
 * F2-5 / X-03: satu sumber kebenaran nomor tiket. `db` = Prisma.TransactionClient ATAU
 * PrismaService (keduanya punya `.ticket`). Hitung urut `TIC-YYYY-NNNN`; bila tabrakan
 * (race/seed), fallback ke suffix berbasis waktu. (Menyatukan 4 salinan: tickets tanpa-tx
 * dulu TANPA fallback → kini ikut dapat proteksi tabrakan.)
 */
export async function generateTicketNumberTx(db: any): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.ticket.count({ where: { ticketNumber: { startsWith: `TIC-${year}-` } } });
  const primary = `TIC-${year}-${String(count + 1).padStart(4, '0')}`;
  const exists = await db.ticket.findUnique({ where: { ticketNumber: primary }, select: { id: true } });
  return exists ? `TIC-${year}-${Date.now().toString().slice(-6)}` : primary;
}
