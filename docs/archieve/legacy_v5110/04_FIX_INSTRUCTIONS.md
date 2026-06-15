# INSTRUKSI PERBAIKAN — KOST48 (untuk AI eksekutor)
**Sumber temuan:** `docs/03_AUDIT_MEGA_2026-06.md` (audit Fable 5, baseline commit `0a51400`).
**Kamu adalah eksekutor.** Tugasmu HANYA menjalankan FIX-01 sampai FIX-26 di bawah, persis seperti tertulis. Jangan menganalisis ulang, jangan memperbaiki hal lain yang kamu temui, jangan berimprovisasi.

## ATURAN EMAS (baca sebelum mulai, patuhi tanpa kecuali)
1. Kerjakan **berurutan** FIX-01 → FIX-26. Satu FIX selesai (termasuk verifikasi + commit) sebelum mulai FIX berikutnya.
2. Setiap FIX berisi blok **CARI** (kode lama) dan **GANTI** (kode baru). Cari blok CARI **persis karakter-demi-karakter** (termasuk spasi/indentasi) di file yang disebut. Blok CARI dijamin muncul **tepat 1 kali** di file itu.
3. **Jika blok CARI tidak ketemu, atau ketemu lebih dari 1 kali: BERHENTI.** Jangan menebak, jangan mengubah apa pun, laporkan "FIX-XX: blok tidak ketemu/duplikat" lalu lanjut ke FIX berikutnya.
4. Ganti HANYA blok itu. Jangan mengubah baris lain, jangan merapikan format, jangan mengubah import kecuali diperintahkan eksplisit.
5. Setelah setiap FIX backend: jalankan `cd backend` lalu `npx tsc --noEmit` → harus **0 error**. Setelah FIX frontend (FIX-26): `cd frontend` lalu `npx tsc --noEmit` → 0 error. Jika ada error: **kembalikan file ke kondisi semula (git checkout -- <file>), laporkan, lanjut FIX berikutnya.** Jangan mencoba memperbaiki error dengan cara lain.
6. Commit per FIX dengan pesan persis yang tertulis di FIX tsb: `git add <file yang diubah>` lalu `git commit -m "<pesan>"`.
7. LARANGAN MUTLAK: jangan tambah dependensi; jangan mengubah/menghapus kolom atau tabel yang sudah ada (FIX-25 hanya MENAMBAH constraint di file SQL); jangan menjalankan SQL apa pun ke database; jangan menyentuh DB produksi; jangan menjalankan `prisma migrate`/`db push`; jangan push ke remote.
8. Path file relatif terhadap root repo (folder `final_bundle`).

| FIX | File | Temuan | Tingkat |
|---|---|---|---|
| 01 | backend/src/modules/stays/stays.service.ts | M-14 | P1 |
| 02 | backend/src/modules/stays/stays.service.ts | M-15 | P1 |
| 03 | backend/src/modules/stays/stays.service.ts | M-16 | P1 |
| 04 | backend/src/modules/auto-ops/auto-ops.service.ts | M-22 | P1 |
| 05 | backend/src/modules/auto-ops/auto-ops.service.ts | M-24 | P3 |
| 06 | backend/src/modules/auto-ops/auto-ops.service.ts | M-25 | P3 |
| 07 | backend/src/modules/payment-submissions/payment-submissions.service.ts | M-07 | P2 |
| 08 | backend/src/modules/payment-submissions/payment-submissions.service.ts | M-12 | P3 |
| 09 | backend/src/modules/payment-submissions/payment-submissions.service.ts | M-10, M-11 | P3 |
| 10 | backend/src/modules/invoices/invoices.service.ts | M-08 | P2 |
| 11 | backend/src/modules/tenant-bookings/tenant-bookings.service.ts | M-09 | P2 |
| 12 | backend/src/modules/tenant-bookings/tenant-bookings.service.ts | M-17 | P2 |
| 13 | backend/src/modules/tenant-bookings/public-bookings.service.ts | M-18 | P2 |
| 14 | backend/src/modules/expenses/expenses.service.ts | M-33 | P1 |
| 15 | backend/src/modules/wifi-sales/wifi-sales.service.ts | M-33 | P1 |
| 16 | backend/src/modules/reports/reports.service.ts | M-35 | P2 |
| 17 | backend/src/modules/reports/reports.service.ts | M-36 | P2 |
| 18 | backend/src/modules/tickets/tickets.service.ts | M-26 | P2 |
| 19 | backend/src/modules/tickets/tickets.service.ts | M-27 | P3 |
| 20 | backend/src/modules/staff-routines/staff-routines.service.ts | M-28 | P3 |
| 21 | backend/src/common/filters/all-exceptions.filter.ts | M-02 | P2 |
| 22 | backend/src/modules/users/users.service.ts | M-39 | P3 |
| 25 | backend/sql/bootstrap.sql | M-01 | P2 |
| 26 | frontend/src/utils/publicRoomDisplay.ts | M-40 | P2 |

> Catatan: beberapa FIX berisi lebih dari satu langkah CARI/GANTI pada file yang sama. Kerjakan langkah-langkah dalam satu FIX berurutan (a, b, c, …), lalu satu commit untuk FIX itu.
> Nomor FIX-23 dan FIX-24 sengaja TIDAK ADA (dilebur saat konsolidasi). Urutan kerja: 01→22, lalu 25, lalu 26.

---

## FIX-01 [P1] Check-in manual harus langsung "promoted" (M-14)
**File:** `backend/src/modules/stays/stays.service.ts`
**Tujuan:** stay hasil check-in manual ikut seluruh lifecycle (pengingat, overstay, okupansi) dan tidak dianggap booking tak berbayar oleh sweeper.

**CARI:**
```ts
            stayPurpose: dto.stayPurpose as StayPurpose,
            notes: dto.notes,
            createdById: actor.id,
          },
        });
```
**GANTI:**
```ts
            stayPurpose: dto.stayPurpose as StayPurpose,
            notes: dto.notes,
            createdById: actor.id,
            // Audit M-14: check-in manual = langsung resmi huni; tanpa ini stay
            // dianggap "unpromoted" dan tersisih dari seluruh lifecycle overstay.
            initialMetersPromotedAt: new Date(),
          },
        });
```
**Verifikasi:** `cd backend` → `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-14): check-in manual set initialMetersPromotedAt agar masuk lifecycle overstay`

