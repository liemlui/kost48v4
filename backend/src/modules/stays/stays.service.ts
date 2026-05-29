import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import * as bcrypt from "bcryptjs";
import { AuditLogService } from "../../audit-log/audit-log.service";
import { CurrentUserPayload } from "../../common/interfaces/current-user.interface";
import {
  RoomStatus,
  StayStatus,
  PricingTerm,
  LeadSource,
  StayPurpose,
  InvoiceStatus,
  InvoiceLineType,
  DepositStatus,
  UtilityType,
  UserRole,
} from "../../common/enums/app.enums";
import { serializePrismaResult } from "../../common/utils/serialization";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CancelStayDto,
  CompleteStayDto,
  CreateStayDto,
  ProcessDepositDto,
  RenewStayDto,
  UpdateStayDto,
} from "./dto/stay.dto";
import { Prisma } from "../../generated/prisma";
import {
  normalizeStayForResponse,
  startOfDay,
  maxDate,
  resolveRent,
  mapPricingTermToUnit,
  calculatePeriodEnd,
  calculateDueDate,
} from "./stays.helpers";
import { AccountingPostingService } from "../accounting/accounting-posting.service";
import { DepositLedgerService } from "../deposit-ledger/deposit-ledger.service";
import { endOfDay, parseJakartaDateOnly } from "../../common/utils/date.util";

