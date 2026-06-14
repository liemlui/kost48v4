import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
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
  ProcessLossRefundDto,
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
import {
  assertCoreLifecycleActor,
  assertNoOpenInvoicesTx,
  parseMeterDecimal,
  createRenewUtilityCheckpointLineTx,
  resolveDepositSettlementAmount,
} from "./stays-service-helpers";
import { DepositLedgerService } from "../deposit-ledger/deposit-ledger.service";
import {
  endOfDay,
  parseJakartaDateOnly,
  startOfJakartaBusinessDay,
} from "../../common/utils/date.util";

@Injectable()
export class StaysService {
  private readonly logger = new Logger(StaysService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly accountingPosting: AccountingPostingService,
    private readonly depositLedger: DepositLedgerService,
  ) {}

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

    // B-12: cegah set plannedCheckOutDate ke masa lalu (langsung jadi target
    // overstay/forced-checkout di sweep berikutnya). Hanya saat tanggal diubah.
    if (dto.plannedCheckOutDate && nextPlannedCheckOutDate) {
      const wibNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
      const wibToday = new Date(
        Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate()),
      );
      if (nextPlannedCheckOutDate < wibToday) {
        throw new ConflictException(
          "Tanggal keluar tidak boleh di masa lalu. Untuk mengeluarkan tenant lebih awal, pakai flow checkout/forced-checkout, bukan ubah tanggal.",
        );
      }
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

