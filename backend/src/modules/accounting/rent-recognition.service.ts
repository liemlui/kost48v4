import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountingPostingService } from './accounting-posting.service';
import { buildRentRecognitionSchedule } from './rent-recognition.helper';

/** Tanggal kalender WIB (UTC+7) sebagai UTC-midnight — bebas timezone server. */
function wibDateOnly(now: Date): Date {
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
}

/**
 * F4-1 (PSAK 72) — pengakuan pendapatan sewa panjang.
 * Decoupled dari flow check-in: berbasis stay long-lease yang invoice sewanya sudah
 * ter-posting. (1) ensure: tangguhkan seluruh sewa ke 2200 + buat jadwal N bulan;
 * (2) recognize: akui baris jatuh tempo (periode sudah mulai) ke 4000. Idempotent &
 * best-effort; tak menyentuh fungsi posting lama (DO-NOT-TOUCH).
 */
@Injectable()
export class RentRecognitionService {
  private readonly logger = new Logger(RentRecognitionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly posting: AccountingPostingService,
  ) {}

  /**
   * Untuk tiap stay long-lease (SMESTERLY/YEARLY) yang sudah promoted, invoice sewanya
   * ter-posting, dan belum punya jadwal → buat jurnal deferral (DR 4000 / CR 2200 = R)
   * + jadwal N bulan, atomik. Bila deferral tak bisa diposting (mis. periode tutup) →
   * rollback & coba lagi run berikutnya.
   */
  async ensureSchedules(options: { actorUserId?: number | null } = {}) {
    const actorId = options.actorUserId ?? null;
    const stays = await this.prisma.stay.findMany({
      where: {
        pricingTerm: { in: ['SMESTERLY', 'YEARLY'] as any },
        status: 'ACTIVE' as any,
        initialMetersPromotedAt: { not: null },
        rentRecognitionSchedules: { none: {} },
      },
      select: { id: true, checkInDate: true, pricingTerm: true },
      take: 50,
    });

    let created = 0;
    for (const stay of stays) {
      const invoice = await this.prisma.invoice.findFirst({
        where: {
          stayId: stay.id,
          status: { notIn: ['DRAFT', 'CANCELLED'] as any },
          lines: { some: { lineType: 'RENT' as any } },
        },
        orderBy: { id: 'asc' },
        select: { id: true, lines: { where: { lineType: 'RENT' as any }, select: { lineAmountRupiah: true } } },
      });
      if (!invoice) continue;

      const issuancePosted = await this.prisma.journalEntry.findFirst({
        where: { sourceType: 'INVOICE' as any, sourceId: String(invoice.id), status: 'POSTED' as any },
        select: { id: true },
      });
      if (!issuancePosted) continue;

      const rentTotal = invoice.lines.reduce((sum, l) => sum + Number(l.lineAmountRupiah ?? 0), 0);
      const periods = buildRentRecognitionSchedule(stay.checkInDate, String(stay.pricingTerm), rentTotal);
      if (!periods.length) continue;

      try {
        await this.prisma.$transaction(async (tx) => {
          const deferral = await this.posting.postRentDeferralTx(tx, {
            stayId: stay.id,
            unearnedAmountRupiah: rentTotal,
            entryDate: stay.checkInDate,
            createdById: actorId,
          });
          const je = (deferral as any)?.journalEntry;
          if (!((deferral as any)?.posted || je)) {
            // skip tanpa jurnal (mis. periode tutup / COA hilang) → rollback, retry nanti
            throw new Error('DEFERRAL_NOT_POSTED');
          }
          await tx.rentRecognitionSchedule.createMany({
            data: periods.map((p) => ({
              stayId: stay.id,
              periodIndex: p.periodIndex,
              periodStart: p.periodStart,
              periodEnd: p.periodEnd,
              scheduledAmountRupiah: p.scheduledAmountRupiah,
            })),
            skipDuplicates: true,
          });
        });
        created += 1;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          // race: jadwal/deferral sudah dibuat proses lain → aman diabaikan
          continue;
        }
        if (error instanceof Error && error.message === 'DEFERRAL_NOT_POSTED') continue;
        this.logger.warn(`Gagal membuat jadwal pengakuan sewa stay #${stay.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return { created };
  }

  /**
   * Akui semua baris jadwal yang periodenya sudah dimulai (periodStart <= hari ini WIB)
   * dan belum diakui → jurnal DR 2200 / CR 4000, set recognizedAt + journalEntryId.
   * Bila posting di-skip tanpa jurnal (mis. periode bulan itu belum/ sudah tutup) → baris
   * dibiarkan pending untuk dicoba lagi.
   */
  async recognizeDue(options: { actorUserId?: number | null; now?: Date } = {}) {
    const actorId = options.actorUserId ?? null;
    const todayWib = wibDateOnly(options.now ?? new Date());
    const due = await this.prisma.rentRecognitionSchedule.findMany({
      where: { recognizedAt: null, periodStart: { lte: todayWib } },
      orderBy: [{ stayId: 'asc' }, { periodIndex: 'asc' }],
      take: 200,
    });

    let recognized = 0;
    let pending = 0;
    for (const row of due) {
      try {
        const ok = await this.prisma.$transaction(async (tx) => {
          const res = await this.posting.postRentRecognitionTx(tx, {
            stayId: row.stayId,
            periodIndex: row.periodIndex,
            amountRupiah: row.scheduledAmountRupiah,
            entryDate: row.periodStart,
            createdById: actorId,
          });
          const je = (res as any)?.journalEntry;
          if ((res as any)?.posted || je) {
            await tx.rentRecognitionSchedule.update({
              where: { id: row.id },
              data: { recognizedAt: new Date(), journalEntryId: je?.id ?? null },
            });
            return true;
          }
          return false; // di-skip tanpa jurnal (periode belum dibuka) → tetap pending
        });
        if (ok) recognized += 1;
        else pending += 1;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          // race: jurnal sudah ada; baris akan dicocokkan run berikutnya
          pending += 1;
          continue;
        }
        this.logger.warn(`Gagal mengakui pendapatan sewa baris #${row.id}: ${error instanceof Error ? error.message : String(error)}`);
        pending += 1;
      }
    }
    return { recognized, pending };
  }

  async run(options: { actorUserId?: number | null; now?: Date } = {}) {
    const ensured = await this.ensureSchedules(options);
    const recognizedResult = await this.recognizeDue(options);
    return { schedulesCreated: ensured.created, ...recognizedResult };
  }
}
