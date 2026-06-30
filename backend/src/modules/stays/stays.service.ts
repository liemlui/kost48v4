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
  PaymentMethod,
  UtilityType,
  UserRole,
} from "../../common/enums/app.enums";
import { serializePrismaResult } from "../../common/utils/serialization";
import { deleteFileSafe } from "../../common/utils/file-signature.util";
import { pickRoundRobinStaffTx } from "../../common/utils/staff-assignment.util";
import { join } from "path";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CancelStayDto,
  CompleteStayDto,
  CreateStayDto,
  ForcedCheckoutDto,
  MarkBelongingsDto,
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
  mapPricingTermToUnit,
  calculatePeriodEnd,
  calculateDueDate,
} from "./stays.helpers";
import { calculateRentByPricingTerm } from "../tenant-bookings/pricing.helper";
import { AccountingPostingService } from "../accounting/accounting-posting.service";
import {
  assertCoreLifecycleActor,
  resolveDepositSettlementAmount,
  isMeterInvoice,
  invoiceRemainingRupiah,
  computeInvoiceDepositSettlement,
} from "./stays-service-helpers";
import { DepositLedgerService } from "../deposit-ledger/deposit-ledger.service";
import { StaysRenewalService } from "./stays-renewal.service";
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
    private readonly staysRenewalService: StaysRenewalService,
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

    // STF-ROLE-SCOPE: STAFF dilarang override harga/tarif — pakai default kamar.
    if (actor.role === UserRole.STAFF) {
      if (dto.agreedRentAmountRupiah != null) {
        throw new ForbiddenException(
          'Staf tidak boleh override harga sewa. Biaya akan dihitung dari tarif kamar.',
        );
      }
      if (dto.electricityTariffPerKwhRupiah != null) {
        throw new ForbiddenException(
          'Staf tidak boleh override tarif listrik. Gunakan tarif default kamar.',
        );
      }
      if (dto.waterTariffPerM3Rupiah != null) {
        throw new ForbiddenException(
          'Staf tidak boleh override tarif air. Gunakan tarif default kamar.',
        );
      }
    }

    // F3-17: gate aktivasi kamar — bila KTP_ACTIVATION_GATE_ENABLED=true, tenant
    // wajib KTP terverifikasi sebelum check-in. Default OFF agar tak mengganggu
    // alur sampai onboarding KTP terpasang penuh; owner aktifkan saat siap.
    if (
      String(process.env.KTP_ACTIVATION_GATE_ENABLED ?? "false").toLowerCase() === "true" &&
      (tenant as { ktpVerifiedAt: Date | null }).ktpVerifiedAt == null
    ) {
      throw new ConflictException(
        "KTP tenant belum diverifikasi. Unggah & verifikasi KTP sebelum aktivasi kamar (gate UU PDP/onboarding).",
      );
    }

    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
    });
    if (!room) throw new NotFoundException("Kamar tidak ditemukan");

    // V-03: booking stay (RESERVED, unpromoted) tidak dianggap sebagai "stay aktif" untuk gate ini
    const existingTenantStay = await this.prisma.stay.findFirst({
      where: {
        tenantId: dto.tenantId,
        status: StayStatus.ACTIVE,
        initialMetersPromotedAt: { not: null },
      },
    });
    if (existingTenantStay) {
      throw new ConflictException("Tenant masih memiliki stay aktif");
    }

    // Check-in hanya untuk kamar AVAILABLE (booking walk-in) atau RESERVED (tenant
    // sudah bayar lunas). BOOKING (baru DP) belum boleh check-in — tunggu pelunasan.
    if (![RoomStatus.AVAILABLE, RoomStatus.RESERVED].includes(room.status as RoomStatus)) {
      throw new ConflictException(
        room.status === RoomStatus.MAINTENANCE
          ? "Kamar masih berstatus Perlu Dicek (belum lolos inspeksi checkout). Selesaikan tiket inspeksi sampai kamar AVAILABLE sebelum check-in."
          : "Kamar tidak tersedia untuk check-in (sedang ditempati, atau nonaktif)",
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
      dto.agreedRentAmountRupiah ?? calculateRentByPricingTerm(Number(room.monthlyRateRupiah ?? 0), dto.pricingTerm);
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
        // V-03: RESERVED diterima untuk aktivasi booking (cek pembayaran di bawah)
        if (![RoomStatus.AVAILABLE, RoomStatus.RESERVED].includes(lockedRoom.status as RoomStatus)) {
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

        // V-03: Room RESERVED = aktivasi booking (stay sudah ada)
        let stay: { id: number };
        let returnInvoice: { id: number } | undefined;
        if (lockedRoom.status === RoomStatus.RESERVED) {
          const bookingStay = await tx.stay.findFirst({
            where: {
              roomId: dto.roomId,
              status: StayStatus.ACTIVE,
              initialMetersPromotedAt: null,
            },
            select: {
              id: true,
              depositAmountRupiah: true,
              depositPaidAmountRupiah: true,
              initialElectricityKwhPending: true,
              initialWaterM3Pending: true,
              checkInDate: true,
              roomId: true,
            },
          });
          if (!bookingStay) {
            throw new ConflictException('Tidak ada booking aktif untuk kamar ini.');
          }

          // Verifikasi invoice sewa awal sudah LUNAS
          const initialInvoice = await tx.invoice.findFirst({
            where: { stayId: bookingStay.id },
            select: { id: true, status: true, totalAmountRupiah: true },
            orderBy: { id: 'asc' },
          });
          if (!initialInvoice || initialInvoice.status !== InvoiceStatus.PAID) {
            throw new ConflictException(
              'Invoice sewa awal belum LUNAS. Tenant hanya bayar DP — belum bisa check-in. Setujui pelunasan terlebih dahulu.',
            );
          }

          // V-03: promote stay — tandai sebagai resmi huni
          await tx.stay.update({
            where: { id: bookingStay.id },
            data: { initialMetersPromotedAt: new Date() },
          });

          // TEMUAN-2: promote pending meter snapshot ke MeterReading saat check-in
          // (pemindahan dari payment-submissions.service.ts)
          const baselineDateBooking = startOfDay(new Date(dto.checkInDate));

          if (bookingStay.initialElectricityKwhPending != null) {
            const existingElec = await tx.meterReading.findFirst({
              where: {
                roomId: dto.roomId,
                utilityType: UtilityType.ELECTRICITY,
                readingAt: baselineDateBooking,
              },
              select: { id: true },
            });
            if (!existingElec) {
              await tx.meterReading.create({
                data: {
                  roomId: dto.roomId,
                  utilityType: UtilityType.ELECTRICITY,
                  readingAt: baselineDateBooking,
                  readingValue: bookingStay.initialElectricityKwhPending,
                  recordedById: actor.id,
                  note: 'Meter awal dipromote dari pending booking saat check-in.',
                },
              });
            } else {
              this.logger.warn(
                `TEMUAN-2: skip meter LISTRIK stay #${bookingStay.id} — sudah ada reading di ${baselineDateBooking.toISOString().slice(0, 10)}`,
              );
            }
          }

          if (bookingStay.initialWaterM3Pending != null) {
            const existingWater = await tx.meterReading.findFirst({
              where: {
                roomId: dto.roomId,
                utilityType: UtilityType.WATER,
                readingAt: baselineDateBooking,
              },
              select: { id: true },
            });
            if (!existingWater) {
              await tx.meterReading.create({
                data: {
                  roomId: dto.roomId,
                  utilityType: UtilityType.WATER,
                  readingAt: baselineDateBooking,
                  readingValue: bookingStay.initialWaterM3Pending,
                  recordedById: actor.id,
                  note: 'Meter awal dipromote dari pending booking saat check-in.',
                },
              });
            } else {
              this.logger.warn(
                `TEMUAN-2: skip meter AIR stay #${bookingStay.id} — sudah ada reading di ${baselineDateBooking.toISOString().slice(0, 10)}`,
              );
            }
          }

          // Clear pending fields setelah dipromote
          await tx.stay.update({
            where: { id: bookingStay.id },
            data: {
              initialElectricityKwhPending: null,
              initialWaterM3Pending: null,
              initialMetersRecordedAt: null,
              initialMetersRecordedById: null,
            },
          });

          returnInvoice = initialInvoice;
          stay = bookingStay;
        } else {
          // Walk-in: buat stay baru
          stay = await tx.stay.create({
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
              initialMetersPromotedAt: new Date(),
            },
          });
        }

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

        // TEMUAN-1: booking activation sudah punya invoice sewa — jangan buat baru
        if (lockedRoom.status !== RoomStatus.RESERVED) {
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
          returnInvoice = issuedInvoice;

          // Walk-in: buat MeterReading baseline dari DTO (booking activation sudah promote di atas)
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
        }

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

        return { stay, invoice: returnInvoice };
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
      // M5.1: meter listrik/air PASCABAYAR → catat meter final sebelum kamar
      // lepas. Bila kamar punya riwayat meter listrik tapi belum ada catatan
      // tertanggal >= hari checkout, blokir agar pemakaian akhir tidak luput
      // ditagih (reuse MeterCycleModal: catat angka yang sama bila 0 pemakaian).
      const meteredHistory = await tx.meterReading.findFirst({
        where: { roomId: existing.roomId, utilityType: UtilityType.ELECTRICITY },
        select: { id: true },
      });
      if (meteredHistory) {
        const finalReading = await tx.meterReading.findFirst({
          where: {
            roomId: existing.roomId,
            utilityType: UtilityType.ELECTRICITY,
            readingAt: { gte: startOfJakartaBusinessDay(actualCheckOutDate) },
          },
          select: { id: true },
        });
        if (!finalReading) {
          throw new ConflictException(
            "Catat meter listrik final (tanggal ≥ tanggal checkout) dulu sebelum final checkout. Bila tidak ada pemakaian, catat angka meter terakhir yang sama (0 pemakaian, tanpa tagihan).",
          );
        }
      }

      // Tagihan meter (listrik/air) PASCABAYAR boleh tersisa OPEN: nanti dipotong
      // dari deposit jaminan saat Proses Deposit (M5.3). Tagihan lain (sewa, dll)
      // tetap WAJIB lunas/batal sebelum kamar lepas.
      const openInvoices = await tx.invoice.findMany({
        where: {
          stayId: id,
          status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          lines: { select: { lineType: true } },
        },
        orderBy: { id: "asc" },
      });
      const blockingInvoices = openInvoices.filter((inv) => !isMeterInvoice(inv));

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
          // F3-15: batas pengambilan barang = checkout + 30 hari (status PENDING).
          belongingsDeadline: new Date(
            actualCheckOutDate.getTime() + 30 * 24 * 60 * 60 * 1000,
          ),
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

      // Biaya kerusakan/penalti: buat invoice PENALTY setelah stay COMPLETED
      // agar tidak memblokir checkout. Invoice otomatis disettle via processDeposit.
      const damageChargeRupiah = dto.damageChargeRupiah ?? 0;
      if (damageChargeRupiah > 0) {
        const damageNote = (dto.damageNote ?? "Biaya kerusakan/penalti").trim();
        const damageInvNumber = `INV-${stay.id}-DMG-${Date.now().toString().slice(-6)}`;
        const damageInvoice = await tx.invoice.create({
          data: {
            invoiceNumber: damageInvNumber,
            stayId: stay.id,
            status: InvoiceStatus.DRAFT,
            periodStart: actualCheckOutDate,
            periodEnd: actualCheckOutDate,
            dueDate: actualCheckOutDate,
            notes: `Denda kerusakan: ${damageNote}`,
            createdById: actor.id,
          },
        });
        await tx.invoiceLine.create({
          data: {
            invoiceId: damageInvoice.id,
            lineType: InvoiceLineType.PENALTY as any,
            description: damageNote,
            qty: 1,
            unit: "paket",
            unitPriceRupiah: damageChargeRupiah,
            lineAmountRupiah: damageChargeRupiah,
            sortOrder: 0,
          },
        });
        await tx.invoice.update({
          where: { id: damageInvoice.id },
          data: {
            totalAmountRupiah: damageChargeRupiah,
            status: InvoiceStatus.ISSUED,
            issuedAt: new Date(),
          },
        });
        // best-effort journal — kegagalan tak menggagalkan checkout
        await this.accountingPosting
          .postInvoiceIssuedTx(tx, damageInvoice.id, actor.id)
          .catch((err) => {
            this.logger.warn(
              `Auto Journal Lite gagal untuk invoice denda #${damageInvoice.id}: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
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
          const staffAssignee = await pickRoundRobinStaffTx(tx); // F5-3: round-robin tiket sistem
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
              assignedToId: staffAssignee ?? null,
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

    // F3-17 (UU PDP): hapus foto KTP saat tenant keluar bila tak punya stay aktif
    // lain. Best-effort di luar tx (file IO) — kegagalan tak menggagalkan checkout.
    await this.cleanupTenantKtpOnCheckout(existing.tenantId, id).catch((err) =>
      this.logger.warn(
        `PDP cleanup KTP tenant #${existing.tenantId} gagal: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );

    return normalizeStayForResponse({
      ...updated,
      roomStatusAfterSync: "MAINTENANCE",
      roomReadinessAfterCheckout: "NEEDS_INSPECTION",
    });
  }

  // F3-14/F3-16: paksa-checkout admin (overstay nunggak / tenant kabur). Deposit
  // menutup tunggakan (AR), sisa TETAP jadi piutang AR; kelebihan deposit di-refund.
  // OWNER-only. Guard deposit di-bypass khusus tx ini via GUC sesi-transaksi.
  async forcedCheckout(id: number, dto: ForcedCheckoutDto, actor: CurrentUserPayload) {
    assertCoreLifecycleActor(actor, "Forced checkout");
    const actualCheckOutDate = dto.actualCheckOutDate
      ? parseJakartaDateOnly(dto.actualCheckOutDate, "Tanggal checkout final tidak valid")
      : startOfJakartaBusinessDay(new Date());
    const note = dto.note?.trim() || `Forced checkout admin (${dto.reason})`;

    const result = await this.prisma.$transaction(async (tx) => {
      // Carve-out guard deposit HANYA untuk transaksi ini (auto-reset saat commit).
      await tx.$executeRawUnsafe(`SET LOCAL "app.allow_deposit_with_open_invoices" = 'on'`);

      const stay = await tx.stay.findUnique({ where: { id } });
      if (!stay) throw new NotFoundException("Stay tidak ditemukan");
      if (stay.status !== StayStatus.ACTIVE)
        throw new ConflictException("Hanya stay ACTIVE yang bisa di-forced-checkout");
      if (!stay.initialMetersPromotedAt)
        throw new ConflictException(
          "Forced checkout hanya untuk penghuni aktif (sudah promoted). Booking belum huni: gunakan pembatalan.",
        );
      if (stay.depositStatus !== DepositStatus.HELD)
        throw new ConflictException("Deposit sudah diproses sebelumnya.");

      const depositAmount = Number(stay.depositAmountRupiah ?? 0);
      const depositHeld = Number(stay.depositPaidAmountRupiah ?? 0);
      // Constraint deposit memakai depositAmountRupiah; settlement bersih hanya saat
      // deposit dibayar penuh. Deposit parsial → proses manual (hindari langgar CHECK).
      if (depositHeld > 0 && depositHeld !== depositAmount) {
        throw new ConflictException(
          "Deposit dibayar parsial — selesaikan lewat Proses Deposit manual, bukan forced checkout.",
        );
      }

      // 1. Batalkan invoice DRAFT (tanpa jurnal).
      await tx.invoice.updateMany({
        where: { stayId: id, status: InvoiceStatus.DRAFT },
        data: { status: InvoiceStatus.CANCELLED, cancelReason: note },
      });

      // 2. Outstanding = Σ sisa (total − Σ pembayaran) invoice ISSUED/PARTIAL.
      const openInvoices = await tx.invoice.findMany({
        where: { stayId: id, status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] } },
        select: { id: true, totalAmountRupiah: true, payments: { select: { amountRupiah: true } } },
        orderBy: { id: "asc" },
      });
      const withRemaining = openInvoices
        .map((inv) => {
          const paid = inv.payments.reduce((s, p) => s + Number(p.amountRupiah), 0);
          return { id: inv.id, remaining: Math.max(0, Number(inv.totalAmountRupiah) - paid) };
        })
        .filter((x) => x.remaining > 0);
      const outstanding = withRemaining.reduce((s, x) => s + x.remaining, 0);

      const applied = Math.min(outstanding, depositHeld);
      const excess = depositHeld - applied;
      const shortfall = outstanding - applied;

      // 3. Jurnal settlement deposit DULU (DR 2000 / CR 1100 applied / CR kas excess).
      //    Bila penerimaan deposit tak pernah terjurnal (F-24), settlement di-skip —
      //    jangan setengah-terapkan (tolak agar tak ada state tak konsisten).
      let depositSettlement: any = null;
      if (depositHeld > 0) {
        depositSettlement = await this.accountingPosting.postForcedCheckoutDepositSettlementTx(
          tx,
          id,
          applied,
          excess,
          actor.id,
        );
        if (!depositSettlement?.posted) {
          throw new ConflictException(
            `Settlement deposit gagal/di-skip (${depositSettlement?.reason ?? 'penerimaan deposit belum terjurnal'}). Perbaiki jurnal penerimaan deposit atau proses manual; forced-checkout dibatalkan agar buku tetap konsisten.`,
          );
        }
      }

      // 4. Terapkan deposit ke invoice (oldest first) — pembayaran NON-KAS (method
      //    OTHER + catatan); AR sudah di-clear lewat jurnal offset di atas.
      let left = applied;
      for (const inv of withRemaining) {
        if (left <= 0) break;
        const cover = Math.min(inv.remaining, left);
        await tx.invoicePayment.create({
          data: {
            invoiceId: inv.id,
            paymentDate: actualCheckOutDate,
            amountRupiah: cover,
            method: PaymentMethod.OTHER,
            note: `Potongan deposit (forced checkout ${dto.reason})`,
            capturedById: actor.id,
          },
        });
        await tx.invoice.update({
          where: { id: inv.id },
          data:
            cover >= inv.remaining
              ? { status: InvoiceStatus.PAID, paidAt: new Date() }
              : { status: InvoiceStatus.PARTIAL },
        });
        left -= cover;
      }

      // 5. Tentukan status deposit (patuh stay_deposit_status_consistency_chk).
      let depositPatch: any = {};
      if (depositHeld > 0) {
        if (applied === 0) {
          depositPatch = {
            depositStatus: DepositStatus.REFUNDED,
            depositDeductionRupiah: 0,
            depositRefundedRupiah: excess,
            depositRefundedAt: new Date(),
          };
        } else if (excess === 0) {
          depositPatch = {
            depositStatus: DepositStatus.FORFEITED,
            depositDeductionRupiah: applied, // == depositAmount (dijaga di atas)
            depositRefundedRupiah: 0,
            depositRefundedAt: null,
          };
        } else {
          depositPatch = {
            depositStatus: DepositStatus.PARTIALLY_REFUNDED,
            depositDeductionRupiah: applied,
            depositRefundedRupiah: excess,
            depositRefundedAt: new Date(),
          };
        }
      }

      // 6. Update stay: COMPLETED + fled (jika kabur) + belongings + deposit + alasan.
      const updateRes = await tx.stay.updateMany({
        where: { id, status: StayStatus.ACTIVE },
        data: {
          status: StayStatus.COMPLETED,
          actualCheckOutDate,
          checkoutReason: note,
          depositNote: note,
          belongingsDeadline: new Date(actualCheckOutDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          ...(dto.reason === "TENANT_KABUR"
            ? { fledMarkedAt: new Date(), fledMarkedById: actor.id, fledReason: note }
            : {}),
          ...depositPatch,
        },
      });
      if (updateRes.count !== 1)
        throw new ConflictException("Status stay berubah saat diproses. Muat ulang.");

      // 7. Kamar → MAINTENANCE + tiket inspeksi (dedupe).
      const otherActive = await tx.stay.count({
        where: { roomId: stay.roomId, status: StayStatus.ACTIVE, id: { not: id } },
      });
      if (otherActive === 0) {
        await tx.room.update({
          where: { id: stay.roomId },
          data: { status: RoomStatus.MAINTENANCE, allowBookingWhileCleaning: true },
        });
        const existingInspection = await tx.ticket.findFirst({
          where: { stayId: id, roomId: stay.roomId, category: "CHECKOUT_INSPECTION" },
          select: { id: true },
        });
        if (!existingInspection) {
          const staffAssignee = await pickRoundRobinStaffTx(tx); // F5-3: round-robin tiket sistem
          const roomInfo = await tx.room.findUnique({
            where: { id: stay.roomId },
            select: { code: true, name: true },
          });
          const roomLabel = roomInfo?.code || roomInfo?.name || `Kamar #${stay.roomId}`;
          const baseTicketNumber = `TIC-${new Date().getFullYear()}-CHK-${id}`;
          let ticketNumber = baseTicketNumber;
          let suffix = 1;
          while (await tx.ticket.findUnique({ where: { ticketNumber }, select: { id: true } })) {
            suffix += 1;
            ticketNumber = `${baseTicketNumber}-${suffix}`;
          }
          await tx.ticket.create({
            data: {
              ticketNumber,
              tenantId: stay.tenantId,
              roomId: stay.roomId,
              stayId: id,
              title: `Cek kamar pasca forced-checkout - ${roomLabel}`,
              description: [
                `Kamar ${roomLabel} di-forced-checkout admin (alasan: ${dto.reason}).`,
                "Keluarkan & amankan barang tenant, bersihkan, cek inventaris & kerusakan, foto kondisi akhir.",
                "Barang tenant dilacak 30 hari (ABANDONED otomatis bila tak diambil).",
              ].join("\n"),
              category: "CHECKOUT_INSPECTION",
              assignedToId: staffAssignee ?? null,
            },
          });
        }
      }

      // 8. Ledger deposit (reconciliation) — baca field deduction/refund yang baru diset.
      let depositLedgerResult: any = null;
      if (depositHeld > 0) {
        depositLedgerResult = await this.depositLedger.recordDepositSettlementTx(tx, {
          stayId: id,
          actorUserId: actor.id,
          note,
          metadata: { action: "FORCED_CHECKOUT", reason: dto.reason, appliedToArRupiah: applied },
        });
      }

      const finalStay = await tx.stay.findUnique({ where: { id } });
      return {
        stay: finalStay,
        outstanding,
        depositHeld,
        appliedToArRupiah: applied,
        refundedRupiah: excess,
        shortfallRemainingArRupiah: shortfall,
        depositSettlement,
        depositLedger: depositLedgerResult,
      };
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: "FORCED_CHECKOUT",
      entityType: "Stay",
      entityId: String(id),
      newData: {
        reason: dto.reason,
        appliedToArRupiah: result.appliedToArRupiah,
        refundedRupiah: result.refundedRupiah,
        shortfallRemainingArRupiah: result.shortfallRemainingArRupiah,
      },
    });

    // PDP: hapus KTP pasca-checkout bila tak ada stay aktif lain (best-effort).
    await this.cleanupTenantKtpOnCheckout(result.stay!.tenantId, id).catch((err) =>
      this.logger.warn(
        `PDP cleanup KTP (forced-checkout) tenant #${result.stay!.tenantId} gagal: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );

    return normalizeStayForResponse({ ...result.stay, forcedCheckout: { ...result, stay: undefined } });
  }

  // F3-17 (UU PDP): hapus foto KTP saat tenant checkout & tak punya stay aktif lain.
  private async cleanupTenantKtpOnCheckout(tenantId: number, completedStayId: number) {
    const otherActive = await this.prisma.stay.count({
      where: { tenantId, status: StayStatus.ACTIVE, id: { not: completedStayId } },
    });
    if (otherActive > 0) return; // tenant masih huni kamar lain → simpan KTP

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ktpImageFileKey: true },
    });
    if (!tenant?.ktpImageFileKey) return;

    deleteFileSafe(join(process.cwd(), "uploads", "ktp-images", tenant.ktpImageFileKey));
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ktpImageUrl: null,
        ktpImageFileKey: null,
        ktpImageOriginalFilename: null,
        ktpImageMimeType: null,
        ktpImageFileSizeBytes: null,
        ktpVerifiedAt: null,
        ktpVerifiedById: null,
        ktpDeletedAt: new Date(),
      },
    });
    this.logger.log(`PDP: foto KTP tenant #${tenantId} dihapus otomatis pasca-checkout.`);
  }

  // F3-15: admin menandai barang tenant pasca-checkout (diambil=CLAIMED atau
  // dinyatakan ditinggal=ABANDONED). Menghentikan/menyatakan jam abandonment.
  async markBelongings(id: number, dto: MarkBelongingsDto, actor: CurrentUserPayload) {
    const stay = await this.prisma.stay.findUnique({
      where: { id },
      select: { id: true, status: true, belongingsStatus: true, notes: true },
    });
    if (!stay) throw new NotFoundException("Stay tidak ditemukan");
    if (stay.status !== StayStatus.COMPLETED) {
      throw new ConflictException(
        "Catatan barang hanya berlaku untuk stay yang sudah checkout (COMPLETED).",
      );
    }
    const updated = await this.prisma.stay.update({
      where: { id },
      data: {
        belongingsStatus: dto.status as any,
        belongingsResolvedAt: new Date(),
        ...(dto.note
          ? { notes: [stay.notes, `Barang (${dto.status}): ${dto.note}`].filter(Boolean).join("\n") }
          : {}),
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: "MARK_BELONGINGS",
      entityType: "Stay",
      entityId: String(id),
      oldData: { belongingsStatus: stay.belongingsStatus },
      newData: { belongingsStatus: dto.status },
    });
    return updated;
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
      // DP hangus jika booking belum promoted (belum check-in) dan DP sudah dibayar.
      // Untuk stay yang sudah promoted, DP sudah diserap ke invoice pertama.
      const dpPaid = Number((existing as any).downPaymentPaidRupiah ?? 0);
      const shouldForfeitDp = dpPaid > 0 && !(existing as any).downPaymentForfeitedAt && !existing.initialMetersPromotedAt;

      const updateData: Prisma.StayUpdateInput = {
        status: StayStatus.CANCELLED,
        checkoutReason: dto.cancelReason,
        notes: dto.notes ?? existing.notes,
        ...(shouldForfeitDp ? { downPaymentForfeitedAt: new Date() } : {}),
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

      // Hanguskan DP secara akuntansi (jurnal DR Kas / CR Pendapatan-DP-hangus)
      // jika booking belum check-in dan DP sudah terbayar — selaras dengan sweeper.
      if (shouldForfeitDp) {
        const forfeitResult = await this.accountingPosting.postDownPaymentForfeitTx(
          tx,
          id,
          dpPaid,
          actor.id,
        );
        if (forfeitResult?.skipped && !(forfeitResult as any)?.journalEntry && !(forfeitResult as any)?.benign) {
          throw new ConflictException(
            `Pembatalan gagal: jurnal hangus DP tidak berhasil (${(forfeitResult as any)?.reason ?? 'alasan tidak diketahui'}).`,
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
          const staffAssignee = await pickRoundRobinStaffTx(tx); // F5-3: round-robin tiket sistem
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
              assignedToId: staffAssignee ?? null,
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
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmountRupiah: true,
          lines: { select: { lineType: true } },
          payments: { select: { amountRupiah: true } },
        },
        orderBy: { id: "asc" },
      });
      // Q5: selaraskan dengan forced checkout — deposit auto-cover SEMUA invoice
      // terbuka (meter + non-meter), oldest-first. Tidak lagi memblokir non-meter.
      const allOpen = openInvoices; // sudah termasuk meter + non-meter
      if (allOpen.length > 0) {
        return await this.settleDepositAgainstOpenInvoicesTx(tx, {
          stay,
          settlementAmount,
          openInvoices: allOpen,
          actorId: actor.id,
          actorNote: dto.depositNote?.trim() || undefined,
        });
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

  /**
   * Q5: settlement deposit saat ada invoice OPEN. Deposit jaminan menutup
   * invoice terbuka (DR 2000 / CR 1100), sisa di-refund kas,
   * kekurangan TETAP jadi piutang AR. Reuse jurnal forced-checkout (F3-16);
   * input refund/forfeit manual diabaikan (netting otomatis demi buku konsisten).
   * Dipanggil DI DALAM tx processDeposit; mengembalikan bentuk yang sama.
   */
  private async settleDepositAgainstOpenInvoicesTx(
    tx: Prisma.TransactionClient,
    params: {
      stay: {
        id: number;
        depositAmountRupiah: number | null;
        actualCheckOutDate: Date | null;
      };
      settlementAmount: number;
      openInvoices: Array<{
        id: number;
        invoiceNumber: string | null;
        totalAmountRupiah: number | null;
        payments: Array<{ amountRupiah: number | Prisma.Decimal | null }>;
      }>;
      actorId: number;
      actorNote?: string;
    },
  ) {
    const { stay, settlementAmount, openInvoices, actorId } = params;
    const id = stay.id;

    // Carve-out guard deposit HANYA untuk transaksi ini (auto-reset saat commit):
    // izinkan deposit diproses meski invoice masih open (akan ditutup deposit).
    await (tx as any).$executeRawUnsafe(
      `SET LOCAL "app.allow_deposit_with_open_invoices" = 'on'`,
    );

    // Constraint deposit memakai depositAmountRupiah; netting bersih hanya saat
    // deposit dibayar penuh (settlementAmount = depositPaidAmount = depositAmount).
    const depositAmount = Number(stay.depositAmountRupiah ?? 0);
    if (settlementAmount !== depositAmount) {
      throw new ConflictException(
        "Deposit dibayar parsial - selesaikan invoice terbuka & deposit lewat proses manual, bukan pemotongan otomatis.",
      );
    }

    const invoiceDue = openInvoices.reduce(
      (sum, inv) => sum + invoiceRemainingRupiah(inv),
      0,
    );
    const { applied, excess, shortfall } = computeInvoiceDepositSettlement({
      invoiceDueRupiah: invoiceDue,
      depositHeldRupiah: settlementAmount,
    });

    const note =
      params.actorNote ||
      `Potong deposit untuk invoice terbuka checkout (total invoice Rp${invoiceDue.toLocaleString("id-ID")})`;

    // 1. Jurnal settlement deposit DULU (DR 2000 / CR 1100 applied / CR kas excess).
    //    Bila penerimaan deposit tak pernah terjurnal (F-24), tolak agar konsisten.
    const depositSettlement =
      await this.accountingPosting.postForcedCheckoutDepositSettlementTx(
        tx,
        id,
        applied,
        excess,
        actorId,
      );
    if (!depositSettlement?.posted) {
      throw new ConflictException(
        `Settlement deposit gagal/di-skip (${depositSettlement?.reason ?? "penerimaan deposit belum terjurnal"}). Perbaiki jurnal penerimaan deposit atau proses manual.`,
      );
    }

    // 2. Terapkan deposit ke invoice terbuka (oldest first) - pembayaran NON-KAS
    //    (method OTHER); AR sudah di-clear lewat jurnal offset di atas.
    const paymentDate = stay.actualCheckOutDate ?? new Date();
    let left = applied;
    for (const inv of openInvoices) {
      if (left <= 0) break;
      const remaining = invoiceRemainingRupiah(inv);
      if (remaining <= 0) continue;
      const cover = Math.min(remaining, left);
      await tx.invoicePayment.create({
        data: {
          invoiceId: inv.id,
          paymentDate,
          amountRupiah: cover,
          method: PaymentMethod.OTHER,
          note: "Potongan deposit untuk invoice terbuka saat checkout",
          capturedById: actorId,
        },
      });
      await tx.invoice.update({
        where: { id: inv.id },
        data:
          cover >= remaining
            ? { status: InvoiceStatus.PAID, paidAt: new Date() }
            : { status: InvoiceStatus.PARTIAL },
      });
      left -= cover;
    }

    // 3. Status deposit (patuh stay_deposit_status_consistency_chk vs depositAmount).
    let depositPatch: Prisma.StayUpdateManyMutationInput;
    if (applied === 0) {
      depositPatch = {
        depositStatus: DepositStatus.REFUNDED,
        depositDeductionRupiah: 0,
        depositRefundedRupiah: excess,
        depositRefundedAt: new Date(),
      };
    } else if (excess === 0) {
      depositPatch = {
        depositStatus: DepositStatus.FORFEITED,
        depositDeductionRupiah: applied, // == depositAmount (dijaga di atas)
        depositRefundedRupiah: 0,
        depositRefundedAt: null,
      };
    } else {
      depositPatch = {
        depositStatus: DepositStatus.PARTIALLY_REFUNDED,
        depositDeductionRupiah: applied,
        depositRefundedRupiah: excess,
        depositRefundedAt: new Date(),
      };
    }

    const updateResult = await tx.stay.updateMany({
      where: {
        id,
        status: { in: [StayStatus.COMPLETED, StayStatus.CANCELLED] },
        depositStatus: DepositStatus.HELD,
      },
      data: { ...depositPatch, depositNote: note },
    });
    if (updateResult.count !== 1) {
      throw new ConflictException(
        "Deposit sudah diproses atau status masa sewa berubah. Muat ulang halaman.",
      );
    }

    const result = await tx.stay.findUnique({ where: { id } });
    if (!result)
      throw new NotFoundException("Stay tidak ditemukan setelah proses deposit");

    const ledger = await this.depositLedger.recordDepositSettlementTx(tx, {
      stayId: id,
      actorUserId: actorId,
      note,
      metadata: {
        action: "OPEN_INVOICE_SETTLEMENT",
        settlementAmountRupiah: settlementAmount,
        invoiceDueRupiah: invoiceDue,
        appliedToInvoiceArRupiah: applied,
        refundedRupiah: excess,
        shortfallRemainingArRupiah: shortfall,
      },
    });

    return {
      ...result,
      depositSettlement: {
        accounting: depositSettlement,
        ledger,
        settlementAmountRupiah: settlementAmount,
        openInvoiceSettlement: {
          invoiceDueRupiah: invoiceDue,
          appliedToInvoiceArRupiah: applied,
          refundedRupiah: excess,
          shortfallRemainingArRupiah: shortfall,
        },
      },
    };
  }

  async renewStay(id: number, dto: RenewStayDto, actor: CurrentUserPayload) {
    return this.staysRenewalService.renewStay(id, dto, actor);
  }

  async issueRenewalDownPaymentInvoiceTx(
    tx: Prisma.TransactionClient,
    stayId: number,
    downPaymentRupiah: number,
    actor: CurrentUserPayload,
  ) {
    return this.staysRenewalService.issueRenewalDownPaymentInvoiceTx(tx, stayId, downPaymentRupiah, actor);
  }

  async prepareRenewalSettlementInTransaction(
    tx: Prisma.TransactionClient,
    id: number,
    dto: RenewStayDto,
    actor: CurrentUserPayload,
    settlementDueDate?: Date | null,
  ) {
    return this.staysRenewalService.prepareRenewalSettlementInTransaction(tx, id, dto, actor, settlementDueDate);
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
    return this.staysRenewalService.finalizePreparedRenewalInTransaction(tx, params, actor);
  }

  async cancelUnpaidRenewalInvoiceInTransaction(
    tx: Prisma.TransactionClient,
    invoiceId: number,
    actorUserId: number,
    reason: string,
  ) {
    return this.staysRenewalService.cancelUnpaidRenewalInvoiceInTransaction(tx, invoiceId, actorUserId, reason);
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
