-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF', 'TENANT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RoomCategory" AS ENUM ('ECONOMY', 'STANDARD', 'DELUXE');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('REGULAR', 'MEZZANINE');

-- CreateEnum
CREATE TYPE "RoomSize" AS ENUM ('STANDARD', 'LARGE');

-- CreateEnum
CREATE TYPE "PricingTerm" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'SMESTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "StayStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('HELD', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FORFEITED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NONE', 'PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "UtilityType" AS ENUM ('ELECTRICITY', 'WATER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceLineType" AS ENUM ('RENT', 'ELECTRICITY', 'WATER', 'PENALTY', 'DISCOUNT', 'WIFI', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'QRIS', 'EWALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentSubmissionStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentSubmissionTargetType" AS ENUM ('INVOICE', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "BookingDepositPaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "TenantDepositLedgerEntryType" AS ENUM ('CHARGED', 'PAYMENT_RECEIVED', 'HELD', 'REFUND', 'DEDUCTION', 'FORFEIT', 'SETTLEMENT', 'ADJUSTMENT', 'MIGRATION_SNAPSHOT');

-- CreateEnum
CREATE TYPE "TenantDepositLedgerDirection" AS ENUM ('INCREASE_LIABILITY', 'DECREASE_LIABILITY', 'INFO');

-- CreateEnum
CREATE TYPE "RenewRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PENDING_DECISION', 'AWAITING_DP', 'DP_SECURED', 'COMPLETED', 'REJECTED_BY_TENANT', 'EXPIRED_PRIORITY', 'FORFEITED');

-- CreateEnum
CREATE TYPE "CheckoutRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoomItemStatus" AS ENUM ('GOOD', 'DAMAGED', 'MAINTENANCE', 'MISSING');

-- CreateEnum
CREATE TYPE "InventoryItemStatus" AS ENUM ('GOOD', 'LOW_STOCK', 'OUT_OF_STOCK', 'DAMAGED', 'MISSING', 'NEEDS_REPAIR', 'PENDING_CHECK');

-- CreateEnum
CREATE TYPE "ReportedCondition" AS ENUM ('DAMAGED', 'MISSING', 'NEEDS_REPAIR', 'NEEDS_REPLACEMENT', 'NEEDS_CLEANING', 'LOW_STOCK', 'OUT_OF_STOCK', 'PENDING_CHECK');

-- CreateEnum
CREATE TYPE "AdminDecision" AS ENUM ('APPROVE', 'REJECT', 'NEEDS_MORE_INFO');

-- CreateEnum
CREATE TYPE "StaffFieldReportStatus" AS ENUM ('REPORTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IN_REPAIR', 'DONE', 'CLOSED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('IN', 'OUT', 'ASSIGN_TO_ROOM', 'RETURN_FROM_ROOM', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "StaffRoutineFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "StaffRoutineAreaType" AS ENUM ('GENERAL', 'BATHROOM', 'ROOM', 'INVENTORY', 'METER', 'SECURITY', 'CLEANING');

-- CreateEnum
CREATE TYPE "StaffRoutineStatus" AS ENUM ('IN_PROGRESS', 'DONE', 'NEED_HELP', 'MISSED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "StaffWorkSourceType" AS ENUM ('ROUTINE', 'TICKET', 'METER', 'ROOM_CHECK', 'STOCK_REPORT', 'INVENTORY_REPORT', 'TENANT_REVIEW', 'MANUAL_AUDIT');

-- CreateEnum
CREATE TYPE "StaffAuditResult" AS ENUM ('PASS', 'NEEDS_FIX', 'FAILED', 'NOT_DONE');

-- CreateEnum
CREATE TYPE "StaffReviewStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'FLAGGED', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "StaffPerformanceEventType" AS ENUM ('ROUTINE_DONE', 'ROUTINE_NEED_HELP', 'TICKET_DONE', 'METER_RECORDED', 'STOCK_REPORTED', 'AUDIT_PASS', 'AUDIT_NEEDS_FIX', 'AUDIT_FAILED', 'TENANT_REVIEW_HIGH', 'TENANT_REVIEW_LOW', 'MISSING_PROOF', 'MANUAL_ADJUSTMENT', 'TIP_RECEIVED');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('TENANT', 'ALL');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('GOOGLE_MAPS', 'WALK_IN', 'REFERRAL', 'INSTAGRAM', 'TIKTOK', 'WHATSAPP', 'FACEBOOK', 'WEBSITE', 'OTA', 'OTHER');

-- CreateEnum
CREATE TYPE "StayPurpose" AS ENUM ('WORK', 'STUDY', 'TRANSIT', 'FAMILY', 'MEDICAL', 'PROJECT', 'OTHER');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "VehicleOwnership" AS ENUM ('NONE', 'MOTORCYCLE', 'CAR', 'BOTH');

-- CreateEnum
CREATE TYPE "SmokingHabit" AS ENUM ('NEVER', 'OCCASIONAL', 'REGULAR');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT_BUILDING', 'SALARY', 'ELECTRICITY', 'WATER', 'INTERNET', 'MAINTENANCE', 'CLEANING', 'SUPPLIES', 'TAX', 'MARKETING', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountingAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AccountingNormalBalance" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');

-- CreateEnum
CREATE TYPE "CashAccountType" AS ENUM ('CASH', 'BANK', 'QRIS', 'EWALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "OpeningBalanceBatchStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "JournalSourceType" AS ENUM ('MANUAL', 'OPENING_BALANCE', 'SYSTEM_PLACEHOLDER', 'INVOICE', 'INVOICE_PAYMENT', 'PAYMENT_SUBMISSION', 'EXPENSE', 'WIFI_SALE', 'DEPOSIT', 'INVENTORY', 'DEPRECIATION', 'ADJUSTMENT', 'CLOSING_ENTRY', 'CLOSING_REVERSAL');

-- CreateEnum
CREATE TYPE "FixedAssetCategory" AS ENUM ('BUILDING', 'RENOVATION', 'ROOM_EQUIPMENT', 'FURNITURE', 'ELECTRONIC', 'UTILITY_EQUIPMENT', 'VEHICLE', 'SOFTWARE', 'OTHER');

-- CreateEnum
CREATE TYPE "FixedAssetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FULLY_DEPRECIATED', 'DISPOSED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "FixedAssetLocationType" AS ENUM ('GENERAL', 'ROOM', 'WAREHOUSE');

-- CreateEnum
CREATE TYPE "FixedAssetCapitalizationSource" AS ENUM ('OPENING_BALANCE', 'PURCHASE_JOURNAL', 'DISCLOSURE_ONLY');

-- CreateEnum
CREATE TYPE "FixedAssetDepreciationMethod" AS ENUM ('STRAIGHT_LINE');

-- CreateEnum
CREATE TYPE "FixedAssetLedgerAlignmentStatus" AS ENUM ('NOT_REQUIRED', 'NEEDS_REVIEW', 'PREVIEWED', 'ALIGNED', 'DISCLOSURE_ONLY', 'VOIDED');

-- CreateEnum
CREATE TYPE "FixedAssetLedgerAlignmentMethod" AS ENUM ('RECLASSIFY_FROM_CASH', 'OWNER_CAPITAL_CONTRIBUTION', 'DISCLOSURE_ONLY', 'MANUAL_REVIEW');

-- CreateEnum
CREATE TYPE "AssetDepreciationRunStatus" AS ENUM ('POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "BelongingsStatus" AS ENUM ('PENDING', 'CLAIMED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "PushDeliveryStatus" AS ENUM ('NONE', 'PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "AiDraftStatus" AS ENUM ('DRAFT', 'APPLIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LoyaltyPointReason" AS ENUM ('RENEWAL', 'ON_TIME_PAYMENT', 'VALIDATED_REPORT', 'ONBOARDING_QUEST', 'REDEMPTION', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LoyaltyRewardType" AS ENUM ('RENT_DISCOUNT', 'SERVICE_ADDON', 'METER_DISCOUNT', 'BADGE', 'PHYSICAL');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PeerReportStatus" AS ENUM ('PENDING_REVIEW', 'ACKNOWLEDGED', 'IMPROVED', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'JOINED', 'REWARDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceInterestStatus" AS ENUM ('PENDING', 'CONTACTED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProfilePhotoSource" AS ENUM ('KTP_AUTO', 'MANUAL');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "tenantId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "tipGopay" TEXT,
    "tipOvo" TEXT,
    "tipDana" TEXT,
    "tipShopeepay" TEXT,
    "tipBank" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketAnalysis" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "resultJson" JSONB,
    "transcriptJson" JSONB,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SatisfactionSurvey" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER,
    "stayId" INTEGER,
    "overallRating" INTEGER NOT NULL,
    "cleanliness" INTEGER,
    "staffService" INTEGER,
    "facility" INTEGER,
    "valueForMoney" INTEGER,
    "wouldRecommend" BOOLEAN,
    "comment" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SatisfactionSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "identityNumber" TEXT,
    "ktpImageUrl" TEXT,
    "ktpImageFileKey" TEXT,
    "ktpImageOriginalFilename" TEXT,
    "ktpImageMimeType" TEXT,
    "ktpImageFileSizeBytes" INTEGER,
    "ktpVerifiedAt" TIMESTAMP(3),
    "ktpVerifiedById" INTEGER,
    "ktpDeletedAt" TIMESTAMP(3),
    "profilePhotoUrl" TEXT,
    "profilePhotoFileKey" TEXT,
    "profilePhotoMimeType" TEXT,
    "profilePhotoFileSizeBytes" INTEGER,
    "profilePhotoSource" "ProfilePhotoSource",
    "profilePhotoUpdatedAt" TIMESTAMP(3),
    "gender" "Gender",
    "birthDate" TIMESTAMP(3),
    "originCity" TEXT,
    "originProvince" TEXT,
    "occupation" TEXT,
    "companyOrCampus" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "maritalStatus" "MaritalStatus",
    "vehicleOwnership" "VehicleOwnership",
    "smokingHabit" "SmokingHabit",
    "howDidYouHear" "LeadSource",
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "referralCode" TEXT,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "floor" TEXT,
    "status" "RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "category" "RoomCategory" NOT NULL DEFAULT 'STANDARD',
    "roomType" "RoomType" NOT NULL DEFAULT 'REGULAR',
    "roomSize" "RoomSize" NOT NULL DEFAULT 'STANDARD',
    "dailyRateRupiah" INTEGER,
    "weeklyRateRupiah" INTEGER,
    "biWeeklyRateRupiah" INTEGER,
    "monthlyRateRupiah" INTEGER NOT NULL,
    "defaultDepositRupiah" INTEGER NOT NULL DEFAULT 0,
    "electricityTariffPerKwhRupiah" INTEGER NOT NULL DEFAULT 0,
    "waterTariffPerM3Rupiah" INTEGER NOT NULL DEFAULT 0,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowBookingWhileCleaning" BOOLEAN NOT NULL DEFAULT false,
    "hasAc" BOOLEAN NOT NULL DEFAULT false,
    "acWattage" INTEGER,
    "acLastCleanedAt" TIMESTAMP(3),
    "acCleanIntervalDays" INTEGER NOT NULL DEFAULT 90,
    "acUsageHoursPerDay" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomFacility" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "category" TEXT,
    "publicVisible" BOOLEAN NOT NULL DEFAULT true,
    "condition" TEXT,
    "note" TEXT,
    "inventoryItemId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stay" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "roomId" INTEGER NOT NULL,
    "status" "StayStatus" NOT NULL DEFAULT 'ACTIVE',
    "pricingTerm" "PricingTerm" NOT NULL,
    "agreedRentAmountRupiah" INTEGER NOT NULL,
    "occupantCount" INTEGER NOT NULL DEFAULT 1,
    "hasPet" BOOLEAN NOT NULL DEFAULT false,
    "checkInDate" DATE NOT NULL,
    "plannedCheckOutDate" DATE,
    "actualCheckOutDate" DATE,
    "expiresAt" TIMESTAMP(3),
    "depositAmountRupiah" INTEGER NOT NULL DEFAULT 0,
    "depositPaidAmountRupiah" INTEGER NOT NULL DEFAULT 0,
    "depositPaymentStatus" "BookingDepositPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "depositStatus" "DepositStatus" NOT NULL DEFAULT 'HELD',
    "depositDeductionRupiah" INTEGER NOT NULL DEFAULT 0,
    "depositRefundedRupiah" INTEGER NOT NULL DEFAULT 0,
    "depositRefundedAt" TIMESTAMP(3),
    "depositNote" TEXT,
    "downPaymentAmountRupiah" INTEGER NOT NULL DEFAULT 0,
    "downPaymentPaidRupiah" INTEGER NOT NULL DEFAULT 0,
    "downPaymentPaidAt" TIMESTAMP(3),
    "downPaymentForfeitedAt" TIMESTAMP(3),
    "lossRefundStatus" "RefundStatus" NOT NULL DEFAULT 'NONE',
    "lossRefundAmountRupiah" INTEGER NOT NULL DEFAULT 0,
    "lossRefundProofUrl" TEXT,
    "lossRefundProofFileKey" TEXT,
    "lossRefundNote" TEXT,
    "lossRefundProcessedAt" TIMESTAMP(3),
    "lossRefundProcessedById" INTEGER,
    "electricityTariffPerKwhRupiah" INTEGER NOT NULL DEFAULT 0,
    "waterTariffPerM3Rupiah" INTEGER NOT NULL DEFAULT 0,
    "bookingSource" "LeadSource",
    "bookingSourceDetail" TEXT,
    "stayPurpose" "StayPurpose",
    "checkoutReason" TEXT,
    "cancelReason" TEXT,
    "fledMarkedAt" TIMESTAMP(3),
    "fledMarkedById" INTEGER,
    "fledReason" TEXT,
    "belongingsStatus" "BelongingsStatus" NOT NULL DEFAULT 'PENDING',
    "belongingsDeadline" TIMESTAMP(3),
    "belongingsResolvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "initialElectricityKwhPending" DECIMAL(12,3),
    "initialWaterM3Pending" DECIMAL(12,3),
    "initialMetersRecordedAt" TIMESTAMP(3),
    "initialMetersRecordedById" INTEGER,
    "initialMetersPromotedAt" TIMESTAMP(3),

    CONSTRAINT "Stay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDepositLedgerEntry" (
    "id" SERIAL NOT NULL,
    "stayId" INTEGER NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "roomId" INTEGER NOT NULL,
    "type" "TenantDepositLedgerEntryType" NOT NULL,
    "direction" "TenantDepositLedgerDirection" NOT NULL,
    "amountRupiah" INTEGER NOT NULL DEFAULT 0,
    "balanceAfterRupiah" INTEGER NOT NULL DEFAULT 0,
    "depositStatusAfter" "DepositStatus",
    "depositPaymentStatusAfter" "BookingDepositPaymentStatus",
    "sourceType" TEXT,
    "sourceId" TEXT,
    "paymentSubmissionId" INTEGER,
    "invoicePaymentId" INTEGER,
    "journalEntryId" INTEGER,
    "actorUserId" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantDepositLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeterReading" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "utilityType" "UtilityType" NOT NULL,
    "readingAt" TIMESTAMP(3) NOT NULL,
    "readingValue" DECIMAL(12,3) NOT NULL,
    "note" TEXT,
    "recordedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeterReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "stayId" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "dueDate" DATE,
    "paidAt" TIMESTAMP(3),
    "totalAmountRupiah" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "cancelReason" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "lineType" "InvoiceLineType" NOT NULL,
    "utilityType" "UtilityType",
    "description" TEXT NOT NULL,
    "qty" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPriceRupiah" INTEGER NOT NULL,
    "lineAmountRupiah" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePayment" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "paymentDate" DATE NOT NULL,
    "amountRupiah" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "referenceNo" TEXT,
    "note" TEXT,
    "capturedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSubmission" (
    "id" SERIAL NOT NULL,
    "stayId" INTEGER NOT NULL,
    "invoiceId" INTEGER,
    "tenantId" INTEGER NOT NULL,
    "submittedById" INTEGER NOT NULL,
    "amountRupiah" INTEGER NOT NULL,
    "paidAt" DATE NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "targetType" "PaymentSubmissionTargetType" NOT NULL DEFAULT 'INVOICE',
    "targetId" INTEGER,
    "senderName" TEXT,
    "senderBankName" TEXT,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "fileKey" TEXT,
    "fileUrl" TEXT,
    "originalFilename" TEXT,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "status" "PaymentSubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "tenantId" INTEGER,
    "roomId" INTEGER,
    "stayId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "issueImageUrl" TEXT,
    "issueImageFileKey" TEXT,
    "issueImageOriginalFilename" TEXT,
    "issueImageMimeType" TEXT,
    "issueImageFileSizeBytes" INTEGER,
    "resolutionImageUrl" TEXT,
    "resolutionImageFileKey" TEXT,
    "resolutionImageOriginalFilename" TEXT,
    "resolutionImageMimeType" TEXT,
    "resolutionImageFileSizeBytes" INTEGER,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" INTEGER,
    "linkedRoomItemId" INTEGER,
    "linkedInventoryItemId" INTEGER,
    "finalRoomItemStatus" "RoomItemStatus",
    "finalInventoryItemStatus" "InventoryItemStatus",
    "finalAdminNote" TEXT,
    "resolutionNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "escalatedAt" TIMESTAMP(3),
    "handledByVendor" BOOLEAN NOT NULL DEFAULT false,
    "vendorNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRoutineTemplate" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "StaffRoutineFrequency" NOT NULL DEFAULT 'DAILY',
    "areaType" "StaffRoutineAreaType" NOT NULL DEFAULT 'GENERAL',
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "requiresNote" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRoutineTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRoutineAssignment" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "staffUserId" INTEGER,
    "roomId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRoutineAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRoutineCompletion" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "assignmentId" INTEGER,
    "staffUserId" INTEGER NOT NULL,
    "roomId" INTEGER,
    "dueDate" DATE NOT NULL,
    "status" "StaffRoutineStatus" NOT NULL DEFAULT 'DONE',
    "completedAt" TIMESTAMP(3),
    "note" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRoutineCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffWorkAudit" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER,
    "sourceType" "StaffWorkSourceType" NOT NULL,
    "sourceId" INTEGER,
    "auditedById" INTEGER NOT NULL,
    "result" "StaffAuditResult" NOT NULL,
    "scoreDelta" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffWorkAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffPerformanceEvent" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER,
    "sourceType" "StaffWorkSourceType" NOT NULL,
    "sourceId" INTEGER,
    "eventType" "StaffPerformanceEventType" NOT NULL,
    "scoreDelta" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffPerformanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffReview" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER,
    "tenantId" INTEGER NOT NULL,
    "ticketId" INTEGER,
    "routineCompletionId" INTEGER,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "StaffReviewStatus" NOT NULL DEFAULT 'VISIBLE',
    "moderatedById" INTEGER,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'TENANT',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "imageUrl" TEXT,
    "imageFileKey" TEXT,
    "imageOriginalFilename" TEXT,
    "imageMimeType" TEXT,
    "imageFileSizeBytes" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" SERIAL NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "qtyOnHand" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "minQty" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "InventoryItemStatus" NOT NULL DEFAULT 'GOOD',
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomItem" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "qty" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "status" "RoomItemStatus" NOT NULL DEFAULT 'GOOD',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "movementType" "InventoryMovementType" NOT NULL,
    "qty" DECIMAL(12,2) NOT NULL,
    "roomId" INTEGER,
    "movementDate" DATE NOT NULL,
    "note" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffFieldReport" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER,
    "roomId" INTEGER,
    "roomItemId" INTEGER,
    "inventoryItemId" INTEGER,
    "reportedByStaffId" INTEGER NOT NULL,
    "reportedCondition" "ReportedCondition" NOT NULL,
    "conditionNotes" TEXT,
    "photoUrl" TEXT,
    "photoFileKey" TEXT,
    "photoOriginalFilename" TEXT,
    "photoMimeType" TEXT,
    "photoFileSizeBytes" INTEGER,
    "requestsReplacement" BOOLEAN NOT NULL DEFAULT false,
    "requestedInventoryItemId" INTEGER,
    "requestedQty" DECIMAL(12,2),
    "adminReviewedById" INTEGER,
    "adminDecision" "AdminDecision",
    "adminNotes" TEXT,
    "relatedMovementId" INTEGER,
    "status" "StaffFieldReportStatus" NOT NULL DEFAULT 'REPORTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffFieldReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenewRequest" (
    "id" SERIAL NOT NULL,
    "stayId" INTEGER NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "requestedTerm" "PricingTerm" NOT NULL,
    "requestedCheckOutDate" DATE,
    "status" "RenewRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestNotes" TEXT,
    "reviewNotes" TEXT,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "downPaymentAmountRupiah" INTEGER,
    "downPaymentPaidAt" TIMESTAMP(3),
    "downPaymentDueDate" DATE,
    "settlementDueDate" DATE,
    "downPaymentInvoiceId" INTEGER,
    "settlementInvoiceId" INTEGER,
    "prepaidMonths" INTEGER,
    "isEarly" BOOLEAN NOT NULL DEFAULT false,
    "tenantReview" TEXT,
    "tenantReviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutRequest" (
    "id" SERIAL NOT NULL,
    "stayId" INTEGER NOT NULL,
    "requestedCheckOutDate" DATE NOT NULL,
    "checkoutReason" TEXT NOT NULL,
    "status" "CheckoutRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestNotes" TEXT,
    "reviewNotes" TEXT,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WifiSale" (
    "id" SERIAL NOT NULL,
    "saleDate" DATE NOT NULL,
    "customerName" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "soldPriceRupiah" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WifiSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "expenseDate" DATE NOT NULL,
    "type" "ExpenseType" NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'CONFIRMED',
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amountRupiah" INTEGER NOT NULL,
    "recurringKey" TEXT,
    "vendorName" TEXT,
    "roomId" INTEGER,
    "stayId" INTEGER,
    "note" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" SERIAL NOT NULL,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FixedAssetCategory" NOT NULL DEFAULT 'OTHER',
    "status" "FixedAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "locationType" "FixedAssetLocationType" NOT NULL DEFAULT 'GENERAL',
    "capitalizationSource" "FixedAssetCapitalizationSource" NOT NULL DEFAULT 'DISCLOSURE_ONLY',
    "depreciationMethod" "FixedAssetDepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "acquisitionDate" DATE NOT NULL,
    "depreciationStartDate" DATE,
    "acquisitionCostRupiah" INTEGER NOT NULL,
    "salvageValueRupiah" INTEGER NOT NULL DEFAULT 0,
    "usefulLifeMonths" INTEGER NOT NULL,
    "accumulatedDepreciationRupiah" INTEGER NOT NULL DEFAULT 0,
    "depreciationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "roomId" INTEGER,
    "inventoryItemId" INTEGER,
    "roomItemId" INTEGER,
    "expenseId" INTEGER,
    "createdById" INTEGER,
    "ledgerAlignmentStatus" "FixedAssetLedgerAlignmentStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "ledgerAlignmentMethod" "FixedAssetLedgerAlignmentMethod",
    "ledgerAlignmentAmountRupiah" INTEGER,
    "ledgerAlignmentCreditAccountId" INTEGER,
    "ledgerAlignmentJournalEntryId" INTEGER,
    "ledgerAlignedAt" TIMESTAMP(3),
    "ledgerAlignedById" INTEGER,
    "ledgerAlignmentNote" TEXT,
    "ledgerAlignmentReviewedAt" TIMESTAMP(3),
    "ledgerAlignmentReviewedById" INTEGER,
    "notes" TEXT,
    "disposedAt" DATE,
    "disposalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetDepreciationRun" (
    "id" SERIAL NOT NULL,
    "runNumber" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "runDate" DATE NOT NULL,
    "status" "AssetDepreciationRunStatus" NOT NULL DEFAULT 'POSTED',
    "totalDepreciationRupiah" INTEGER NOT NULL DEFAULT 0,
    "journalEntryId" INTEGER,
    "createdById" INTEGER,
    "postedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetDepreciationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetDepreciationLine" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "fixedAssetId" INTEGER NOT NULL,
    "depreciationAmountRupiah" INTEGER NOT NULL,
    "accumulatedBeforeRupiah" INTEGER NOT NULL,
    "accumulatedAfterRupiah" INTEGER NOT NULL,
    "bookValueBeforeRupiah" INTEGER NOT NULL,
    "bookValueAfterRupiah" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetDepreciationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppNotification" (
    "id" SERIAL NOT NULL,
    "recipientUserId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkTo" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "pushStatus" "PushDeliveryStatus" NOT NULL DEFAULT 'NONE',
    "pushAttempts" INTEGER NOT NULL DEFAULT 0,
    "pushedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorUserId" INTEGER,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldData" JSONB,
    "newData" JSONB,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDraft" (
    "id" SERIAL NOT NULL,
    "feature" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "status" "AiDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "mode" TEXT NOT NULL,
    "model" TEXT,
    "snapshotHash" TEXT,
    "promptHash" TEXT,
    "confidence" DOUBLE PRECISION,
    "resultJson" JSONB NOT NULL,
    "usageJson" JSONB,
    "createdById" INTEGER,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartOfAccount" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountingAccountType" NOT NULL,
    "normalBalance" "AccountingNormalBalance" NOT NULL,
    "description" TEXT,
    "parentId" INTEGER,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChartOfAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashAccount" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "CashAccountType" NOT NULL DEFAULT 'BANK',
    "chartOfAccountId" INTEGER NOT NULL,
    "bankName" TEXT,
    "accountNumberMasked" TEXT,
    "holderName" TEXT,
    "openingBalanceRupiah" INTEGER NOT NULL DEFAULT 0,
    "currentBalanceRupiah" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingPeriod" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "closedById" INTEGER,
    "closingJournalEntryId" INTEGER,
    "closingNote" TEXT,
    "closeBasis" TEXT,
    "closeVersion" INTEGER NOT NULL DEFAULT 0,
    "reopenedAt" TIMESTAMP(3),
    "reopenedById" INTEGER,
    "reopenJournalEntryId" INTEGER,
    "reopenReason" TEXT,
    "reopenVersion" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningBalanceBatch" (
    "id" SERIAL NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "accountingPeriodId" INTEGER,
    "cutoverDate" DATE NOT NULL,
    "status" "OpeningBalanceBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "totalDebitRupiah" INTEGER NOT NULL DEFAULT 0,
    "totalCreditRupiah" INTEGER NOT NULL DEFAULT 0,
    "createdById" INTEGER,
    "postedById" INTEGER,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpeningBalanceBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeningBalanceLine" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "chartOfAccountId" INTEGER NOT NULL,
    "description" TEXT,
    "debitRupiah" INTEGER NOT NULL DEFAULT 0,
    "creditRupiah" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpeningBalanceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" SERIAL NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "entryDate" DATE NOT NULL,
    "accountingPeriodId" INTEGER,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "JournalSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceId" TEXT,
    "memo" TEXT,
    "totalDebitRupiah" INTEGER NOT NULL DEFAULT 0,
    "totalCreditRupiah" INTEGER NOT NULL DEFAULT 0,
    "isBalanced" BOOLEAN NOT NULL DEFAULT false,
    "createdById" INTEGER,
    "postedById" INTEGER,
    "postedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" SERIAL NOT NULL,
    "journalEntryId" INTEGER NOT NULL,
    "chartOfAccountId" INTEGER NOT NULL,
    "cashAccountId" INTEGER,
    "description" TEXT,
    "debitRupiah" INTEGER NOT NULL DEFAULT 0,
    "creditRupiah" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentRecognitionSchedule" (
    "id" SERIAL NOT NULL,
    "stayId" INTEGER NOT NULL,
    "periodIndex" INTEGER NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "scheduledAmountRupiah" INTEGER NOT NULL,
    "recognizedAt" TIMESTAMP(3),
    "journalEntryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentRecognitionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomTransfer" (
    "id" SERIAL NOT NULL,
    "stayId" INTEGER NOT NULL,
    "fromRoomId" INTEGER NOT NULL,
    "toRoomId" INTEGER NOT NULL,
    "transferDate" DATE NOT NULL,
    "reason" TEXT,
    "rentBeforeRupiah" INTEGER NOT NULL,
    "rentAfterRupiah" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyPoint" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "LoyaltyPointReason" NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "note" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyReward" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pointCost" INTEGER NOT NULL,
    "type" "LoyaltyRewardType" NOT NULL,
    "valueRupiah" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stockQty" INTEGER,
    "fulfillmentTaskCategory" TEXT,
    "fulfillmentTaskTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "rewardId" INTEGER NOT NULL,
    "pointCost" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" INTEGER,
    "journalEntryId" INTEGER,
    "note" TEXT,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerBehaviorReport" (
    "id" SERIAL NOT NULL,
    "reporterTenantId" INTEGER NOT NULL,
    "reporteeTenantId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "PeerReportStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "moderatedById" INTEGER,
    "acknowledgedAt" TIMESTAMP(3),
    "improvedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeerBehaviorReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantReferral" (
    "id" SERIAL NOT NULL,
    "referrerTenantId" INTEGER NOT NULL,
    "referredTenantId" INTEGER,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "rewardedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Umum',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalSetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "freeElectricityKwhPerMonth" INTEGER NOT NULL DEFAULT 30,
    "electricityTariffPerKwhRupiah" INTEGER NOT NULL DEFAULT 2500,
    "waterMeteringEnabled" BOOLEAN NOT NULL DEFAULT false,
    "waterTariffPerM3Rupiah" INTEGER NOT NULL DEFAULT 0,
    "freeWaterM3PerMonth" INTEGER NOT NULL DEFAULT 0,
    "wifiRupiah" INTEGER NOT NULL DEFAULT 50000,
    "galonRupiah" INTEGER NOT NULL DEFAULT 20000,
    "petDepositRupiah" INTEGER NOT NULL DEFAULT 100000,
    "extraOccupantFeePercent" INTEGER NOT NULL DEFAULT 20,
    "acCleanKwhThreshold" INTEGER NOT NULL DEFAULT 200,
    "deepseekModel" TEXT NOT NULL DEFAULT 'deepseek-v4-flash',
    "deepseekFinanceModel" TEXT NOT NULL DEFAULT 'deepseek-v4-pro',
    "deepseekBaseUrl" TEXT NOT NULL DEFAULT 'https://api.deepseek.com',
    "deepseekApiKey" TEXT NOT NULL DEFAULT '',
    "aiFeaturesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiManualOnly" BOOLEAN NOT NULL DEFAULT true,
    "aiOwnerAdminOnly" BOOLEAN NOT NULL DEFAULT true,
    "aiDailyRequestLimit" INTEGER NOT NULL DEFAULT 50,
    "aiMaxInputChars" INTEGER NOT NULL DEFAULT 12000,
    "aiMaxOutputTokens" INTEGER NOT NULL DEFAULT 1400,
    "aiFinanceMaxOutputTokens" INTEGER NOT NULL DEFAULT 2200,
    "aiLogUsage" BOOLEAN NOT NULL DEFAULT true,
    "aiDraftRetentionDays" INTEGER NOT NULL DEFAULT 60,
    "capitalizationThresholdByCategory" TEXT,
    "tenantLoyaltyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "adminWhatsappNumber" TEXT NOT NULL DEFAULT '6285648887628',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" INTEGER,

    CONSTRAINT "OperationalSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalService" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceRupiah" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceInterest" (
    "id" SERIAL NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "status" "ServiceInterestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestPreferenceSurvey" (
    "id" TEXT NOT NULL,
    "bathroom" TEXT,
    "cooling" TEXT,
    "roomSize" TEXT,
    "roomType" TEXT,
    "priorities" TEXT,
    "estimatedPriceRupiah" INTEGER,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "sessionId" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestPreferenceSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalReview" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'google',
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_key" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "MarketAnalysis_kind_createdAt_idx" ON "MarketAnalysis"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "SatisfactionSurvey_createdAt_idx" ON "SatisfactionSurvey"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_identityNumber_key" ON "Tenant"("identityNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_referralCode_key" ON "Tenant"("referralCode");

-- CreateIndex
CREATE INDEX "Tenant_fullName_idx" ON "Tenant"("fullName");

-- CreateIndex
CREATE INDEX "Tenant_phone_idx" ON "Tenant"("phone");

-- CreateIndex
CREATE INDEX "Tenant_email_idx" ON "Tenant"("email");

-- CreateIndex
CREATE INDEX "Tenant_gender_idx" ON "Tenant"("gender");

-- CreateIndex
CREATE INDEX "Tenant_originCity_idx" ON "Tenant"("originCity");

-- CreateIndex
CREATE INDEX "Tenant_occupation_idx" ON "Tenant"("occupation");

-- CreateIndex
CREATE INDEX "Tenant_companyOrCampus_idx" ON "Tenant"("companyOrCampus");

-- CreateIndex
CREATE INDEX "Tenant_isActive_idx" ON "Tenant"("isActive");

-- CreateIndex
CREATE INDEX "Tenant_maritalStatus_idx" ON "Tenant"("maritalStatus");

-- CreateIndex
CREATE INDEX "Tenant_vehicleOwnership_idx" ON "Tenant"("vehicleOwnership");

-- CreateIndex
CREATE INDEX "Tenant_howDidYouHear_idx" ON "Tenant"("howDidYouHear");

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE INDEX "Room_status_idx" ON "Room"("status");

-- CreateIndex
CREATE INDEX "Room_isActive_idx" ON "Room"("isActive");

-- CreateIndex
CREATE INDEX "Room_floor_category_idx" ON "Room"("floor", "category");

-- CreateIndex
CREATE INDEX "Room_category_roomType_roomSize_idx" ON "Room"("category", "roomType", "roomSize");

-- CreateIndex
CREATE INDEX "RoomFacility_roomId_idx" ON "RoomFacility"("roomId");

-- CreateIndex
CREATE INDEX "RoomFacility_roomId_publicVisible_idx" ON "RoomFacility"("roomId", "publicVisible");

-- CreateIndex
CREATE INDEX "RoomFacility_inventoryItemId_idx" ON "RoomFacility"("inventoryItemId");

-- CreateIndex
CREATE INDEX "Stay_tenantId_idx" ON "Stay"("tenantId");

-- CreateIndex
CREATE INDEX "Stay_roomId_idx" ON "Stay"("roomId");

-- CreateIndex
CREATE INDEX "Stay_status_idx" ON "Stay"("status");

-- CreateIndex
CREATE INDEX "Stay_tenantId_status_idx" ON "Stay"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Stay_roomId_status_idx" ON "Stay"("roomId", "status");

-- CreateIndex
CREATE INDEX "Stay_checkInDate_idx" ON "Stay"("checkInDate");

-- CreateIndex
CREATE INDEX "Stay_expiresAt_idx" ON "Stay"("expiresAt");

-- CreateIndex
CREATE INDEX "Stay_bookingSource_idx" ON "Stay"("bookingSource");

-- CreateIndex
CREATE INDEX "Stay_stayPurpose_idx" ON "Stay"("stayPurpose");

-- CreateIndex
CREATE INDEX "Stay_belongingsStatus_belongingsDeadline_idx" ON "Stay"("belongingsStatus", "belongingsDeadline");

-- CreateIndex
CREATE INDEX "Stay_createdById_idx" ON "Stay"("createdById");

-- CreateIndex
CREATE INDEX "TenantDepositLedgerEntry_stayId_idx" ON "TenantDepositLedgerEntry"("stayId");

-- CreateIndex
CREATE INDEX "TenantDepositLedgerEntry_tenantId_idx" ON "TenantDepositLedgerEntry"("tenantId");

-- CreateIndex
CREATE INDEX "TenantDepositLedgerEntry_roomId_idx" ON "TenantDepositLedgerEntry"("roomId");

-- CreateIndex
CREATE INDEX "TenantDepositLedgerEntry_type_idx" ON "TenantDepositLedgerEntry"("type");

-- CreateIndex
CREATE INDEX "TenantDepositLedgerEntry_direction_idx" ON "TenantDepositLedgerEntry"("direction");

-- CreateIndex
CREATE INDEX "TenantDepositLedgerEntry_occurredAt_idx" ON "TenantDepositLedgerEntry"("occurredAt");

-- CreateIndex
CREATE INDEX "TenantDepositLedgerEntry_sourceType_sourceId_idx" ON "TenantDepositLedgerEntry"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "TenantDepositLedgerEntry_paymentSubmissionId_idx" ON "TenantDepositLedgerEntry"("paymentSubmissionId");

-- CreateIndex
CREATE INDEX "MeterReading_roomId_utilityType_idx" ON "MeterReading"("roomId", "utilityType");

-- CreateIndex
CREATE INDEX "MeterReading_readingAt_idx" ON "MeterReading"("readingAt");

-- CreateIndex
CREATE UNIQUE INDEX "MeterReading_roomId_utilityType_readingAt_key" ON "MeterReading"("roomId", "utilityType", "readingAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_stayId_idx" ON "Invoice"("stayId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_periodStart_periodEnd_idx" ON "Invoice"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLine_lineType_idx" ON "InvoiceLine"("lineType");

-- CreateIndex
CREATE INDEX "InvoiceLine_utilityType_idx" ON "InvoiceLine"("utilityType");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_sortOrder_idx" ON "InvoiceLine"("invoiceId", "sortOrder");

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "InvoicePayment"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoicePayment_paymentDate_idx" ON "InvoicePayment"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PaymentSubmission_stayId_idx" ON "PaymentSubmission"("stayId");

-- CreateIndex
CREATE INDEX "PaymentSubmission_invoiceId_idx" ON "PaymentSubmission"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentSubmission_tenantId_idx" ON "PaymentSubmission"("tenantId");

-- CreateIndex
CREATE INDEX "PaymentSubmission_status_idx" ON "PaymentSubmission"("status");

-- CreateIndex
CREATE INDEX "PaymentSubmission_invoiceId_status_idx" ON "PaymentSubmission"("invoiceId", "status");

-- CreateIndex
CREATE INDEX "PaymentSubmission_targetType_status_idx" ON "PaymentSubmission"("targetType", "status");

-- CreateIndex
CREATE INDEX "PaymentSubmission_targetType_targetId_idx" ON "PaymentSubmission"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "Ticket_tenantId_idx" ON "Ticket"("tenantId");

-- CreateIndex
CREATE INDEX "Ticket_roomId_idx" ON "Ticket"("roomId");

-- CreateIndex
CREATE INDEX "Ticket_stayId_idx" ON "Ticket"("stayId");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_linkedRoomItemId_idx" ON "Ticket"("linkedRoomItemId");

-- CreateIndex
CREATE INDEX "Ticket_linkedInventoryItemId_idx" ON "Ticket"("linkedInventoryItemId");

-- CreateIndex
CREATE INDEX "Ticket_dueAt_idx" ON "Ticket"("dueAt");

-- CreateIndex
CREATE INDEX "Ticket_status_dueAt_idx" ON "Ticket"("status", "dueAt");

-- CreateIndex
CREATE INDEX "Ticket_assignedToId_idx" ON "Ticket"("assignedToId");

-- CreateIndex
CREATE INDEX "Ticket_category_idx" ON "Ticket"("category");

-- CreateIndex
CREATE INDEX "StaffRoutineTemplate_frequency_idx" ON "StaffRoutineTemplate"("frequency");

-- CreateIndex
CREATE INDEX "StaffRoutineTemplate_areaType_idx" ON "StaffRoutineTemplate"("areaType");

-- CreateIndex
CREATE INDEX "StaffRoutineTemplate_isActive_sortOrder_idx" ON "StaffRoutineTemplate"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "StaffRoutineAssignment_templateId_idx" ON "StaffRoutineAssignment"("templateId");

-- CreateIndex
CREATE INDEX "StaffRoutineAssignment_staffUserId_idx" ON "StaffRoutineAssignment"("staffUserId");

-- CreateIndex
CREATE INDEX "StaffRoutineAssignment_roomId_idx" ON "StaffRoutineAssignment"("roomId");

-- CreateIndex
CREATE INDEX "StaffRoutineAssignment_isActive_idx" ON "StaffRoutineAssignment"("isActive");

-- CreateIndex
CREATE INDEX "StaffRoutineCompletion_staffUserId_dueDate_idx" ON "StaffRoutineCompletion"("staffUserId", "dueDate");

-- CreateIndex
CREATE INDEX "StaffRoutineCompletion_status_idx" ON "StaffRoutineCompletion"("status");

-- CreateIndex
CREATE INDEX "StaffRoutineCompletion_roomId_idx" ON "StaffRoutineCompletion"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffRoutineCompletion_templateId_assignmentId_staffUserId__key" ON "StaffRoutineCompletion"("templateId", "assignmentId", "staffUserId", "roomId", "dueDate");

-- CreateIndex
CREATE INDEX "StaffWorkAudit_staffId_createdAt_idx" ON "StaffWorkAudit"("staffId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffWorkAudit_sourceType_sourceId_idx" ON "StaffWorkAudit"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "StaffWorkAudit_result_idx" ON "StaffWorkAudit"("result");

-- CreateIndex
CREATE INDEX "StaffWorkAudit_auditedById_idx" ON "StaffWorkAudit"("auditedById");

-- CreateIndex
CREATE INDEX "StaffPerformanceEvent_staffId_createdAt_idx" ON "StaffPerformanceEvent"("staffId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffPerformanceEvent_sourceType_sourceId_idx" ON "StaffPerformanceEvent"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "StaffPerformanceEvent_eventType_idx" ON "StaffPerformanceEvent"("eventType");

-- CreateIndex
CREATE INDEX "StaffReview_staffId_createdAt_idx" ON "StaffReview"("staffId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffReview_tenantId_createdAt_idx" ON "StaffReview"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffReview_ticketId_idx" ON "StaffReview"("ticketId");

-- CreateIndex
CREATE INDEX "StaffReview_status_idx" ON "StaffReview"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StaffReview_tenantId_ticketId_key" ON "StaffReview"("tenantId", "ticketId");

-- CreateIndex
CREATE INDEX "Announcement_audience_idx" ON "Announcement"("audience");

-- CreateIndex
CREATE INDEX "Announcement_isPublished_idx" ON "Announcement"("isPublished");

-- CreateIndex
CREATE INDEX "Announcement_isPinned_idx" ON "Announcement"("isPinned");

-- CreateIndex
CREATE INDEX "Announcement_startsAt_idx" ON "Announcement"("startsAt");

-- CreateIndex
CREATE INDEX "Announcement_expiresAt_idx" ON "Announcement"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_sku_key" ON "InventoryItem"("sku");

-- CreateIndex
CREATE INDEX "InventoryItem_name_idx" ON "InventoryItem"("name");

-- CreateIndex
CREATE INDEX "InventoryItem_category_idx" ON "InventoryItem"("category");

-- CreateIndex
CREATE INDEX "InventoryItem_status_idx" ON "InventoryItem"("status");

-- CreateIndex
CREATE INDEX "InventoryItem_isActive_idx" ON "InventoryItem"("isActive");

-- CreateIndex
CREATE INDEX "RoomItem_roomId_idx" ON "RoomItem"("roomId");

-- CreateIndex
CREATE INDEX "RoomItem_itemId_idx" ON "RoomItem"("itemId");

-- CreateIndex
CREATE INDEX "RoomItem_status_idx" ON "RoomItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RoomItem_roomId_itemId_key" ON "RoomItem"("roomId", "itemId");

-- CreateIndex
CREATE INDEX "InventoryMovement_itemId_idx" ON "InventoryMovement"("itemId");

-- CreateIndex
CREATE INDEX "InventoryMovement_roomId_idx" ON "InventoryMovement"("roomId");

-- CreateIndex
CREATE INDEX "InventoryMovement_movementDate_idx" ON "InventoryMovement"("movementDate");

-- CreateIndex
CREATE INDEX "InventoryMovement_movementType_idx" ON "InventoryMovement"("movementType");

-- CreateIndex
CREATE INDEX "StaffFieldReport_ticketId_idx" ON "StaffFieldReport"("ticketId");

-- CreateIndex
CREATE INDEX "StaffFieldReport_roomId_idx" ON "StaffFieldReport"("roomId");

-- CreateIndex
CREATE INDEX "StaffFieldReport_roomItemId_idx" ON "StaffFieldReport"("roomItemId");

-- CreateIndex
CREATE INDEX "StaffFieldReport_inventoryItemId_idx" ON "StaffFieldReport"("inventoryItemId");

-- CreateIndex
CREATE INDEX "StaffFieldReport_requestedInventoryItemId_idx" ON "StaffFieldReport"("requestedInventoryItemId");

-- CreateIndex
CREATE INDEX "StaffFieldReport_reportedByStaffId_idx" ON "StaffFieldReport"("reportedByStaffId");

-- CreateIndex
CREATE INDEX "StaffFieldReport_adminReviewedById_idx" ON "StaffFieldReport"("adminReviewedById");

-- CreateIndex
CREATE INDEX "StaffFieldReport_status_createdAt_idx" ON "StaffFieldReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RenewRequest_stayId_idx" ON "RenewRequest"("stayId");

-- CreateIndex
CREATE INDEX "RenewRequest_tenantId_idx" ON "RenewRequest"("tenantId");

-- CreateIndex
CREATE INDEX "RenewRequest_status_createdAt_idx" ON "RenewRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RenewRequest_settlementInvoiceId_idx" ON "RenewRequest"("settlementInvoiceId");

-- CreateIndex
CREATE INDEX "CheckoutRequest_stayId_idx" ON "CheckoutRequest"("stayId");

-- CreateIndex
CREATE INDEX "CheckoutRequest_status_createdAt_idx" ON "CheckoutRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WifiSale_saleDate_idx" ON "WifiSale"("saleDate");

-- CreateIndex
CREATE INDEX "WifiSale_customerName_idx" ON "WifiSale"("customerName");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_recurringKey_key" ON "Expense"("recurringKey");

-- CreateIndex
CREATE INDEX "Expense_expenseDate_idx" ON "Expense"("expenseDate");

-- CreateIndex
CREATE INDEX "Expense_type_idx" ON "Expense"("type");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_roomId_idx" ON "Expense"("roomId");

-- CreateIndex
CREATE INDEX "Expense_stayId_idx" ON "Expense"("stayId");

-- CreateIndex
CREATE UNIQUE INDEX "FixedAsset_assetCode_key" ON "FixedAsset"("assetCode");

-- CreateIndex
CREATE INDEX "FixedAsset_status_idx" ON "FixedAsset"("status");

-- CreateIndex
CREATE INDEX "FixedAsset_category_idx" ON "FixedAsset"("category");

-- CreateIndex
CREATE INDEX "FixedAsset_locationType_idx" ON "FixedAsset"("locationType");

-- CreateIndex
CREATE INDEX "FixedAsset_capitalizationSource_idx" ON "FixedAsset"("capitalizationSource");

-- CreateIndex
CREATE INDEX "FixedAsset_depreciationEnabled_idx" ON "FixedAsset"("depreciationEnabled");

-- CreateIndex
CREATE INDEX "FixedAsset_roomId_idx" ON "FixedAsset"("roomId");

-- CreateIndex
CREATE INDEX "FixedAsset_inventoryItemId_idx" ON "FixedAsset"("inventoryItemId");

-- CreateIndex
CREATE INDEX "FixedAsset_roomItemId_idx" ON "FixedAsset"("roomItemId");

-- CreateIndex
CREATE INDEX "FixedAsset_expenseId_idx" ON "FixedAsset"("expenseId");

-- CreateIndex
CREATE INDEX "FixedAsset_ledgerAlignmentStatus_idx" ON "FixedAsset"("ledgerAlignmentStatus");

-- CreateIndex
CREATE INDEX "FixedAsset_ledgerAlignmentMethod_idx" ON "FixedAsset"("ledgerAlignmentMethod");

-- CreateIndex
CREATE INDEX "FixedAsset_ledgerAlignmentCreditAccountId_idx" ON "FixedAsset"("ledgerAlignmentCreditAccountId");

-- CreateIndex
CREATE INDEX "FixedAsset_ledgerAlignmentJournalEntryId_idx" ON "FixedAsset"("ledgerAlignmentJournalEntryId");

-- CreateIndex
CREATE INDEX "FixedAsset_acquisitionDate_idx" ON "FixedAsset"("acquisitionDate");

-- CreateIndex
CREATE UNIQUE INDEX "AssetDepreciationRun_runNumber_key" ON "AssetDepreciationRun"("runNumber");

-- CreateIndex
CREATE INDEX "AssetDepreciationRun_status_idx" ON "AssetDepreciationRun"("status");

-- CreateIndex
CREATE INDEX "AssetDepreciationRun_runDate_idx" ON "AssetDepreciationRun"("runDate");

-- CreateIndex
CREATE INDEX "AssetDepreciationRun_journalEntryId_idx" ON "AssetDepreciationRun"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetDepreciationRun_periodYear_periodMonth_key" ON "AssetDepreciationRun"("periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "AssetDepreciationLine_fixedAssetId_idx" ON "AssetDepreciationLine"("fixedAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetDepreciationLine_runId_fixedAssetId_key" ON "AssetDepreciationLine"("runId", "fixedAssetId");

-- CreateIndex
CREATE INDEX "AppNotification_recipientUserId_isRead_createdAt_idx" ON "AppNotification"("recipientUserId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "AppNotification_recipientUserId_createdAt_idx" ON "AppNotification"("recipientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AppNotification_pushStatus_idx" ON "AppNotification"("pushStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_isActive_idx" ON "PushSubscription"("userId", "isActive");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiDraft_feature_status_idx" ON "AiDraft"("feature", "status");

-- CreateIndex
CREATE INDEX "AiDraft_targetType_targetId_idx" ON "AiDraft"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AiDraft_createdAt_idx" ON "AiDraft"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChartOfAccount_code_key" ON "ChartOfAccount"("code");

-- CreateIndex
CREATE INDEX "ChartOfAccount_type_idx" ON "ChartOfAccount"("type");

-- CreateIndex
CREATE INDEX "ChartOfAccount_normalBalance_idx" ON "ChartOfAccount"("normalBalance");

-- CreateIndex
CREATE INDEX "ChartOfAccount_parentId_idx" ON "ChartOfAccount"("parentId");

-- CreateIndex
CREATE INDEX "ChartOfAccount_isActive_idx" ON "ChartOfAccount"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CashAccount_name_key" ON "CashAccount"("name");

-- CreateIndex
CREATE INDEX "CashAccount_accountType_idx" ON "CashAccount"("accountType");

-- CreateIndex
CREATE INDEX "CashAccount_chartOfAccountId_idx" ON "CashAccount"("chartOfAccountId");

-- CreateIndex
CREATE INDEX "CashAccount_isActive_idx" ON "CashAccount"("isActive");

-- CreateIndex
CREATE INDEX "CashAccount_isDefault_idx" ON "CashAccount"("isDefault");

-- CreateIndex
CREATE INDEX "AccountingPeriod_status_idx" ON "AccountingPeriod"("status");

-- CreateIndex
CREATE INDEX "AccountingPeriod_startDate_endDate_idx" ON "AccountingPeriod"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "AccountingPeriod_closedById_idx" ON "AccountingPeriod"("closedById");

-- CreateIndex
CREATE INDEX "AccountingPeriod_closingJournalEntryId_idx" ON "AccountingPeriod"("closingJournalEntryId");

-- CreateIndex
CREATE INDEX "AccountingPeriod_reopenedById_idx" ON "AccountingPeriod"("reopenedById");

-- CreateIndex
CREATE INDEX "AccountingPeriod_reopenJournalEntryId_idx" ON "AccountingPeriod"("reopenJournalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_year_month_key" ON "AccountingPeriod"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "OpeningBalanceBatch_batchNumber_key" ON "OpeningBalanceBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "OpeningBalanceBatch_accountingPeriodId_idx" ON "OpeningBalanceBatch"("accountingPeriodId");

-- CreateIndex
CREATE INDEX "OpeningBalanceBatch_cutoverDate_idx" ON "OpeningBalanceBatch"("cutoverDate");

-- CreateIndex
CREATE INDEX "OpeningBalanceBatch_status_idx" ON "OpeningBalanceBatch"("status");

-- CreateIndex
CREATE INDEX "OpeningBalanceLine_batchId_idx" ON "OpeningBalanceLine"("batchId");

-- CreateIndex
CREATE INDEX "OpeningBalanceLine_chartOfAccountId_idx" ON "OpeningBalanceLine"("chartOfAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_entryNumber_key" ON "JournalEntry"("entryNumber");

-- CreateIndex
CREATE INDEX "JournalEntry_entryDate_idx" ON "JournalEntry"("entryDate");

-- CreateIndex
CREATE INDEX "JournalEntry_accountingPeriodId_idx" ON "JournalEntry"("accountingPeriodId");

-- CreateIndex
CREATE INDEX "JournalEntry_status_idx" ON "JournalEntry"("status");

-- CreateIndex
CREATE INDEX "JournalEntry_sourceType_sourceId_idx" ON "JournalEntry"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "JournalLine_journalEntryId_idx" ON "JournalLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalLine_chartOfAccountId_idx" ON "JournalLine"("chartOfAccountId");

-- CreateIndex
CREATE INDEX "JournalLine_cashAccountId_idx" ON "JournalLine"("cashAccountId");

-- CreateIndex
CREATE INDEX "RentRecognitionSchedule_stayId_idx" ON "RentRecognitionSchedule"("stayId");

-- CreateIndex
CREATE INDEX "RentRecognitionSchedule_recognizedAt_idx" ON "RentRecognitionSchedule"("recognizedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RentRecognitionSchedule_stayId_periodIndex_key" ON "RentRecognitionSchedule"("stayId", "periodIndex");

-- CreateIndex
CREATE INDEX "RoomTransfer_stayId_idx" ON "RoomTransfer"("stayId");

-- CreateIndex
CREATE INDEX "RoomTransfer_fromRoomId_idx" ON "RoomTransfer"("fromRoomId");

-- CreateIndex
CREATE INDEX "RoomTransfer_toRoomId_idx" ON "RoomTransfer"("toRoomId");

-- CreateIndex
CREATE INDEX "LoyaltyPoint_tenantId_idx" ON "LoyaltyPoint"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyPoint_sourceType_sourceId_key" ON "LoyaltyPoint"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "LoyaltyReward_isActive_type_idx" ON "LoyaltyReward"("isActive", "type");

-- CreateIndex
CREATE INDEX "LoyaltyReward_pointCost_idx" ON "LoyaltyReward"("pointCost");

-- CreateIndex
CREATE INDEX "Redemption_tenantId_idx" ON "Redemption"("tenantId");

-- CreateIndex
CREATE INDEX "Redemption_status_idx" ON "Redemption"("status");

-- CreateIndex
CREATE INDEX "PeerBehaviorReport_reporteeTenantId_status_idx" ON "PeerBehaviorReport"("reporteeTenantId", "status");

-- CreateIndex
CREATE INDEX "PeerBehaviorReport_reporterTenantId_idx" ON "PeerBehaviorReport"("reporterTenantId");

-- CreateIndex
CREATE INDEX "PeerBehaviorReport_status_idx" ON "PeerBehaviorReport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TenantReferral_referredTenantId_key" ON "TenantReferral"("referredTenantId");

-- CreateIndex
CREATE INDEX "TenantReferral_referrerTenantId_idx" ON "TenantReferral"("referrerTenantId");

-- CreateIndex
CREATE INDEX "TenantReferral_status_idx" ON "TenantReferral"("status");

-- CreateIndex
CREATE INDEX "Faq_category_idx" ON "Faq"("category");

-- CreateIndex
CREATE INDEX "Faq_isActive_sortOrder_idx" ON "Faq"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "AdditionalService_isActive_idx" ON "AdditionalService"("isActive");

-- CreateIndex
CREATE INDEX "AdditionalService_sortOrder_idx" ON "AdditionalService"("sortOrder");

-- CreateIndex
CREATE INDEX "ServiceInterest_serviceId_idx" ON "ServiceInterest"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceInterest_tenantId_idx" ON "ServiceInterest"("tenantId");

-- CreateIndex
CREATE INDEX "ServiceInterest_status_idx" ON "ServiceInterest"("status");

-- CreateIndex
CREATE INDEX "GuestPreferenceSurvey_createdAt_idx" ON "GuestPreferenceSurvey"("createdAt");

-- CreateIndex
CREATE INDEX "GuestPreferenceSurvey_bathroom_cooling_roomSize_roomType_idx" ON "GuestPreferenceSurvey"("bathroom", "cooling", "roomSize", "roomType");

-- CreateIndex
CREATE INDEX "ExternalReview_isVisible_rating_idx" ON "ExternalReview"("isVisible", "rating");

-- CreateIndex
CREATE INDEX "ExternalReview_reviewedAt_idx" ON "ExternalReview"("reviewedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketAnalysis" ADD CONSTRAINT "MarketAnalysis_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SatisfactionSurvey" ADD CONSTRAINT "SatisfactionSurvey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SatisfactionSurvey" ADD CONSTRAINT "SatisfactionSurvey_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SatisfactionSurvey" ADD CONSTRAINT "SatisfactionSurvey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_ktpVerifiedById_fkey" FOREIGN KEY ("ktpVerifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomFacility" ADD CONSTRAINT "RoomFacility_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomFacility" ADD CONSTRAINT "RoomFacility_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_initialMetersRecordedById_fkey" FOREIGN KEY ("initialMetersRecordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_fledMarkedById_fkey" FOREIGN KEY ("fledMarkedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDepositLedgerEntry" ADD CONSTRAINT "TenantDepositLedgerEntry_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDepositLedgerEntry" ADD CONSTRAINT "TenantDepositLedgerEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDepositLedgerEntry" ADD CONSTRAINT "TenantDepositLedgerEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDepositLedgerEntry" ADD CONSTRAINT "TenantDepositLedgerEntry_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeterReading" ADD CONSTRAINT "MeterReading_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeterReading" ADD CONSTRAINT "MeterReading_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_capturedById_fkey" FOREIGN KEY ("capturedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSubmission" ADD CONSTRAINT "PaymentSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_linkedRoomItemId_fkey" FOREIGN KEY ("linkedRoomItemId") REFERENCES "RoomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_linkedInventoryItemId_fkey" FOREIGN KEY ("linkedInventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRoutineTemplate" ADD CONSTRAINT "StaffRoutineTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRoutineAssignment" ADD CONSTRAINT "StaffRoutineAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "StaffRoutineTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRoutineAssignment" ADD CONSTRAINT "StaffRoutineAssignment_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRoutineAssignment" ADD CONSTRAINT "StaffRoutineAssignment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRoutineCompletion" ADD CONSTRAINT "StaffRoutineCompletion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "StaffRoutineTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRoutineCompletion" ADD CONSTRAINT "StaffRoutineCompletion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "StaffRoutineAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRoutineCompletion" ADD CONSTRAINT "StaffRoutineCompletion_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRoutineCompletion" ADD CONSTRAINT "StaffRoutineCompletion_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffWorkAudit" ADD CONSTRAINT "StaffWorkAudit_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffWorkAudit" ADD CONSTRAINT "StaffWorkAudit_auditedById_fkey" FOREIGN KEY ("auditedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPerformanceEvent" ADD CONSTRAINT "StaffPerformanceEvent_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffReview" ADD CONSTRAINT "StaffReview_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffReview" ADD CONSTRAINT "StaffReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffReview" ADD CONSTRAINT "StaffReview_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomItem" ADD CONSTRAINT "RoomItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomItem" ADD CONSTRAINT "RoomItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_roomItemId_fkey" FOREIGN KEY ("roomItemId") REFERENCES "RoomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_requestedInventoryItemId_fkey" FOREIGN KEY ("requestedInventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_reportedByStaffId_fkey" FOREIGN KEY ("reportedByStaffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_adminReviewedById_fkey" FOREIGN KEY ("adminReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffFieldReport" ADD CONSTRAINT "StaffFieldReport_relatedMovementId_fkey" FOREIGN KEY ("relatedMovementId") REFERENCES "InventoryMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewRequest" ADD CONSTRAINT "RenewRequest_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewRequest" ADD CONSTRAINT "RenewRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewRequest" ADD CONSTRAINT "RenewRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutRequest" ADD CONSTRAINT "CheckoutRequest_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutRequest" ADD CONSTRAINT "CheckoutRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WifiSale" ADD CONSTRAINT "WifiSale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_roomItemId_fkey" FOREIGN KEY ("roomItemId") REFERENCES "RoomItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_ledgerAlignmentCreditAccountId_fkey" FOREIGN KEY ("ledgerAlignmentCreditAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedAsset" ADD CONSTRAINT "FixedAsset_ledgerAlignmentJournalEntryId_fkey" FOREIGN KEY ("ledgerAlignmentJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDepreciationRun" ADD CONSTRAINT "AssetDepreciationRun_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDepreciationRun" ADD CONSTRAINT "AssetDepreciationRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDepreciationLine" ADD CONSTRAINT "AssetDepreciationLine_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AssetDepreciationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDepreciationLine" ADD CONSTRAINT "AssetDepreciationLine_fixedAssetId_fkey" FOREIGN KEY ("fixedAssetId") REFERENCES "FixedAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ChartOfAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashAccount" ADD CONSTRAINT "CashAccount_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalanceBatch" ADD CONSTRAINT "OpeningBalanceBatch_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "AccountingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalanceLine" ADD CONSTRAINT "OpeningBalanceLine_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "OpeningBalanceBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeningBalanceLine" ADD CONSTRAINT "OpeningBalanceLine_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "AccountingPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_chartOfAccountId_fkey" FOREIGN KEY ("chartOfAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_cashAccountId_fkey" FOREIGN KEY ("cashAccountId") REFERENCES "CashAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentRecognitionSchedule" ADD CONSTRAINT "RentRecognitionSchedule_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentRecognitionSchedule" ADD CONSTRAINT "RentRecognitionSchedule_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTransfer" ADD CONSTRAINT "RoomTransfer_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTransfer" ADD CONSTRAINT "RoomTransfer_fromRoomId_fkey" FOREIGN KEY ("fromRoomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTransfer" ADD CONSTRAINT "RoomTransfer_toRoomId_fkey" FOREIGN KEY ("toRoomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTransfer" ADD CONSTRAINT "RoomTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyPoint" ADD CONSTRAINT "LoyaltyPoint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "LoyaltyReward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerBehaviorReport" ADD CONSTRAINT "PeerBehaviorReport_reporterTenantId_fkey" FOREIGN KEY ("reporterTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerBehaviorReport" ADD CONSTRAINT "PeerBehaviorReport_reporteeTenantId_fkey" FOREIGN KEY ("reporteeTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerBehaviorReport" ADD CONSTRAINT "PeerBehaviorReport_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantReferral" ADD CONSTRAINT "TenantReferral_referrerTenantId_fkey" FOREIGN KEY ("referrerTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantReferral" ADD CONSTRAINT "TenantReferral_referredTenantId_fkey" FOREIGN KEY ("referredTenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInterest" ADD CONSTRAINT "ServiceInterest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "AdditionalService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceInterest" ADD CONSTRAINT "ServiceInterest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