---

## FIX-02 [P1] Kunci stay saat perpanjangan (M-15)
**File:** `backend/src/modules/stays/stays.service.ts`
**Tujuan:** mencegah dobel-renew dan race dengan sweeper auto-ops.

**CARI:**
```ts
    const stay = await tx.stay.findUnique({
      where: { id },
      include: { room: { select: { id: true, code: true } } },
    });
    if (!stay) throw new NotFoundException("Stay tidak ditemukan");
    if (stay.status !== StayStatus.ACTIVE)
      throw new ConflictException("Stay tidak aktif, tidak dapat diperpanjang");
```
**GANTI:**
```ts
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
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-15): lock FOR UPDATE pada renewStayInTransaction`

---

## FIX-03 [P1] Pembatalan stay tidak boleh melepas kamar bekas huni langsung ke AVAILABLE (M-16)
**File:** `backend/src/modules/stays/stays.service.ts`
**Dua langkah (a lalu b), satu commit.**

**Langkah a — CARI:**
```ts
      if (otherActive === 0) {
        await tx.room.update({
          where: { id: existing.roomId },
          data: { status: RoomStatus.AVAILABLE },
        });
      }
```
**GANTI:**
```ts
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
      }
```

**Langkah b — CARI:**
```ts
    return normalizeStayForResponse({
      ...updated,
      roomStatusAfterSync: "AVAILABLE",
    });
```
**GANTI:**
```ts
    return normalizeStayForResponse({
      ...updated,
      roomStatusAfterSync: existing.initialMetersPromotedAt ? "MAINTENANCE" : "AVAILABLE",
    });
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-16): stays.cancel pakai gate inspeksi - kamar promoted ke MAINTENANCE`

---

## FIX-04 [P1] Auto-ops: satu item gagal tidak boleh menghentikan seluruh rantai (M-22)
**File:** `backend/src/modules/auto-ops/auto-ops.service.ts`
**Lima langkah (a–e), satu commit.** Semua langkah membungkus isi loop dengan try/catch.

**Langkah a — CARI:**
```ts
    const expiredStayIds: number[] = [];
    for (const booking of expiredBookings) {
      await this.expireBookingTx(booking.id, booking.roomId, options.actorUserId ?? null, options.source ?? 'AUTO_OPS_BOOKING_EXPIRY');
      expiredStayIds.push(booking.id);
    }
```
**GANTI:**
```ts
    const expiredStayIds: number[] = [];
    for (const booking of expiredBookings) {
      try {
        await this.expireBookingTx(booking.id, booking.roomId, options.actorUserId ?? null, options.source ?? 'AUTO_OPS_BOOKING_EXPIRY');
        expiredStayIds.push(booking.id);
      } catch (err) {
        // Audit M-22: satu stay gagal tidak boleh menghentikan job & job berikutnya.
        this.logger.warn(`AutoOps booking-expiry gagal untuk stay #${booking.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
```

**Langkah b — CARI:**
```ts
    const releasedRoomIds: number[] = [];
    for (const stay of staysToRelease) {
      const cancelled = await this.cancelEndedUnpaidStay(stay.id, {
        actorUserId: options.actorUserId ?? null,
        source: options.source ?? 'AUTO_OPS_NOON_RELEASE',
        action: 'AUTO_RELEASE_ROOM_NOON',
        checkoutReason: 'Otomatis dilepas: pk 12:00 H-day, kontrak berakhir. Tenant tidak diperpanjang.',
      });
      if (cancelled) releasedRoomIds.push(stay.roomId);
    }
