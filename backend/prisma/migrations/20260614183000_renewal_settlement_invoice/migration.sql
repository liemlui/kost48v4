ALTER TABLE "RenewRequest"
ADD COLUMN "settlementInvoiceId" INTEGER;

CREATE INDEX "RenewRequest_settlementInvoiceId_idx"
ON "RenewRequest"("settlementInvoiceId");
