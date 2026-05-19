import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { RoomStatus, StayStatus, PricingTerm, LeadSource, StayPurpose, InvoiceStatus, DepositStatus, UtilityType, UserRole } from '../../common/enums/app.enums';
import { serializePrismaResult } from '../../common/utils/serialization';
import { PrismaService } from '../../prisma/prisma.service';
import { CancelStayDto, CompleteStayDto, CreateStayDto, ProcessDepositDto, RenewStayDto, UpdateStayDto } from './dto/stay.dto';
import { Prisma } from '../../generated/prisma';
import {
  normalizeStayForResponse,
  startOfDay,
  addDays,
  maxDate,
  resolveRent,
  mapPricingTermToUnit,
  calculatePeriodEnd,
  calculateDueDate,
} from './stays.helpers';

@Injectable()
export class StaysService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  async update(id: number, dto: UpdateStayDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.stay.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Stay tidak ditemukan');
    if (existing.status !== 'ACTIVE') {
      throw new ConflictException('Stay tidak aktif, tidak bisa diperbarui');
    }

    const nextPlannedCheckOutDate = dto.plannedCheckOutDate ? new Date(dto.plannedCheckOutDate) : existing.plannedCheckOutDate;
    if (nextPlannedCheckOutDate && nextPlannedCheckOutDate < existing.checkInDate) {
      throw new ConflictException('Tanggal rencana checkout tidak boleh sebelum check-in');
    }

    const updated = await this.prisma.stay.update({
      where: { id },
      data: {
        notes: dto.notes ?? existing.notes,
        bookingSourceDetail: dto.bookingSourceDetail ?? existing.bookingSourceDetail,
        plannedCheckOutDate: dto.plannedCheckOutDate ? new Date(dto.plannedCheckOutDate) : undefined,
      },
    });

    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'Stay', entityId: String(updated.id), oldData: existing, newData: updated });
    return updated;
  }

  async create(dto: CreateStayDto, actor: CurrentUserPayload) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');

    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException('Kamar tidak ditemukan');

    const existingTenantStay = await this.prisma.stay.findFirst({
      where: { tenantId: dto.tenantId, status: StayStatus.ACTIVE },
    });
    if (existingTenantStay) {
      throw new ConflictException('Tenant masih memiliki stay aktif');
    }

    if (room.status === RoomStatus.OCCUPIED || room.status === RoomStatus.RESERVED) {
      throw new ConflictException('Kamar sudah ditempati stay aktif lain atau sedang dipesan');
    }

    const existingRoomStay = await this.prisma.stay.findFirst({
      where: { roomId: dto.roomId, status: StayStatus.ACTIVE },
    });
    if (existingRoomStay) {
      throw new ConflictException('Kamar sudah ditempati stay aktif lain');
    }

    if (dto.plannedCheckOutDate && new Date(dto.plannedCheckOutDate) < new Date(dto.checkInDate)) {
      throw new ConflictException('Tanggal tidak konsisten');
    }

    const agreed = dto.agreedRentAmountRupiah || resolveRent(room, dto.pricingTerm);
    const deposit = dto.depositAmountRupiah ?? room.defaultDepositRupiah;
    const electricity = dto.electricityTariffPerKwhRupiah ?? room.electricityTariffPerKwhRupiah;
    const water = dto.waterTariffPerM3Rupiah ?? room.waterTariffPerM3Rupiah;

    const initialElectricity = new Prisma.Decimal(dto.initialElectricityKwh);
    const initialWater = new Prisma.Decimal(dto.initialWaterM3);
    if (initialElectricity.lt(0) || initialWater.lt(0)) {
      throw new BadRequestException('Nilai meter tidak boleh negatif');
    }

    // --- Portal pre-check: lakukan SEBELUM transaction untuk menghindari side effects ---
    let portalStatus: 'MISSING_EMAIL' | 'CREATED' | 'ALREADY_ACTIVE' = 'MISSING_EMAIL';
    let portalEmail: string | undefined;
    let temporaryPassword: string | undefined;
    let portalUserId: number | undefined;
    let passwordHash: string | undefined;

    const tenantEmail = tenant.email?.trim().toLowerCase();

    if (!tenantEmail) {
      portalStatus = 'MISSING_EMAIL';
    } else {
      portalEmail = tenantEmail;

      // Guard tambahan V5.1: kontrak B1 menolak email yang dipakai tenant lain,
      // bahkan jika belum ada User portal. Ini mencegah auto-create portal ke data tenant yang ambigu.
      const tenantWithSameEmail = await this.prisma.tenant.findFirst({
        where: {
          email: { equals: tenantEmail, mode: Prisma.QueryMode.insensitive },
          id: { not: tenant.id },
        },
        select: { id: true, fullName: true },
      });

      if (tenantWithSameEmail) {
        throw new ConflictException(
          `Email ${tenantEmail} sudah digunakan oleh tenant lain (${tenantWithSameEmail.fullName}). Tidak dapat melanjutkan check-in.`,
        );
      }

      const existingPortalUser = await this.prisma.user.findFirst({
        where: {
          email: { equals: tenantEmail, mode: Prisma.QueryMode.insensitive },
        },
        select: { id: true, tenantId: true },
      });

      if (existingPortalUser) {
        if (existingPortalUser.tenantId === tenant.id) {
          portalStatus = 'ALREADY_ACTIVE';
          portalUserId = existingPortalUser.id;
        } else {
          throw new ConflictException(
            `Email ${tenantEmail} sudah digunakan oleh user/tenant lain. Tidak dapat melanjutkan check-in. Hubungi administrator untuk menyelesaikan konflik data.`,
          );
        }
      } else {
        portalStatus = 'CREATED';
        const rawPassword = `kost48-${String(Math.floor(1000 + Math.random() * 9000))}`;
        temporaryPassword = rawPassword;
        passwordHash = await bcrypt.hash(rawPassword, 10);
      }
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const stay = await tx.stay.create({
          data: {
            tenantId: dto.tenantId,
            roomId: dto.roomId,
            status: StayStatus.ACTIVE,
            pricingTerm: dto.pricingTerm as PricingTerm,
            agreedRentAmountRupiah: agreed,
            checkInDate: new Date(dto.checkInDate),
            plannedCheckOutDate: dto.plannedCheckOutDate ? new Date(dto.plannedCheckOutDate) : calculatePeriodEnd(new Date(dto.checkInDate), dto.pricingTerm),
            depositAmountRupiah: deposit,
            electricityTariffPerKwhRupiah: electricity,
            waterTariffPerM3Rupiah: water,
            bookingSource: dto.bookingSource as LeadSource,
            bookingSourceDetail: dto.bookingSourceDetail,
            stayPurpose: dto.stayPurpose as StayPurpose,
            notes: dto.notes,
            createdById: actor.id,
          },
        });

        await tx.room.update({
          where: { id: dto.roomId },
          data: { status: RoomStatus.OCCUPIED },
        });

        const invoiceNumber = `INV-${stay.id}-${Date.now().toString().slice(-6)}`;
        const checkInDate = new Date(dto.checkInDate);
        const plannedCheckOutDate = dto.plannedCheckOutDate ? new Date(dto.plannedCheckOutDate) : undefined;
        const periodEnd = calculatePeriodEnd(checkInDate, dto.pricingTerm, plannedCheckOutDate);
        const dueDate = calculateDueDate(periodEnd);

        // Invoice dibuat DRAFT dulu agar InvoiceLine bisa dibuat (DB guard: invoice_line_draft_only_trg)
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            stayId: stay.id,
            status: InvoiceStatus.DRAFT,
            periodStart: checkInDate,
            periodEnd,
            dueDate,
            createdById: actor.id,
          },
        });

        const unit = mapPricingTermToUnit(dto.pricingTerm);
        await tx.invoiceLine.create({
          data: {
            invoiceId: invoice.id,
            lineType: 'RENT' as any,
            description: `Sewa kamar ${room.code} - ${dto.pricingTerm}`,
            qty: 1,
            unit,
            unitPriceRupiah: agreed,
            lineAmountRupiah: agreed,
            sortOrder: 0,
          },
        });

        // Setelah InvoiceLine dibuat, update invoice jadi ISSUED
        const issuedAt = new Date();
        const issuedInvoice = await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.ISSUED, issuedAt },
        });

        const baselineDate = new Date(dto.checkInDate);
        baselineDate.setHours(0, 0, 0, 0);

        const existingElectricityReading = await tx.meterReading.findFirst({
          where: {
            roomId: dto.roomId,
            utilityType: UtilityType.ELECTRICITY,
            readingAt: baselineDate,
          },
        });
        if (existingElectricityReading) {
          throw new BadRequestException(
            `Meter awal listrik pada tanggal check-in ${baselineDate.toLocaleDateString('id-ID')} sudah pernah tercatat untuk kamar ini.`,
          );
        }

        const existingWaterReading = await tx.meterReading.findFirst({
          where: {
            roomId: dto.roomId,
            utilityType: UtilityType.WATER,
            readingAt: baselineDate,
          },
        });
        if (existingWaterReading) {
          throw new BadRequestException(
            `Meter awal air pada tanggal check-in ${baselineDate.toLocaleDateString('id-ID')} sudah pernah tercatat untuk kamar ini.`,
          );
        }

        await tx.meterReading.create({
          data: {
            roomId: dto.roomId,
            utilityType: UtilityType.ELECTRICITY,
            readingAt: baselineDate,
            readingValue: initialElectricity,
            recordedById: actor.id,
            note: 'Meter awal saat check-in',
          },
        });

        await tx.meterReading.create({
          data: {
            roomId: dto.roomId,
            utilityType: UtilityType.WATER,
            readingAt: baselineDate,
            readingValue: initialWater,
            recordedById: actor.id,
            note: 'Meter awal saat check-in',
          },
        });

        // --- Portal user creation ---
        if (portalStatus === 'CREATED' && passwordHash && portalEmail) {
          const newPortalUser = await tx.user.create({
            data: {
              fullName: tenant.fullName,
              email: portalEmail,
              passwordHash,
              role: UserRole.TENANT,
              tenantId: tenant.id,
              isActive: true,
            },
            select: { id: true },
          });
          portalUserId = newPortalUser.id;
        }

        return { stay, invoice: issuedInvoice };
      });

      await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'Stay', entityId: String(created.stay.id), newData: created.stay });
      await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'Invoice', entityId: String(created.invoice.id), newData: created.invoice });
      if (portalStatus === 'CREATED' && portalUserId) {
        await this.audit.log({
          actorUserId: actor.id,
          action: 'CREATE',
          entityType: 'User',
          entityId: String(portalUserId),
          meta: { tenantId: tenant.id, action: 'AUTO_CREATE_PORTAL_BY_CHECKIN' },
        });
      }

      return {
        ...created,
        portal: {
          status: portalStatus,
          email: portalEmail,
          temporaryPassword,
          portalUserId,
        },
      };
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const target = Array.isArray(error.meta?.target)
            ? error.meta.target.join(',')
            : String(error.meta?.target ?? '');

          if (target.includes('email')) {
            throw new ConflictException('Email sudah digunakan oleh user lain. Tidak dapat membuat akses portal tenant.');
          }

          if (target.includes('tenantId')) {
            throw new ConflictException('Tenant ini sudah memiliki akun portal. Silakan refresh data dan coba lagi.');
          }

          if (target.includes('roomId') || target.includes('utilityType') || target.includes('readingAt')) {
            throw new ConflictException('Pembacaan meter untuk tanggal tersebut sudah ada');
          }

          throw new ConflictException('Data duplikat terdeteksi. Periksa data tenant, user portal, atau meter check-in.');
        }
        throw new ConflictException(`Constraint database gagal: ${error.message}`);
      }

      if (error?.message?.includes('monotonic') || error?.message?.includes('tidak boleh lebih rendah')) {
        throw new ConflictException('Pembacaan meter tidak boleh lebih rendah dari sebelumnya');
      }

      throw error;
    }
  }

  async complete(id: number, dto: CompleteStayDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.stay.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Stay tidak ditemukan');
    if (existing.status !== StayStatus.ACTIVE) throw new ConflictException('Stay bukan status ACTIVE');

    const updated = await this.prisma.$transaction(async (tx) => {
      const blockingInvoices = await tx.invoice.findMany({
        where: {
          stayId: id,
          status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
        },
        orderBy: { id: 'asc' },
      });

      if (blockingInvoices.length > 0) {
        const invoiceRefs = blockingInvoices
          .map((invoice) => `${invoice.invoiceNumber || `Invoice #${invoice.id}`} (${invoice.status})`)
          .join(', ');
        throw new ConflictException(
          `Tidak bisa checkout final karena masih ada invoice yang belum diselesaikan: ${invoiceRefs}. Selesaikan atau batalkan invoice terlebih dahulu.`,
        );
      }

      const stay = await tx.stay.update({
        where: { id },
        data: {
          status: StayStatus.COMPLETED,
          actualCheckOutDate: new Date(dto.actualCheckOutDate),
          checkoutReason: dto.checkoutReason,
          notes: dto.notes ?? existing.notes,
        },
      });

      const otherActive = await tx.stay.count({ where: { roomId: existing.roomId, status: StayStatus.ACTIVE, id: { not: id } } });
      if (otherActive === 0) {
        await tx.room.update({ where: { id: existing.roomId }, data: { status: RoomStatus.AVAILABLE } });
      }

      return stay;
    });

    await this.audit.log({ actorUserId: actor.id, action: 'COMPLETE', entityType: 'Stay', entityId: String(updated.id), oldData: existing, newData: updated });
    return normalizeStayForResponse({ ...updated, roomStatusAfterSync: 'AVAILABLE' });
  }

  async cancel(id: number, dto: CancelStayDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.stay.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Stay tidak ditemukan');
    if (existing.status !== StayStatus.ACTIVE) throw new ConflictException('Stay bukan status ACTIVE');

    const room = await this.prisma.room.findUnique({
      where: { id: existing.roomId },
      select: { status: true },
    });
    const isReservedBooking = room?.status === RoomStatus.RESERVED;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.StayUpdateInput = {
        status: StayStatus.CANCELLED,
        checkoutReason: dto.cancelReason,
        notes: dto.notes ?? existing.notes,
      };

      if (isReservedBooking) {
        updateData.initialElectricityKwhPending = null;
        updateData.initialWaterM3Pending = null;
        updateData.initialMetersRecordedAt = null;
        updateData.initialMetersRecordedBy = { disconnect: true };
      }

      await tx.stay.update({
        where: { id },
        data: updateData,
      });

      await tx.invoice.updateMany({
        where: {
          stayId: id,
          status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] },
        },
        data: {
          status: InvoiceStatus.CANCELLED,
          cancelReason: dto.cancelReason,
        },
      });

      const stay = await tx.stay.findUnique({ where: { id } });
      if (!stay) {
        throw new NotFoundException('Stay tidak ditemukan setelah pembatalan');
      }

      const otherActive = await tx.stay.count({ where: { roomId: existing.roomId, status: StayStatus.ACTIVE, id: { not: id } } });
      if (otherActive === 0) {
        await tx.room.update({ where: { id: existing.roomId }, data: { status: RoomStatus.AVAILABLE } });
      }

      return {
        ...stay,
        cancelReason: dto.cancelReason,
      };
    });

    await this.audit.log({ actorUserId: actor.id, action: 'CANCEL', entityType: 'Stay', entityId: String(updated.id), oldData: existing, newData: updated });
    return normalizeStayForResponse({ ...updated, roomStatusAfterSync: 'AVAILABLE' });
  }

  async processDeposit(id: number, dto: ProcessDepositDto, actor: CurrentUserPayload) {
    const stay = await this.prisma.stay.findUnique({ where: { id } });
    if (!stay) throw new NotFoundException('Stay tidak ditemukan');
    if (stay.status !== 'COMPLETED' && stay.status !== 'CANCELLED') throw new ConflictException('Deposit belum boleh diproses');
    if (stay.depositStatus !== 'HELD') throw new ConflictException('Deposit sudah diproses sebelumnya');

    const openInvoices = await this.prisma.invoice.findMany({
      where: { stayId: id, status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] } },
      select: { id: true, invoiceNumber: true, status: true },
      orderBy: { id: 'asc' },
    });
    if (openInvoices.length > 0) {
      const invoiceRefs = openInvoices
        .map((invoice) => `${invoice.invoiceNumber || `Invoice #${invoice.id}`} (${invoice.status})`)
        .join(', ');
      throw new ConflictException(
        `Deposit tidak dapat diproses karena masih ada invoice yang belum diselesaikan: ${invoiceRefs}`,
      );
    }

    let deduction = dto.depositDeductionRupiah ?? 0;
    let refunded = dto.depositRefundedRupiah ?? 0;

    let depositStatus: DepositStatus;
    if (dto.action === 'FULL_REFUND') {
      deduction = 0;
      refunded = stay.depositAmountRupiah;
      depositStatus = DepositStatus.REFUNDED;
    } else if (dto.action === 'FORFEIT') {
      deduction = stay.depositAmountRupiah;
      refunded = 0;
      depositStatus = DepositStatus.FORFEITED;
    } else {
      depositStatus = DepositStatus.PARTIALLY_REFUNDED;
    }

    if (deduction + refunded > stay.depositAmountRupiah) {
      throw new ConflictException('Nilai deposit tidak konsisten');
    }

    const updated = await this.prisma.stay.update({
      where: { id },
      data: {
        depositStatus,
        depositDeductionRupiah: deduction,
        depositRefundedRupiah: refunded,
        depositRefundedAt: refunded > 0 ? new Date() : null,
        depositNote: dto.depositNote,
      },
    });

    await this.audit.log({ actorUserId: actor.id, action: 'PROCESS_DEPOSIT', entityType: 'Stay', entityId: String(updated.id), oldData: stay, newData: updated });
    return updated;
  }

  async renewStay(id: number, dto: RenewStayDto, actor: CurrentUserPayload) {
    try {
      const result = await this.prisma.$transaction((tx) => this.renewStayInTransaction(tx, id, dto, actor));

      await this.audit.log({
        actorUserId: actor.id,
        action: 'RENEW',
        entityType: 'Stay',
        entityId: String(result.stay.id),
        oldData: result.oldStay,
        newData: result.stay,
      });
      await this.audit.log({
        actorUserId: actor.id,
        action: 'CREATE',
        entityType: 'Invoice',
        entityId: String(result.invoice.id),
        newData: result.invoice,
      });

      return { stay: result.stay, invoice: result.invoice };
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException(`Constraint database gagal: ${error.message}`);
      }
      throw error;
    }
  }

  async renewStayInTransaction(tx: Prisma.TransactionClient, id: number, dto: RenewStayDto, actor: CurrentUserPayload) {
    const stay = await tx.stay.findUnique({ where: { id } });
    if (!stay) throw new NotFoundException('Stay tidak ditemukan');
    if (stay.status !== 'ACTIVE') throw new ConflictException('Stay tidak aktif, tidak dapat diperpanjang');

    const today = startOfDay(new Date());
    const currentPlannedCheckOut = stay.plannedCheckOutDate ? startOfDay(stay.plannedCheckOutDate) : null;
    const logicalPeriodStart = currentPlannedCheckOut ? maxDate(addDays(currentPlannedCheckOut, 1), today) : today;

    const newPlannedCheckOut = dto.plannedCheckOutDate
      ? startOfDay(new Date(dto.plannedCheckOutDate))
      : calculatePeriodEnd(logicalPeriodStart, stay.pricingTerm);

    if (Number.isNaN(newPlannedCheckOut.getTime())) {
      throw new BadRequestException('Tanggal perpanjangan tidak valid');
    }

    if (newPlannedCheckOut <= logicalPeriodStart) {
      throw new ConflictException('Tanggal perpanjangan harus setelah awal periode renewal yang baru');
    }

    const rentAmount = dto.agreedRentAmountRupiah ?? stay.agreedRentAmountRupiah;

    const updatedStay = await tx.stay.update({
      where: { id },
      data: { plannedCheckOutDate: newPlannedCheckOut },
    });

    const invoiceNumber = `INV-${stay.id}-R-${Date.now().toString().slice(-6)}`;
    const periodStart = logicalPeriodStart;
    const periodEnd = newPlannedCheckOut;
    const dueDate = calculateDueDate(periodEnd);

    // Keep invoice in DRAFT while inserting lines because DB guards prevent line mutation after ISSUE.
    // Immediately issue it after the renewal rent line exists, so approved renewals are tenant-facing.
    let invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        stayId: stay.id,
        status: InvoiceStatus.DRAFT,
        periodStart,
        periodEnd,
        dueDate,
        createdById: actor.id,
      },
    });

    const unit = mapPricingTermToUnit(stay.pricingTerm);
    await tx.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        lineType: 'RENT' as any,
        description: `Perpanjangan ${stay.pricingTerm}`,
        qty: 1,
        unit,
        unitPriceRupiah: rentAmount,
        lineAmountRupiah: rentAmount,
        sortOrder: 0,
      },
    });

    invoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.ISSUED,
        issuedAt: new Date(),
      },
    });

    return { oldStay: stay, stay: updatedStay, invoice };
  }

}
