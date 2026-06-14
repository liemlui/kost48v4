import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma';
import { RoomStatus } from '../enums/app.enums';

/**
 * F2-5 / X-03: satu sumber kebenaran untuk melepas kamar setelah booking batal.
 * Bila masih ada tiket CHECKOUT_INSPECTION terbuka (kamar kotor bekas overstay),
 * kembalikan ke MAINTENANCE (tetap bisa dipesan via allowBookingWhileCleaning,
 * tapi check-in manual tidak masuk kamar kotor); selain itu AVAILABLE.
 * (Sebelumnya disalin identik di auto-ops & payment-submissions.)
 */
export async function releaseRoomAfterBookingCancelTx(tx: Prisma.TransactionClient, roomId: number) {
  const openCleaning = await tx.ticket.findFirst({
    where: { roomId, category: 'CHECKOUT_INSPECTION' as any, status: { notIn: ['CLOSED', 'CANCELLED'] as any } },
    select: { id: true },
  });
  await tx.room.update({
    where: { id: roomId },
    data: openCleaning ? { status: RoomStatus.MAINTENANCE } : { status: RoomStatus.AVAILABLE },
  });
}

/**
 * F2-5 / X-03 (perilaku kanonik 2026-06-14, keputusan owner): sinkron RoomItem dari
 * movement inventaris. ASSIGN_TO_ROOM → tambah qty + set status GOOD (restok = barang baik);
 * RETURN_FROM_ROOM → kurangi qty, status RoomItem dipertahankan. qty ≤ 0 → hapus baris.
 * (Menyatukan 2 salinan yang sempat berbeda: inventory-movements dulu tak set status.)
 */
/**
 * F2-5 / X-03: validasi (dengan LOCK FOR UPDATE) bahwa qty barang di kamar cukup untuk
 * RETURN_FROM_ROOM. Mencegah ghost-stock: RETURN melebihi stok kamar → 409 (bukan diam-diam
 * menghapus RoomItem & menambah stok gudang fiktif). Dipakai inventory-movements & staff-field-reports.
 */
export async function assertRoomItemQtyAvailableTx(tx: any, itemId: number, roomId: number, qty: string | number) {
  const rows = await tx.$queryRaw<Array<{ id: number; qty: any }>>`
    SELECT id, qty FROM "RoomItem" WHERE "itemId" = ${itemId} AND "roomId" = ${roomId} FOR UPDATE
  `;
  const roomQty = Number(rows[0]?.qty ?? 0);
  const requestedQty = Number(qty);
  if (!rows.length || roomQty < requestedQty) {
    throw new ConflictException(`Barang di kamar tidak cukup untuk dikembalikan. Tersedia ${roomQty}, diminta ${qty}.`);
  }
}

export async function syncRoomItemTx(
  tx: any,
  itemId: number,
  roomId: number | undefined,
  movementType: string,
  qty: any,
) {
  if (!roomId || !['ASSIGN_TO_ROOM', 'RETURN_FROM_ROOM'].includes(movementType)) return;
  const numericQty = Number(qty);
  const delta = movementType === 'ASSIGN_TO_ROOM' ? numericQty : -numericQty;
  const existing = await tx.roomItem.findFirst({ where: { itemId, roomId } });
  if (!existing) {
    if (delta > 0) {
      await tx.roomItem.create({ data: { itemId, roomId, qty: String(delta), status: 'GOOD' as any } });
    }
    return;
  }
  const nextQty = Number(existing.qty) + delta;
  if (nextQty <= 0) {
    await tx.roomItem.delete({ where: { id: existing.id } });
  } else {
    await tx.roomItem.update({
      where: { id: existing.id },
      data: {
        qty: String(nextQty),
        status: movementType === 'ASSIGN_TO_ROOM' ? ('GOOD' as any) : existing.status,
      },
    });
  }
}