```
**GANTI:**
```ts
    const releasedRoomIds: number[] = [];
    for (const stay of staysToRelease) {
      try {
        const cancelled = await this.cancelEndedUnpaidStay(stay.id, {
          actorUserId: options.actorUserId ?? null,
          source: options.source ?? 'AUTO_OPS_NOON_RELEASE',
          action: 'AUTO_RELEASE_ROOM_NOON',
          checkoutReason: 'Otomatis dilepas: pk 12:00 H-day, kontrak berakhir. Tenant tidak diperpanjang.',
        });
        if (cancelled) releasedRoomIds.push(stay.roomId);
      } catch (err) {
        this.logger.warn(`AutoOps noon-release gagal untuk stay #${stay.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
```

**Langkah c — CARI:**
```ts
    const forfeitedStayIds: number[] = [];
    for (const stay of candidates) {
      const cancelled = await this.cancelEndedUnpaidStay(stay.id, {
        actorUserId: options.actorUserId ?? null,
        source: options.source ?? 'AUTO_OPS_DP_FORFEIT',
        action: 'AUTO_CANCEL_DP_FORFEIT_HPLUS1',
        checkoutReason:
          'Gagal kontrak: pelunasan sisa sewa + deposit jaminan tidak masuk hingga H+1 pk 12:00 setelah check-in. DP hangus sesuai kebijakan.',
        forfeitDownPayment: true,
      });
      if (cancelled) forfeitedStayIds.push(stay.id);
    }
```
**GANTI:**
```ts
    const forfeitedStayIds: number[] = [];
    for (const stay of candidates) {
      try {
        const cancelled = await this.cancelEndedUnpaidStay(stay.id, {
          actorUserId: options.actorUserId ?? null,
          source: options.source ?? 'AUTO_OPS_DP_FORFEIT',
          action: 'AUTO_CANCEL_DP_FORFEIT_HPLUS1',
          checkoutReason:
            'Gagal kontrak: pelunasan sisa sewa + deposit jaminan tidak masuk hingga H+1 pk 12:00 setelah check-in. DP hangus sesuai kebijakan.',
          forfeitDownPayment: true,
        });
        if (cancelled) forfeitedStayIds.push(stay.id);
      } catch (err) {
        this.logger.warn(`AutoOps DP-forfeit gagal untuk stay #${stay.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
```

**Langkah d — CARI:**
```ts
    const forcedCheckoutStayIds: number[] = [];
    for (const candidate of candidates) {
      const done = await this.forceCheckoutOverstay(candidate.id, options, yesterday);
      if (done) forcedCheckoutStayIds.push(candidate.id);
    }
```
**GANTI:**
```ts
    const forcedCheckoutStayIds: number[] = [];
    for (const candidate of candidates) {
      try {
        const done = await this.forceCheckoutOverstay(candidate.id, options, yesterday);
        if (done) forcedCheckoutStayIds.push(candidate.id);
      } catch (err) {
        this.logger.warn(`AutoOps forced-checkout gagal untuk stay #${candidate.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
```

**Langkah e — CARI:**
```ts
    const cancelledStayIds: number[] = [];
    for (const stay of expiredStays) {
      const cancelled = await this.cancelEndedUnpaidStay(stay.id, {
        actorUserId: options.actorUserId ?? null,
        source: options.source ?? 'AUTO_OPS_HPLUS1_CANCEL',
        action: 'AUTO_CANCEL_HPLUS1_NO_PAYMENT',
        checkoutReason: 'Gagal kontrak: tidak melunasi hingga H+1. DP hangus sesuai kebijakan.',
      });
      if (cancelled) cancelledStayIds.push(stay.id);
    }
```
**GANTI:**
```ts
    const cancelledStayIds: number[] = [];
    for (const stay of expiredStays) {
      try {
        const cancelled = await this.cancelEndedUnpaidStay(stay.id, {
          actorUserId: options.actorUserId ?? null,
          source: options.source ?? 'AUTO_OPS_HPLUS1_CANCEL',
          action: 'AUTO_CANCEL_HPLUS1_NO_PAYMENT',
          checkoutReason: 'Gagal kontrak: tidak melunasi hingga H+1. DP hangus sesuai kebijakan.',
        });
        if (cancelled) cancelledStayIds.push(stay.id);
      } catch (err) {
        this.logger.warn(`AutoOps H+1 auto-cancel gagal untuk stay #${stay.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-22): try/catch per item di semua loop sweeper auto-ops`

---

## FIX-05 [P3] Forfeit jaminan legacy tidak boleh melanggar constraint DB (M-24)
**File:** `backend/src/modules/auto-ops/auto-ops.service.ts`
**Empat langkah (a–d), satu commit.**

**Langkah a — CARI:**
```ts
        Array<{ status: string; roomId: number; tenantId: number; promotedAt: Date | null; depositPaid: number; dpPaid: number }>
```
**GANTI:**
```ts
        Array<{ status: string; roomId: number; tenantId: number; promotedAt: Date | null; depositPaid: number; depositAmount: number; dpPaid: number }>
```

**Langkah b — CARI:**
```ts
        SELECT s.status, s."roomId", s."tenantId",
               s."initialMetersPromotedAt" AS "promotedAt",
               COALESCE(s."depositPaidAmountRupiah", 0) AS "depositPaid",
               COALESCE(s."downPaymentPaidRupiah", 0) AS "dpPaid"
```
**GANTI:**
```ts
        SELECT s.status, s."roomId", s."tenantId",
               s."initialMetersPromotedAt" AS "promotedAt",
               COALESCE(s."depositPaidAmountRupiah", 0) AS "depositPaid",
               COALESCE(s."depositAmountRupiah", 0) AS "depositAmount",
               COALESCE(s."downPaymentPaidRupiah", 0) AS "dpPaid"
```

**Langkah c — CARI:**
```ts
      const paid = current.depositPaid;
      await tx.stay.update({
        where: { id: stayId },
        data: {
          status: StayStatus.CANCELLED,
          checkoutReason: params.checkoutReason,
          ...(paid > 0
            ? { depositStatus: 'FORFEITED' as any, depositDeductionRupiah: paid }
            : {}),
```
**GANTI:**
```ts
      const paid = current.depositPaid;
      // Audit M-24: constraint DB menuntut FORFEITED => deduction = depositAmount.
      // Deposit terbayar parsial (data legacy) dibiarkan HELD untuk diproses manual.
      const canForfeitDeposit = paid > 0 && Number(current.depositAmount ?? 0) === paid;
      await tx.stay.update({
        where: { id: stayId },
        data: {
          status: StayStatus.CANCELLED,
          checkoutReason: params.checkoutReason,
          ...(canForfeitDeposit
            ? { depositStatus: 'FORFEITED' as any, depositDeductionRupiah: paid }
            : {}),
```

**Langkah d — CARI:**
```ts
      // Pass C: forfeit deposit jaminan legacy juga dicatat di ledger agar
      // reconciliationLite tidak mendeteksi selisih (FORFEIT entry idempotent).
      if (paid > 0) {
```
**GANTI:**
```ts
      // Pass C: forfeit deposit jaminan legacy juga dicatat di ledger agar
      // reconciliationLite tidak mendeteksi selisih (FORFEIT entry idempotent).
      if (canForfeitDeposit) {
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-24): forfeit jaminan hanya bila paid = depositAmount (selaras constraint DB)`

---

## FIX-06 [P3] Perbaiki link notifikasi mati (M-25)
**File:** `backend/src/modules/auto-ops/auto-ops.service.ts`
**Dua langkah (a, b), satu commit.** Rute frontend yang benar adalah `/portal/stay`.

**Langkah a — CARI:**
```ts
        linkTo: '/portal/my-stay',
        entityType: 'Stay',
        entityId: String(stay.id),
```
**GANTI:**
```ts
        linkTo: '/portal/stay',
        entityType: 'Stay',
        entityId: String(stay.id),
```

**Langkah b — CARI:**
```ts
          linkTo: '/portal/my-stay',
          entityType: 'Stay',
          entityId: String(stayId),
```
**GANTI:**
```ts
          linkTo: '/portal/stay',
          entityType: 'Stay',
          entityId: String(stayId),
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-25): linkTo notifikasi auto-ops ke rute portal yang benar`

---

## FIX-07 [P2] Aktivasi booking selalu menandai stay "promoted" (M-07)
**File:** `backend/src/modules/payment-submissions/payment-submissions.service.ts`
**Tujuan:** invariant "kamar OCCUPIED ⇒ stay promoted" dijaga struktural, meski snapshot meter tidak ada. Pembuatan MeterReading tetap kondisional (sudah ada guard `hasElectricity`/`hasWater` di dalam blok).

**CARI:**
```ts
            if (stay && (hasElectricity || hasWater)) {
```
**GANTI:**
```ts
            // Audit M-07: promosi stay TIDAK boleh bergantung pada ada/tidaknya
            // snapshot meter; meter dibuat kondisional di dalam blok ini.
            if (stay) {
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-07): set initialMetersPromotedAt saat aktivasi walau tanpa snapshot meter`

---

## FIX-08 [P3] Matikan expiresAt saat pembayaran pertama disetujui (M-12)
**File:** `backend/src/modules/payment-submissions/payment-submissions.service.ts`

**CARI:**
```ts
          await tx.stay.update({
            where: { id: submission.stayId },
            data: {
              depositPaidAmountRupiah: stayDepositPaidAfter,
```
**GANTI:**
```ts
          await tx.stay.update({
            where: { id: submission.stayId },
            data: {
              // Audit M-12: pembayaran pertama disetujui = kamar terkunci;
              // matikan expiresAt struktural, bukan hanya lewat filter sweeper.
              expiresAt: null,
              depositPaidAmountRupiah: stayDepositPaidAfter,
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-12): expiresAt dinolkan saat approval pembayaran booking`

---

## FIX-09 [P3] Copy notifikasi approve + akses bukti EXPIRED (M-10, M-11)
**File:** `backend/src/modules/payment-submissions/payment-submissions.service.ts`
**Dua langkah (a, b), satu commit.**

**Langkah a — CARI:**
```ts
        body: 'Pembayaran Anda telah diverifikasi. Hunian Anda sudah aktif.',
```
**GANTI:**
```ts
        body: 'Pembayaran Anda telah diverifikasi. Silakan cek status hunian/booking Anda di portal.',
```

**Langkah b — CARI:**
```ts
        status: { in: [PaymentSubmissionStatus.PENDING_REVIEW, PaymentSubmissionStatus.APPROVED, PaymentSubmissionStatus.REJECTED] },
```
**GANTI:**
```ts
        status: { in: [PaymentSubmissionStatus.PENDING_REVIEW, PaymentSubmissionStatus.APPROVED, PaymentSubmissionStatus.REJECTED, PaymentSubmissionStatus.EXPIRED] },
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-10,M-11): copy notifikasi approve netral + tenant bisa lihat bukti EXPIRED miliknya`
<!-- LANJUTAN-FIX-10 -->

---

## FIX-10 [P2] Total invoice: DISCOUNT adalah pengurang (M-08)
**File:** `backend/src/modules/invoices/invoices.service.ts`
**Dua langkah (a, b), satu commit.** Rumus service harus identik dengan trigger DB `recalc_invoice_total` (DISCOUNT bertanda minus), kalau tidak guard DB menolak update total.

**Langkah a — CARI:**
```ts
  private async recalculateInvoiceTotal(invoiceId: number) {
    const aggregate = await this.prisma.invoiceLine.aggregate({
      where: { invoiceId },
      _sum: { lineAmountRupiah: true },
    });
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { totalAmountRupiah: Number(aggregate._sum.lineAmountRupiah ?? 0) },
    });
  }
```
**GANTI:**
```ts
  private async recalculateInvoiceTotal(invoiceId: number) {
    // Audit M-08: DISCOUNT adalah pengurang - harus identik dengan trigger DB
    // recalc_invoice_total, kalau tidak guard DB menolak update total.
    const lines = await this.prisma.invoiceLine.findMany({
      where: { invoiceId },
      select: { lineType: true, lineAmountRupiah: true },
    });
    const total = lines.reduce(
      (sum, line) =>
        sum +
        (String(line.lineType) === 'DISCOUNT'
          ? -Number(line.lineAmountRupiah ?? 0)
          : Number(line.lineAmountRupiah ?? 0)),
      0,
    );
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { totalAmountRupiah: total },
    });
  }
```

**Langkah b — CARI:**
```ts
      let totalAmountRupiah = 0;
      for (let index = 0; index < dto.lines.length; index += 1) {
        const lineData = this.buildLineData(created.id, dto.lines[index], index);
        totalAmountRupiah += Number(lineData.lineAmountRupiah ?? 0);
        await tx.invoiceLine.create({ data: lineData });
      }
```
**GANTI:**
```ts
      let totalAmountRupiah = 0;
      for (let index = 0; index < dto.lines.length; index += 1) {
        const lineData = this.buildLineData(created.id, dto.lines[index], index);
        const lineSign = String(dto.lines[index].lineType) === 'DISCOUNT' ? -1 : 1;
        totalAmountRupiah += lineSign * Number(lineData.lineAmountRupiah ?? 0);
        await tx.invoiceLine.create({ data: lineData });
      }
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-08): total invoice menghitung DISCOUNT sebagai pengurang (selaras trigger DB)`

---

## FIX-11 [P2] DP 30% mengikuti tarif final saat approval booking (M-09)
**File:** `backend/src/modules/tenant-bookings/tenant-bookings.service.ts`

**CARI:**
```ts
        const baselineDate = startOfDay(new Date(booking.checkInDate));

        const updatedStay = await tx.stay.update({
          where: { id: stayId },
          data: {
            agreedRentAmountRupiah: dto.agreedRentAmountRupiah,
            depositAmountRupiah: dto.depositAmountRupiah,
          },
        });
```
**GANTI:**
```ts
        const baselineDate = startOfDay(new Date(booking.checkInDate));

        // Audit M-09: DP wajib tetap 30% dari tarif final. Bila DP sudah
        // terbayar, tarif tidak boleh diubah lagi lewat approval ini.
        const dpRow = await tx.stay.findUnique({
          where: { id: stayId },
          select: { downPaymentPaidRupiah: true, agreedRentAmountRupiah: true },
        });
        const dpPaidSoFar = Number(dpRow?.downPaymentPaidRupiah ?? 0);
        if (dpPaidSoFar > 0 && dto.agreedRentAmountRupiah !== Number(dpRow?.agreedRentAmountRupiah ?? 0)) {
          throw new ConflictException(
            'DP sudah dibayar untuk tarif sebelumnya. Tarif tidak dapat diubah; batalkan booking bila perlu negosiasi ulang.',
          );
        }
        const updatedStay = await tx.stay.update({
          where: { id: stayId },
          data: {
            agreedRentAmountRupiah: dto.agreedRentAmountRupiah,
            depositAmountRupiah: dto.depositAmountRupiah,
            ...(dpPaidSoFar === 0
              ? { downPaymentAmountRupiah: Math.round((dto.agreedRentAmountRupiah * 30) / 100) }
              : {}),
          },
        });
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-09): recalc DP 30% saat approval booking; tolak ubah tarif bila DP terbayar`

---

## FIX-12 [P2] Pelepas kamar di reject/cancel booking sadar tiket pembersihan (M-17)
**File:** `backend/src/modules/tenant-bookings/tenant-bookings.service.ts`
**Dua langkah (a, b), satu commit.**

**Langkah a (jalur rejectBooking) — CARI:**
```ts
        if (existingSubmission) {
          throw new ConflictException('Booking sudah memiliki bukti pembayaran. Review pembayaran harus diselesaikan dari flow pembayaran.');
        }

        const otherActiveReservedBooking = await tx.stay.findFirst({
          where: {
            roomId: row.roomId,
            status: StayStatus.ACTIVE as any,
            NOT: { id: stayId },
            room: { status: RoomStatus.RESERVED as any },
          },
          select: { id: true },
        });
        const nextRoomStatus = otherActiveReservedBooking
          ? RoomStatus.RESERVED
          : RoomStatus.AVAILABLE;
```
**GANTI:**
```ts
        if (existingSubmission) {
          throw new ConflictException('Booking sudah memiliki bukti pembayaran. Review pembayaran harus diselesaikan dari flow pembayaran.');
        }

        const otherActiveReservedBooking = await tx.stay.findFirst({
          where: {
            roomId: row.roomId,
            status: StayStatus.ACTIVE as any,
            NOT: { id: stayId },
            room: { status: RoomStatus.RESERVED as any },
          },
          select: { id: true },
        });
        // Audit M-17: kamar dengan tiket pembersihan terbuka kembali ke
        // MAINTENANCE (tetap bisa dipesan), bukan AVAILABLE.
        const openCleaningTicket = await tx.ticket.findFirst({
          where: {
            roomId: row.roomId,
            category: 'CHECKOUT_INSPECTION' as any,
            status: { notIn: ['CLOSED', 'CANCELLED'] as any },
          },
          select: { id: true },
        });
        const nextRoomStatus = otherActiveReservedBooking
          ? RoomStatus.RESERVED
          : openCleaningTicket
            ? RoomStatus.MAINTENANCE
            : RoomStatus.AVAILABLE;
```

**Langkah b (jalur cancelPendingBooking) — CARI:**
```ts
        const cancelReason =
          dto.cancelReason?.trim() ||
          'Dibatalkan oleh tenant sebelum review admin';

        const otherActiveReservedBooking = await tx.stay.findFirst({
          where: {
            roomId: row.roomId,
            status: StayStatus.ACTIVE as any,
            NOT: { id: stayId },
            room: { status: RoomStatus.RESERVED as any },
          },
          select: { id: true },
        });
        const nextRoomStatus = otherActiveReservedBooking
          ? RoomStatus.RESERVED
          : RoomStatus.AVAILABLE;
```
**GANTI:**
```ts
        const cancelReason =
          dto.cancelReason?.trim() ||
          'Dibatalkan oleh tenant sebelum review admin';

        const otherActiveReservedBooking = await tx.stay.findFirst({
          where: {
            roomId: row.roomId,
            status: StayStatus.ACTIVE as any,
            NOT: { id: stayId },
            room: { status: RoomStatus.RESERVED as any },
          },
          select: { id: true },
        });
        // Audit M-17: kamar dengan tiket pembersihan terbuka kembali ke
        // MAINTENANCE (tetap bisa dipesan), bukan AVAILABLE.
        const openCleaningTicket = await tx.ticket.findFirst({
          where: {
            roomId: row.roomId,
            category: 'CHECKOUT_INSPECTION' as any,
            status: { notIn: ['CLOSED', 'CANCELLED'] as any },
          },
          select: { id: true },
        });
        const nextRoomStatus = otherActiveReservedBooking
          ? RoomStatus.RESERVED
          : openCleaningTicket
            ? RoomStatus.MAINTENANCE
            : RoomStatus.AVAILABLE;
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-17): reject/cancel booking tidak melepas kamar kotor ke AVAILABLE`

---

## FIX-13 [P2] Cutoff booking publik same-day pakai jam WIB (M-18)
**File:** `backend/src/modules/tenant-bookings/public-bookings.service.ts`

**CARI:**
```ts
    const isSameDayCheckIn = checkInDate.getTime() === today.getTime();
    const minimumBookingWindowMs = 3 * 60 * 60 * 1000;
    if (isSameDayCheckIn && (endOfDay(checkInDate).getTime() - now.getTime()) < minimumBookingWindowMs) {
      throw new BadRequestException(
        'Booking untuk hari ini sudah ditutup karena jam operasional sudah berakhir. Silakan pilih tanggal check-in mulai besok. Jam operasional booking hari ini: 08.00–21.00 WIB.',
      );
    }
```
**GANTI:**
```ts
    const isSameDayCheckIn = checkInDate.getTime() === today.getTime();
    // Audit M-18: cutoff same-day mengikuti jam Jakarta (pk 21.00 WIB),
    // konsisten dengan jalur booking portal.
    const jakartaHour = (now.getUTCHours() + 7) % 24;
    if (isSameDayCheckIn && jakartaHour >= 21) {
      throw new BadRequestException(
        'Booking untuk hari ini sudah ditutup karena jam operasional sudah berakhir (pk 21.00 WIB). Silakan pilih tanggal check-in mulai besok.',
      );
    }
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-18): cutoff booking publik same-day pakai pk 21.00 WIB (paritas portal)`

---

## FIX-14 [P1] Expense terjurnal tidak boleh diedit nominalnya / dihapus diam-diam (M-33)
**File:** `backend/src/modules/expenses/expenses.service.ts`
**Tiga langkah (a, b, c), satu commit.**

**Langkah a — CARI:**
```ts
  async update(id: number, dto: UpdateExpenseDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense tidak ditemukan');
    await this.validateRelations(dto.roomId ?? existing.roomId ?? undefined, dto.stayId ?? existing.stayId ?? undefined);
```
**GANTI:**
```ts
  async update(id: number, dto: UpdateExpenseDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense tidak ditemukan');
    // Audit M-33: data finansial yang sudah terjurnal tidak boleh berubah senyap.
    const changingFinancials =
      (dto.amountRupiah !== undefined && dto.amountRupiah !== existing.amountRupiah) ||
      (dto.expenseDate !== undefined && new Date(dto.expenseDate).getTime() !== new Date(existing.expenseDate).getTime()) ||
      (dto.category !== undefined && dto.category !== existing.category);
    await this.assertExpenseJournalAllowsChange(id, changingFinancials);
    await this.validateRelations(dto.roomId ?? existing.roomId ?? undefined, dto.stayId ?? existing.stayId ?? undefined);
```

**Langkah b — CARI:**
```ts
  async remove(id: number, actor: CurrentUserPayload) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense tidak ditemukan');
    await this.prisma.expense.delete({ where: { id } });
```
**GANTI:**
```ts
  async remove(id: number, actor: CurrentUserPayload) {
    const existing = await this.prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Expense tidak ditemukan');
    await this.assertExpenseJournalAllowsChange(id, true);
    await this.prisma.expense.delete({ where: { id } });
```

**Langkah c — CARI:**
```ts
  private async validateRelations(roomId?: number, stayId?: number) {
```
**GANTI:**
```ts
  private async assertExpenseJournalAllowsChange(expenseId: number, changingFinancials: boolean) {
    if (!changingFinancials) return;
    const journal = await this.prisma.journalEntry.findFirst({
      where: { sourceType: 'EXPENSE' as any, sourceId: String(expenseId), status: { not: 'VOID' as any } },
      select: { id: true, entryNumber: true },
    });
    if (journal) {
      throw new ConflictException(
        `Expense sudah terjurnal (${journal.entryNumber}). Nominal/tanggal/kategori tidak boleh diubah dan data tidak boleh dihapus; gunakan jurnal koreksi atau void resmi di accounting.`,
      );
    }
  }

  private async validateRelations(roomId?: number, stayId?: number) {
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-33): blokir edit-nominal/hapus expense yang sudah terjurnal`

---

## FIX-15 [P1] WiFi sale terjurnal tidak boleh diedit nominalnya / dihapus diam-diam (M-33)
**File:** `backend/src/modules/wifi-sales/wifi-sales.service.ts`
**Empat langkah (a, b, c, d), satu commit.**

**Langkah a — CARI:**
```ts
import { Injectable, NotFoundException } from '@nestjs/common';
```
**GANTI:**
```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
```

**Langkah b — CARI:**
```ts
  async update(id: number, dto: UpdateWifiSaleDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.wifiSale.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Penjualan WiFi tidak ditemukan');
    const updated = await this.prisma.wifiSale.update({
```
**GANTI:**
```ts
  async update(id: number, dto: UpdateWifiSaleDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.wifiSale.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Penjualan WiFi tidak ditemukan');
    // Audit M-33: data finansial yang sudah terjurnal tidak boleh berubah senyap.
    const changingFinancials =
      (dto.soldPriceRupiah !== undefined && dto.soldPriceRupiah !== existing.soldPriceRupiah) ||
      (dto.saleDate !== undefined && new Date(dto.saleDate).getTime() !== new Date(existing.saleDate).getTime());
    await this.assertWifiSaleJournalAllowsChange(id, changingFinancials);
    const updated = await this.prisma.wifiSale.update({
```

**Langkah c — CARI:**
```ts
  async remove(id: number, actor: CurrentUserPayload) {
    const existing = await this.prisma.wifiSale.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Penjualan WiFi tidak ditemukan');
    await this.prisma.wifiSale.delete({ where: { id } });
```
**GANTI:**
```ts
  async remove(id: number, actor: CurrentUserPayload) {
    const existing = await this.prisma.wifiSale.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Penjualan WiFi tidak ditemukan');
    await this.assertWifiSaleJournalAllowsChange(id, true);
    await this.prisma.wifiSale.delete({ where: { id } });
```

**Langkah d — CARI:**
```ts
    await this.audit.log({ actorUserId: actor.id, action: 'DELETE', entityType: 'WifiSale', entityId: String(existing.id), oldData: existing });
    return { deletedId: existing.id };
  }
}
```
**GANTI:**
```ts
    await this.audit.log({ actorUserId: actor.id, action: 'DELETE', entityType: 'WifiSale', entityId: String(existing.id), oldData: existing });
    return { deletedId: existing.id };
  }

  private async assertWifiSaleJournalAllowsChange(wifiSaleId: number, changingFinancials: boolean) {
    if (!changingFinancials) return;
    const journal = await this.prisma.journalEntry.findFirst({
      where: { sourceType: 'WIFI_SALE' as any, sourceId: String(wifiSaleId), status: { not: 'VOID' as any } },
      select: { id: true, entryNumber: true },
    });
    if (journal) {
      throw new ConflictException(
        `Penjualan WiFi sudah terjurnal (${journal.entryNumber}). Nominal/tanggal tidak boleh diubah dan data tidak boleh dihapus; gunakan jurnal koreksi atau void resmi di accounting.`,
      );
    }
  }
}
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-33): blokir edit-nominal/hapus wifi-sale yang sudah terjurnal`

---

## FIX-16 [P2] Okupansi laporan tidak menghitung booking yang belum huni (M-35)
**File:** `backend/src/modules/reports/reports.service.ts`
**Dua langkah (a, b), satu commit.**

**Langkah a (financialRatios) — CARI:**
```ts
    // Occupancy Rate — real-time snapshot
    const [operableCount, occupiedCount] = await Promise.all([
      this.prisma.room.count({
        where: {
          isActive: true,
          status: { notIn: ['MAINTENANCE', 'INACTIVE'] as any },
        },
      }),
      this.prisma.stay.count({
        where: { status: 'ACTIVE' as any },
      }),
    ]);
```
**GANTI:**
```ts
    // Occupancy Rate — real-time snapshot
    const [operableCount, occupiedCount] = await Promise.all([
      this.prisma.room.count({
        where: {
          isActive: true,
          status: { notIn: ['MAINTENANCE', 'INACTIVE'] as any },
        },
      }),
      // Audit M-35: hanya stay promoted (benar-benar huni) yang dihitung okupansi.
      this.prisma.stay.count({
        where: { status: 'ACTIVE' as any, initialMetersPromotedAt: { not: null } },
      }),
    ]);
```

**Langkah b (occupancy) — CARI:**
```ts
    const [operableCount, occupiedCount, invoiceAgg] = await Promise.all([
      this.prisma.room.count({
        where: {
          isActive: true,
          status: { notIn: ['MAINTENANCE', 'INACTIVE'] as any },
        },
      }),
      this.prisma.stay.count({
        where: { status: 'ACTIVE' as any },
      }),
```
**GANTI:**
```ts
    const [operableCount, occupiedCount, invoiceAgg] = await Promise.all([
      this.prisma.room.count({
        where: {
          isActive: true,
          status: { notIn: ['MAINTENANCE', 'INACTIVE'] as any },
        },
      }),
      // Audit M-35: hanya stay promoted (benar-benar huni) yang dihitung okupansi.
      this.prisma.stay.count({
        where: { status: 'ACTIVE' as any, initialMetersPromotedAt: { not: null } },
      }),
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-35): okupansi reports exclude booking belum promoted (selaras P2-26)`

---

## FIX-17 [P2] Deposit liability mencakup jaminan HELD milik stay yang sudah selesai (M-36)
**File:** `backend/src/modules/reports/reports.service.ts`

**CARI:**
```ts
    const stays = await this.prisma.stay.findMany({
      where: {
        status: 'ACTIVE' as any,
        depositAmountRupiah: { gt: 0 },
      },
```
**GANTI:**
```ts
    const stays = await this.prisma.stay.findMany({
      // Audit M-36: liability = semua jaminan berstatus HELD, termasuk stay
      // yang sudah selesai tetapi depositnya belum di-settle.
      where: {
        depositStatus: 'HELD' as any,
        OR: [{ status: 'ACTIVE' as any }, { depositPaidAmountRupiah: { gt: 0 } }],
        depositAmountRupiah: { gt: 0 },
      },
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-36): deposit liability report mencakup jaminan HELD stay selesai`
<!-- LANJUTAN-FIX-18 -->

---

## FIX-18 [P2] Staf hanya boleh menyelesaikan tiketnya sendiri (M-26)
**File:** `backend/src/modules/tickets/tickets.service.ts`

**CARI:**
```ts
  async markDone(id: number, dto: ResolutionDto, actor: CurrentUserPayload) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException("Tiket tidak ditemukan");
    if (ticket.status !== "IN_PROGRESS")
      throw new ConflictException("Transisi status tidak valid");
```
**GANTI:**
```ts
  async markDone(id: number, dto: ResolutionDto, actor: CurrentUserPayload) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException("Tiket tidak ditemukan");
    if (ticket.status !== "IN_PROGRESS")
      throw new ConflictException("Transisi status tidak valid");
    // Audit M-26: guard yang sama dengan start() — staf bukan assignee tidak
    // boleh menyelesaikan tiket staf lain.
    if (actor.role === "STAFF" && ticket.assignedToId !== actor.id) {
      throw new ConflictException("Tiket ini bukan tugas akun ini");
    }
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-26): markDone tiket dijaga kepemilikan untuk STAFF`

---

## FIX-19 [P3] Tiket tertutup tidak bisa di-assign ulang (M-27)
**File:** `backend/src/modules/tickets/tickets.service.ts`

**CARI:**
```ts
  async assign(id: number, dto: AssignTicketDto, actor: CurrentUserPayload) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException("Tiket tidak ditemukan");
```
**GANTI:**
```ts
  async assign(id: number, dto: AssignTicketDto, actor: CurrentUserPayload) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException("Tiket tidak ditemukan");
    // Audit M-27: tiket final tidak boleh dipindah-tangankan lagi.
    if (["CLOSED", "CANCELLED"].includes(String(ticket.status))) {
      throw new ConflictException("Tiket yang sudah ditutup/dibatalkan tidak dapat di-assign ulang");
    }
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-27): tolak assign pada tiket CLOSED/CANCELLED`

---

## FIX-20 [P3] Pekerjaan rutin DONE tidak bisa ditimpa ulang (M-28)
**File:** `backend/src/modules/staff-routines/staff-routines.service.ts`

**CARI:**
```ts
    const existing = await this.prisma.staffRoutineCompletion.findFirst({
      where: {
        templateId: template.id,
        assignmentId: assignment?.id ?? null,
        staffUserId: actor.id,
        roomId,
        dueDate,
      },
    });

    const data = {
```
**GANTI:**
```ts
    const existing = await this.prisma.staffRoutineCompletion.findFirst({
      where: {
        templateId: template.id,
        assignmentId: assignment?.id ?? null,
        staffUserId: actor.id,
        roomId,
        dueDate,
      },
    });

    // Audit M-28: pekerjaan yang sudah DONE tidak boleh ditimpa (anti polish KPI).
    if (existing?.status === StaffRoutineStatus.DONE) {
      throw new ConflictException('Pekerjaan ini sudah selesai dan tidak dapat diubah lagi.');
    }

    const data = {
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-28): complete rutin menolak pekerjaan yang sudah DONE`

---

## FIX-21 [P2] Pesan error internal tidak bocor di production (M-02)
**File:** `backend/src/common/filters/all-exceptions.filter.ts`

**CARI:**
```ts
    let message: any = 'Terjadi kesalahan pada server';
    if (typeof exceptionResponse === 'string') message = exceptionResponse;
    else if (exceptionResponse && typeof exceptionResponse === 'object') {
      const resp: any = exceptionResponse;
      message = resp.message ?? resp.error ?? message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }
```
**GANTI:**
```ts
    let message: any = 'Terjadi kesalahan pada server';
    if (typeof exceptionResponse === 'string') message = exceptionResponse;
    else if (exceptionResponse && typeof exceptionResponse === 'object') {
      const resp: any = exceptionResponse;
      message = resp.message ?? resp.error ?? message;
    } else if (exception instanceof Error && process.env.NODE_ENV !== 'production') {
      // Audit M-02: pesan error internal (Prisma/driver) tidak boleh bocor di production.
      message = exception.message;
    }
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-02): sembunyikan pesan exception non-HTTP di production`

---

## FIX-22 [P3] Cek duplikat email saat update user harus case-insensitive (M-39)
**File:** `backend/src/modules/users/users.service.ts`

**CARI:**
```ts
    if (dto.email && dto.email !== existing.email) {
      const emailExists = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (emailExists) throw new ConflictException('Email sudah digunakan');
    }
```
**GANTI:**
```ts
    if (dto.email && dto.email !== existing.email) {
      // Audit M-39: samakan dengan create() — pengecekan email case-insensitive.
      const emailExists = await this.prisma.user.findFirst({
        where: { email: { equals: dto.email, mode: 'insensitive' }, id: { not: id } },
      });
      if (emailExists) throw new ConflictException('Email sudah digunakan');
    }
```
**Verifikasi:** `npx tsc --noEmit` = 0 error.
**Commit:** `fix(M-39): cek duplikat email update user case-insensitive`

---

## FIX-25 [P2] Pagar DB untuk DP (M-01) — HANYA mengedit file SQL, JANGAN dijalankan ke database
**File:** `backend/sql/bootstrap.sql`
**Catatan:** ini perubahan ADDITIVE (menambah CHECK constraint baru). Kamu hanya mengubah FILE — owner yang akan menjalankan bootstrap.sql saat deploy/UAT.

**CARI:**
```sql
-- A18: DP (uang muka pesan kamar) terpisah dari deposit (jaminan checkout)
ALTER TABLE "Stay" ADD COLUMN IF NOT EXISTS "downPaymentAmountRupiah" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Stay" ADD COLUMN IF NOT EXISTS "downPaymentPaidRupiah" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Stay" ADD COLUMN IF NOT EXISTS "downPaymentPaidAt" TIMESTAMP(3);
ALTER TABLE "Stay" ADD COLUMN IF NOT EXISTS "downPaymentForfeitedAt" TIMESTAMP(3);
```
**GANTI:**
```sql
-- A18: DP (uang muka pesan kamar) terpisah dari deposit (jaminan checkout)
ALTER TABLE "Stay" ADD COLUMN IF NOT EXISTS "downPaymentAmountRupiah" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Stay" ADD COLUMN IF NOT EXISTS "downPaymentPaidRupiah" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Stay" ADD COLUMN IF NOT EXISTS "downPaymentPaidAt" TIMESTAMP(3);
ALTER TABLE "Stay" ADD COLUMN IF NOT EXISTS "downPaymentForfeitedAt" TIMESTAMP(3);

-- Audit M-01: pagar DP setara pagar deposit jaminan (paid tidak boleh negatif
-- atau melebihi kewajiban DP).
ALTER TABLE "Stay" DROP CONSTRAINT IF EXISTS stay_down_payment_amount_chk;
ALTER TABLE "Stay" ADD CONSTRAINT stay_down_payment_amount_chk
CHECK (
  "downPaymentAmountRupiah" >= 0
  AND "downPaymentPaidRupiah" >= 0
  AND "downPaymentPaidRupiah" <= "downPaymentAmountRupiah"
);
```
**Verifikasi:** tidak ada perintah yang dijalankan; cukup pastikan file tersimpan dan diff hanya menambah blok di atas.
**Commit:** `fix(M-01): tambah CHECK constraint DP di bootstrap.sql (additive)`

---

## FIX-26 [P2] Harga publik = harga yang ditagih (M-40)
**File:** `frontend/src/utils/publicRoomDisplay.ts`

**CARI:**
```ts
export function getPublicRoomRate(room: PublicRoom, term: PricingTerm = "MONTHLY") {
  if (term === "DAILY") return Number(room.pricing?.dailyRateRupiah ?? 0);
  if (term === "WEEKLY") return Number(room.pricing?.weeklyRateRupiah ?? 0);
  if (term === "BIWEEKLY") {
    return Number(room.pricing?.biWeeklyRateRupiah ?? 0) ||
      (room.pricing?.monthlyRateRupiah ? calculateRentByPricingTerm(Number(room.pricing.monthlyRateRupiah), term) : 0);
  }
  if (term === "MONTHLY") return Number(room.pricing?.monthlyRateRupiah ?? room.highlightedRateRupiah ?? 0);

  const monthly = Number(room.pricing?.monthlyRateRupiah ?? 0);
  return monthly > 0 ? calculateRentByPricingTerm(monthly, term) : Number(room.highlightedRateRupiah ?? 0);
}
```
**GANTI:**
```ts
export function getPublicRoomRate(room: PublicRoom, term: PricingTerm = "MONTHLY") {
  // Audit M-40: harga tampil harus sama dengan harga yang DITAGIH backend —
  // semua term diturunkan dari tarif bulanan via formula resmi.
  const monthly = Number(room.pricing?.monthlyRateRupiah ?? 0);
  if (term === "MONTHLY") return monthly || Number(room.highlightedRateRupiah ?? 0);
  if (monthly > 0) return calculateRentByPricingTerm(monthly, term);
  return Number(room.highlightedRateRupiah ?? 0);
}
```
**Verifikasi:** `cd frontend` lalu `npx tsc --noEmit` = 0 error. (Bila ada error "unused variable" pada helper lain di file ini: kembalikan file, laporkan, JANGAN hapus apa pun.)
**Commit:** `fix(M-40): harga publik semua term dari formula resmi (paritas dengan tagihan)`

---

## SETELAH SEMUA FIX SELESAI
1. Jalankan sekali lagi: `cd backend` → `npx tsc --noEmit` dan `cd ../frontend` → `npx tsc --noEmit` — keduanya 0 error.
2. `git log --oneline -30` — pastikan ada satu commit per FIX yang berhasil.
3. Tulis laporan singkat: daftar FIX yang sukses, dan FIX yang kamu lewati beserta alasannya (blok tidak ketemu / tsc error). JANGAN push.

## JANGAN DIKERJAKAN (eskalasi — bukan tugasmu)
Daftar E-1 sampai E-9 di `docs/03_AUDIT_MEGA_2026-06.md` bagian "Daftar ESKALASI" hanya boleh dikerjakan Fable/owner. Jika kamu merasa sebuah FIX butuh perubahan di luar blok yang diberikan — itu sinyal BERHENTI, bukan sinyal improvisasi.
