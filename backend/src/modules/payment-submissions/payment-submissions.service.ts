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
  InvoiceStatus,
  PaymentMethod,
  PaymentSubmissionStatus,
  RoomStatus,
  StayStatus,
} from '../../common/enums/app.enums';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { serializePrismaResult } from '../../common/utils/serialization';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentSubmissionDto } from './dto/create-payment-submission.dto';
import { ReviewQueueQueryDto } from './dto/review-queue-query.dto';

interface SubmissionBaseRow {
  id: number;
  stayId: number;
  invoiceId: number;
  tenantId: number;
  submittedById: number;
  amountRupiah: number;
  paidAt: Date;
  paymentMethod: string;
  senderName: string | null;
  senderBankName: string | null;
  referenceNumber: string | null;
  notes: string | null;
  fileKey: string | null;
  fileUrl: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  status: string;
  reviewedById: number | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SubmissionListRow extends SubmissionBaseRow {
  tenantFullName: string;
  tenantPhone: string;
  roomId: number;
  roomCode: string;
  roomName: string | null;
  roomStatus: string;
  stayStatus: string;
  stayExpiresAt: Date | null;
  invoiceNumber: string;
  invoiceStatus: string;
  invoiceTotalAmountRupiah: number;
  invoicePaidAmountRupiah: number;
  invoiceRemainingAmountRupiah: number;
  submittedByName: string;
  reviewedByName: string | null;
}

interface SubmissionLockRow extends SubmissionBaseRow {
  tenantFullName: string;
  roomId: number;
  roomCode: string;
  roomStatus: string;
  roomIsActive: boolean;
  stayStatus: string;
  stayExpiresAt: Date | null;
  invoiceNumber: string;
  invoiceStatus: string;
  invoiceIssuedAt: Date | null;
  invoiceTotalAmountRupiah: number;
  invoicePaidAmountRupiah: number;
}

interface SubmissionEligibilityRow {
  stayId: number;
  invoiceId: number;
  tenantId: number;
  tenantFullName: string;
  roomId: number;
  roomCode: string;
  roomName: string | null;
  roomStatus: string;
  stayStatus: string;
  stayExpiresAt: Date | null;
  invoiceNumber: string;
  invoiceStatus: string;
  invoiceTotalAmountRupiah: number;
  invoicePaidAmountRupiah: number;
}

@Injectable()
export class PaymentSubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSubmission(user: CurrentUserPayload, dto: CreatePaymentSubmissionDto) {
    const tenantId = user.tenantId;
    if (!tenantId) {
      throw new ConflictException('Akun tenant belum terhubung ke data tenant');
    }

    const paidAt = this.parseDateOnly(dto.paidAt, 'Tanggal bayar tidak valid');
    if (paidAt > this.endOfDay(new Date())) {
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

      const remainingAmount = Math.max(
        eligibility.invoiceTotalAmountRupiah - eligibility.invoicePaidAmountRupiah,
        0,
      );

      if (remainingAmount <= 0) {
        throw new ConflictException('Invoice ini sudah lunas');
      }

      if (dto.amountRupiah > remainingAmount) {
        throw new ConflictException('Bukti pembayaran melebihi sisa tagihan invoice');
      }

      const existingPending = await this.prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
        SELECT id
        FROM "PaymentSubmission"
        WHERE "stayId" = ${dto.stayId}
          AND "invoiceId" = ${dto.invoiceId}
          AND status = CAST(${PaymentSubmissionStatus.PENDING_REVIEW} AS "PaymentSubmissionStatus")
        LIMIT 1
      `);

      if (existingPending.length > 0) {
        throw new ConflictException(
          'Masih ada bukti pembayaran lain yang sedang menunggu review untuk invoice ini',
        );
      }

      const created = await this.prisma.$transaction(async (tx) => {
        const insertedRows = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
          INSERT INTO "PaymentSubmission" (
            "stayId",
            "invoiceId",
            "tenantId",
            "submittedById",
            "amountRupiah",
            "paidAt",
            "paymentMethod",
            "senderName",
            "senderBankName",
            "referenceNumber",
            notes,
            "fileKey",
            "fileUrl",
            "originalFilename",
            "mimeType",
            "fileSizeBytes",
            status,
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${dto.stayId},
            ${dto.invoiceId},
            ${tenantId},
            ${user.id},
            ${dto.amountRupiah},
            ${paidAt},
            CAST(${dto.paymentMethod} AS "PaymentMethod"),
            ${dto.senderName ?? null},
            ${dto.senderBankName ?? null},
            ${dto.referenceNumber ?? null},
            ${dto.notes ?? null},
            ${dto.fileKey ?? null},
            ${dto.fileUrl ?? null},
            ${dto.originalFilename ?? null},
            ${dto.mimeType ?? null},
            ${dto.fileSizeBytes ?? null},
            CAST(${PaymentSubmissionStatus.PENDING_REVIEW} AS "PaymentSubmissionStatus"),
            NOW(),
            NOW()
          ) RETURNING id
        `);

