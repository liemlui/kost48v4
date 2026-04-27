import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Prisma } from 'src/generated/prisma';
import {
  BookingDepositPaymentStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentSubmissionStatus,
  PaymentSubmissionTargetType,
  RoomStatus,
  StayStatus,
} from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { serializePrismaResult } from '../../common/utils/serialization';
import { PrismaService } from '../../prisma/prisma.service';
import { AppNotificationService } from '../notifications/app-notification.service';
import { UserRole } from '../../common/enums/app.enums';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly appNotificationService: AppNotificationService,
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

      if (eligibility.stayStatus !== StayStatus.ACTIVE) {
        throw new ConflictException('Booking tidak lagi aktif');
      }

      if (eligibility.roomStatus !== RoomStatus.RESERVED) {
        throw new ConflictException('Booking ini tidak lagi menunggu pembayaran reserved');
      }

      if ([InvoiceStatus.PAID, InvoiceStatus.CANCELLED].includes(eligibility.invoiceStatus as InvoiceStatus)) {
        throw new ConflictException('Invoice ini tidak dapat menerima bukti pembayaran baru');
      }

      if (eligibility.stayExpiresAt && new Date(eligibility.stayExpiresAt) < new Date()) {
        throw new ConflictException('Booking sudah kedaluwarsa dan tidak dapat menerima bukti pembayaran');
      }

      const invoiceRemaining = Math.max(
        eligibility.invoiceTotalAmountRupiah - eligibility.invoicePaidAmountRupiah,
        0,
      );

      const depositRemaining = Math.max(
        (eligibility.stayDepositAmountRupiah ?? 0) - (eligibility.stayDepositPaidAmountRupiah ?? 0),
        0,
      );

      const combinedRemaining = invoiceRemaining + depositRemaining;

      if (combinedRemaining <= 0) {
        throw new ConflictException('Pembayaran awal (sewa + deposit) sudah lunas');
      }

      if (dto.amountRupiah !== combinedRemaining) {
        throw new ConflictException(
          `Pembayaran harus tepat sebesar total yang tersisa: Rp ${combinedRemaining.toLocaleString('id-ID')}`,
        );
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

      return serializePrismaResult(created);
    } catch (error) {
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
    try {
      const approved = await this.prisma.$transaction(async (tx) => {
        const submission = await this.lockSubmissionTx(tx, submissionId);
        if (!submission) {
          throw new NotFoundException('Bukti pembayaran tidak ditemukan');
        }

        if (submission.status !== PaymentSubmissionStatus.PENDING_REVIEW) {
          throw new ConflictException('Bukti pembayaran ini sudah pernah diproses');
        }

        if (submission.stayStatus !== StayStatus.ACTIVE) {
          throw new ConflictException('Booking tidak lagi aktif');
        }

        if (submission.roomStatus !== RoomStatus.RESERVED) {
          throw new ConflictException('Booking ini tidak lagi berada pada status reserved');
        }

        if (!submission.roomIsActive) {
          throw new ConflictException('Kamar tidak aktif untuk aktivasi booking');
        }

        if ([InvoiceStatus.CANCELLED, InvoiceStatus.PAID].includes(submission.invoiceStatus as InvoiceStatus)) {
          throw new ConflictException('Invoice ini tidak dapat menerima approval pembayaran baru');
        }

        if (submission.stayExpiresAt && new Date(submission.stayExpiresAt) < new Date()) {
          throw new ConflictException('Booking sudah kedaluwarsa dan tidak dapat disetujui');
        }

        const freshPayments = await tx.invoicePayment.aggregate({
          where: { invoiceId: submission.invoiceId },
          _sum: { amountRupiah: true },
        });
        const freshPaidAmount = freshPayments._sum.amountRupiah ?? 0;

        const remainingAmount = Math.max(
          submission.invoiceTotalAmountRupiah - freshPaidAmount,
          0,
        );

        const rentPortion = Math.min(submission.amountRupiah, remainingAmount);
        const depositPortion = Math.max(0, submission.amountRupiah - rentPortion);

        if (rentPortion > 0) {
          await tx.invoicePayment.create({
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

        await tx.paymentSubmission.update({
          where: { id: submissionId },
          data: {
            status: PaymentSubmissionStatus.APPROVED,
            reviewedById: user.id,
            reviewedAt: new Date(),
          },
        });

        const stayDepositAmount = submission.stayDepositAmountRupiah ?? 0;
        const stayDepositPaidBefore = submission.stayDepositPaidAmountRupiah ?? 0;
        const stayDepositPaidAfter = stayDepositPaidBefore + depositPortion;

        const stayDepositPaymentStatus: BookingDepositPaymentStatus =
          stayDepositPaidAfter >= stayDepositAmount && stayDepositAmount > 0
            ? BookingDepositPaymentStatus.PAID
            : stayDepositPaidAfter > 0
              ? BookingDepositPaymentStatus.PARTIAL
              : BookingDepositPaymentStatus.UNPAID;

        await tx.stay.update({
          where: { id: submission.stayId },
          data: {
            depositPaidAmountRupiah: stayDepositPaidAfter,
            depositPaymentStatus: stayDepositPaymentStatus,
          },
        });

        if (nextInvoiceStatus === InvoiceStatus.PAID) {
          await tx.room.update({
            where: { id: submission.roomId },
            data: { status: RoomStatus.OCCUPIED },
          });
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
      return result;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Approval pembayaran bentrok dengan data yang sudah ada');
      }
      this.handleSchemaError(error);
      throw error;
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
        select: { id: true, roomId: true, status: true },
      });

      if (!booking) {
        throw new NotFoundException('Booking tidak ditemukan');
      }

      if (booking.status !== StayStatus.ACTIVE) {
        throw new ConflictException('Hanya booking dengan status ACTIVE yang dapat ditutup manual');
      }

      const room = await this.prisma.room.findUnique({
        where: { id: booking.roomId },
        select: { status: true },
      });

      if (room?.status !== RoomStatus.RESERVED) {
        throw new ConflictException('Booking ini sudah tidak dalam status reserved');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.paymentSubmission.updateMany({
          where: {
            stayId,
            status: PaymentSubmissionStatus.PENDING_REVIEW,
          },
          data: { status: PaymentSubmissionStatus.EXPIRED },
        });

        await tx.invoice.updateMany({
          where: {
            stayId,
            status: { in: ['DRAFT', 'ISSUED', 'PARTIAL'] },
          },
          data: {
            status: 'CANCELLED',
            cancelReason: 'Booking ditutup manual oleh admin',
          },
        });

        await tx.stay.update({
          where: { id: stayId },
          data: {
            status: StayStatus.CANCELLED,
            checkoutReason: 'Booking ditutup manual oleh admin',
          },
        });

        await tx.room.update({
          where: { id: booking.roomId },
          data: { status: RoomStatus.AVAILABLE },
        });

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

      return { message: 'Booking berhasil ditutup', stayId };
    } catch (error) {
      this.handleSchemaError(error);
      throw error;
    }
  }

  async runExpiryCheck(user?: CurrentUserPayload) {
    try {
      const expiredBookings = await this.prisma.stay.findMany({
        where: {
          status: StayStatus.ACTIVE,
          room: { status: RoomStatus.RESERVED },
          expiresAt: { not: null, lt: new Date() },
          paymentSubmissions: {
            none: {
              status: PaymentSubmissionStatus.APPROVED,
              reviewedAt: { gte: new Date(Date.now() - 60 * 1000) },
            },
          },
        },
        select: { id: true, roomId: true },
      });

      const processedStayIds: number[] = [];

      for (const booking of expiredBookings) {
        await this.prisma.$transaction(async (tx) => {
          await tx.paymentSubmission.updateMany({
            where: {
              stayId: booking.id,
              status: PaymentSubmissionStatus.PENDING_REVIEW,
            },
            data: { status: PaymentSubmissionStatus.EXPIRED },
          });

          await tx.invoice.updateMany({
            where: {
              stayId: booking.id,
              status: { in: ['DRAFT', 'ISSUED', 'PARTIAL'] },
            },
            data: {
              status: 'CANCELLED',
              cancelReason: 'Booking kadaluarsa otomatis',
            },
          });

          await tx.stay.update({
            where: { id: booking.id },
            data: {
              status: StayStatus.CANCELLED,
              checkoutReason: 'Booking kadaluarsa otomatis',
            },
          });

          await tx.room.update({
            where: { id: booking.roomId },
            data: { status: RoomStatus.AVAILABLE },
          });

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
        });

        processedStayIds.push(booking.id);
      }

      return {
        expiredCount: processedStayIds.length,
        stayIds: processedStayIds,
      };
    } catch (error) {
      this.handleSchemaError(error);
      throw error;
    }
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
            payments: { select: { amountRupiah: true } },
          },
        },
      },
    });

    if (!stay || stay.tenantId !== tenantId) return null;

    const invoice = stay.invoices[0];
    if (!invoice) return null;

    const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amountRupiah, 0);

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
      invoiceTotalAmountRupiah: invoice.totalAmountRupiah,
      invoicePaidAmountRupiah: paidAmount,
      stayDepositAmountRupiah: stay.depositAmountRupiah,
      stayDepositPaidAmountRupiah: stay.depositPaidAmountRupiah,
      stayDepositPaymentStatus: stay.depositPaymentStatus,
    };
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
        s."expiresAt" AS "stayExpiresAt",
        i."invoiceNumber",
        i.status AS "invoiceStatus",
        i."issuedAt" AS "invoiceIssuedAt",
        i."totalAmountRupiah" AS "invoiceTotalAmountRupiah",
        COALESCE((SELECT SUM(ip."amountRupiah")::int FROM "InvoicePayment" ip WHERE ip."invoiceId" = i.id), 0) AS "invoicePaidAmountRupiah"
      FROM "PaymentSubmission" ps
      INNER JOIN "Stay" s ON s.id = ps."stayId"
      INNER JOIN "Room" r ON r.id = s."roomId"
      INNER JOIN "Invoice" i ON i.id = ps."invoiceId"
      INNER JOIN "Tenant" t ON t.id = ps."tenantId"
      WHERE ps.id = ${submissionId}
      FOR UPDATE OF ps
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
    console.error('=== PAYMENT SUBMISSION ERROR ===', { code, message: message.slice(0, 500) });
    return code === '42P01' || code === '42704' || /PaymentSubmission|paymentsubmission/i.test(message);
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
        body: 'Pembayaran Anda telah diverifikasi. Hunian Anda sudah aktif.',
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
}