@Injectable()
export class StaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly accountingPosting: AccountingPostingService,
    private readonly depositLedger: DepositLedgerService,
  ) {}

  private assertCoreLifecycleActor(
    actor: CurrentUserPayload,
    actionLabel: string,
  ) {
    if (![UserRole.OWNER, UserRole.ADMIN].includes(actor.role)) {
      throw new ForbiddenException(
        `${actionLabel} hanya boleh dilakukan oleh owner/admin`,
      );
    }
  }

  private formatOpenInvoiceRefs(
    invoices: Array<{
      id: number;
      invoiceNumber: string | null;
      status: InvoiceStatus | string;
    }>,
  ) {
    return invoices
      .map(
        (invoice) =>
          `${invoice.invoiceNumber || `Tagihan #${invoice.id}`} (${invoice.status})`,
      )
      .join(", ");
  }

  private async assertNoOpenInvoicesTx(
    tx: Prisma.TransactionClient,
    stayId: number,
    actionLabel: string,
  ) {
    const openInvoices = await tx.invoice.findMany({
      where: {
        stayId,
        status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
      },
      select: { id: true, invoiceNumber: true, status: true },
      orderBy: { id: "asc" },
    });

    if (openInvoices.length > 0) {
      throw new ConflictException(
        `${actionLabel} belum bisa diproses karena masih ada tagihan aktif: ${this.formatOpenInvoiceRefs(openInvoices)}. Selesaikan atau batalkan tagihan terlebih dahulu.`,
      );
    }
  }

  private parseMeterDecimal(value: string, label: string) {
    try {
      const decimalValue = new Prisma.Decimal(value);
      if (decimalValue.lt(0)) {
        throw new BadRequestException(
          `Angka meter ${label} tidak boleh negatif`,
        );
      }
      return decimalValue;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Angka meter ${label} tidak valid`);
    }
  }

  private async createRenewUtilityCheckpointLineTx(
    tx: Prisma.TransactionClient,
    params: {
      roomId: number;
      invoiceId: number;
      utilityType: UtilityType;
      label: string;
      unit: string;
      newReadingValue: Prisma.Decimal;
      readingAt: Date;
      tariffRupiah: number;
      actorId: number;
      sortOrder: number;
    },
  ) {
    const previousReading = await tx.meterReading.findFirst({
      where: {
        roomId: params.roomId,
        utilityType: params.utilityType,
        readingAt: { lt: params.readingAt },
      },
      orderBy: { readingAt: "desc" },
    });

    if (!previousReading) {
      throw new ConflictException(
        `Belum ada catatan meter ${params.label} sebelumnya. Catat meter awal dulu sebelum menyetujui perpanjangan.`,
      );
    }

    const duplicateReading = await tx.meterReading.findFirst({
      where: {
        roomId: params.roomId,
        utilityType: params.utilityType,
        readingAt: { gte: params.readingAt, lte: endOfDay(params.readingAt) },
      },
      select: { id: true },
    });
    if (duplicateReading) {
      throw new ConflictException(
        `Catatan meter ${params.label} untuk tanggal ini sudah ada`,
      );
    }

    const nextReading = await tx.meterReading.findFirst({
      where: {
        roomId: params.roomId,
        utilityType: params.utilityType,
        readingAt: { gt: params.readingAt },
      },
      orderBy: { readingAt: "asc" },
    });

    if (params.newReadingValue.lt(previousReading.readingValue)) {
      throw new ConflictException(
        `Angka meter ${params.label} tidak boleh lebih kecil dari catatan sebelumnya (${previousReading.readingValue.toString()})`,
      );
    }

    if (nextReading && params.newReadingValue.gt(nextReading.readingValue)) {
      throw new ConflictException(
        `Angka meter ${params.label} tidak boleh lebih besar dari catatan setelahnya (${nextReading.readingValue.toString()})`,
      );
    }

    const usageDelta = params.newReadingValue.minus(
      previousReading.readingValue,
    );
    const billingQty = usageDelta.toDecimalPlaces(2);
    const tariff = params.tariffRupiah ?? 0;

    if (usageDelta.gt(0) && tariff <= 0) {
      throw new ConflictException(
        `Tarif ${params.label} belum diatur, tidak bisa menghitung tagihan perpanjangan`,
      );
    }

    const lineAmount = Math.round(billingQty.toNumber() * tariff);

    const reading = await tx.meterReading.create({
      data: {
        roomId: params.roomId,
        utilityType: params.utilityType,
        readingAt: params.readingAt,
        readingValue: params.newReadingValue,
        recordedById: params.actorId,
        note: `Checkpoint perpanjangan masa sewa. Pemakaian ${params.label}: ${billingQty.toString()} ${params.unit}.`,
      },
    });

    const line = await tx.invoiceLine.create({
      data: {
        invoiceId: params.invoiceId,
        lineType: (params.utilityType === UtilityType.ELECTRICITY
          ? InvoiceLineType.ELECTRICITY
          : InvoiceLineType.WATER) as any,
        utilityType: params.utilityType,
        description: `Pemakaian ${params.label} periode sebelumnya: ${billingQty.toString()} ${params.unit}`,
        qty: billingQty,
        unit: params.unit,
        unitPriceRupiah: tariff,
        lineAmountRupiah: lineAmount,
        sortOrder: params.sortOrder,
      },
    });

    return {
      reading,
      line,
      previousReadingValue: previousReading.readingValue,
      readingValue: params.newReadingValue,
      usageDelta,
      tariffRupiah: tariff,
      amountRupiah: lineAmount,
    };
  }

  async update(id: number, dto: UpdateStayDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.stay.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Stay tidak ditemukan");
    if (existing.status !== StayStatus.ACTIVE) {
      throw new ConflictException("Stay tidak aktif, tidak bisa diperbarui");
    }

    const nextPlannedCheckOutDate = dto.plannedCheckOutDate
      ? new Date(dto.plannedCheckOutDate)
      : existing.plannedCheckOutDate;
    if (
      nextPlannedCheckOutDate &&
      nextPlannedCheckOutDate <= existing.checkInDate
    ) {
      throw new ConflictException(
        "Tanggal renew/keluar harus setelah check-in",
      );
    }

    const updated = await this.prisma.stay.update({
      where: { id },
      data: {
        notes: dto.notes ?? existing.notes,
        bookingSourceDetail:
          dto.bookingSourceDetail ?? existing.bookingSourceDetail,
        plannedCheckOutDate: dto.plannedCheckOutDate
          ? new Date(dto.plannedCheckOutDate)
          : undefined,
      },
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: "UPDATE",
      entityType: "Stay",
      entityId: String(updated.id),
      oldData: existing,
      newData: updated,
    });
    return updated;
  }

  async create(dto: CreateStayDto, actor: CurrentUserPayload) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant) throw new NotFoundException("Tenant tidak ditemukan");

    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
    });
    if (!room) throw new NotFoundException("Kamar tidak ditemukan");

    const existingTenantStay = await this.prisma.stay.findFirst({
      where: { tenantId: dto.tenantId, status: StayStatus.ACTIVE },
    });
    if (existingTenantStay) {
      throw new ConflictException("Tenant masih memiliki stay aktif");
    }

    if (
      room.status === RoomStatus.OCCUPIED ||
      room.status === RoomStatus.RESERVED
    ) {
      throw new ConflictException(
        "Kamar sudah ditempati stay aktif lain atau sedang dipesan",
      );
    }

    const existingRoomStay = await this.prisma.stay.findFirst({
      where: { roomId: dto.roomId, status: StayStatus.ACTIVE },
    });
    if (existingRoomStay) {
      throw new ConflictException("Kamar sudah ditempati stay aktif lain");
    }

    if (
      dto.plannedCheckOutDate &&
      new Date(dto.plannedCheckOutDate) <= new Date(dto.checkInDate)
    ) {
      throw new ConflictException(
        "Tanggal renew/keluar harus setelah check-in",
      );
    }

    const agreed =
      dto.agreedRentAmountRupiah ?? resolveRent(room, dto.pricingTerm);
    const deposit = dto.depositAmountRupiah ?? room.defaultDepositRupiah;
    const electricity =
      dto.electricityTariffPerKwhRupiah ?? room.electricityTariffPerKwhRupiah;
    const water = dto.waterTariffPerM3Rupiah ?? room.waterTariffPerM3Rupiah;

    const initialElectricity = new Prisma.Decimal(dto.initialElectricityKwh);
    const initialWater = new Prisma.Decimal(dto.initialWaterM3);
    if (initialElectricity.lt(0) || initialWater.lt(0)) {
      throw new BadRequestException("Nilai meter tidak boleh negatif");
    }

    // --- Portal pre-check: lakukan SEBELUM transaction untuk menghindari side effects ---
    let portalStatus: "MISSING_EMAIL" | "CREATED" | "ALREADY_ACTIVE" =
      "MISSING_EMAIL";
    let portalEmail: string | undefined;
    let temporaryPassword: string | undefined;
    let portalUserId: number | undefined;
    let passwordHash: string | undefined;

    const tenantEmail = tenant.email?.trim().toLowerCase();

    if (!tenantEmail) {
      portalStatus = "MISSING_EMAIL";
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
          portalStatus = "ALREADY_ACTIVE";
          portalUserId = existingPortalUser.id;
        } else {
          throw new ConflictException(
            `Email ${tenantEmail} sudah digunakan oleh user/tenant lain. Tidak dapat melanjutkan check-in. Hubungi administrator untuk menyelesaikan konflik data.`,
          );
        }
      } else {
        portalStatus = "CREATED";
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
            plannedCheckOutDate: dto.plannedCheckOutDate
              ? new Date(dto.plannedCheckOutDate)
              : calculatePeriodEnd(new Date(dto.checkInDate), dto.pricingTerm),
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
        const plannedCheckOutDate = dto.plannedCheckOutDate
          ? new Date(dto.plannedCheckOutDate)
          : undefined;
        const periodEnd = calculatePeriodEnd(
          checkInDate,
          dto.pricingTerm,
          plannedCheckOutDate,
        );
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
            lineType: "RENT" as any,
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
          data: {
            status: InvoiceStatus.ISSUED,
            issuedAt,
            totalAmountRupiah: agreed,
          },
        });
        await this.accountingPosting
          .postInvoiceIssuedTx(tx, issuedInvoice.id, actor.id)
          .catch(() => undefined);

        const baselineDate = startOfDay(new Date(dto.checkInDate));

        const existingElectricityReading = await tx.meterReading.findFirst({
          where: {
            roomId: dto.roomId,
            utilityType: UtilityType.ELECTRICITY,
            readingAt: baselineDate,
          },
        });
        if (existingElectricityReading) {
          throw new BadRequestException(
            `Meter awal listrik pada tanggal check-in ${baselineDate.toLocaleDateString("id-ID")} sudah pernah tercatat untuk kamar ini.`,
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
            `Meter awal air pada tanggal check-in ${baselineDate.toLocaleDateString("id-ID")} sudah pernah tercatat untuk kamar ini.`,
          );
        }

        await tx.meterReading.create({
          data: {
            roomId: dto.roomId,
            utilityType: UtilityType.ELECTRICITY,
            readingAt: baselineDate,
            readingValue: initialElectricity,
            recordedById: actor.id,
            note: "Meter awal saat check-in",
          },
        });

        await tx.meterReading.create({
          data: {
            roomId: dto.roomId,
            utilityType: UtilityType.WATER,
            readingAt: baselineDate,
            readingValue: initialWater,
            recordedById: actor.id,
            note: "Meter awal saat check-in",
          },
        });

        // --- Portal user creation ---
        if (portalStatus === "CREATED" && passwordHash && portalEmail) {
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

      await this.audit.log({
        actorUserId: actor.id,
        action: "CREATE",
        entityType: "Stay",
        entityId: String(created.stay.id),
        newData: created.stay,
      });
      await this.audit.log({
        actorUserId: actor.id,
        action: "CREATE",
        entityType: "Invoice",
        entityId: String(created.invoice.id),
        newData: created.invoice,
      });
      if (portalStatus === "CREATED" && portalUserId) {
        await this.audit.log({
          actorUserId: actor.id,
          action: "CREATE",
          entityType: "User",
          entityId: String(portalUserId),
          meta: {
            tenantId: tenant.id,
            action: "AUTO_CREATE_PORTAL_BY_CHECKIN",
          },
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
        if (error.code === "P2002") {
          const target = Array.isArray(error.meta?.target)
            ? error.meta.target.join(",")
            : String(error.meta?.target ?? "");

          if (target.includes("email")) {
            throw new ConflictException(
              "Email sudah digunakan oleh user lain. Tidak dapat membuat akses portal tenant.",
            );
          }

          if (target.includes("tenantId")) {
            throw new ConflictException(
              "Tenant ini sudah memiliki akun portal. Silakan refresh data dan coba lagi.",
            );
          }

          if (
            target.includes("roomId") ||
            target.includes("utilityType") ||
            target.includes("readingAt")
          ) {
            throw new ConflictException(
              "Pembacaan meter untuk tanggal tersebut sudah ada",
            );
          }

          throw new ConflictException(
            "Data duplikat terdeteksi. Periksa data tenant, user portal, atau meter check-in.",
          );
        }
        throw new ConflictException(
          `Constraint database gagal: ${error.message}`,
        );
      }

      if (
        error?.message?.includes("monotonic") ||
        error?.message?.includes("tidak boleh lebih rendah")
      ) {
        throw new ConflictException(
          "Pembacaan meter tidak boleh lebih rendah dari sebelumnya",
        );
      }

      throw error;
    }
  }

  async complete(id: number, dto: CompleteStayDto, actor: CurrentUserPayload) {
    this.assertCoreLifecycleActor(actor, "Final checkout");
    const actualCheckOutDate = parseJakartaDateOnly(
      dto.actualCheckOutDate,
      "Tanggal checkout final tidak valid",
    );
    const existing = await this.prisma.stay.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Stay tidak ditemukan");
    if (existing.status !== StayStatus.ACTIVE)
      throw new ConflictException("Stay bukan status ACTIVE");
    if (actualCheckOutDate < startOfDay(existing.checkInDate)) {
      throw new ConflictException(
        "Tanggal checkout final tidak boleh sebelum tanggal check-in",
      );
    }

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
        orderBy: { id: "asc" },
      });

      if (blockingInvoices.length > 0) {
        const invoiceRefs = blockingInvoices
          .map(
            (invoice) =>
              `${invoice.invoiceNumber || `Tagihan #${invoice.id}`} (${invoice.status})`,
          )
          .join(", ");
        throw new ConflictException(
          `Tidak bisa final checkout karena masih ada tagihan aktif: ${invoiceRefs}. Selesaikan atau batalkan tagihan terlebih dahulu.`,
        );
      }

      const updateResult = await tx.stay.updateMany({
        where: { id, status: StayStatus.ACTIVE },
        data: {
          status: StayStatus.COMPLETED,
          actualCheckOutDate,
          checkoutReason: dto.checkoutReason,
          notes: dto.notes ?? existing.notes,
        },
      });
      if (updateResult.count !== 1) {
        throw new ConflictException(
          "Final checkout sudah diproses atau status masa sewa berubah. Muat ulang halaman.",
        );
      }

      const stay = await tx.stay.findUnique({ where: { id } });
      if (!stay)
        throw new NotFoundException(
          "Stay tidak ditemukan setelah checkout final",
        );

      const otherActive = await tx.stay.count({
        where: {
          roomId: existing.roomId,
          status: StayStatus.ACTIVE,
          id: { not: id },
        },
      });
      if (otherActive === 0) {
        await tx.room.update({
          where: { id: existing.roomId },
          data: { status: RoomStatus.AVAILABLE },
        });
      }

      return stay;
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: "COMPLETE",
      entityType: "Stay",
      entityId: String(updated.id),
      oldData: existing,
      newData: updated,
    });
    return normalizeStayForResponse({
      ...updated,
      roomStatusAfterSync: "AVAILABLE",
    });
  }

  async cancel(id: number, dto: CancelStayDto, actor: CurrentUserPayload) {
    this.assertCoreLifecycleActor(actor, "Pembatalan stay");
    const existing = await this.prisma.stay.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Stay tidak ditemukan");
    if (existing.status !== StayStatus.ACTIVE)
      throw new ConflictException("Stay bukan status ACTIVE");

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

      const invoicesToReverse = await tx.invoice.findMany({
        where: {
          stayId: id,
          status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] },
        },
        select: { id: true },
      });

      await tx.invoice.updateMany({
        where: {
          stayId: id,
          status: {
            in: [
              InvoiceStatus.DRAFT,
              InvoiceStatus.ISSUED,
              InvoiceStatus.PARTIAL,
            ],
          },
        },
        data: {
          status: InvoiceStatus.CANCELLED,
          cancelReason: dto.cancelReason,
        },
      });

      for (const invoice of invoicesToReverse) {
        const reversalResult =
          await this.accountingPosting.postInvoiceCancellationReversalTx(
            tx,
            invoice.id,
            actor.id,
          );
        if (reversalResult?.skipped) {
          throw new ConflictException(
            `Pembatalan stay gagal karena reversal accounting invoice #${invoice.id} tidak berhasil: ${reversalResult.reason ?? "alasan tidak diketahui"}`,
          );
        }
      }

      const stay = await tx.stay.findUnique({ where: { id } });
      if (!stay) {
        throw new NotFoundException("Stay tidak ditemukan setelah pembatalan");
      }

      const otherActive = await tx.stay.count({
        where: {
          roomId: existing.roomId,
          status: StayStatus.ACTIVE,
          id: { not: id },
        },
      });
      if (otherActive === 0) {
        await tx.room.update({
          where: { id: existing.roomId },
          data: { status: RoomStatus.AVAILABLE },
        });
      }

      return {
        ...stay,
        cancelReason: dto.cancelReason,
      };
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: "CANCEL",
      entityType: "Stay",
      entityId: String(updated.id),
      oldData: existing,
      newData: updated,
    });
    return normalizeStayForResponse({
      ...updated,
      roomStatusAfterSync: "AVAILABLE",
    });
  }

  private resolveDepositSettlementAmount(stay: {
    depositAmountRupiah: number | null;
    depositPaidAmountRupiah?: number | null;
  }) {
    const paid = Number(stay.depositPaidAmountRupiah ?? 0);
    const expected = Number(stay.depositAmountRupiah ?? 0);
    return paid > 0 ? paid : expected;
  }

  async processDeposit(
    id: number,
    dto: ProcessDepositDto,
    actor: CurrentUserPayload,
  ) {
    this.assertCoreLifecycleActor(actor, "Proses deposit");

    const updated = await this.prisma.$transaction(async (tx) => {
      const stay = await tx.stay.findUnique({ where: { id } });
      if (!stay) throw new NotFoundException("Stay tidak ditemukan");
      if (
        stay.status !== StayStatus.COMPLETED &&
        stay.status !== StayStatus.CANCELLED
      )
        throw new ConflictException("Deposit belum boleh diproses");
      if (stay.depositStatus !== DepositStatus.HELD)
        throw new ConflictException("Deposit sudah diproses sebelumnya");

      const settlementAmount = this.resolveDepositSettlementAmount(stay);
      if (settlementAmount <= 0) {
        throw new ConflictException(
          "Deposit tidak dapat diproses karena nominal deposit yang diterima masih 0.",
        );
      }

      const openInvoices = await tx.invoice.findMany({
        where: {
          stayId: id,
          status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
        },
        select: { id: true, invoiceNumber: true, status: true },
        orderBy: { id: "asc" },
      });
      if (openInvoices.length > 0) {
        const invoiceRefs = openInvoices
          .map(
            (invoice) =>
              `${invoice.invoiceNumber || `Tagihan #${invoice.id}`} (${invoice.status})`,
          )
          .join(", ");
        throw new ConflictException(
          `Deposit tidak dapat diproses karena masih ada tagihan aktif: ${invoiceRefs}`,
        );
      }

      const note = dto.depositNote?.trim() ?? "";
      let deduction = dto.depositDeductionRupiah ?? 0;
      let refunded = dto.depositRefundedRupiah ?? 0;

      let depositStatus: DepositStatus;
      if (dto.action === "FULL_REFUND") {
        deduction = 0;
        refunded = settlementAmount;
        depositStatus = DepositStatus.REFUNDED;
      } else if (dto.action === "FORFEIT") {
        if (note.length < 8) {
          throw new BadRequestException(
            "Catatan minimal 8 karakter wajib diisi untuk deposit hangus.",
          );
        }
        deduction = settlementAmount;
        refunded = 0;
        depositStatus = DepositStatus.FORFEITED;
      } else {
        if (note.length < 8) {
          throw new BadRequestException(
            "Catatan minimal 8 karakter wajib diisi untuk potongan deposit.",
          );
        }
        if (deduction <= 0 || refunded <= 0) {
          throw new BadRequestException(
            "Partial refund harus memiliki nilai potongan dan pengembalian lebih dari 0. Gunakan FULL_REFUND untuk refund penuh atau FORFEIT untuk potongan penuh.",
          );
        }
        if (deduction + refunded !== settlementAmount) {
          throw new ConflictException(
            "Partial refund harus memproses seluruh deposit yang diterima: potongan + pengembalian harus sama dengan jumlah deposit diterima.",
          );
        }
        depositStatus = DepositStatus.PARTIALLY_REFUNDED;
      }

      if (
        deduction < 0 ||
        refunded < 0 ||
        deduction + refunded > settlementAmount
      ) {
        throw new ConflictException("Nilai deposit tidak konsisten");
      }

      const updateResult = await tx.stay.updateMany({
        where: {
          id,
          status: { in: [StayStatus.COMPLETED, StayStatus.CANCELLED] },
          depositStatus: DepositStatus.HELD,
        },
        data: {
          depositStatus,
          depositDeductionRupiah: deduction,
          depositRefundedRupiah: refunded,
          depositRefundedAt: refunded > 0 ? new Date() : null,
          depositNote: note || undefined,
        },
      });
      if (updateResult.count !== 1) {
        throw new ConflictException(
          "Deposit sudah diproses atau status masa sewa berubah. Muat ulang halaman.",
        );
      }

      const result = await tx.stay.findUnique({ where: { id } });
      if (!result)
        throw new NotFoundException(
          "Stay tidak ditemukan setelah proses deposit",
        );

      const accounting = await this.accountingPosting.postDepositSettlementTx(
        tx,
        id,
        actor.id,
      );
      const ledger = await this.depositLedger.recordDepositSettlementTx(tx, {
        stayId: id,
        actorUserId: actor.id,
        note: note || undefined,
        metadata: {
          action: dto.action,
          settlementAmountRupiah: settlementAmount,
        },
      });

      return {
        ...result,
        depositSettlement: {
          accounting,
          ledger,
          settlementAmountRupiah: settlementAmount,
        },
      };
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: "PROCESS_DEPOSIT",
      entityType: "Stay",
      entityId: String(updated.id),
      newData: updated,
    });
    return updated;
  }

  async renewStay(id: number, dto: RenewStayDto, actor: CurrentUserPayload) {
    this.assertCoreLifecycleActor(actor, "Perpanjangan masa sewa");
    try {
      const result = await this.prisma.$transaction((tx) =>
        this.renewStayInTransaction(tx, id, dto, actor),
      );

      await this.audit.log({
        actorUserId: actor.id,
        action: "RENEW",
        entityType: "Stay",
        entityId: String(result.stay.id),
        oldData: result.oldStay,
        newData: result.stay,
      });
      await this.audit.log({
        actorUserId: actor.id,
        action: "CREATE",
        entityType: "Invoice",
        entityId: String(result.invoice.id),
        newData: result.invoice,
      });

      return { stay: result.stay, invoice: result.invoice };
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ConflictException(
          `Constraint database gagal: ${error.message}`,
        );
      }
      throw error;
    }
  }

  async renewStayInTransaction(
    tx: Prisma.TransactionClient,
    id: number,
    dto: RenewStayDto,
    actor: CurrentUserPayload,
  ) {
    this.assertCoreLifecycleActor(actor, "Perpanjangan masa sewa");

    const stay = await tx.stay.findUnique({
      where: { id },
      include: { room: { select: { id: true, code: true } } },
    });
    if (!stay) throw new NotFoundException("Stay tidak ditemukan");
    if (stay.status !== StayStatus.ACTIVE)
      throw new ConflictException("Stay tidak aktif, tidak dapat diperpanjang");

    await this.assertNoOpenInvoicesTx(tx, id, "Perpanjangan masa sewa");

    const effectivePricingTerm = dto.pricingTerm ?? stay.pricingTerm;

    const meterReadingAt = parseJakartaDateOnly(
      dto.meterReadingAt,
      "Tanggal catat meter tidak valid",
    );

    const electricityReadingValue = this.parseMeterDecimal(
      dto.electricityReadingValue,
      "listrik",
    );
    const waterReadingValue = this.parseMeterDecimal(
      dto.waterReadingValue,
      "air",
    );

    const today = startOfDay(new Date());
    const currentPlannedCheckOut = stay.plannedCheckOutDate
      ? startOfDay(stay.plannedCheckOutDate)
      : null;
    // periodEnd/plannedCheckOutDate is exclusive, so the renewal starts on the current periodEnd date.
    const logicalPeriodStart = currentPlannedCheckOut
      ? maxDate(currentPlannedCheckOut, today)
      : today;

    const newPlannedCheckOut = dto.plannedCheckOutDate
      ? startOfDay(new Date(dto.plannedCheckOutDate))
      : calculatePeriodEnd(logicalPeriodStart, effectivePricingTerm);

    if (Number.isNaN(newPlannedCheckOut.getTime())) {
      throw new BadRequestException("Tanggal perpanjangan tidak valid");
    }

    if (newPlannedCheckOut <= logicalPeriodStart) {
      throw new ConflictException(
        "Tanggal perpanjangan harus setelah awal periode renewal yang baru",
      );
    }

    const rentAmount =
      dto.agreedRentAmountRupiah ?? stay.agreedRentAmountRupiah;

    const invoiceNumber = `INV-${stay.id}-R-${Date.now().toString().slice(-6)}`;
    const periodStart = logicalPeriodStart;
    const periodEnd = newPlannedCheckOut;
    const dueDate = calculateDueDate(periodEnd);

    // Keep invoice in DRAFT while inserting all lines because DB guards prevent line mutation after ISSUE.
    let invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        stayId: stay.id,
        status: InvoiceStatus.DRAFT,
        periodStart,
        periodEnd,
        dueDate,
        notes:
          "Tagihan perpanjangan termasuk checkpoint meter listrik dan air periode sebelumnya.",
        createdById: actor.id,
      },
    });

    const unit = mapPricingTermToUnit(effectivePricingTerm);
    await tx.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        lineType: InvoiceLineType.RENT as any,
        description: `Perpanjangan masa sewa ${effectivePricingTerm}`,
        qty: 1,
        unit,
        unitPriceRupiah: rentAmount,
        lineAmountRupiah: rentAmount,
        sortOrder: 0,
      },
    });

    const electricitySummary = await this.createRenewUtilityCheckpointLineTx(
      tx,
      {
        roomId: stay.roomId,
        invoiceId: invoice.id,
        utilityType: UtilityType.ELECTRICITY,
        label: "listrik",
        unit: "kWh",
        newReadingValue: electricityReadingValue,
        readingAt: meterReadingAt,
        tariffRupiah: stay.electricityTariffPerKwhRupiah,
        actorId: actor.id,
        sortOrder: 1,
      },
    );

    const waterSummary = await this.createRenewUtilityCheckpointLineTx(tx, {
      roomId: stay.roomId,
      invoiceId: invoice.id,
      utilityType: UtilityType.WATER,
      label: "air",
      unit: "m³",
      newReadingValue: waterReadingValue,
      readingAt: meterReadingAt,
      tariffRupiah: stay.waterTariffPerM3Rupiah,
      actorId: actor.id,
      sortOrder: 2,
    });

    const renewalTotalAmountRupiah =
      Number(rentAmount ?? 0) +
      Number(electricitySummary.amountRupiah ?? 0) +
      Number(waterSummary.amountRupiah ?? 0);

    invoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        totalAmountRupiah: renewalTotalAmountRupiah,
        status: InvoiceStatus.ISSUED,
        issuedAt: new Date(),
      },
    });
    await this.accountingPosting
      .postInvoiceIssuedTx(tx, invoice.id, actor.id)
      .catch(() => undefined);

    const issuedInvoice = await tx.invoice.findUnique({
      where: { id: invoice.id },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    });

    const updatedStay = await tx.stay.update({
      where: { id },
      data: {
        plannedCheckOutDate: newPlannedCheckOut,
        pricingTerm: effectivePricingTerm,
        agreedRentAmountRupiah: rentAmount,
      },
    });

    return {
      oldStay: stay,
      stay: updatedStay,
      invoice: issuedInvoice ?? invoice,
      meterSummary: {
        readingAt: meterReadingAt,
        electricity: electricitySummary,
        water: waterSummary,
      },
    };
  }
}
