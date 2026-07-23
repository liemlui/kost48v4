import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { AppNotificationService } from '../notifications/app-notification.service';
import { AccountingPostingService } from '../accounting/accounting-posting.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { InvoiceLineType, InvoiceStatus, RoomStatus, UserRole, UtilityType } from '../../common/enums/app.enums';
import { pickRoundRobinStaffTx } from '../../common/utils/staff-assignment.util';
import { createRenewUtilityCheckpointLineTx } from './stays-service.helpers';
import { startOfDay } from './stays.helpers';
import { TransferRoomDto } from './dto/room-transfer.dto';

/**
 * F4-8 — Pindah kamar resmi (keputusan owner 2026-06-15):
 * Stay SAMA dipertahankan (roomId diperbarui); deposit ikut apa adanya; harga dikunci
 * (rent-loyalty D-16) kecuali override OWNER; meter kamar baru di-snapshot; kamar lama
 * -> MAINTENANCE + tiket CHECKOUT_INSPECTION; kamar baru -> OCCUPIED. RoomTransfer = audit.
 */
@Injectable()
export class RoomTransferService {
  private readonly logger = new Logger(RoomTransferService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly appNotification: AppNotificationService,
    private readonly accountingPosting: AccountingPostingService,
  ) {}

  async transferRoom(stayId: number, dto: TransferRoomDto, actor: CurrentUserPayload) {
    // Override harga = OWNER-only (D-17: setelan harga kamar OWNER-only).
    if (dto.newAgreedRentRupiah != null && actor.role !== UserRole.OWNER) {
      throw new ForbiddenException('Hanya OWNER yang boleh mengubah harga sewa saat pindah kamar.');
    }
    const transferDate = startOfDay(dto.transferDate ? new Date(dto.transferDate) : new Date());

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Stay" WHERE id = ${stayId} FOR UPDATE`;
      const stay = await tx.stay.findUnique({ where: { id: stayId }, include: { room: true } });
      if (!stay) throw new NotFoundException('Stay tidak ditemukan');
      if (stay.status !== 'ACTIVE' || !stay.initialMetersPromotedAt) {
        throw new ConflictException('Pindah kamar hanya untuk penghuni aktif yang sudah huni (promoted).');
      }
      if (dto.toRoomId === stay.roomId) {
        throw new ConflictException('Kamar tujuan sama dengan kamar saat ini.');
      }

      const [toRoom] = await tx.$queryRaw<Array<{ id: number; name: string; code: string | null; isActive: boolean; status: string; defaultDepositRupiah: number | null; electricityTariffPerKwhRupiah: number | null; waterTariffPerM3Rupiah: number | null }>>`
        SELECT id, name, code, "isActive", status, "defaultDepositRupiah", "electricityTariffPerKwhRupiah", "waterTariffPerM3Rupiah" FROM "Room" WHERE id = ${dto.toRoomId} FOR UPDATE
      `;
      if (!toRoom || !toRoom.isActive) throw new NotFoundException('Kamar tujuan tidak tersedia.');
      if ([RoomStatus.OCCUPIED, RoomStatus.MAINTENANCE, RoomStatus.INACTIVE].includes(toRoom.status as RoomStatus)) {
        throw new ConflictException(`Kamar tujuan berstatus ${toRoom.status}; tidak bisa dihuni.`);
      }
      const otherActiveInTarget = await tx.stay.count({ where: { roomId: dto.toRoomId, status: 'ACTIVE', id: { not: stayId } } });
      if (otherActiveInTarget > 0) throw new ConflictException('Kamar tujuan masih dihuni penghuni lain.');

      const fromRoomId = stay.roomId;
      const rentBefore = stay.agreedRentAmountRupiah;
      const rentAfter = dto.newAgreedRentRupiah ?? rentBefore;

      // F5-7 (AUD-1/D-21.1): tagih utilitas kamar LAMA (snapshot meter akhir + invoice + jurnal)
      // SEBELUM roomId & tarif diperbarui ke kamar baru. Memakai tarif kamar lama (di stay saat ini).
      const oldRoomUtility = await this.billOldRoomUtilityTx(tx, { stay, fromRoomId, dto, transferDate, actorId: actor.id });

      const updatedStay = await tx.stay.update({
        where: { id: stayId },
        data: {
          roomId: dto.toRoomId,
          agreedRentAmountRupiah: rentAfter,
          electricityTariffPerKwhRupiah: toRoom.electricityTariffPerKwhRupiah ?? 0,
          waterTariffPerM3Rupiah: toRoom.waterTariffPerM3Rupiah ?? 0,
        },
      });

      // Snapshot meter awal kamar baru (opsional).
      if (dto.initialElectricityKwh != null) {
        await tx.meterReading.create({
          data: { roomId: dto.toRoomId, utilityType: UtilityType.ELECTRICITY, readingAt: transferDate, readingValue: dto.initialElectricityKwh, recordedById: actor.id, note: 'Meter awal saat pindah kamar' },
        });
      }
      if (dto.initialWaterM3 != null) {
        await tx.meterReading.create({
          data: { roomId: dto.toRoomId, utilityType: UtilityType.WATER, readingAt: transferDate, readingValue: dto.initialWaterM3, recordedById: actor.id, note: 'Meter awal saat pindah kamar' },
        });
      }

      // Kamar baru -> OCCUPIED.
      await tx.room.update({ where: { id: dto.toRoomId }, data: { status: RoomStatus.OCCUPIED } });

      // Kamar lama -> MAINTENANCE + tiket inspeksi (dedupe).
      await tx.room.update({ where: { id: fromRoomId }, data: { status: RoomStatus.MAINTENANCE } });
      const existingInspection = await tx.ticket.findFirst({
        where: { stayId, roomId: fromRoomId, category: 'CHECKOUT_INSPECTION' as any },
        select: { id: true },
      });
      if (!existingInspection) {
        const staffAssigneeId = await pickRoundRobinStaffTx(tx); // F5-3: round-robin tiket sistem
        const roomLabel = stay.room?.code || stay.room?.name || `Kamar #${fromRoomId}`;
        const base = `TIC-${new Date().getFullYear()}-CHK-${stayId}`;
        let ticketNumber = base;
        let suffix = 1;
        while (await tx.ticket.findUnique({ where: { ticketNumber }, select: { id: true } })) {
          suffix += 1;
          ticketNumber = `${base}-${suffix}`;
        }
        await tx.ticket.create({
          data: {
            ticketNumber,
            tenantId: stay.tenantId,
            roomId: fromRoomId,
            stayId,
            title: `Cek kamar setelah pindah penghuni - ${roomLabel}`,
            description: [
              `Penghuni pindah dari ${roomLabel} ke kamar lain. Kamar ini perlu dicek sebelum ditawarkan lagi.`,
              'Cek kebersihan, kunci, barang tertinggal, inventaris kamar, kerusakan, dan foto kondisi akhir.',
              'Jika semua aman, tandai pekerjaan selesai agar admin bisa menjadikan kamar siap ditempati kembali.',
            ].join('\n'),
            category: 'CHECKOUT_INSPECTION' as any,
            assignedToId: staffAssigneeId ?? null,
          },
        });
      }

      const transfer = await tx.roomTransfer.create({
        data: {
          stayId,
          fromRoomId,
          toRoomId: dto.toRoomId,
          transferDate,
          reason: dto.reason ?? null,
          rentBeforeRupiah: rentBefore,
          rentAfterRupiah: rentAfter,
          note: dto.note ?? null,
          createdById: actor.id,
        },
      });

      return { stay: updatedStay, transfer, fromRoomId, toRoom, tenantId: stay.tenantId, oldRoomUtility };
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'ROOM_TRANSFER',
      entityType: 'Stay',
      entityId: String(stayId),
      newData: result.transfer,
    });

    // Notif tenant (best-effort, di luar tx).
    try {
      const tenantUser = await this.prisma.user.findFirst({
        where: { tenantId: result.tenantId, isActive: true },
        select: { id: true },
      });
      if (tenantUser) {
        const label = result.toRoom?.code || result.toRoom?.name || `Kamar #${result.toRoom?.id}`;
        await this.appNotification.create({
          recipientUserId: tenantUser.id,
          title: '🔁 Pindah kamar',
          body: `Anda telah dipindahkan ke ${label}. Masa sewa, deposit, dan kontrak Anda tetap berlanjut.`,
          linkTo: '/portal',
          entityType: 'RoomTransfer',
          entityId: String(result.transfer.id),
        });
      }
    } catch (error) {
      this.logger.warn(`Notif pindah kamar stay #${stayId} gagal: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * F5-7 (AUD-1 / D-21.1): tagih utilitas kamar LAMA periode berjalan saat pindah.
   * - Kamar lama tak bertarif utilitas (flat) → tak ada yang ditagih (null).
   * - Bertarif tapi meter akhir tak diisi → 409 (wajib isi meter akhir kamar lama).
   * - Buat invoice utilitas (listrik/air) memakai checkpoint meter kamar lama, ISSUED + jurnal
   *   (best-effort; bila skip → invoice tetap tertagih, F5-6 mem-backfill jurnalnya).
   */
  private async billOldRoomUtilityTx(
    tx: Prisma.TransactionClient,
    params: {
      stay: { id: number; electricityTariffPerKwhRupiah: number | null; waterTariffPerM3Rupiah: number | null };
      fromRoomId: number;
      dto: TransferRoomDto;
      transferDate: Date;
      actorId: number;
    },
  ): Promise<{ invoiceId: number; totalAmountRupiah: number } | null> {
    const { stay, fromRoomId, dto, transferDate, actorId } = params;
    const elecTariff = stay.electricityTariffPerKwhRupiah ?? 0;
    const waterTariff = stay.waterTariffPerM3Rupiah ?? 0;
    const isMetered = elecTariff > 0 || waterTariff > 0;
    if (!isMetered) return null; // utilitas flat/termasuk → tak ada tagihan utilitas

    const hasFinalReadings = dto.finalElectricityKwh != null || dto.finalWaterM3 != null;
    if (!hasFinalReadings) {
      throw new ConflictException(
        'Kamar lama bertarif utilitas. Masukkan meter AKHIR listrik/air kamar lama untuk menagih pemakaian berjalan sebelum pindah (D-21.1).',
      );
    }

    const invoiceNumber = `INV-TRF-${stay.id}-${Date.now().toString().slice(-6)}`;
    let invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        stayId: stay.id,
        status: InvoiceStatus.DRAFT,
        periodStart: transferDate,
        periodEnd: transferDate,
        dueDate: transferDate,
        notes: 'Tagihan utilitas kamar lama (pemakaian berjalan) saat pindah kamar.',
        createdById: actorId,
      },
    });

    let total = 0;
    let sortOrder = 0;
    if (dto.finalElectricityKwh != null) {
      const s = await createRenewUtilityCheckpointLineTx(tx, {
        roomId: fromRoomId,
        invoiceId: invoice.id,
        utilityType: UtilityType.ELECTRICITY,
        label: 'listrik',
        unit: 'kWh',
        newReadingValue: new Prisma.Decimal(dto.finalElectricityKwh),
        readingAt: transferDate,
        tariffRupiah: elecTariff,
        actorId,
        sortOrder: sortOrder++,
      });
      total += Number(s.amountRupiah ?? 0);
    }
    if (dto.finalWaterM3 != null) {
      const s = await createRenewUtilityCheckpointLineTx(tx, {
        roomId: fromRoomId,
        invoiceId: invoice.id,
        utilityType: UtilityType.WATER,
        label: 'air',
        unit: 'm³',
        newReadingValue: new Prisma.Decimal(dto.finalWaterM3),
        readingAt: transferDate,
        tariffRupiah: waterTariff,
        actorId,
        sortOrder: sortOrder++,
      });
      total += Number(s.amountRupiah ?? 0);
    }

    invoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: { totalAmountRupiah: total, status: InvoiceStatus.ISSUED, issuedAt: new Date() },
    });
    await this.accountingPosting.postInvoiceIssuedTx(tx, invoice.id, actorId).catch((err) => {
      this.logger.warn(
        `Jurnal utilitas kamar lama (invoice #${invoice.id}, pindah kamar) gagal — invoice tetap tertagih, akan di-backfill F5-6: ${err instanceof Error ? err.message : String(err)}`,
      );
      return undefined;
    });

    return { invoiceId: invoice.id, totalAmountRupiah: total };
  }
}