        const submissionId = insertedRows[0]?.id;
        if (!submissionId) {
          throw new ConflictException('Bukti pembayaran gagal dibuat');
        }

        await tx.auditLog.create({
          data: {
            actorUserId: user.id,
            action: 'CREATE_PAYMENT_SUBMISSION',
            entityType: 'PaymentSubmission',
            entityId: String(submissionId),
            meta: {
              stayId: dto.stayId,
              invoiceId: dto.invoiceId,
              tenantId,
              amountRupiah: dto.amountRupiah,
              paymentMethod: dto.paymentMethod,
            } as any,
          },
        });

        return this.findSubmissionByIdTx(tx, submissionId);
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
    const searchPattern = query.search?.trim() ? `%${query.search.trim()}%` : null;
    const statusFilter = query.status
      ? Prisma.sql` AND ps.status = CAST(${query.status} AS "PaymentSubmissionStatus")`
      : Prisma.empty;
    const searchFilter = searchPattern
      ? Prisma.sql`
          AND (
            r.code ILIKE ${searchPattern}
            OR COALESCE(r.name, '') ILIKE ${searchPattern}
            OR i."invoiceNumber" ILIKE ${searchPattern}
            OR COALESCE(ps."referenceNumber", '') ILIKE ${searchPattern}
          )
        `
      : Prisma.empty;

