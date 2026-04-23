import { NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmissionEligibilityRow, SubmissionListRow, SubmissionLockRow } from './payment-submissions.types';
import { mapSubmissionRow } from './payment-submissions.mapper';

export async function findEligibleSubmissionTarget(
  prisma: PrismaService,
  tenantId: number,
  stayId: number,
  invoiceId: number,
) {
  const rows = await prisma.$queryRaw<SubmissionEligibilityRow[]>(Prisma.sql`
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

export async function lockSubmissionTx(tx: Prisma.TransactionClient, submissionId: number) {
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

export async function findSubmissionByIdTx(tx: Prisma.TransactionClient, submissionId: number) {
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

  return mapSubmissionRow(rows[0]);
}

export async function findSubmissionMinePage(
  prisma: PrismaService,
  tenantId: number,
  params: { skip: number; take: number; status?: string; searchPattern: string | null },
) {
  const statusFilter = params.status
    ? Prisma.sql` AND ps.status = CAST(${params.status} AS "PaymentSubmissionStatus")`
    : Prisma.empty;
  const searchFilter = params.searchPattern
    ? Prisma.sql`
        AND (
          r.code ILIKE ${params.searchPattern}
          OR COALESCE(r.name, '') ILIKE ${params.searchPattern}
          OR i."invoiceNumber" ILIKE ${params.searchPattern}
          OR COALESCE(ps."referenceNumber", '') ILIKE ${params.searchPattern}
        )
      `
    : Prisma.empty;

  const items = await prisma.$queryRaw<SubmissionListRow[]>(Prisma.sql`
    SELECT
      ps.id, ps."stayId", ps."invoiceId", ps."tenantId", ps."submittedById", ps."amountRupiah", ps."paidAt",
      ps."paymentMethod", ps."senderName", ps."senderBankName", ps."referenceNumber", ps.notes, ps."fileKey",
      ps."fileUrl", ps."originalFilename", ps."mimeType", ps."fileSizeBytes", ps.status, ps."reviewedById",
      ps."reviewedAt", ps."reviewNotes", ps."createdAt", ps."updatedAt",
      t."fullName" AS "tenantFullName", t.phone AS "tenantPhone",
      r.id AS "roomId", r.code AS "roomCode", r.name AS "roomName", r.status AS "roomStatus",
      s.status AS "stayStatus", s."expiresAt" AS "stayExpiresAt",
      i."invoiceNumber", i.status AS "invoiceStatus", i."totalAmountRupiah" AS "invoiceTotalAmountRupiah",
      COALESCE((SELECT SUM(ip."amountRupiah")::int FROM "InvoicePayment" ip WHERE ip."invoiceId" = i.id), 0) AS "invoicePaidAmountRupiah",
      GREATEST(i."totalAmountRupiah" - COALESCE((SELECT SUM(ip."amountRupiah")::int FROM "InvoicePayment" ip WHERE ip."invoiceId" = i.id), 0), 0) AS "invoiceRemainingAmountRupiah",
      submitter."fullName" AS "submittedByName", reviewer."fullName" AS "reviewedByName"
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
    LIMIT ${params.take}
    OFFSET ${params.skip}
  `);

  const countRows = await prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS total
    FROM "PaymentSubmission" ps
    INNER JOIN "Stay" s ON s.id = ps."stayId"
    INNER JOIN "Room" r ON r.id = s."roomId"
    INNER JOIN "Invoice" i ON i.id = ps."invoiceId"
    WHERE ps."tenantId" = ${tenantId}
    ${statusFilter}
    ${searchFilter}
  `);

  return { items, total: Number(countRows[0]?.total ?? 0) };
}

