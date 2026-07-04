// FILE: rooms.service.ts — CRUD kamar: status, harga, fasilitas, foto
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { CreateRoomFacilityDto, UpdateRoomFacilityDto } from './dto/room-facility.dto';
import { RoomsQueryDto } from './dto/rooms-query.dto';
import { InvoiceStatus, PricingTerm, RoomStatus, UserRole, UtilityType } from '../../common/enums/app.enums';
import { computeFacilityGap, type FacilityGapInput } from './room-facility-spec';
import { evaluateAcCleaning, AC_DEFAULT_KWH_THRESHOLD } from '../auto-ops/ac-cleaning.helper';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  async findAll(query: RoomsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: Prisma.RoomWhereInput = {
      AND: [
        query.search
          ? {
              OR: [
                { code: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                { name: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
              ],
            }
          : undefined,
        query.status ? { status: query.status } : undefined,
        typeof query.isActive === 'string' ? { isActive: query.isActive === 'true' } : undefined,
        query.floor ? { floor: query.floor } : undefined,
      ].filter(Boolean),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.room.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'asc' },
        include: {
          stays: {
            where: { status: 'ACTIVE' },
            take: 1,
            orderBy: { id: 'desc' },
            include: {
              tenant: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.room.count({ where }),
    ]);

    const transformedItems = items.map((room) => {
      const activeStay = room.stays[0] || null;
      return {
        ...room,
        activeStayId: activeStay?.id || null,
        currentStay: activeStay
          ? {
              id: activeStay.id,
              tenant: activeStay.tenant,
            }
          : null,
        stays: undefined,
      };
    });

    return { items: transformedItems, meta: buildMeta(page, limit, totalItems) };
  }

  async findOne(id: number) {
    const item = await this.prisma.room.findUnique({
      where: { id },
      include: {
        roomItems: {
          include: {
            item: true,
          },
          orderBy: { id: 'asc' },
        },
        facilities: {
          orderBy: { id: 'asc' },
        },
        stays: {
          where: { status: 'ACTIVE' },
          take: 1,
          orderBy: { id: 'desc' },
          include: {
            tenant: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
              },
            },
            invoices: {
              where: { status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] } },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!item) throw new NotFoundException('Kamar tidak ditemukan');

    const [latestElectricityReadings, latestWaterReadings] = await Promise.all([
      this.prisma.meterReading.findMany({
        where: { roomId: id, utilityType: UtilityType.ELECTRICITY },
        orderBy: { readingAt: 'desc' },
        take: 2,
      }),
      this.prisma.meterReading.findMany({
        where: { roomId: id, utilityType: UtilityType.WATER },
        orderBy: { readingAt: 'desc' },
        take: 2,
      }),
    ]);

    const activeStay = item.stays[0] ?? null;

    return {
      ...item,
      images: (item.images as unknown as Array<Record<string, unknown>>) ?? [],
      currentStay: activeStay
        ? {
            id: activeStay.id,
            tenant: activeStay.tenant,
            checkInDate: activeStay.checkInDate,
            plannedCheckOutDate: activeStay.plannedCheckOutDate,
            pricingTerm: activeStay.pricingTerm,
            agreedRentAmountRupiah: activeStay.agreedRentAmountRupiah,
            openInvoiceCount: activeStay.invoices.length,
          }
        : null,
      roomItems: item.roomItems.map((roomItem) => ({
        ...roomItem,
        inventoryItem: roomItem.item,
        item: undefined,
      })),
      // Cek konsistensi Fasilitas ↔ Inventaris (AC disorot). Dihitung dari data yang
      // sudah di-include di atas → tanpa query tambahan (hindari N+1).
      facilityCheck: this.buildFacilityGapReport(item),
      meterSummary: {
        electricity: this.buildMeterSummary(latestElectricityReadings),
        water: this.buildMeterSummary(latestWaterReadings),
      },
      stays: undefined,
    };
  }

  /** Cek konsistensi fasilitas↔inventaris satu kamar (dipakai findOne). */
  buildFacilityGapReport(room: FacilityGapInput) {
    return computeFacilityGap(room);
  }

  /**
   * Ringkasan gap fasilitas↔inventaris untuk banyak kamar sekaligus (reusable:
   * filter katalog publik, roll-up dashboard). Satu query ringan + hitung di memori.
   */
  async getFacilityGapSummary(roomIds?: number[]) {
    const rooms = await this.prisma.room.findMany({
      where: roomIds && roomIds.length ? { id: { in: roomIds } } : undefined,
      select: {
        id: true,
        category: true,
        roomType: true,
        roomSize: true,
        hasAc: true,
        roomItems: { select: { id: true, status: true, item: { select: { name: true } } } },
        facilities: { select: { inventoryItemId: true } },
      },
    });

    return rooms.map((room) => {
      const check = computeFacilityGap(room as unknown as FacilityGapInput);
      return { roomId: room.id, hasGap: check.hasGap, acGap: check.acGap };
    });
  }

  /** Set roomId yang punya gap fasilitas↔inventaris belum terpenuhi (untuk sembunyikan dari katalog). */
  async getRoomIdsWithFacilityGap(roomIds?: number[]): Promise<Set<number>> {
    const summary = await this.getFacilityGapSummary(roomIds);
    return new Set(summary.filter((s) => s.hasGap).map((s) => s.roomId));
  }

  // ── Monitoring AC + jadwal cuci (area admin) ─────────────────────────────────

  /** Daftar kamar ber-AC + status jadwal cuci (interval + estimasi kWh hibrid). */
  async getAcMaintenanceOverview() {
    const kwhThresholdEnv = Number(process.env.AC_CLEAN_KWH_THRESHOLD ?? AC_DEFAULT_KWH_THRESHOLD);
    const kwhThreshold = Number.isFinite(kwhThresholdEnv) ? kwhThresholdEnv : AC_DEFAULT_KWH_THRESHOLD;
    const now = new Date();

    const rooms = await this.prisma.room.findMany({
      where: { hasAc: true, isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        floor: true,
        acWattage: true,
        acUsageHoursPerDay: true,
        acLastCleanedAt: true,
        acCleanIntervalDays: true,
      },
      orderBy: [{ floor: 'asc' }, { code: 'asc' }],
    });

    // Tiket cuci AC terbuka per kamar (untuk badge "sedang dijadwalkan").
    const openTickets = rooms.length
      ? await this.prisma.ticket.findMany({
          where: {
            roomId: { in: rooms.map((r) => r.id) },
            category: 'AC_CLEANING' as any,
            status: { in: ['OPEN', 'IN_PROGRESS', 'DONE'] as any },
          },
          select: { id: true, roomId: true, status: true },
        })
      : [];
    const openTicketByRoom = new Map<number, { id: number; status: string }>();
    for (const t of openTickets) if (t.roomId && !openTicketByRoom.has(t.roomId)) openTicketByRoom.set(t.roomId, { id: t.id, status: String(t.status) });

    const items = rooms.map((room) => {
      const evalAc = evaluateAcCleaning(room, now, { kwhThreshold });
      const intervalDays = Math.max(1, room.acCleanIntervalDays);
      const nextDueAt = room.acLastCleanedAt
        ? new Date(new Date(room.acLastCleanedAt).getTime() + intervalDays * 24 * 60 * 60 * 1000)
        : null;

      let status: 'NEVER' | 'OVERDUE' | 'SOON' | 'OK';
      if (!room.acLastCleanedAt) status = 'NEVER';
      else if (evalAc.due) status = 'OVERDUE';
      else if (evalAc.daysSinceClean >= intervalDays * 0.8 || (kwhThreshold > 0 && evalAc.estimatedKwh >= kwhThreshold * 0.8)) status = 'SOON';
      else status = 'OK';

      return {
        id: room.id,
        code: room.code,
        name: room.name,
        floor: room.floor,
        acWattage: room.acWattage,
        acUsageHoursPerDay: room.acUsageHoursPerDay,
        acLastCleanedAt: room.acLastCleanedAt,
        acCleanIntervalDays: room.acCleanIntervalDays,
        nextDueAt,
        status,
        due: evalAc.due,
        reason: evalAc.reason,
        daysSinceClean: Math.round(evalAc.daysSinceClean),
        estimatedKwh: Math.round(evalAc.estimatedKwh),
        kwhPerDay: Math.round(evalAc.kwhPerDay * 100) / 100,
        openTicketId: openTicketByRoom.get(room.id)?.id ?? null,
      };
    });

    return {
      items,
      summary: {
        total: items.length,
        overdue: items.filter((i) => i.status === 'OVERDUE' || i.status === 'NEVER').length,
        soon: items.filter((i) => i.status === 'SOON').length,
      },
    };
  }

  /** Catat cuci AC selesai: acLastCleanedAt=now + tutup tiket AC_CLEANING terbuka. */
  async recordAcCleaning(roomId: number, actor: CurrentUserPayload) {
    this.assertOwnerOrAdmin(actor);
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan');
    if (!room.hasAc) throw new ConflictException('Kamar ini tidak memiliki AC.');

    const now = new Date();
    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: { acLastCleanedAt: now },
    });

    // Tutup tiket cuci AC yang masih terbuka (selaras reset di tickets.service saat tiket AC ditutup).
    await this.prisma.ticket.updateMany({
      where: { roomId, category: 'AC_CLEANING' as any, status: { in: ['OPEN', 'IN_PROGRESS', 'DONE'] as any } },
      data: { status: 'CLOSED' as any, closedAt: now },
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'UPDATE',
      entityType: 'Room',
      entityId: String(roomId),
      oldData: { acLastCleanedAt: room.acLastCleanedAt },
      newData: { acLastCleanedAt: updated.acLastCleanedAt },
    });

    return updated;
  }



  // Audit E-9/M-31: findPublicOne (jalur harga kedua berbasis kolom per-term)
  // DIHAPUS — kode mati tanpa route; katalog publik resmi = modules/marketing.

  async create(dto: CreateRoomDto, actor: CurrentUserPayload) {
    this.assertOwnerOrAdmin(actor);
    const exists = await this.prisma.room.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('Kode kamar sudah digunakan');

    const createData: Prisma.RoomCreateInput = {
      ...dto,
      status: 'AVAILABLE',
    };

    const created = await this.prisma.room.create({ data: createData });
    await this.audit.log({
      actorUserId: actor.id,
      action: 'CREATE',
      entityType: 'Room',
      entityId: String(created.id),
      newData: created,
    });
    return created;
  }

  async update(id: number, dto: UpdateRoomDto, actor: CurrentUserPayload) {
    this.assertOwnerOrAdmin(actor);
    const existing = await this.prisma.room.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kamar tidak ditemukan');

    if (dto.code && dto.code !== existing.code) {
      const exists = await this.prisma.room.findUnique({ where: { code: dto.code } });
      if (exists) throw new ConflictException('Kode kamar sudah digunakan');
    }

    const isTryingToDeactivate = dto.isActive === false;
    if (isTryingToDeactivate) {
      const activeStay = await this.prisma.stay.findFirst({
        where: {
          roomId: id,
          status: 'ACTIVE',
        },
      });
      if (activeStay) {
        throw new ConflictException(
          'Kamar ini sedang ditempati tenant aktif. Selesaikan atau batalkan stay terlebih dahulu sebelum menonaktifkan kamar.',
        );
      }
    }

    const nextMonthly = dto.monthlyRateRupiah ?? existing.monthlyRateRupiah;
    const nextActive = dto.isActive ?? existing.isActive;
    if (nextActive && nextMonthly <= 0) {
      throw new ConflictException('Kamar aktif wajib memiliki monthlyRateRupiah > 0');
    }

    const updateData: Prisma.RoomUpdateInput = {
      ...dto,
    };

    const updated = await this.prisma.room.update({
      where: { id },
      data: updateData,
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'UPDATE',
      entityType: 'Room',
      entityId: String(updated.id),
      oldData: existing,
      newData: updated,
    });

    return updated;
  }

  async findFacilities(roomId: number) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan');

    return this.prisma.roomFacility.findMany({
      where: { roomId },
      orderBy: { id: 'asc' },
    });
  }

  async createFacility(roomId: number, dto: CreateRoomFacilityDto, actor: CurrentUserPayload) {
    this.assertOwnerOrAdmin(actor);
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan');

    const name = dto.name?.trim();
    if (!name) throw new ConflictException('Nama fasilitas wajib diisi.');

    const quantity = dto.quantity ?? 1;
    if (quantity < 1) throw new ConflictException('Jumlah fasilitas minimal 1.');

    const inventoryItemId = dto.inventoryItemId ?? undefined;
    const facility = await this.prisma.roomFacility.create({
      data: {
        roomId,
        name,
        inventoryItemId,
        quantity,
        category: dto.category?.trim() || null,
        publicVisible: dto.publicVisible ?? true,
        condition: dto.condition?.trim() || null,
        note: dto.note?.trim() || null,
      },
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'CREATE',
      entityType: 'RoomFacility',
      entityId: String(facility.id),
      newData: facility,
    });

    return facility;
  }

  async updateFacility(roomId: number, facilityId: number, dto: UpdateRoomFacilityDto, actor: CurrentUserPayload) {
    this.assertOwnerOrAdmin(actor);
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan');

    const existing = await this.prisma.roomFacility.findUnique({ where: { id: facilityId } });
    if (!existing || existing.roomId !== roomId) throw new NotFoundException('Fasilitas kamar tidak ditemukan.');

    if (dto.name !== undefined) {
      const name = dto.name?.trim();
      if (!name) throw new ConflictException('Nama fasilitas wajib diisi.');
      dto.name = name;
    }
    if (dto.quantity !== undefined && dto.quantity < 1) {
      throw new ConflictException('Jumlah fasilitas minimal 1.');
    }

    const updateData: Prisma.RoomFacilityUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.quantity !== undefined) updateData.quantity = dto.quantity;
    if (dto.category !== undefined) updateData.category = dto.category?.trim() || null;
    if (dto.publicVisible !== undefined) updateData.publicVisible = dto.publicVisible;
    if (dto.condition !== undefined) updateData.condition = dto.condition?.trim() || null;
    if (dto.inventoryItemId !== undefined) (updateData as any).inventoryItemId = dto.inventoryItemId ?? null;
    if (dto.note !== undefined) updateData.note = dto.note?.trim() || null;

    const updated = await this.prisma.roomFacility.update({
      where: { id: facilityId },
      data: updateData,
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'UPDATE',
      entityType: 'RoomFacility',
      entityId: String(updated.id),
      oldData: existing,
      newData: updated,
    });

    return updated;
  }

  async deleteFacility(roomId: number, facilityId: number, actor: CurrentUserPayload) {
    this.assertOwnerOrAdmin(actor);
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan');

    const existing = await this.prisma.roomFacility.findUnique({ where: { id: facilityId } });
    if (!existing || existing.roomId !== roomId) throw new NotFoundException('Fasilitas kamar tidak ditemukan.');

    await this.prisma.roomFacility.delete({ where: { id: facilityId } });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'DELETE',
      entityType: 'RoomFacility',
      entityId: String(facilityId),
      oldData: existing,
    });
  }

  private assertOwnerOrAdmin(actor: CurrentUserPayload) {
    if (![UserRole.OWNER, UserRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException('Staff hanya boleh melihat data kamar. Perubahan kamar/fasilitas hanya boleh dilakukan Owner/Admin.');
    }
  }

  private buildMeterSummary(readings: Array<{ id: number; readingAt: Date; readingValue: Prisma.Decimal }>) {
    const latest = readings[0] ?? null;
    const previous = readings[1] ?? null;

    return {
      latestReading: latest,
      previousReading: previous,
      usageSincePrevious:
        latest && previous ? Number(latest.readingValue.toString()) - Number(previous.readingValue.toString()) : null,
    };
  }
}
