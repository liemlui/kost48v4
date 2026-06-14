import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import {
  BookingDepositPaymentStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentSubmissionStatus,
  PaymentSubmissionTargetType,
  RoomStatus,
  StayStatus,
  UtilityType,
} from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { serializePrismaResult } from '../../common/utils/serialization';
import { PrismaService } from '../../prisma/prisma.service';
import { AppNotificationService } from '../notifications/app-notification.service';
import { AccountingPostingService } from '../accounting/accounting-posting.service';
import { DepositLedgerService } from '../deposit-ledger/deposit-ledger.service';
import { AUTO_OPS_DEADLINES } from '../../common/business/auto-ops.constants';
import { calculatePeriodEnd } from '../stays/stays.helpers';
import { UserRole } from '../../common/enums/app.enums';
import { releaseRoomAfterBookingCancelTx } from '../../common/utils/room-booking.util';
import { CreatePaymentSubmissionDto } from './dto/create-payment-submission.dto';
import { ReviewQueueQueryDto } from './dto/review-queue-query.dto';
import {
  SubmissionDetail,
  SubmissionLockRow,
  mapSubmissionFromPrisma,
  buildApprovalPaymentNote,
  parseDateOnly,
  endOfDay,
} from './payment-submissions.helpers';

@Injectable()
export class PaymentSubmissionsService {
  private readonly logger = new Logger(PaymentSubmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appNotificationService: AppNotificationService,
    private readonly accountingPosting: AccountingPostingService,
    private readonly depositLedger: DepositLedgerService,
  ) {}

  async createSubmission(user: CurrentUserPayload, dto: CreatePaymentSubmissionDto) {
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new ConflictException('Akun tenant belum terhubung ke data tenant');
    }

    const paidAt = parseDateOnly(dto.paidAt, 'Tanggal bayar tidak valid');
    if (paidAt > endOfDay(new Date())) {
      throw new BadRequestException('Tanggal bayar tidak boleh di masa depan');
    }

