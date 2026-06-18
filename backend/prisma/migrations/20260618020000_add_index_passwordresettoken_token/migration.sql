-- DEEP-01: tambah index di field token untuk query WHERE token = $1
-- Catatan: @unique sudah membuat unique index, tapi @@index([token])
-- eksplisit di Prisma schema menambah non-unique index sebagai dokumentasi.

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");