export async function findSubmissionReviewQueuePage(
  prisma: PrismaService,
  params: { skip: number; take: number; status: string; searchPattern: string | null; paymentMethod?: string | null; roomId?: number | null; tenantId?: number | null },
) {
  const paymentMethodFilter = params.paymentMethod
    ? Prisma.sql` AND ps."paymentMethod" = CAST(${params.paymentMethod} AS "PaymentMethod")`
    : Prisma.empty;
  const roomFilter = params.roomId ? Prisma.sql` AND r.id = ${params.roomId}` : Prisma.empty;
  const tenantFilter = params.tenantId ? Prisma.sql` AND t.id = ${params.tenantId}` : Prisma.empty;
  const searchFilter = params.searchPattern
    ? Prisma.sql`
        AND (
          r.code ILIKE ${params.searchPattern}
          OR COALESCE(r.name, '') ILIKE ${params.searchPattern}
          OR t."fullName" ILIKE ${params.searchPattern}
          OR t.phone ILIKE ${params.searchPattern}
          OR i."invoiceNumber" ILIKE ${params.searchPattern}
          OR COALESCE(ps."referenceNumber", '') ILIKE ${params.searchPattern}
        )
      `
    : Prisma.empty;

  const items = await prisma.$queryRaw<SubmissionListRow[]>(Prisma.sql`
    SELECT
      ps.id, ps."stayId", ps."invoiceId", ps."tenantId", ps."submittedById", ps."amountRupiah", ps."paidAt",
      ps."paymentMethod", ps."senderName", ps."senderBankName", ps."referenceNumber", ps.notes, ps."fileKey",
      ps."fileUrl", ps."originalFilename", ps."mimeType", ps."fileSizeBytes", ps.status, ps."reviewedById",
      ps."reviewedAt", ps."reviewNotes", ps."createdAt", ps."updatedAt",
      t."fullName" AS "tenantFullName", t.phone AS "tenantPhone",
      r.id AS "roomId", r.code AS "roomCode", r.name AS "roomName", r.status AS "roomStatus",
      s.status AS "stayStatus", s."expiresAt" AS "stayExpiresAt",
      i."invoiceNumber", i.status AS "invoiceStatus", i."totalAmountRupiah" AS "invoiceTotalAmountRupiah",
      COALESCE((SELECT SUM(ip."amountRupiah")::int FROM "InvoicePayment" ip WHERE ip."invoiceId" = i.id), 0) AS "invoicePaidAmountRupiah",
      GREATEST(i."totalAmountRupiah" - COALESCE((SELECT SUM(ip."amountRupiah")::int FROM "InvoicePayment" ip WHERE ip."invoiceId" = i.id), 0), 0) AS "invoiceRemainingAmountRupiah",
      submitter."fullName" AS "submittedByName", reviewer."fullName" AS "reviewedByName"
    FROM "PaymentSubmission" ps
    INNER JOIN "Stay" s ON s.id = ps."stayId"
    INNER JOIN "Room" r ON r.id = s."roomId"
    INNER JOIN "Tenant" t ON t.id = ps."tenantId"
    INNER JOIN "Invoice" i ON i.id = ps."invoiceId"
    INNER JOIN "User" submitter ON submitter.id = ps."submittedById"
    LEFT JOIN "User" reviewer ON reviewer.id = ps."reviewedById"
    WHERE ps.status = CAST(${params.status} AS "PaymentSubmissionStatus")
    ${paymentMethodFilter}
    ${roomFilter}
    ${tenantFilter}
    ${searchFilter}
    ORDER BY ps."createdAt" ASC, ps.id ASC
    LIMIT ${params.take}
    OFFSET ${params.skip}
  `);

  const countRows = await prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS total
    FROM "PaymentSubmission" ps
    INNER JOIN "Stay" s ON s.id = ps."stayId"
    INNER JOIN "Room" r ON r.id = s."roomId"
    INNER JOIN "Tenant" t ON t.id = ps."tenantId"
    INNER JOIN "Invoice" i ON i.id = ps."invoiceId"
    WHERE ps.status = CAST(${params.status} AS "PaymentSubmissionStatus")
    ${paymentMethodFilter}
    ${roomFilter}
    ${tenantFilter}
    ${searchFilter}
  `);

  return { items, total: Number(countRows[0]?.total ?? 0) };
}