    try {
      const eligibility = await this.findEligibleSubmissionTarget(tenantId, dto.stayId, dto.invoiceId);
      if (!eligibility) {
        throw new NotFoundException('Booking atau invoice tidak ditemukan');
      }
      await this.assertRenewalPaymentWithinDeadline(this.prisma, dto.invoiceId, paidAt);

      if (eligibility.stayStatus !== StayStatus.ACTIVE) {
        throw new ConflictException('Booking tidak lagi aktif');
      }

      const isBookingPath = eligibility.roomStatus === RoomStatus.RESERVED;

      if (isBookingPath) {
        // ── Booking combined payment (RESERVED) ──────────────────────────
        if (eligibility.invoiceStatus === InvoiceStatus.DRAFT) {
          // Audit A10: tanpa guard ini bukti bayar bisa masuk untuk invoice DRAFT
          // yang pasti gagal di-approve (:350) dan menggantung sampai expiry.
          throw new ConflictException('Invoice ini masih dalam status draft dan belum dapat menerima pembayaran');
        }
        if ([InvoiceStatus.PAID, InvoiceStatus.CANCELLED].includes(eligibility.invoiceStatus as InvoiceStatus)) {
          throw new ConflictException('Invoice ini tidak dapat menerima bukti pembayaran baru');
        }

        // expiresAt (SLA 3 jam) hanya berlaku sebelum DP masuk; setelah DP
        // disetujui, kamar terkunci sampai deadline pelunasan H+1 check-in (A18).
        const dpPaidSoFar = eligibility.stayDownPaymentPaidRupiah ?? 0;
        if (
          dpPaidSoFar <= 0 &&
          eligibility.stayExpiresAt &&
          new Date(eligibility.stayExpiresAt) < new Date()
        ) {
          throw new ConflictException('Booking sudah kedaluwarsa dan tidak dapat menerima bukti pembayaran');
        }

        const invoiceRemaining = Math.max(
          eligibility.invoiceTotalAmountRupiah - eligibility.invoicePaidAmountRupiah,
          0,
        );

        // Deposit = uang jaminan (refundable, dicek saat checkout).
        const depositRemaining = Math.max(
          (eligibility.stayDepositAmountRupiah ?? 0) - (eligibility.stayDepositPaidAmountRupiah ?? 0),
          0,
        );

        // DP = uang muka pesan kamar (bagian harga sewa, non-refundable).
        const downPaymentRemaining = Math.max(
          (eligibility.stayDownPaymentAmountRupiah ?? 0) - (eligibility.stayDownPaymentPaidRupiah ?? 0),
          0,
        );

        // Pelunasan = sisa sewa + jaminan. (Sebelum DP dibayar, ini = sewa penuh + jaminan.)
        const settlementAmount = invoiceRemaining + depositRemaining;

        if (settlementAmount <= 0) {
          throw new ConflictException('Pembayaran awal (sewa + deposit jaminan) sudah lunas');
        }

        // A18: dua nominal yang sah — DP 30% (kunci kamar) atau pelunasan sekaligus.
        const isDownPaymentAmount = downPaymentRemaining > 0 && dto.amountRupiah === downPaymentRemaining;
        const isSettlementAmount = dto.amountRupiah === settlementAmount;

        if (!isDownPaymentAmount && !isSettlementAmount) {
          const accepted = [
            downPaymentRemaining > 0 && downPaymentRemaining !== settlementAmount
              ? `DP Rp ${downPaymentRemaining.toLocaleString('id-ID')}`
              : null,
            `pelunasan Rp ${settlementAmount.toLocaleString('id-ID')} (sisa sewa + deposit jaminan)`,
          ]
            .filter(Boolean)
            .join(' atau ');
          throw new ConflictException(`Nominal pembayaran harus tepat: ${accepted}.`);
        }
      } else {
        // ── Invoice-only payment (OCCUPIED / manual check-in / renewal) ──
        if (eligibility.invoiceStatus === InvoiceStatus.DRAFT) {
          throw new ConflictException('Invoice ini masih dalam status draft dan belum dapat menerima pembayaran');
        }

        if ([InvoiceStatus.PAID, InvoiceStatus.CANCELLED].includes(eligibility.invoiceStatus as InvoiceStatus)) {
          throw new ConflictException('Invoice ini tidak dapat menerima bukti pembayaran baru');
        }

        const invoiceRemaining = Math.max(
          eligibility.invoiceTotalAmountRupiah - eligibility.invoicePaidAmountRupiah,
          0,
        );

        if (invoiceRemaining <= 0) {
          throw new ConflictException('Tagihan ini sudah lunas');
        }

        // F1-1R (D-02): invoice-only (renewal/utilitas/manual) wajib LUNAS penuh — tidak ada cicilan.
        if (dto.amountRupiah !== invoiceRemaining) {
          throw new ConflictException(
            `Pembayaran harus melunasi tagihan penuh Rp ${invoiceRemaining.toLocaleString('id-ID')} (tidak ada pembayaran sebagian).`,
          );
        }
      }

      const existingPending = await this.prisma.paymentSubmission.findFirst({
        where: {
          stayId: dto.stayId,
          invoiceId: dto.invoiceId,
          status: PaymentSubmissionStatus.PENDING_REVIEW,
        },
        select: { id: true },
      });

      if (existingPending) {
        throw new ConflictException(
          'Masih ada bukti pembayaran lain yang sedang menunggu review untuk invoice ini',
        );
      }

      const created = await this.prisma.$transaction(async (tx) => {
        const submission = await tx.paymentSubmission.create({
          data: {
            stayId: dto.stayId,
            invoiceId: dto.invoiceId,
            tenantId,
            submittedById: user.id,
            amountRupiah: dto.amountRupiah,
            paidAt,
            paymentMethod: dto.paymentMethod as PaymentMethod,
            targetType: PaymentSubmissionTargetType.INVOICE,
            targetId: dto.invoiceId,
            senderName: dto.senderName ?? null,
            senderBankName: dto.senderBankName ?? null,
            referenceNumber: dto.referenceNumber ?? null,
            notes: dto.notes ?? null,
            fileKey: dto.fileKey ?? null,
            fileUrl: dto.fileUrl ?? null,
            originalFilename: dto.originalFilename ?? null,
            mimeType: dto.mimeType ?? null,
            fileSizeBytes: dto.fileSizeBytes ?? null,
            status: PaymentSubmissionStatus.PENDING_REVIEW,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: 'CREATE_PAYMENT_SUBMISSION',
            entityType: 'PaymentSubmission',
            entityId: String(submission.id),
            meta: {
              stayId: dto.stayId,
              invoiceId: dto.invoiceId,
              tenantId,
              amountRupiah: dto.amountRupiah,
              paymentMethod: dto.paymentMethod,
            } as unknown as Prisma.InputJsonValue,
          },
        });

        return this.findSubmissionByIdTx(tx, submission.id);
      });

      await this.notifyOwnerAdminPaymentSubmitted(created);
      return serializePrismaResult(created);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Masih ada bukti pembayaran menunggu review untuk invoice ini.');
      }
      this.handleSchemaError(error);
      throw error;
    }
  }

  async findMine(user: CurrentUserPayload, query: ReviewQueueQueryDto) {
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new ConflictException('Akun tenant belum terhubung ke data tenant');
    }

    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const search = query.search?.trim() ?? null;
    const status = query.status ?? undefined;

    try {
      const where: Prisma.PaymentSubmissionWhereInput = {
        tenantId,
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { stay: { room: { code: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
                { stay: { room: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
                { invoice: { invoiceNumber: { contains: search, mode: Prisma.QueryMode.insensitive } } },
                { referenceNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
              ],
            }
          : {}),
      };

      const [items, totalItems] = await this.prisma.$transaction([
        this.prisma.paymentSubmission.findMany({
          where,
          skip,
          take,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: {
            stay: {
              include: { room: true },
            },
            invoice: {
              include: {
                lines: { select: { lineAmountRupiah: true } },
                payments: { select: { amountRupiah: true } },
              },
            },
            tenant: { select: { id: true, fullName: true, phone: true } },
            submittedBy: { select: { id: true, fullName: true } },
            reviewedBy: { select: { id: true, fullName: true } },
          },
        }),
        this.prisma.paymentSubmission.count({ where }),
      ]);

      return {
        items: serializePrismaResult(items.map((item) => mapSubmissionFromPrisma(item))),
        meta: buildMeta(page, limit, totalItems),
      };
    } catch (error) {
      this.handleSchemaError(error);
      throw error;
    }
  }

  async findReviewQueue(query: ReviewQueueQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const search = query.search?.trim() ?? null;
    const paymentMethod = query.paymentMethod ?? undefined;
    const roomId = query.roomId ? Number(query.roomId) : undefined;
    const tenantId = query.tenantId ? Number(query.tenantId) : undefined;
    const status = query.status ?? PaymentSubmissionStatus.PENDING_REVIEW;

    try {
      const where: Prisma.PaymentSubmissionWhereInput = {
        status,
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(roomId ? { stay: { roomId } } : {}),
        ...(tenantId ? { tenantId } : {}),
        ...(search
          ? {
              OR: [
                { stay: { room: { code: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
                { stay: { room: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
                { tenant: { fullName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
                { tenant: { phone: { contains: search, mode: Prisma.QueryMode.insensitive } } },
                { invoice: { invoiceNumber: { contains: search, mode: Prisma.QueryMode.insensitive } } },
                { referenceNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
              ],
            }
          : {}),
      };

      const [items, totalItems] = await this.prisma.$transaction([
        this.prisma.paymentSubmission.findMany({
          where,
          skip,
          take,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          include: {
            stay: {
              include: { room: true },
            },
            invoice: {
              include: {
                lines: { select: { lineAmountRupiah: true } },
                payments: { select: { amountRupiah: true } },
              },
            },
            tenant: { select: { id: true, fullName: true, phone: true } },
            submittedBy: { select: { id: true, fullName: true } },
            reviewedBy: { select: { id: true, fullName: true } },
          },
        }),
        this.prisma.paymentSubmission.count({ where }),
      ]);

      return {
        items: serializePrismaResult(items.map((item) => mapSubmissionFromPrisma(item))),
        meta: buildMeta(page, limit, totalItems),
      };
    } catch (error) {
      this.handleSchemaError(error);
      throw error;
    }
  }

  async approveSubmission(user: CurrentUserPayload, submissionId: number) {
    let losingTenants: Array<{ stayId: number; tenantId: number }> = [];
    try {
      const approved = await this.prisma.$transaction(async (tx) => {
        const submission = await this.lockSubmissionTx(tx, submissionId);
        if (!submission) {
          throw new NotFoundException('Bukti pembayaran tidak ditemukan');
        }

        if (submission.status !== PaymentSubmissionStatus.PENDING_REVIEW) {
          throw new ConflictException('Bukti pembayaran ini sudah pernah diproses');
        }
        await this.assertRenewalPaymentWithinDeadline(
          tx,
          submission.invoiceId,
          new Date(submission.paidAt),
        );

        if (submission.stayStatus !== StayStatus.ACTIVE) {
          throw new ConflictException('Hunian tidak lagi aktif');
        }

        const isBookingPath = submission.roomStatus === RoomStatus.RESERVED;

        if (isBookingPath) {
          if (!submission.roomIsActive) {
            throw new ConflictException('Kamar tidak aktif untuk aktivasi booking');
          }
          // expiresAt hanya berlaku sebelum DP masuk (A18) — setelah DP,
          // deadline-nya adalah pelunasan H+1 check-in (sweeper DP forfeit).
          if (
            (submission.stayDownPaymentPaidRupiah ?? 0) <= 0 &&
            submission.stayExpiresAt &&
            new Date(submission.stayExpiresAt) < new Date()
          ) {
            throw new ConflictException('Booking sudah kedaluwarsa dan tidak dapat disetujui');
          }
        }

        if (submission.invoiceStatus === InvoiceStatus.DRAFT) {
          throw new ConflictException('Invoice ini masih dalam status draft dan belum dapat menerima pembayaran');
        }

        if ([InvoiceStatus.CANCELLED, InvoiceStatus.PAID].includes(submission.invoiceStatus as InvoiceStatus)) {
          throw new ConflictException('Invoice ini tidak dapat menerima approval pembayaran baru');
        }

        const freshPayments = await tx.invoicePayment.aggregate({
          where: { invoiceId: submission.invoiceId },
          _sum: { amountRupiah: true },
        });
        const freshPaidAmount = freshPayments._sum.amountRupiah ?? 0;

        const invoiceRemaining = Math.max(
          submission.invoiceTotalAmountRupiah - freshPaidAmount,
          0,
        );

        // ── F1-1R (D-02): NO-PARTIAL — tegakkan ulang dua nominal sah di titik approve.
        // Submission lama/race bisa lolos meski gate createSubmission (:121-160) berubah; cegah invoice PARTIAL liar.
        if (isBookingPath) {
          const depositRemainingGate = Math.max(
            (submission.stayDepositAmountRupiah ?? 0) - (submission.stayDepositPaidAmountRupiah ?? 0),
            0,
          );
          const downPaymentRemainingGate = Math.max(
            (submission.stayDownPaymentAmountRupiah ?? 0) - (submission.stayDownPaymentPaidRupiah ?? 0),
            0,
          );
          const settlementAmountGate = invoiceRemaining + depositRemainingGate;
          const isDownPaymentAmount = downPaymentRemainingGate > 0 && submission.amountRupiah === downPaymentRemainingGate;
          const isSettlementAmount = submission.amountRupiah === settlementAmountGate;
          if (!isDownPaymentAmount && !isSettlementAmount) {
            const accepted = [
              downPaymentRemainingGate > 0 && downPaymentRemainingGate !== settlementAmountGate
                ? `DP Rp ${downPaymentRemainingGate.toLocaleString('id-ID')}`
                : null,
              `pelunasan Rp ${settlementAmountGate.toLocaleString('id-ID')} (sisa sewa + deposit jaminan)`,
            ]
              .filter(Boolean)
              .join(' atau ');
            throw new ConflictException(`Nominal pembayaran harus tepat: ${accepted}. Tidak ada pembayaran sebagian (no-partial).`);
          }
        } else {
          // Invoice-only (renewal/utilitas/manual check-in): wajib LUNAS penuh, tanpa cicilan.
          if (submission.amountRupiah !== invoiceRemaining) {
            throw new ConflictException(
              `Pembayaran harus melunasi tagihan penuh Rp ${invoiceRemaining.toLocaleString('id-ID')} (tidak ada pembayaran sebagian).`,
            );
          }
        }

        let rentPortion = 0;
        let depositPortion = 0;

        if (isBookingPath) {
          rentPortion = Math.min(submission.amountRupiah, invoiceRemaining);
          const rawDeposit = Math.max(0, submission.amountRupiah - rentPortion);
          const stayDepositAmount = submission.stayDepositAmountRupiah ?? 0;
          const stayDepositPaidBefore = submission.stayDepositPaidAmountRupiah ?? 0;
          const depositRemaining = Math.max(stayDepositAmount - stayDepositPaidBefore, 0);
          depositPortion = Math.min(rawDeposit, depositRemaining);
          if (rawDeposit > depositPortion) {
            throw new ConflictException(
              `Nominal melebihi sisa tagihan + deposit. Kelebihan: Rp ${(rawDeposit - depositPortion).toLocaleString('id-ID')}. Silakan koreksi bukti bayar.`,
            );
          }
        } else {
          // Invoice-only: must not exceed remaining
          if (submission.amountRupiah > invoiceRemaining) {
            throw new ConflictException(
              `Jumlah pembayaran melebihi sisa tagihan sebesar Rp ${invoiceRemaining.toLocaleString('id-ID')}`,
            );
          }
          rentPortion = submission.amountRupiah;
          depositPortion = 0;
        }

        let invoicePaymentId: number | null = null;

        if (rentPortion > 0) {
          const invoicePayment = await tx.invoicePayment.create({
            data: {
              invoiceId: submission.invoiceId,
              paymentDate: new Date(submission.paidAt),
              amountRupiah: rentPortion,
              method: submission.paymentMethod as PaymentMethod,
              referenceNo: submission.referenceNumber,
              note: buildApprovalPaymentNote(submission),
              capturedById: user.id,
            },
          });
          invoicePaymentId = invoicePayment.id;
        }

        const nextPaidAmount = freshPaidAmount + rentPortion;

        const nextInvoiceStatus =
          nextPaidAmount >= submission.invoiceTotalAmountRupiah
            ? InvoiceStatus.PAID
            : nextPaidAmount > 0
              ? InvoiceStatus.PARTIAL
              : InvoiceStatus.ISSUED;

        const nextIssuedAt = submission.invoiceIssuedAt
          ? new Date(submission.invoiceIssuedAt)
          : new Date();

        const nextPaidAt =
          nextInvoiceStatus === InvoiceStatus.PAID
            ? new Date(submission.paidAt)
            : null;

        await tx.invoice.update({
          where: { id: submission.invoiceId },
          data: {
            status: nextInvoiceStatus,
            issuedAt: nextIssuedAt,
            paidAt: nextPaidAt,
          },
        });

        try {
          await this.accountingPosting.postInvoiceIssuedTx(tx, submission.invoiceId, user.id);
          if (invoicePaymentId) {
            await this.accountingPosting.postInvoicePaymentTx(tx, invoicePaymentId, user.id);
          }
        } catch (err) {
          // Auto Journal Lite must not block payment approval. Readiness/backfill can repair skipped journal later.
          this.logger.warn(
            `Auto Journal Lite gagal saat approval pembayaran (submission #${submissionId}, invoice #${submission.invoiceId}): ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        await tx.paymentSubmission.update({
          where: { id: submissionId },
          data: {
            status: PaymentSubmissionStatus.APPROVED,
            reviewedById: user.id,
            reviewedAt: new Date(),
          },
        });

        // ── Booking path only: deposit settlement, room activation, meter promotion ──
        if (isBookingPath) {
          const stayDepositAmount = submission.stayDepositAmountRupiah ?? 0;
          const stayDepositPaidBefore = submission.stayDepositPaidAmountRupiah ?? 0;
          const stayDepositPaidAfter = stayDepositPaidBefore + depositPortion;

          const stayDepositPaymentStatus: BookingDepositPaymentStatus =
            stayDepositPaidAfter >= stayDepositAmount && stayDepositAmount > 0
              ? BookingDepositPaymentStatus.PAID
              : stayDepositPaidAfter > 0
                ? BookingDepositPaymentStatus.PARTIAL
                : BookingDepositPaymentStatus.UNPAID;

          // A18: DP (uang muka) = bagian dari pembayaran sewa (rentPortion),
          // dicatat terpisah dari deposit jaminan.
          const stayDpAmount = submission.stayDownPaymentAmountRupiah ?? 0;
          const stayDpPaidBefore = submission.stayDownPaymentPaidRupiah ?? 0;
          const stayDpPaidAfter = Math.min(stayDpAmount, stayDpPaidBefore + rentPortion);

          await tx.stay.update({
            where: { id: submission.stayId },
            data: {
              // Audit M-12: pembayaran pertama disetujui = kamar terkunci;
              // matikan expiresAt struktural, bukan hanya lewat filter sweeper.
              expiresAt: null,
              depositPaidAmountRupiah: stayDepositPaidAfter,
              depositPaymentStatus: stayDepositPaymentStatus,
              downPaymentPaidRupiah: stayDpPaidAfter,
              ...(stayDpPaidAfter > stayDpPaidBefore && stayDpPaidBefore === 0
                ? { downPaymentPaidAt: new Date(submission.paidAt) }
                : {}),
            },
          });

          if (depositPortion > 0) {
            try {
              await this.depositLedger.recordDepositReceivedTx(tx, {
                stayId: submission.stayId,
                amountRupiah: depositPortion,
                actorUserId: user.id,
                paymentSubmissionId: submissionId,
                invoicePaymentId,
                occurredAt: new Date(submission.paidAt),
                note: 'Deposit diterima dari approval pembayaran booking.',
                metadata: {
                  paymentMethod: submission.paymentMethod,
                  referenceNumber: submission.referenceNumber,
                  rentPortion,
                  depositPortion,
                },
              });
            } catch (err) {
              this.logger.warn(
                `Deposit ledger gagal saat approval (submission #${submissionId}, stay #${submission.stayId}): ${err instanceof Error ? err.message : String(err)}`,
              );
            }
            try {
              await this.accountingPosting.postDepositReceivedForStayTx(
                tx,
                submission.stayId,
                user.id,
                submission.paymentMethod,
                new Date(submission.paidAt),
              );
            } catch (err) {
              // Deposit liability journal is best-effort; do not block payment approval.
              this.logger.warn(
                `Jurnal deposit (liability) gagal saat approval pembayaran (submission #${submissionId}, stay #${submission.stayId}): ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          }

          if (nextInvoiceStatus === InvoiceStatus.PAID) {
            // Kamar bekas overstay: huni baru menunggu pembersihan selesai.
            // DP boleh masuk kapan saja; pelunasan (yang memicu aktivasi) baru
            // boleh disetujui setelah tiket pembersihan/inspeksi ditutup.
            const openCleaningTicket = await tx.ticket.findFirst({
              where: {
                roomId: submission.roomId,
                category: 'CHECKOUT_INSPECTION' as any,
                status: { notIn: ['CLOSED', 'CANCELLED'] as any },
              },
              select: { id: true, ticketNumber: true },
            });
            if (openCleaningTicket) {
              throw new ConflictException(
                `Kamar masih dalam proses pembersihan/inspeksi (tiket ${openCleaningTicket.ticketNumber}). Tutup tiket tersebut terlebih dahulu, lalu setujui pelunasan untuk mengaktifkan hunian.`,
              );
            }

            await tx.room.update({
              where: { id: submission.roomId },
              data: { status: RoomStatus.OCCUPIED, allowBookingWhileCleaning: false },
            });

            const activationStay = await tx.stay.findUnique({
              where: { id: submission.stayId },
              select: { id: true, checkInDate: true, pricingTerm: true, plannedCheckOutDate: true },
            });

            if (activationStay && activationStay.checkInDate && !activationStay.plannedCheckOutDate) {
              const autoPlannedCheckOut = calculatePeriodEnd(
                activationStay.checkInDate,
                activationStay.pricingTerm,
              );

              await tx.stay.update({
                where: { id: activationStay.id },
                data: { plannedCheckOutDate: autoPlannedCheckOut },
              });
            }

            // Promote pending meter snapshot to operational MeterReading
            const hasElectricity =
              submission.stayInitialElectricityKwhPending != null;
            const hasWater = submission.stayInitialWaterM3Pending != null;

            const stay = await tx.stay.findUnique({
              where: { id: submission.stayId },
              select: { checkInDate: true, roomId: true },
            });

            // Audit M-07: promosi stay TIDAK boleh bergantung pada ada/tidaknya
            // snapshot meter; meter dibuat kondisional di dalam blok ini.
            if (stay) {
              const readingAt = new Date(stay.checkInDate);
              readingAt.setUTCHours(0, 0, 0, 0);

              const recordedById =
                submission.stayInitialMetersRecordedById ?? user.id;

              if (hasElectricity) {
                const electricityValue = submission.stayInitialElectricityKwhPending!;
                const existingElectricity = await tx.meterReading.findFirst({
                  where: {
                    roomId: stay.roomId,
                    utilityType: UtilityType.ELECTRICITY,
                    readingAt,
                  },
                  select: { id: true },
                });
                if (!existingElectricity) {
                  await tx.meterReading.create({
                    data: {
                      roomId: stay.roomId,
                      utilityType: UtilityType.ELECTRICITY,
                      readingAt,
                      readingValue: electricityValue,
                      recordedById,
                      note: 'Meter awal dipromote otomatis setelah pembayaran booking disetujui.',
                    },
                  });
                }
              }

              if (hasWater) {
                const waterValue = submission.stayInitialWaterM3Pending!;
                const existingWater = await tx.meterReading.findFirst({
                  where: {
                    roomId: stay.roomId,
                    utilityType: UtilityType.WATER,
                    readingAt,
                  },
                  select: { id: true },
                });
                if (!existingWater) {
                  await tx.meterReading.create({
                    data: {
                      roomId: stay.roomId,
                      utilityType: UtilityType.WATER,
                      readingAt,
                      readingValue: waterValue,
                      recordedById,
                      note: 'Meter awal dipromote otomatis setelah pembayaran booking disetujui.',
                    },
                  });
                }
              }

              await tx.stay.update({
                where: { id: submission.stayId },
                data: {
                  initialElectricityKwhPending: null,
                  initialWaterM3Pending: null,
                  initialMetersRecordedAt: null,
                  initialMetersRecordedById: null,
                  initialMetersPromotedAt: new Date(),
                },
              });
            }

          }

          // A18: kamar terkunci sejak pembayaran pertama disetujui (DP maupun
          // pelunasan) — booking pesaing yang belum bayar dibatalkan di sini,
          // tidak menunggu invoice PAID.
          const competingResult = await this.cancelCompetingUnpaidBookingsTx(tx, {
            roomId: submission.roomId,
            winningStayId: submission.stayId,
            actorUserId: user.id,
            paymentSubmissionId: submissionId,
          });
          losingTenants = competingResult.losingTenants;
        }

        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: 'APPROVE_PAYMENT_SUBMISSION',
            entityType: 'PaymentSubmission',
            entityId: String(submissionId),
            meta: {
              stayId: submission.stayId,
              roomId: submission.roomId,
              invoiceId: submission.invoiceId,
              invoicePayment: { rentPortion, depositPortion },
              invoiceStatusAfter: nextInvoiceStatus,
            } as unknown as Prisma.InputJsonValue,
          },
        });

        return this.findSubmissionByIdTx(tx, submissionId);
      });

      const result = serializePrismaResult(approved);
      this.notifyPaymentApproved(approved.tenantId, submissionId).catch(() => {});
      if (losingTenants.length > 0) {
        this.notifyLosingTenants(losingTenants).catch(() => {});
      }
      return result;
    } catch (error) {
if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Approval pembayaran bentrok dengan data yang sudah ada');
      }
      this.handleSchemaError(error);
      throw error;
    }
  }

  private async cancelCompetingUnpaidBookingsTx(
    tx: Prisma.TransactionClient,
    params: {
      roomId: number;
      winningStayId: number;
      actorUserId: number;
      paymentSubmissionId: number;
    },
  ) {
    const competingBookings = await tx.stay.findMany({
      where: {
        roomId: params.roomId,
        status: StayStatus.ACTIVE,
        id: { not: params.winningStayId },
        initialMetersPromotedAt: null,
      },
      select: { id: true, tenantId: true },
    });

    const competingStayIds = competingBookings.map((stay) => stay.id);
    if (competingStayIds.length === 0) {
      return { cancelledCount: 0, stayIds: [] as number[], losingTenants: [] as Array<{ stayId: number; tenantId: number }> };
    }

    const cancelReason =
      'Kamar sudah diamankan oleh pembayaran tenant lain. Prioritas kamar mengikuti pembayaran valid pertama.';

    const invoicesToReverse = await tx.invoice.findMany({
      where: {
        stayId: { in: competingStayIds },
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] },
      },
      select: { id: true, invoiceNumber: true },
    });

    await tx.invoice.updateMany({
      where: {
        stayId: { in: competingStayIds },
        status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL] },
      },
      data: { status: InvoiceStatus.CANCELLED, cancelReason },
    });

    await this.reverseCancelledInvoiceJournalsTx(tx, invoicesToReverse, params.actorUserId, 'pembatalan booking pesaing');

    await tx.paymentSubmission.updateMany({
      where: {
        stayId: { in: competingStayIds },
        status: PaymentSubmissionStatus.PENDING_REVIEW,
      },
      data: {
        status: PaymentSubmissionStatus.EXPIRED,
        reviewedById: params.actorUserId,
        reviewedAt: new Date(),
        reviewNotes: cancelReason,
      },
    });

    await tx.stay.updateMany({
      where: { id: { in: competingStayIds } },
      data: {
        status: StayStatus.CANCELLED,
        checkoutReason: cancelReason,
        initialElectricityKwhPending: null,
        initialWaterM3Pending: null,
        initialMetersRecordedAt: null,
        initialMetersRecordedById: null,
      },
    });

    // F2-3b: catat kewajiban refund untuk loser yang SUDAH transfer (DP tercatat ATAU
    // ada bukti bayar) → lossRefundStatus PENDING + nominal, agar admin tak lupa
    // mengembalikan dana. Atomik dgn pembatalan; loser yang belum transfer dilewati.
    const refundCandidates = await tx.stay.findMany({
      where: { id: { in: competingStayIds } },
      select: {
        id: true,
        downPaymentPaidRupiah: true,
        paymentSubmissions: {
          where: { status: { in: [PaymentSubmissionStatus.PENDING_REVIEW, PaymentSubmissionStatus.APPROVED] } },
          select: { amountRupiah: true, status: true },
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
    });
    for (const s of refundCandidates) {
      const submitted = Number(s.paymentSubmissions[0]?.amountRupiah ?? 0);
      const dpPaid = Number(s.downPaymentPaidRupiah ?? 0);
      const refundAmount = dpPaid > 0 ? dpPaid : submitted;
      if (refundAmount > 0) {
        await tx.stay.update({
          where: { id: s.id },
          data: {
            lossRefundStatus: 'PENDING' as any,
            lossRefundAmountRupiah: refundAmount,
            lossRefundNote: 'Auto: kalah first-paid-wins padahal dana sudah ditransfer → wajib refund.',
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        actorUserId: params.actorUserId,
        action: 'AUTO_CANCEL_COMPETING_BOOKINGS_FIRST_PAID',
        entityType: 'Room',
        entityId: String(params.roomId),
        meta: {
          winningStayId: params.winningStayId,
          paymentSubmissionId: params.paymentSubmissionId,
          cancelledStayIds: competingStayIds,
          policy: 'first_paid_valid_payment_wins',
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      cancelledCount: competingStayIds.length,
      stayIds: competingStayIds,
      losingTenants: competingBookings.map((stay) => ({ stayId: stay.id, tenantId: stay.tenantId })),
    };
  }

  /**
   * Audit A17: tenant yang kalah first-paid-wins berhak tahu nasib bookingnya.
   * Dipanggil SETELAH transaksi approve sukses (best-effort, tidak memblokir).
   */
  private async notifyLosingTenants(losingTenants: Array<{ stayId: number; tenantId: number }>) {
    for (const loser of losingTenants) {
      try {
        const tenantUser = await this.prisma.user.findFirst({
          where: { tenantId: loser.tenantId, role: UserRole.TENANT, isActive: true },
          select: { id: true },
        });
        if (!tenantUser) continue;
        // F2-3 (A17 dua-varian): loser yang SUDAH transfer (pernah upload bukti bayar atau
        // DP-nya tercatat terbayar) butuh pesan REFUND; yang belum cukup diarahkan pilih kamar lain.
        const [submission, stay] = await Promise.all([
          this.prisma.paymentSubmission.findFirst({
            where: {
              stayId: loser.stayId,
              status: { in: [PaymentSubmissionStatus.PENDING_REVIEW, PaymentSubmissionStatus.APPROVED] },
            },
            select: { id: true },
          }),
          this.prisma.stay.findUnique({ where: { id: loser.stayId }, select: { downPaymentPaidRupiah: true } }),
        ]);
        const hasTransferred = !!submission || Number(stay?.downPaymentPaidRupiah ?? 0) > 0;
        await this.appNotificationService.create({
          recipientUserId: tenantUser.id,
          title: hasTransferred
            ? 'Booking dibatalkan: dana Anda akan direfund'
            : 'Booking dibatalkan: kamar diamankan tenant lain',
          body: hasTransferred
            ? 'Kamar yang Anda pesan sudah diamankan oleh pembayaran tenant lain yang disetujui lebih dulu (kebijakan first-paid-wins). Karena Anda sudah melakukan transfer, dana Anda akan DIKEMBALIKAN (refund) — admin akan menghubungi Anda untuk memprosesnya. Anda juga dapat memilih kamar lain di katalog.'
            : 'Kamar yang Anda pesan sudah diamankan oleh pembayaran tenant lain yang disetujui lebih dulu (kebijakan first-paid-wins). Tidak ada dana yang terpotong dari Anda. Silakan pilih kamar lain di katalog.',
          linkTo: '/rooms',
          entityType: 'Stay',
          entityId: String(loser.stayId),
        });
      } catch (err) {
        this.logger.warn(`Notifikasi tenant kalah gagal (stay #${loser.stayId}): ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }


  /**
   * Reversal jurnal invoice yang dibatalkan — kebijakan tunggal (audit A8):
   * skip benign bila jurnal POSTED tidak ada; bila ada, reversal WAJIB sukses
   * (invoice CANCELLED keluar dari readiness unmapped, jadi kegagalan di sini
   * tidak akan pernah terdeteksi lagi → revenue overstated permanen).
   * `skipped` dengan `journalEntry` berarti reversal sudah ada (idempotent) = OK.
   */
  private async reverseCancelledInvoiceJournalsTx(
    tx: Prisma.TransactionClient,
    invoices: Array<{ id: number; invoiceNumber?: string | null }>,
    actorUserId: number | null,
    context: string,
  ) {
    for (const invoice of invoices) {
      const postedInvoiceJournal = await tx.journalEntry.findFirst({
        where: {
          sourceType: 'INVOICE' as any,
          sourceId: String(invoice.id),
          status: 'POSTED' as any,
        },
        select: { id: true },
        orderBy: [{ postedAt: 'desc' }, { id: 'desc' }],
      });
      if (!postedInvoiceJournal) continue;

      const reversalResult = await this.accountingPosting.postInvoiceCancellationReversalTx(
        tx,
        invoice.id,
        actorUserId,
      );
      if (reversalResult?.skipped && !(reversalResult as any)?.journalEntry) {
        throw new ConflictException(
          `Pembatalan gagal (${context}): reversal accounting tagihan ${invoice.invoiceNumber ?? invoice.id} tidak berhasil: ${reversalResult.reason ?? 'alasan tidak diketahui'}. Perbaiki kesiapan accounting (COA/periode) lalu ulangi.`,
        );
      }
    }
  }

  async rejectSubmission(user: CurrentUserPayload, submissionId: number, reviewNotes: string) {
    try {
      const rejected = await this.prisma.$transaction(async (tx) => {
        const submission = await this.lockSubmissionTx(tx, submissionId);
        if (!submission) {
          throw new NotFoundException('Bukti pembayaran tidak ditemukan');
        }

        if (submission.status !== PaymentSubmissionStatus.PENDING_REVIEW) {
          throw new ConflictException('Bukti pembayaran ini sudah pernah diproses');
        }

        await tx.paymentSubmission.update({
          where: { id: submissionId },
          data: {
            status: PaymentSubmissionStatus.REJECTED,
            reviewedById: user.id,
            reviewedAt: new Date(),
            reviewNotes,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: 'REJECT_PAYMENT_SUBMISSION',
            entityType: 'PaymentSubmission',
            entityId: String(submissionId),
            meta: {
              stayId: submission.stayId,
              invoiceId: submission.invoiceId,
              reviewNotes,
            } as unknown as Prisma.InputJsonValue,
          },
        });

        await this.autoCancelRejectedExpiredBookingTx(tx, submission.stayId, submission.roomId, user.id, submissionId);

        return this.findSubmissionByIdTx(tx, submissionId);
      });

      const result = serializePrismaResult(rejected);
      this.notifyPaymentRejected(rejected.tenantId, submissionId, reviewNotes).catch(() => {});
      return result;
    } catch (error) {
      this.handleSchemaError(error);
      throw error;
    }
  }

  async expireBooking(stayId: number, user: CurrentUserPayload) {
    try {
      const booking = await this.prisma.stay.findUnique({
        where: { id: stayId },
        select: {
          id: true,
          roomId: true,
          status: true,
          initialMetersPromotedAt: true,
          room: { select: { status: true } },
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking tidak ditemukan');
      }

      if (booking.status !== StayStatus.ACTIVE) {
        throw new ConflictException('Booking tidak aktif atau sudah diproses.');
      }

      if (booking.room.status !== RoomStatus.RESERVED) {
        throw new ConflictException(
          'Booking sudah menjadi hunian aktif. Gunakan checkout untuk mengakhiri stay.',
        );
      }

      if (booking.initialMetersPromotedAt !== null) {
        throw new ConflictException(
          'Booking sudah aktif operasional. Gunakan checkout untuk mengakhiri stay.',
        );
      }

      await this.prisma.$transaction(async (tx) => {
        // Lock + re-cek (audit A2): pastikan booking belum berubah status oleh
        // approval yang berjalan bersamaan sebelum membatalkan.
        const lockedRows = await tx.$queryRaw<Array<{ status: string; roomStatus: string; promotedAt: Date | null }>>(Prisma.sql`
          SELECT s.status, r.status AS "roomStatus", s."initialMetersPromotedAt" AS "promotedAt"
          FROM "Stay" s JOIN "Room" r ON r.id = s."roomId"
          WHERE s.id = ${stayId}
          FOR UPDATE OF s, r`);
        const current = lockedRows[0];
        if (
          !current ||
          current.status !== StayStatus.ACTIVE ||
          current.roomStatus !== RoomStatus.RESERVED ||
          current.promotedAt
        ) {
          throw new ConflictException(
            'Booking baru saja berubah status (kemungkinan pembayaran disetujui). Muat ulang halaman.',
          );
        }

        const approvedSubmission = await tx.paymentSubmission.findFirst({
          where: { stayId, status: PaymentSubmissionStatus.APPROVED },
          select: { id: true },
        });
        if (approvedSubmission) {
          throw new ConflictException(
            'Booking sudah memiliki pembayaran yang disetujui dan tidak dapat dibatalkan lewat jalur expiry.',
          );
        }

        const paidInvoice = await tx.invoice.findFirst({
          where: { stayId, status: { in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL] } },
          select: { id: true },
        });
        if (paidInvoice) {
          throw new ConflictException(
            'Booking memiliki invoice yang sudah dibayar sebagian/lunas. Gunakan pembatalan stay (dengan reversal) bila memang ingin membatalkan.',
          );
        }

        await tx.paymentSubmission.updateMany({
          where: {
            stayId,
            status: PaymentSubmissionStatus.PENDING_REVIEW,
          },
          data: { status: PaymentSubmissionStatus.EXPIRED },
        });

        const invoicesToReverse = await tx.invoice.findMany({
          where: {
            stayId,
            status: { in: ['ISSUED', 'PARTIAL'] as any },
          },
          select: { id: true, invoiceNumber: true },
        });

        await tx.invoice.updateMany({
          where: {
            stayId,
            status: { in: ['DRAFT', 'ISSUED', 'PARTIAL'] },
          },
          data: {
            status: 'CANCELLED',
            cancelReason: 'Booking dibatalkan. Pemesanan saja belum mengunci kamar; prioritas mengikuti pembayaran valid pertama.',
          },
        });

        await this.reverseCancelledInvoiceJournalsTx(tx, invoicesToReverse, user.id, 'pembatalan booking manual');

        await tx.stay.update({
          where: { id: stayId },
          data: {
            status: StayStatus.CANCELLED,
            checkoutReason: 'Booking dibatalkan. Pemesanan saja belum mengunci kamar; prioritas mengikuti pembayaran valid pertama.',
            initialElectricityKwhPending: null,
            initialWaterM3Pending: null,
            initialMetersRecordedAt: null,
            initialMetersRecordedById: null,
          },
        });

        await releaseRoomAfterBookingCancelTx(tx, booking.roomId);

        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: 'EXPIRE_BOOKING',
            entityType: 'Stay',
            entityId: String(stayId),
            meta: {
              roomId: booking.roomId,
              source: 'MANUAL_EXPIRY',
            } as unknown as Prisma.InputJsonValue,
          },
        });
      });

      return { message: 'Booking berhasil dibatalkan dan kamar dilepas', stayId };
    } catch (error) {
      this.handleSchemaError(error);
      throw error;
    }
  }

  async runExpiryCheck(user?: CurrentUserPayload) {
    try {
      const heldForPaymentReview = await this.prisma.stay.count({
        where: {
          status: StayStatus.ACTIVE,
          room: { status: RoomStatus.RESERVED },
          initialMetersPromotedAt: null,
          expiresAt: { not: null, lt: new Date() },
          paymentSubmissions: { some: { status: PaymentSubmissionStatus.PENDING_REVIEW } },
        },
      });

      const expiredBookings = await this.prisma.stay.findMany({
        where: {
          status: StayStatus.ACTIVE,
          room: { status: RoomStatus.RESERVED },
          initialMetersPromotedAt: null,
          expiresAt: { not: null, lt: new Date() },
          paymentSubmissions: {
            none: {
              status: { in: [PaymentSubmissionStatus.PENDING_REVIEW, PaymentSubmissionStatus.APPROVED] },
            },
          },
        },
        select: { id: true, roomId: true },
      });

      const processedStayIds: number[] = [];

      for (const booking of expiredBookings) {
        const processed = await this.prisma.$transaction(async (tx) => {
          // Lock + re-cek (audit A2): kandidat dipilih di luar transaksi, jadi
          // status bisa berubah (approval bersamaan). Skip senyap bila berubah.
          const lockedRows = await tx.$queryRaw<Array<{ status: string; roomStatus: string; promotedAt: Date | null }>>(Prisma.sql`
            SELECT s.status, r.status AS "roomStatus", s."initialMetersPromotedAt" AS "promotedAt"
            FROM "Stay" s JOIN "Room" r ON r.id = s."roomId"
            WHERE s.id = ${booking.id}
            FOR UPDATE OF s, r`);
          const current = lockedRows[0];
          if (
            !current ||
            current.status !== StayStatus.ACTIVE ||
            current.roomStatus !== RoomStatus.RESERVED ||
            current.promotedAt
          ) {
            return false;
          }

          const freshSubmission = await tx.paymentSubmission.findFirst({
            where: {
              stayId: booking.id,
              status: { in: [PaymentSubmissionStatus.PENDING_REVIEW, PaymentSubmissionStatus.APPROVED] },
            },
            select: { id: true },
          });
          if (freshSubmission) return false;

          const paidInvoice = await tx.invoice.findFirst({
            where: { stayId: booking.id, status: { in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL] } },
            select: { id: true },
          });
          if (paidInvoice) return false;

          await tx.paymentSubmission.updateMany({
            where: {
              stayId: booking.id,
              status: PaymentSubmissionStatus.PENDING_REVIEW,
            },
            data: { status: PaymentSubmissionStatus.EXPIRED },
          });

          const invoicesToReverse = await tx.invoice.findMany({
            where: {
              stayId: booking.id,
              status: { in: ['ISSUED', 'PARTIAL'] as any },
            },
            select: { id: true, invoiceNumber: true },
          });

          await tx.invoice.updateMany({
            where: {
              stayId: booking.id,
              status: { in: ['DRAFT', 'ISSUED', 'PARTIAL'] },
            },
            data: {
              status: 'CANCELLED',
              cancelReason: 'Otomatis dibatalkan: batas 3 jam terlewati tanpa bukti pembayaran valid.',
            },
          });

          await this.reverseCancelledInvoiceJournalsTx(tx, invoicesToReverse, user?.id ?? null, 'sweep expiry booking');

          await tx.stay.update({
            where: { id: booking.id },
            data: {
              status: StayStatus.CANCELLED,
              checkoutReason: 'Otomatis dibatalkan: batas 3 jam terlewati. Pemesanan saja belum mengunci kamar.',
              initialElectricityKwhPending: null,
              initialWaterM3Pending: null,
              initialMetersRecordedAt: null,
              initialMetersRecordedById: null,
            },
          });

          await releaseRoomAfterBookingCancelTx(tx, booking.roomId);

          await tx.auditLog.create({
            data: {
              actorUserId: user?.id ?? null,
              action: 'EXPIRE_BOOKING',
              entityType: 'Stay',
              entityId: String(booking.id),
              meta: {
                roomId: booking.roomId,
                source: user ? 'MANUAL_EXPIRY_CHECK' : 'SYSTEM_EXPIRY_CHECK',
              } as unknown as Prisma.InputJsonValue,
            },
          });

          return true;
        });

        if (processed) processedStayIds.push(booking.id);
      }

      return {
        expiredCount: processedStayIds.length,
        heldForPaymentReview,
        stayIds: processedStayIds,
      };
    } catch (error) {
      this.handleSchemaError(error);
      throw error;
    }
  }


  private async autoCancelRejectedExpiredBookingTx(
    tx: Prisma.TransactionClient,
    stayId: number,
    roomId: number,
    actorUserId: number,
    submissionId: number,
  ) {
    const booking = await tx.stay.findFirst({
      where: {
        id: stayId,
        status: StayStatus.ACTIVE as any,
        room: { status: RoomStatus.RESERVED as any },
        initialMetersPromotedAt: null,
        expiresAt: { not: null, lt: new Date() },
        paymentSubmissions: {
          none: {
            status: { in: [PaymentSubmissionStatus.PENDING_REVIEW, PaymentSubmissionStatus.APPROVED] as any },
          },
        },
      },
      select: { id: true, roomId: true },
    });
    if (!booking) return;

    // Uang sudah masuk (mis. pembayaran manual) = jangan auto-cancel (audit A1).
    const paidInvoice = await tx.invoice.findFirst({
      where: { stayId, status: { in: ['PAID', 'PARTIAL'] as any } },
      select: { id: true },
    });
    if (paidInvoice) return;

    const invoicesToReverse = await tx.invoice.findMany({
      where: { stayId, status: { in: ['ISSUED', 'PARTIAL'] as any } },
      select: { id: true, invoiceNumber: true },
    });

    await tx.invoice.updateMany({
      where: { stayId, status: { in: ['DRAFT', 'ISSUED', 'PARTIAL'] as any } },
      data: {
        status: 'CANCELLED' as any,
        cancelReason: 'Bukti pembayaran ditolak setelah batas waktu. Pemesanan dibatalkan otomatis dan kamar dilepas.',
      },
    });

    await this.reverseCancelledInvoiceJournalsTx(tx, invoicesToReverse, actorUserId, 'auto-cancel booking setelah reject');
    await tx.stay.update({
      where: { id: stayId },
      data: {
        status: StayStatus.CANCELLED as any,
        checkoutReason: 'Bukti pembayaran ditolak setelah batas waktu 3 jam. Kamar dilepas otomatis untuk calon tenant lain.',
        initialElectricityKwhPending: null,
        initialWaterM3Pending: null,
        initialMetersRecordedAt: null,
        initialMetersRecordedById: null,
      },
    });
    await releaseRoomAfterBookingCancelTx(tx, roomId);
    await tx.auditLog.create({
      data: {
        actorUserId,
        action: 'AUTO_CANCEL_REJECTED_EXPIRED_BOOKING',
        entityType: 'Stay',
        entityId: String(stayId),
        meta: {
          roomId,
          submissionId,
          slaHours: AUTO_OPS_DEADLINES.APPROVED_BOOKING_PAYMENT_DEADLINE_HOURS,
          policy: 'first_paid_room_priority_no_debt',
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async findEligibleSubmissionTarget(tenantId: number, stayId: number, invoiceId: number) {
    const stay = await this.prisma.stay.findUnique({
      where: { id: stayId },
      select: {
        id: true,
        tenantId: true,
        status: true,
        expiresAt: true,
        depositAmountRupiah: true,
        depositPaidAmountRupiah: true,
        depositPaymentStatus: true,
        downPaymentAmountRupiah: true,
        downPaymentPaidRupiah: true,
        roomId: true,
        room: { select: { id: true, code: true, name: true, status: true } },
        tenant: { select: { id: true, fullName: true } },
        invoices: {
          where: { id: invoiceId },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            totalAmountRupiah: true,
            lines: { select: { lineAmountRupiah: true } },
            payments: { select: { amountRupiah: true } },
          },
        },
      },
    });

    if (!stay || stay.tenantId !== tenantId) return null;

    const invoice = stay.invoices[0];
    if (!invoice) return null;

    const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amountRupiah, 0);
    const lineTotal = invoice.lines.reduce((sum, line) => sum + Number(line.lineAmountRupiah ?? 0), 0);
    const invoiceTotalAmount = Number(invoice.totalAmountRupiah ?? 0) > 0
      ? Number(invoice.totalAmountRupiah)
      : lineTotal;

    return {
      stayId: stay.id,
      invoiceId: invoice.id,
      tenantId: stay.tenantId,
      tenantFullName: stay.tenant.fullName,
      roomId: stay.roomId,
      roomCode: stay.room.code,
      roomName: stay.room.name,
      roomStatus: stay.room.status,
      stayStatus: stay.status,
      stayExpiresAt: stay.expiresAt,
      invoiceNumber: invoice.invoiceNumber,
      invoiceStatus: invoice.status,
      invoiceTotalAmountRupiah: invoiceTotalAmount,
      invoicePaidAmountRupiah: paidAmount,
      stayDepositAmountRupiah: stay.depositAmountRupiah,
      stayDepositPaidAmountRupiah: stay.depositPaidAmountRupiah,
      stayDepositPaymentStatus: stay.depositPaymentStatus,
      stayDownPaymentAmountRupiah: stay.downPaymentAmountRupiah,
      stayDownPaymentPaidRupiah: stay.downPaymentPaidRupiah,
    };
  }

  private async assertRenewalPaymentWithinDeadline(
    db: Prisma.TransactionClient | PrismaService,
    invoiceId: number,
    paidAt: Date,
  ) {
    const request = await (db as any).renewRequest.findFirst({
      where: {
        status: { in: ['AWAITING_DP', 'DP_SECURED'] },
        OR: [
          { downPaymentInvoiceId: invoiceId },
          { settlementInvoiceId: invoiceId },
        ],
      },
      select: {
        downPaymentInvoiceId: true,
        settlementInvoiceId: true,
        downPaymentDueDate: true,
        settlementDueDate: true,
      },
    });
    if (!request) return;

    const deadline = request.downPaymentInvoiceId === invoiceId
      ? request.downPaymentDueDate
      : request.settlementDueDate;
    if (deadline && paidAt.getTime() > new Date(deadline).getTime()) {
      const label = request.downPaymentInvoiceId === invoiceId ? 'hari-H prioritas' : 'batas pelunasan H+7';
      throw new ConflictException(`Tanggal pembayaran melewati ${label}. Pembayaran renewal tidak dapat diterima.`);
    }
  }

  private async lockSubmissionTx(tx: Prisma.TransactionClient, submissionId: number) {
    const rows = await tx.$queryRaw<SubmissionLockRow[]>(Prisma.sql`
      SELECT
        ps.id,
        ps."stayId",
        ps."invoiceId",
        ps."tenantId",
        ps."submittedById",
        ps."amountRupiah",
        ps."paidAt",
        ps."paymentMethod",
        ps."senderName",
        ps."senderBankName",
        ps."referenceNumber",
        ps.notes,
        ps."fileKey",
        ps."fileUrl",
        ps."originalFilename",
        ps."mimeType",
        ps."fileSizeBytes",
        ps.status,
        ps."reviewedById",
        ps."reviewedAt",
        ps."reviewNotes",
        ps."createdAt",
        ps."updatedAt",
        t."fullName" AS "tenantFullName",
        r.id AS "roomId",
        r.code AS "roomCode",
        r.status AS "roomStatus",
        r."isActive" AS "roomIsActive",
        s.status AS "stayStatus",
        s."depositAmountRupiah" AS "stayDepositAmountRupiah",
        s."depositPaidAmountRupiah" AS "stayDepositPaidAmountRupiah",
        COALESCE(s."downPaymentAmountRupiah", 0) AS "stayDownPaymentAmountRupiah",
        COALESCE(s."downPaymentPaidRupiah", 0) AS "stayDownPaymentPaidRupiah",
        s."expiresAt" AS "stayExpiresAt",
        s."initialElectricityKwhPending" AS "stayInitialElectricityKwhPending",
        s."initialWaterM3Pending" AS "stayInitialWaterM3Pending",
        s."initialMetersRecordedAt" AS "stayInitialMetersRecordedAt",
        s."initialMetersRecordedById" AS "stayInitialMetersRecordedById",
        i."invoiceNumber",
        i.status AS "invoiceStatus",
        i."issuedAt" AS "invoiceIssuedAt",
        COALESCE(NULLIF(i."totalAmountRupiah", 0), (SELECT COALESCE(SUM(il."lineAmountRupiah")::int, 0) FROM "InvoiceLine" il WHERE il."invoiceId" = i.id)) AS "invoiceTotalAmountRupiah",
        COALESCE((SELECT SUM(ip."amountRupiah")::int FROM "InvoicePayment" ip WHERE ip."invoiceId" = i.id), 0) AS "invoicePaidAmountRupiah"
      FROM "PaymentSubmission" ps
      INNER JOIN "Stay" s ON s.id = ps."stayId"
      INNER JOIN "Room" r ON r.id = s."roomId"
      INNER JOIN "Invoice" i ON i.id = ps."invoiceId"
      INNER JOIN "Tenant" t ON t.id = ps."tenantId"
      WHERE ps.id = ${submissionId}
      FOR UPDATE OF ps, s, r, i
    `);

    return rows[0] ?? null;
  }

  private async findSubmissionByIdTx(tx: Prisma.TransactionClient, submissionId: number): Promise<SubmissionDetail> {
    const submission = await tx.paymentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        stay: {
          include: { room: true },
        },
        invoice: {
          include: {
            lines: { select: { lineAmountRupiah: true } },
            payments: { select: { amountRupiah: true } },
          },
        },
        tenant: { select: { id: true, fullName: true, phone: true } },
        submittedBy: { select: { id: true, fullName: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!submission) {
      throw new NotFoundException('Bukti pembayaran tidak ditemukan');
    }

    return mapSubmissionFromPrisma(submission);
  }

  private isPaymentSubmissionSchemaError(error: any) {
    const message = String(error?.message ?? '');
    const code = String(error?.code ?? error?.meta?.code ?? '');
    const isSchemaError = code === '42P01' || code === '42704' || /PaymentSubmission|paymentsubmission/i.test(message);
    if (isSchemaError) {
      this.logger.warn(`Schema drift detected (code=${code}). Payment submission may be degraded.`);
    }
    return isSchemaError;
  }

  private handleSchemaError(error: any): never | void {
    if (this.isPaymentSubmissionSchemaError(error)) {
      throw new ServiceUnavailableException(
        'Fitur payment submission belum aktif penuh karena database belum sinkron. Jalankan sinkronisasi schema terlebih dahulu.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Notification helpers
  // ---------------------------------------------------------------------------

  private async notifyOwnerAdminPaymentSubmitted(submission: SubmissionDetail) {
    try {
      const recipients = await this.prisma.user.findMany({
        where: {
          role: { in: [UserRole.OWNER, UserRole.ADMIN] },
          isActive: true,
        },
        select: { id: true },
      });
      if (!recipients.length) return;

      const roomLabel = submission.room.code
        ? `${submission.room.code}${submission.room.name ? ` - ${submission.room.name}` : ''}`
        : 'kamar terkait';
      const amount = submission.amountRupiah.toLocaleString('id-ID');
      const body = `${submission.tenant.fullName} mengirim bukti pembayaran Rp ${amount} untuk ${submission.invoice.invoiceNumber} (${roomLabel}).`;
      const results = await Promise.allSettled(
        recipients.map((recipient) =>
          this.appNotificationService.createOnce({
            recipientUserId: recipient.id,
            title: 'Bukti Pembayaran Baru',
            body,
            linkTo: '/payment-submissions/review',
            entityType: 'PaymentSubmission',
            entityId: String(submission.id),
          }),
        ),
      );

      const failedCount = results.filter((result) => result.status === 'rejected').length;
      if (failedCount > 0) {
        this.logger.warn(
          `Gagal mengirim ${failedCount} notifikasi OWNER/ADMIN untuk payment submission #${submission.id}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Gagal menyiapkan notifikasi OWNER/ADMIN untuk payment submission #${submission.id}`,
        (error as Error)?.message ?? error,
      );
    }
  }

  private async resolveTenantPortalUser(tenantId: number): Promise<number | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        role: UserRole.TENANT,
        isActive: true,
      },
      select: { id: true },
    });
    return user ? user.id : null;
  }

  private async notifyPaymentApproved(tenantId: number, submissionId: number) {
    try {
      const recipientUserId = await this.resolveTenantPortalUser(tenantId);
      if (!recipientUserId) return;

      const title = 'Pembayaran diterima';
      const entityType = 'PAYMENT_SUBMISSION';
      const entityId = String(submissionId);

      const duplicate = await this.prisma.appNotification.findFirst({
        where: { recipientUserId, entityType, entityId, title },
        select: { id: true },
      });
      if (duplicate) return;

      await this.appNotificationService.create({
        recipientUserId,
        title,
        body: 'Pembayaran Anda telah diverifikasi. Silakan cek status hunian/booking Anda di portal.',
        entityType,
        entityId,
        linkTo: '/portal/stay',
      });
    } catch {
      // Notification failure must not rollback approval
    }
  }

  private async notifyPaymentRejected(tenantId: number, submissionId: number, reviewNotes: string) {
    try {
      const recipientUserId = await this.resolveTenantPortalUser(tenantId);
      if (!recipientUserId) return;

      const title = 'Bukti pembayaran ditolak';
      const entityType = 'PAYMENT_SUBMISSION';
      const entityId = String(submissionId);

      const duplicate = await this.prisma.appNotification.findFirst({
        where: { recipientUserId, entityType, entityId, title },
        select: { id: true },
      });
      if (duplicate) return;

      const safeNotes = reviewNotes?.trim() ?? '';
      const maxLen = 500;
      const body = safeNotes.length > 0
        ? safeNotes.slice(0, maxLen)
        : 'Bukti pembayaran Anda ditolak. Silakan unggah ulang bukti pembayaran.';

      await this.appNotificationService.create({
        recipientUserId,
        title,
        body,
        entityType,
        entityId,
        linkTo: '/portal/bookings',
      });
    } catch {
      // Notification failure must not rollback rejection
    }
  }

  /**
   * Check whether a tenant's submission references the given file key.
   * Used by the protected proof streaming endpoint.
   */
  async doesTenantOwnProof(tenantId: number, fileKey: string): Promise<boolean> {
    const count = await this.prisma.paymentSubmission.count({
      where: {
        tenantId,
        fileKey,
        status: { in: [PaymentSubmissionStatus.PENDING_REVIEW, PaymentSubmissionStatus.APPROVED, PaymentSubmissionStatus.REJECTED, PaymentSubmissionStatus.EXPIRED] },
      },
    });
    return count > 0;
  }
}