    try {
      const items = await this.prisma.$queryRaw<SubmissionListRow[]>(Prisma.sql`
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
          t.phone AS "tenantPhone",
          r.id AS "roomId",
          r.code AS "roomCode",
          r.name AS "roomName",
          r.status AS "roomStatus",
          s.status AS "stayStatus",
          s."expiresAt" AS "stayExpiresAt",
          i."invoiceNumber",
          i.status AS "invoiceStatus",
          i."totalAmountRupiah" AS "invoiceTotalAmountRupiah",
          COALESCE((SELECT SUM(ip."amountRupiah")::int FROM "InvoicePayment" ip WHERE ip."invoiceId" = i.id), 0) AS "invoicePaidAmountRupiah",
          GREATEST(i."totalAmountRupiah" - COALESCE((SELECT SUM(ip."amountRupiah")::int FROM "InvoicePayment" ip WHERE ip."invoiceId" = i.id), 0), 0) AS "invoiceRemainingAmountRupiah",
          submitter."fullName" AS "submittedByName",
          reviewer."fullName" AS "reviewedByName"
        FROM "PaymentSubmission" ps
        INNER JOIN "Stay" s ON s.id = ps."stayId"
        INNER JOIN "Room" r ON r.id = s."roomId"
        INNER JOIN "Tenant" t ON t.id = ps."tenantId"
        INNER JOIN "Invoice" i ON i.id = ps."invoiceId"
        INNER JOIN "User" submitter ON submitter.id = ps."submittedById"
        LEFT JOIN "User" reviewer ON reviewer.id = ps."reviewedById"
        WHERE ps."tenantId" = ${tenantId}
        ${statusFilter}
        ${searchFilter}
        ORDER BY ps."createdAt" DESC, ps.id DESC
        LIMIT ${take}
        OFFSET ${skip}
      `);

      const countRows = await this.prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM "PaymentSubmission" ps
        INNER JOIN "Stay" s ON s.id = ps."stayId"
        INNER JOIN "Room" r ON r.id = s."roomId"
        INNER JOIN "Invoice" i ON i.id = ps."invoiceId"
        WHERE ps."tenantId" = ${tenantId}
        ${statusFilter}
        ${searchFilter}
      `);

      return {
        items: serializePrismaResult(items.map((item) => this.mapSubmissionRow(item))),
        meta: buildMeta(page, limit, Number(countRows[0]?.total ?? 0)),
      };
    } catch (error) {
      this.handleSchemaError(error);
      throw error;
    }
  }

  async findReviewQueue(query: ReviewQueueQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const searchPattern = query.search?.trim() ? `%${query.search.trim()}%` : null;
    const paymentMethod = query.paymentMethod ?? null;
    const roomId = query.roomId ? Number(query.roomId) : null;
    const tenantId = query.tenantId ? Number(query.tenantId) : null;
    const status = query.status ?? PaymentSubmissionStatus.PENDING_REVIEW;

    const paymentMethodFilter = paymentMethod
      ? Prisma.sql` AND ps."paymentMethod" = CAST(${paymentMethod} AS "PaymentMethod")`
      : Prisma.empty;
    const roomFilter = roomId ? Prisma.sql` AND r.id = ${roomId}` : Prisma.empty;
    const tenantFilter = tenantId ? Prisma.sql` AND t.id = ${tenantId}` : Prisma.empty;
    const searchFilter = searchPattern
      ? Prisma.sql`
          AND (
            r.code ILIKE ${searchPattern}
            OR COALESCE(r.name, '') ILIKE ${searchPattern}
            OR t."fullName" ILIKE ${searchPattern}
            OR t.phone ILIKE ${searchPattern}
            OR i."invoiceNumber" ILIKE ${searchPattern}
            OR COALESCE(ps."referenceNumber", '') ILIKE ${searchPattern}
          )
        `
      : Prisma.empty;

    try {
      const items = await this.prisma.$queryRaw<SubmissionListRow[]>(Prisma.sql`
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
          t.phone AS "tenantPhone",
          r.id AS "roomId",
          r.code AS "roomCode",
          r.name AS "roomName",
          r.status AS "roomStatus",
          s.status AS "stayStatus",
          s."expiresAt" AS "stayExpiresAt",
          i."invoiceNumber",
          i.status AS "invoiceStatus",
          i."totalAmountRupiah" AS "invoiceTotalAmountRupiah",
          COALESCE((SELECT SUM(ip."amountRupiah")::int FROM "InvoicePayment" ip WHERE ip."invoiceId" = i.id), 0) AS "invoicePaidAmountRupiah",
          GREATEST(i."totalAmountRupiah" - COALESCE((SELECT SUM(ip."amountRupiah")::int FROM "InvoicePayment" ip WHERE ip."invoiceId" = i.id), 0), 0) AS "invoiceRemainingAmountRupiah",
          submitter."fullName" AS "submittedByName",
          reviewer."fullName" AS "reviewedByName"
        FROM "PaymentSubmission" ps
        INNER JOIN "Stay" s ON s.id = ps."stayId"
        INNER JOIN "Room" r ON r.id = s."roomId"
        INNER JOIN "Tenant" t ON t.id = ps."tenantId"
        INNER JOIN "Invoice" i ON i.id = ps."invoiceId"
        INNER JOIN "User" submitter ON submitter.id = ps."submittedById"
        LEFT JOIN "User" reviewer ON reviewer.id = ps."reviewedById"
        WHERE ps.status = CAST(${status} AS "PaymentSubmissionStatus")
        ${paymentMethodFilter}
        ${roomFilter}
        ${tenantFilter}
        ${searchFilter}
        ORDER BY ps."createdAt" ASC, ps.id ASC
        LIMIT ${take}
        OFFSET ${skip}
      `);

      const countRows = await this.prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM "PaymentSubmission" ps
        INNER JOIN "Stay" s ON s.id = ps."stayId"
        INNER JOIN "Room" r ON r.id = s."roomId"
        INNER JOIN "Tenant" t ON t.id = ps."tenantId"
        INNER JOIN "Invoice" i ON i.id = ps."invoiceId"
        WHERE ps.status = CAST(${status} AS "PaymentSubmissionStatus")
        ${paymentMethodFilter}
        ${roomFilter}
        ${tenantFilter}
        ${searchFilter}
      `);

