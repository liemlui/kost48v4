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
CREATE INDEX "ExternalReview_isVisible_rating_idx" ON "ExternalReview"("isVisible", "rating");

-- CreateIndex
CREATE INDEX "ExternalReview_reviewedAt_idx" ON "ExternalReview"("reviewedAt");
