// AL-FIX-7 (19 Okt 2026): ketahanan data ketersediaan kamar.
//
// `/okupansi` menulis tabel `PublicRoomAvailability` (overlay katalog) dan TIDAK
// menyentuh `Stay`/`Room.status`. Sebelum perbaikan ini, overlay `AVAILABLE`
// menang atas status operasional, sehingga kamar yang masih dihuni bisa tampil
// "Tersedia" di katalog (booking tetap ditolak server, tetapi tampilannya bohong).
//
// Aturan sekarang: override hanya boleh MENURUNKAN ketersediaan (FULL/HIDDEN).
// Override AVAILABLE hanya dihormati bila `Room.status` memang AVAILABLE.
import { PublicRoomAvailabilityStatus } from '../../generated/prisma';
import { RoomStatus } from '../../common/enums/app.enums';

export function resolvePublicAvailabilityStatus(room: {
  status: RoomStatus | string;
  publicAvailability?: { status: PublicRoomAvailabilityStatus } | null;
}): PublicRoomAvailabilityStatus {
  const override = room.publicAvailability?.status;
  if (override === PublicRoomAvailabilityStatus.HIDDEN) return PublicRoomAvailabilityStatus.HIDDEN;
  if (override === PublicRoomAvailabilityStatus.FULL) return PublicRoomAvailabilityStatus.FULL;

  const roomIsAvailable = room.status === RoomStatus.AVAILABLE;
  if (override === PublicRoomAvailabilityStatus.AVAILABLE) {
    return roomIsAvailable
      ? PublicRoomAvailabilityStatus.AVAILABLE
      : PublicRoomAvailabilityStatus.FULL;
  }
  return roomIsAvailable
    ? PublicRoomAvailabilityStatus.AVAILABLE
    : PublicRoomAvailabilityStatus.FULL;
}

/**
 * Hapus overlay `/okupansi` untuk satu kamar di dalam transaksi pemanggil.
 * Dipanggil saat check-in: mulai saat itu ketersediaan murni diturunkan dari
 * `Room.status`, sehingga override lama tidak bisa "membuka" kamar yang terisi.
 */
export async function clearPublicAvailabilityOverrideTx(
  tx: { publicRoomAvailability: { deleteMany: (args: { where: { roomId: number } }) => Promise<unknown> } },
  roomId: number,
): Promise<void> {
  await tx.publicRoomAvailability.deleteMany({ where: { roomId } });
}