      return {
        items: serializePrismaResult(items.map((item) => this.mapSubmissionRow(item))),
        meta: buildMeta(page, limit, Number(countRows[0]?.total ?? 0)),
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

        const remainingAmount = Math.max(
          submission.invoiceTotalAmountRupiah - submission.invoicePaidAmountRupiah,
          0,
        );

        if (submission.amountRupiah > remainingAmount) {
          throw new ConflictException('Approval pembayaran melebihi sisa tagihan invoice');
        }

        const payment = await tx.invoicePayment.create({
          data: {
            invoiceId: submission.invoiceId,
            paymentDate: new Date(submission.paidAt),
            amountRupiah: submission.amountRupiah,
            method: submission.paymentMethod as PaymentMethod,
            referenceNo: submission.referenceNumber,
            note: this.buildApprovalPaymentNote(submission),
            capturedById: user.id,
          },
        });

        const nextPaidAmount = submission.invoicePaidAmountRupiah + submission.amountRupiah;

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
            status: nextInvoiceStatus as any,
            issuedAt: nextIssuedAt,
            paidAt: nextPaidAt,
          },
        });

        await tx.$executeRaw(Prisma.sql`
          UPDATE "PaymentSubmission"
          SET status = CAST(${PaymentSubmissionStatus.APPROVED} AS "PaymentSubmissionStatus"),
              "reviewedById" = ${user.id},
              "reviewedAt" = NOW(),
              "updatedAt" = NOW()
          WHERE id = ${submissionId}
            AND status = CAST(${PaymentSubmissionStatus.PENDING_REVIEW} AS "PaymentSubmissionStatus")
        `);

        if (nextInvoiceStatus === InvoiceStatus.PAID) {
          await tx.room.update({
            where: { id: submission.roomId },
            data: { status: RoomStatus.OCCUPIED as any },
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
              invoicePaymentId: payment.id,
              invoiceStatusAfter: nextInvoiceStatus,
            } as any,
          },
        });

        return this.findSubmissionByIdTx(tx, submissionId);
      });

      return serializePrismaResult(approved);
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

        await tx.$executeRaw(Prisma.sql`
          UPDATE "PaymentSubmission"
          SET status = CAST(${PaymentSubmissionStatus.REJECTED} AS "PaymentSubmissionStatus"),
              "reviewedById" = ${user.id},
              "reviewedAt" = NOW(),
              "reviewNotes" = ${reviewNotes},
              "updatedAt" = NOW()
          WHERE id = ${submissionId}
            AND status = CAST(${PaymentSubmissionStatus.PENDING_REVIEW} AS "PaymentSubmissionStatus")
        `);

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
            } as any,
          },
        });

        return this.findSubmissionByIdTx(tx, submissionId);
      });

      return serializePrismaResult(rejected);
    } catch (error) {
      this.handleSchemaError(error);
      throw error;
    }
  }

  async runExpiryCheck(user?: CurrentUserPayload) {
    try {
      const expiredBookings = await this.prisma.$queryRaw<Array<{ stayId: number; roomId: number }>>(Prisma.sql`
        SELECT s.id AS "stayId", s."roomId"
        FROM "Stay" s
        INNER JOIN "Room" r ON r.id = s."roomId"
        WHERE s.status = CAST(${StayStatus.ACTIVE} AS "StayStatus")
          AND r.status = CAST(${RoomStatus.RESERVED} AS "RoomStatus")
          AND s."expiresAt" IS NOT NULL
          AND s."expiresAt" < NOW()
          AND NOT EXISTS (
            SELECT 1
            FROM "PaymentSubmission" ps
            WHERE ps."stayId" = s.id
              AND ps.status = CAST(${PaymentSubmissionStatus.APPROVED} AS "PaymentSubmissionStatus")
              AND ps."reviewedAt" >= NOW() - INTERVAL '1 minute'
          )
      `);

      const processedStayIds: number[] = [];

      for (const booking of expiredBookings) {
        await this.prisma.$transaction(async (tx) => {
          await tx.$executeRaw(Prisma.sql`
            UPDATE "PaymentSubmission"
            SET status = CAST(${PaymentSubmissionStatus.EXPIRED} AS "PaymentSubmissionStatus"),
                "updatedAt" = NOW()
            WHERE "stayId" = ${booking.stayId}
              AND status = CAST(${PaymentSubmissionStatus.PENDING_REVIEW} AS "PaymentSubmissionStatus")
          `);

          await tx.$executeRaw(Prisma.sql`
            UPDATE "Stay"
            SET status = CAST(${StayStatus.CANCELLED} AS "StayStatus"),
                "checkoutReason" = ${'Booking kadaluarsa otomatis'},
                "updatedAt" = NOW()
            WHERE id = ${booking.stayId}
          `);

          await tx.room.update({
            where: { id: booking.roomId },
            data: { status: RoomStatus.AVAILABLE as any },
          });

          await tx.auditLog.create({
            data: {
              actorUserId: user?.id ?? null,
              action: 'EXPIRE_BOOKING',
              entityType: 'Stay',
              entityId: String(booking.stayId),
              meta: {
                roomId: booking.roomId,
                source: user ? 'MANUAL_EXPIRY_CHECK' : 'SYSTEM_EXPIRY_CHECK',
              } as any,
            },
          });
        });

        processedStayIds.push(booking.stayId);
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
    const rows = await this.prisma.$queryRaw<SubmissionEligibilityRow[]>(Prisma.sql`
      SELECT
        s.id AS "stayId",
        i.id AS "invoiceId",
        s."tenantId",
        t."fullName" AS "tenantFullName",
        r.id AS "roomId",
        r.code AS "roomCode",
        r.name AS "roomName",
        r.status AS "roomStatus",
        s.status AS "stayStatus",
        s."expiresAt" AS "stayExpiresAt",
        i."invoiceNumber",
        i.status AS "invoiceStatus",
        i."totalAmountRupiah" AS "invoiceTotalAmountRupiah",
        COALESCE((SELECT SUM(ip."amountRupiah")::int FROM "InvoicePayment" ip WHERE ip."invoiceId" = i.id), 0) AS "invoicePaidAmountRupiah"
      FROM "Stay" s
      INNER JOIN "Tenant" t ON t.id = s."tenantId"
      INNER JOIN "Room" r ON r.id = s."roomId"
      INNER JOIN "Invoice" i ON i."stayId" = s.id
      WHERE s.id = ${stayId}
        AND i.id = ${invoiceId}
        AND s."tenantId" = ${tenantId}
      LIMIT 1
    `);

    return rows[0] ?? null;
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
      FOR UPDATE OF ps, s, r, i
    `);

    return rows[0] ?? null;
  }

  private async findSubmissionByIdTx(tx: Prisma.TransactionClient, submissionId: number) {
    const rows = await tx.$queryRaw<SubmissionListRow[]>(Prisma.sql`
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
        t.phone AS "tenantPhone",
        r.id AS "roomId",
        r.code AS "roomCode",
        r.name AS "roomName",
        r.status AS "roomStatus",
        s.status AS "stayStatus",
        s."expiresAt" AS "stayExpiresAt",
        i."invoiceNumber",
        i.status AS "invoiceStatus",
        i."totalAmountRupiah" AS "invoiceTotalAmountRupiah",
        COALESCE((SELECT SUM(ip."amountRupiah")::int FROM "InvoicePayment" ip WHERE ip."invoiceId" = i.id), 0) AS "invoicePaidAmountRupiah",
        GREATEST(i."totalAmountRupiah" - COALESCE((SELECT SUM(ip."amountRupiah")::int FROM "InvoicePayment" ip WHERE ip."invoiceId" = i.id), 0), 0) AS "invoiceRemainingAmountRupiah",
        submitter."fullName" AS "submittedByName",
        reviewer."fullName" AS "reviewedByName"
      FROM "PaymentSubmission" ps
      INNER JOIN "Stay" s ON s.id = ps."stayId"
      INNER JOIN "Room" r ON r.id = s."roomId"
      INNER JOIN "Tenant" t ON t.id = ps."tenantId"
      INNER JOIN "Invoice" i ON i.id = ps."invoiceId"
      INNER JOIN "User" submitter ON submitter.id = ps."submittedById"
      LEFT JOIN "User" reviewer ON reviewer.id = ps."reviewedById"
      WHERE ps.id = ${submissionId}
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException('Bukti pembayaran tidak ditemukan');
    }

    return this.mapSubmissionRow(rows[0]);
  }

  private mapSubmissionRow(row: SubmissionListRow) {
    return {
      id: row.id,
      stayId: row.stayId,
      invoiceId: row.invoiceId,
      tenantId: row.tenantId,
      amountRupiah: row.amountRupiah,
      paidAt: row.paidAt,
      paymentMethod: row.paymentMethod,
      senderName: row.senderName,
      senderBankName: row.senderBankName,
      referenceNumber: row.referenceNumber,
      notes: row.notes,
      fileKey: row.fileKey,
      fileUrl: row.fileUrl,
      originalFilename: row.originalFilename,
      mimeType: row.mimeType,
      fileSizeBytes: row.fileSizeBytes,
      status: row.status,
      reviewedAt: row.reviewedAt,
      reviewNotes: row.reviewNotes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tenant: {
        id: row.tenantId,
        fullName: row.tenantFullName,
        phone: row.tenantPhone,
      },
      room: {
        id: row.roomId,
        code: row.roomCode,
        name: row.roomName,
        status: row.roomStatus,
      },
      stay: {
        id: row.stayId,
        status: row.stayStatus,
        expiresAt: row.stayExpiresAt,
      },
      invoice: {
        id: row.invoiceId,
        invoiceNumber: row.invoiceNumber,
        status: row.invoiceStatus,
        totalAmountRupiah: row.invoiceTotalAmountRupiah,
        paidAmountRupiah: row.invoicePaidAmountRupiah,
        remainingAmountRupiah: row.invoiceRemainingAmountRupiah,
      },
      submittedBy: {
        id: row.submittedById,
        fullName: row.submittedByName,
      },
      reviewedBy: row.reviewedById
        ? {
            id: row.reviewedById,
            fullName: row.reviewedByName,
          }
        : null,
    };
  }

  private buildApprovalPaymentNote(submission: SubmissionLockRow) {
    const fragments = ['Pembayaran hasil approval bukti bayar tenant'];
    if (submission.referenceNumber) fragments.push(`Ref: ${submission.referenceNumber}`);
    if (submission.senderName) fragments.push(`Pengirim: ${submission.senderName}`);
    return fragments.join(' | ');
  }

  private parseDateOnly(value: string, errorMessage: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(errorMessage);
    }
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private endOfDay(date: Date) {
    const clone = new Date(date);
    clone.setHours(23, 59, 59, 999);
    return clone;
  }

  private isPaymentSubmissionSchemaError(error: any) {
    const message = String(error?.message ?? '');
    const code = String(error?.code ?? error?.meta?.code ?? '');
    return code === '42P01' || code === '42704' || /PaymentSubmission|paymentsubmission/i.test(message);
  }

  private handleSchemaError(error: any): never | void {
    if (this.isPaymentSubmissionSchemaError(error)) {
      throw new ServiceUnavailableException(
        'Fitur payment submission belum aktif penuh karena database belum sinkron. Jalankan sinkronisasi schema terlebih dahulu.',
      );
    }
  }
}