    if (room.status !== RoomStatus.AVAILABLE) {
      // Audit A9: MAINTENANCE (belum lolos inspeksi checkout) dan INACTIVE
      // juga tidak boleh di-check-in, bukan hanya OCCUPIED/RESERVED.
      throw new ConflictException(
        room.status === RoomStatus.MAINTENANCE
          ? "Kamar masih berstatus Perlu Dicek (belum lolos inspeksi checkout). Selesaikan tiket inspeksi sampai kamar AVAILABLE sebelum check-in."
          : "Kamar tidak tersedia untuk check-in (sedang ditempati, dipesan, atau nonaktif)",
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
    // F1-10 (C3/D-05): deposit jaminan SELALU = Room.defaultDepositRupiah; admin tak boleh override via dto.
    const deposit = room.defaultDepositRupiah ?? 0;
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
        const rawPassword = `kost48-${randomBytes(9).toString('base64url').slice(0, 12)}`;
        temporaryPassword = rawPassword;
        passwordHash = await bcrypt.hash(rawPassword, 10);
      }
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        // Lock + re-validasi: cegah race condition double occupancy
        await tx.$queryRaw`SELECT id FROM "Room" WHERE id = ${dto.roomId} FOR UPDATE`;
        const lockedRoom = await tx.room.findUnique({ where: { id: dto.roomId } });
        if (!lockedRoom) throw new NotFoundException("Kamar tidak ditemukan");
        if (lockedRoom.status !== RoomStatus.AVAILABLE) {
          throw new ConflictException("Kamar tidak tersedia untuk check-in (sedang ditempati, dipesan, perlu dicek, atau nonaktif)");
        }
        const openCleaningTicket = await tx.ticket.findFirst({
          where: {
            roomId: dto.roomId,
            category: "CHECKOUT_INSPECTION" as any,
            status: { notIn: ["CLOSED", "CANCELLED"] as any },
          },
          select: { id: true, ticketNumber: true },
        });
        if (openCleaningTicket) {
          throw new ConflictException(
            `Kamar masih dalam proses pembersihan/inspeksi (tiket ${openCleaningTicket.ticketNumber}). Tutup tiket tersebut sebelum check-in.`,
          );
        }
        const existingRoomStayLock = await tx.stay.findFirst({
          where: { roomId: dto.roomId, status: StayStatus.ACTIVE },
        });
        if (existingRoomStayLock) {
          throw new ConflictException("Kamar sudah ditempati stay aktif lain");
        }
        // Audit E-3: jaminan tunai yang diterima saat check-in dicatat resmi.
        const depositCollected = Boolean(dto.depositCollected) && deposit > 0;
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
            ...(depositCollected
              ? {
                  depositPaidAmountRupiah: deposit,
                  depositPaymentStatus: "PAID" as any,
                }
              : {}),
            electricityTariffPerKwhRupiah: electricity,
            waterTariffPerM3Rupiah: water,
            bookingSource: dto.bookingSource as LeadSource,
            bookingSourceDetail: dto.bookingSourceDetail,
            stayPurpose: dto.stayPurpose as StayPurpose,
            notes: dto.notes,
            createdById: actor.id,
            // Audit M-14: check-in manual = langsung resmi huni; tanpa ini stay
            // dianggap "unpromoted" dan tersisih dari seluruh lifecycle overstay.
            initialMetersPromotedAt: new Date(),
          },
        });

        if (depositCollected) {
          // Ledger wajib sukses (sumber kebenaran riwayat jaminan);
          // jurnal liability best-effort (paritas dengan jalur booking,
          // readiness unmapped akan menandai bila gagal).
          await this.depositLedger.recordDepositReceivedTx(tx, {
            stayId: stay.id,
            amountRupiah: deposit,
            actorUserId: actor.id,
            occurredAt: new Date(dto.checkInDate),
            note: "Jaminan diterima tunai saat check-in manual.",
            metadata: { source: "MANUAL_CHECKIN" },
          });
          await this.accountingPosting
            .postDepositReceivedForStayTx(tx, stay.id, actor.id, "CASH", new Date(dto.checkInDate))
            .catch((err) => {
              this.logger.warn(
                `Jurnal deposit (liability) gagal saat check-in manual stay #${stay.id}: ${err instanceof Error ? err.message : String(err)}`,
              );
            });
        }

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
          .catch((err) => {
            this.logger.warn(
              `Auto Journal Lite gagal untuk invoice awal #${issuedInvoice.id} (stay create): ${err instanceof Error ? err.message : String(err)}`,
            );
            return undefined;
          });

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
          'Gagal menyimpan data. Kesalahan integritas database.',
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
    assertCoreLifecycleActor(actor, "Final checkout");
    const actualCheckOutDate = parseJakartaDateOnly(
      dto.actualCheckOutDate,
      "Tanggal checkout final tidak valid",
    );
    const existing = await this.prisma.stay.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Stay tidak ditemukan");
    if (existing.status !== StayStatus.ACTIVE)
      throw new ConflictException("Stay bukan status ACTIVE");
    // Compare both sides in the same Jakarta business-day convention as
    // actualCheckOutDate to avoid an off-by-one-day mismatch when checkInDate
    // carries a time component near UTC midnight.
    if (actualCheckOutDate < startOfJakartaBusinessDay(existing.checkInDate)) {
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
          data: { status: RoomStatus.MAINTENANCE },
        });

        const existingInspectionTicket = await tx.ticket.findFirst({
          where: {
            stayId: id,
            roomId: existing.roomId,
            category: "CHECKOUT_INSPECTION",
          },
          select: { id: true, ticketNumber: true, status: true },
        });

        if (!existingInspectionTicket) {
          const staffAssignee = await tx.user.findFirst({
            where: { role: UserRole.STAFF, isActive: true },
            orderBy: { id: "asc" },
            select: { id: true },
          });
          const room = await tx.room.findUnique({
            where: { id: existing.roomId },
            select: { code: true, name: true },
          });
          const roomLabel = room?.code || room?.name || `Kamar #${existing.roomId}`;
          const baseTicketNumber = `TIC-${new Date().getFullYear()}-CHK-${id}`;
          let ticketNumber = baseTicketNumber;
          let suffix = 1;
          while (
            await tx.ticket.findUnique({
              where: { ticketNumber },
              select: { id: true },
            })
          ) {
            suffix += 1;
            ticketNumber = `${baseTicketNumber}-${suffix}`;
          }

          await tx.ticket.create({
            data: {
              ticketNumber,
              tenantId: existing.tenantId,
              roomId: existing.roomId,
              stayId: id,
              title: `Cek kamar setelah penghuni keluar - ${roomLabel}`,
              description: [
                `Kamar ${roomLabel} sudah selesai checkout final dan perlu dicek sebelum ditawarkan lagi.`,
                "Cek kebersihan, kunci, barang tertinggal, inventaris kamar, kerusakan, dan foto kondisi akhir.",
                "Jika semua aman, tandai pekerjaan selesai agar admin bisa menjadikan kamar siap ditempati kembali.",
              ].join("\n"),
              category: "CHECKOUT_INSPECTION",
              assignedToId: staffAssignee?.id,
            },
          });
        }
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
      roomStatusAfterSync: "MAINTENANCE",
      roomReadinessAfterCheckout: "NEEDS_INSPECTION",
    });
  }

  async cancel(id: number, dto: CancelStayDto, actor: CurrentUserPayload) {
    assertCoreLifecycleActor(actor, "Pembatalan stay");
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
        const postedJournal = await tx.journalEntry.findFirst({
          where: {
            sourceType: 'INVOICE' as any,
            sourceId: String(invoice.id),
            status: 'POSTED' as any,
          },
          select: { id: true },
          orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
        });
        if (!postedJournal) continue;
        const reversalResult =
          await this.accountingPosting.postInvoiceCancellationReversalTx(
            tx,
            invoice.id,
            actor.id,
          );
        if (reversalResult?.skipped) {
          throw new ConflictException(
            `Pembatalan stay gagal karena reversal accounting invoice #${invoice.id} tidak berhasil: ${reversalResult.reason ?? 'alasan tidak diketahui'}`,
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
        // Audit M-16: kamar bekas dihuni (promoted) wajib lewat inspeksi
        // (MAINTENANCE); kamar dengan tiket pembersihan terbuka juga tidak
        // boleh kembali AVAILABLE.
        const wasPromoted = Boolean(existing.initialMetersPromotedAt);
        const openCleaningTicket = await tx.ticket.findFirst({
          where: {
            roomId: existing.roomId,
            category: "CHECKOUT_INSPECTION",
            status: { notIn: ["CLOSED", "CANCELLED"] as any },
          },
          select: { id: true },
        });
        await tx.room.update({
          where: { id: existing.roomId },
          data: {
            status:
              wasPromoted || openCleaningTicket
                ? RoomStatus.MAINTENANCE
                : RoomStatus.AVAILABLE,
          },
        });

        // F2-6 (B-08): stay PROMOTED (sudah dihuni) yang dibatalkan → kamar MAINTENANCE
        // WAJIB punya tiket CHECKOUT_INSPECTION (seperti complete()). Tanpa ini kamar
        // nyangkut MAINTENANCE selamanya (gate room-ready hanya buka via tutup tiket inspeksi).
        if (wasPromoted && !openCleaningTicket) {
          const staffAssignee = await tx.user.findFirst({
            where: { role: UserRole.STAFF, isActive: true },
            orderBy: { id: "asc" },
            select: { id: true },
          });
          const roomInfo = await tx.room.findUnique({
            where: { id: existing.roomId },
            select: { code: true, name: true },
          });
          const roomLabel = roomInfo?.code || roomInfo?.name || `Kamar #${existing.roomId}`;
          const baseTicketNumber = `TIC-${new Date().getFullYear()}-CHK-${id}`;
          let ticketNumber = baseTicketNumber;
          let suffix = 1;
          while (
            await tx.ticket.findUnique({
              where: { ticketNumber },
              select: { id: true },
            })
          ) {
            suffix += 1;
            ticketNumber = `${baseTicketNumber}-${suffix}`;
          }
          await tx.ticket.create({
            data: {
              ticketNumber,
              tenantId: existing.tenantId,
              roomId: existing.roomId,
              stayId: id,
              title: `Cek kamar setelah pembatalan penghuni - ${roomLabel}`,
              description: [
                `Kamar ${roomLabel} dibatalkan saat sudah dihuni dan perlu dicek sebelum ditawarkan lagi.`,
                "Cek kebersihan, kunci, barang tertinggal, inventaris kamar, kerusakan, dan foto kondisi akhir.",
                "Jika semua aman, tandai pekerjaan selesai agar admin bisa menjadikan kamar siap ditempati kembali.",
              ].join("\n"),
              category: "CHECKOUT_INSPECTION",
              assignedToId: staffAssignee?.id,
            },
          });
        }
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
      roomStatusAfterSync: existing.initialMetersPromotedAt ? "MAINTENANCE" : "AVAILABLE",
    });
  }

  async processDeposit(
    id: number,
    dto: ProcessDepositDto,
    actor: CurrentUserPayload,
  ) {
    assertCoreLifecycleActor(actor, "Proses deposit");

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

      const settlementAmount = resolveDepositSettlementAmount(stay);
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
    assertCoreLifecycleActor(actor, "Perpanjangan masa sewa");
    void id;
    void dto;
    throw new ConflictException(
      "Perpanjangan langsung dinonaktifkan. Gunakan alur Permintaan Perpanjangan agar DP, invoice pelunasan, dan status pembayaran terverifikasi.",
    );
  }

  /**
   * F2-1 inc.2b: terbitkan invoice DP 30% perpanjangan TERPISAH (ISSUED + jurnal).
   * Dibayar PENUH via bukti bayar (no-partial); confirm-dp memverifikasi PAID sebelum DP_SECURED.
   */
  async issueRenewalDownPaymentInvoiceTx(
    tx: Prisma.TransactionClient,
    stayId: number,
    downPaymentRupiah: number,
    actor: CurrentUserPayload,
  ) {
    const stay = await tx.stay.findUnique({ where: { id: stayId } });
    if (!stay) throw new NotFoundException("Stay tidak ditemukan");
    if (stay.status !== StayStatus.ACTIVE) throw new ConflictException("Stay tidak aktif");
    if (!(downPaymentRupiah > 0)) throw new ConflictException("Nominal DP perpanjangan tidak valid");

    const invoiceNumber = `INV-${stay.id}-RDP-${Date.now().toString().slice(-6)}`;
    const periodStart = startOfDay(new Date());
    const periodEnd = stay.plannedCheckOutDate ? startOfDay(stay.plannedCheckOutDate) : periodStart;
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        stayId: stay.id,
        status: InvoiceStatus.DRAFT,
        periodStart,
        periodEnd,
        dueDate: calculateDueDate(periodEnd),
        notes: "DP 30% perpanjangan kontrak (dibayar penuh sebelum kamar diamankan).",
        createdById: actor.id,
      },
    });
    await tx.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        lineType: InvoiceLineType.RENT as any,
        description: "DP 30% perpanjangan masa sewa",
        qty: 1,
        unit: "paket",
        unitPriceRupiah: downPaymentRupiah,
        lineAmountRupiah: downPaymentRupiah,
        sortOrder: 0,
      },
    });
    const issued = await tx.invoice.update({
      where: { id: invoice.id },
      data: { totalAmountRupiah: downPaymentRupiah, status: InvoiceStatus.ISSUED, issuedAt: new Date() },
    });
    await this.accountingPosting.postInvoiceIssuedTx(tx, issued.id, actor.id).catch((err) => {
      this.logger.warn(
        `Auto Journal Lite gagal untuk invoice DP renewal #${issued.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return undefined;
    });
    return issued;
  }

  async prepareRenewalSettlementInTransaction(
    tx: Prisma.TransactionClient,
    id: number,
    dto: RenewStayDto,
    actor: CurrentUserPayload,
    settlementDueDate?: Date | null,
  ) {
    assertCoreLifecycleActor(actor, "Perpanjangan masa sewa");

    // Audit M-15: kunci stay agar dobel-renew / race dengan sweeper auto-ops
    // tidak bisa membuat dua invoice perpanjangan untuk periode yang sama.
    await tx.$queryRaw`SELECT id FROM "Stay" WHERE id = ${id} FOR UPDATE`;
    const stay = await tx.stay.findUnique({
      where: { id },
      include: { room: { select: { id: true, code: true } } },
    });
    if (!stay) throw new NotFoundException("Stay tidak ditemukan");
    if (stay.status !== StayStatus.ACTIVE)
      throw new ConflictException("Stay tidak aktif, tidak dapat diperpanjang");

    await assertNoOpenInvoicesTx(tx, id, "Perpanjangan masa sewa");
    if (!dto.electricityReadingValue || !dto.waterReadingValue || !dto.meterReadingAt) {
      throw new BadRequestException(
        "Meter listrik, meter air, dan tanggal pencatatan wajib diisi untuk menerbitkan invoice pelunasan.",
      );
    }

    const effectivePricingTerm = dto.pricingTerm ?? stay.pricingTerm;

    const meterReadingAt = parseJakartaDateOnly(
      dto.meterReadingAt,
      "Tanggal catat meter tidak valid",
    );

    const electricityReadingValue = parseMeterDecimal(
      dto.electricityReadingValue,
      "listrik",
    );
    const waterReadingValue = parseMeterDecimal(
      dto.waterReadingValue,
      "air",
    );

    const currentPlannedCheckOut = stay.plannedCheckOutDate
      ? startOfDay(stay.plannedCheckOutDate)
      : null;
    const today = startOfDay(new Date());
    // periodEnd/plannedCheckOutDate is exclusive, so the renewal starts on the current periodEnd date.
    const logicalPeriodStart = currentPlannedCheckOut ?? today;

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
    // F2-1 inc.2b: bila DP 30% sudah ditagih via invoice terpisah, rent-line invoice renewal
    // = sisa (rent − DP). Stay.agreedRentAmountRupiah tetap penuh (di update bawah).
    const priorDownPayment = Math.max(0, Number(dto.priorDownPaymentRupiah ?? 0));
    const settlementRentLine = Math.max(0, Number(rentAmount ?? 0) - priorDownPayment);

    const invoiceNumber = `INV-${stay.id}-R-${Date.now().toString().slice(-6)}`;
    const periodStart = logicalPeriodStart;
    const periodEnd = newPlannedCheckOut;
    const dueDate = settlementDueDate
      ? startOfDay(settlementDueDate)
      : calculateDueDate(periodEnd);

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
        description: priorDownPayment > 0
          ? `Perpanjangan masa sewa ${effectivePricingTerm} (sisa setelah DP Rp ${priorDownPayment.toLocaleString('id-ID')})`
          : `Perpanjangan masa sewa ${effectivePricingTerm}`,
        qty: 1,
        unit,
        unitPriceRupiah: settlementRentLine,
        lineAmountRupiah: settlementRentLine,
        sortOrder: 0,
      },
    });

    const electricitySummary = await createRenewUtilityCheckpointLineTx(
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

    const waterSummary = await createRenewUtilityCheckpointLineTx(tx, {
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
      Number(settlementRentLine) +
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
      .catch((err) => {
        this.logger.warn(
          `Auto Journal Lite gagal untuk invoice perpanjangan #${invoice.id} (renew): ${err instanceof Error ? err.message : String(err)}`,
        );
        return undefined;
      });

    const issuedInvoice = await tx.invoice.findUnique({
      where: { id: invoice.id },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    });

    return {
      oldStay: stay,
      invoice: issuedInvoice ?? invoice,
      plannedStayUpdate: {
        plannedCheckOutDate: newPlannedCheckOut,
        pricingTerm: effectivePricingTerm,
        agreedRentAmountRupiah: rentAmount,
      },
      meterSummary: {
        readingAt: meterReadingAt,
        electricity: electricitySummary,
        water: waterSummary,
      },
    };
  }

  async finalizePreparedRenewalInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      stayId: number;
      settlementInvoiceId: number;
      pricingTerm: PricingTerm;
      agreedRentAmountRupiah: number;
    },
    actor: CurrentUserPayload,
  ) {
    assertCoreLifecycleActor(actor, "Finalisasi perpanjangan masa sewa");
    await tx.$queryRaw`SELECT id FROM "Stay" WHERE id = ${params.stayId} FOR UPDATE`;

    const [stay, invoice] = await Promise.all([
      tx.stay.findUnique({ where: { id: params.stayId } }),
      tx.invoice.findUnique({
        where: { id: params.settlementInvoiceId },
        include: { lines: { orderBy: { sortOrder: "asc" } } },
      }),
    ]);

    if (!stay) throw new NotFoundException("Stay tidak ditemukan");
    if (stay.status !== StayStatus.ACTIVE) {
      throw new ConflictException("Stay tidak aktif, tidak dapat difinalkan");
    }
    if (!invoice || invoice.stayId !== stay.id) {
      throw new ConflictException("Invoice pelunasan perpanjangan tidak cocok dengan stay");
    }
    if (invoice.status !== InvoiceStatus.PAID || !invoice.paidAt) {
      throw new ConflictException(
        "Invoice pelunasan belum PAID. Setujui bukti pembayaran penuh sebelum finalisasi perpanjangan.",
      );
    }
    const otherOpenInvoice = await tx.invoice.findFirst({
      where: {
        stayId: stay.id,
        id: { not: invoice.id },
        status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
      },
      select: { invoiceNumber: true },
    });
    if (otherOpenInvoice) {
      throw new ConflictException(
        `Masih ada tagihan aktif ${otherOpenInvoice.invoiceNumber}. Selesaikan sebelum finalisasi perpanjangan.`,
      );
    }
    if (
      stay.plannedCheckOutDate
      && startOfDay(stay.plannedCheckOutDate).getTime() !== startOfDay(invoice.periodStart).getTime()
    ) {
      throw new ConflictException(
        "Periode stay berubah setelah invoice pelunasan diterbitkan. Batalkan dan siapkan ulang renewal.",
      );
    }

    const updatedStay = await tx.stay.update({
      where: { id: stay.id },
      data: {
        plannedCheckOutDate: invoice.periodEnd,
        pricingTerm: params.pricingTerm,
        agreedRentAmountRupiah: params.agreedRentAmountRupiah,
      },
    });

    return {
      oldStay: stay,
      stay: updatedStay,
      invoice,
    };
  }

  async cancelUnpaidRenewalInvoiceInTransaction(
    tx: Prisma.TransactionClient,
    invoiceId: number,
    actorUserId: number,
    reason: string,
  ) {
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, invoiceNumber: true, status: true },
    });
    if (!invoice || invoice.status === InvoiceStatus.CANCELLED) return invoice;
    if ([InvoiceStatus.PAID, InvoiceStatus.PARTIAL].includes(invoice.status as InvoiceStatus)) {
      throw new ConflictException(
        `Invoice ${invoice.invoiceNumber} sudah memiliki pembayaran dan tidak dapat dibatalkan lewat penolakan renewal.`,
      );
    }

    const cancelled = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancelReason: reason,
      },
    });
    const postedJournal = await tx.journalEntry.findFirst({
      where: {
        sourceType: "INVOICE" as any,
        sourceId: String(invoice.id),
        status: "POSTED" as any,
      },
      select: { id: true },
    });
    if (postedJournal) {
      const reversal = await this.accountingPosting.postInvoiceCancellationReversalTx(
        tx,
        invoice.id,
        actorUserId,
      );
      if (reversal?.skipped) {
        throw new ConflictException(
          `Reversal jurnal invoice ${invoice.invoiceNumber} gagal: ${reversal.reason ?? "alasan tidak diketahui"}`,
        );
      }
    }
    return cancelled;
  }

  /** F2-3b: daftar refund kalah-cepat (loser sudah-transfer) yang menunggu diproses. */
  async listPendingLossRefunds() {
    return this.prisma.stay.findMany({
      where: { lossRefundStatus: "PENDING" as any },
      select: {
        id: true,
        lossRefundAmountRupiah: true,
        lossRefundNote: true,
        cancelReason: true,
        updatedAt: true,
        room: { select: { code: true, name: true } },
        tenant: { select: { id: true, fullName: true, phone: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  /**
   * F2-3b: proses refund kalah-cepat — OWNER tandai COMPLETED + bukti transfer balik.
   * Hanya valid saat status PENDING (idempotensi: tak bisa diproses dua kali).
   */
  async processLossRefund(id: number, dto: ProcessLossRefundDto, actor: CurrentUserPayload) {
    const stay = await this.prisma.stay.findUnique({
      where: { id },
      select: { id: true, lossRefundStatus: true, lossRefundAmountRupiah: true },
    });
    if (!stay) throw new NotFoundException("Stay tidak ditemukan");
    if (stay.lossRefundStatus !== "PENDING") {
      throw new ConflictException("Refund hanya dapat diproses saat berstatus PENDING.");
    }
    const proofUrl = dto.proofUrl?.trim();
    const proofFileKey = dto.proofFileKey?.trim();
    if (!proofUrl && !proofFileKey) {
      throw new BadRequestException("Bukti transfer balik wajib diisi sebelum refund ditandai selesai.");
    }
    const updated = await this.prisma.stay.update({
      where: { id },
      data: {
        lossRefundStatus: "COMPLETED" as any,
        lossRefundProofUrl: proofUrl ?? null,
        lossRefundProofFileKey: proofFileKey ?? null,
        lossRefundNote: dto.note ?? undefined,
        lossRefundProcessedAt: new Date(),
        lossRefundProcessedById: actor.id,
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: "PROCESS_LOSS_REFUND",
      entityType: "Stay",
      entityId: String(id),
      newData: { lossRefundStatus: "COMPLETED", lossRefundAmountRupiah: stay.lossRefundAmountRupiah },
    });
    return updated;
  }
}
