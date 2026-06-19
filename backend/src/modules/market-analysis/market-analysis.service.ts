import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatMsg, deepseekChat, deepseekConfigured } from './deepseek.client';
import { MarketAnalysisChatDto, SaveMarketAnalysisDto } from './dto/market-analysis.dto';

const RESULT_MARKER = '===HASIL';

@Injectable()
export class MarketAnalysisService {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  configured() {
    return { configured: deepseekConfigured() };
  }

  private rateLimit(actorId: number) {
    const now = Date.now();
    const b = this.buckets.get(String(actorId));
    if (!b || b.resetAt < now) {
      this.buckets.set(String(actorId), { count: 1, resetAt: now + 60_000 });
      return;
    }
    b.count += 1;
    if (b.count > 20) throw new HttpException('Terlalu banyak permintaan AI. Coba lagi sebentar.', HttpStatus.TOO_MANY_REQUESTS);
  }

  private systemPrompt(kind: string) {
    const k = (kind || 'SWOT').toUpperCase();
    return [
      'Kamu analis pasar untuk usaha kos "KOST48" di Jl. Hikmah V No. 48, Surabaya Barat',
      '(area Pakuwon/PTC), 48 kamar, segmen kos bulanan. Bahasa Indonesia, ringkas, ramah.',
      '',
      `TUGAS: bantu owner menyusun analisa ${k}. Lakukan WAWANCARA dulu: ajukan 1-2 pertanyaan`,
      'terfokus tiap giliran untuk menggali kondisi nyata (okupansi, tarif & paket, profil penghuni,',
      'kompetitor sekitar, fasilitas unggulan, keluhan umum, target pasar, kanal pemasaran).',
      'Jangan memberi hasil sebelum data cukup — tanya dulu, satu langkah demi satu langkah.',
      '',
      `Saat data sudah cukup, keluarkan HASIL AKHIR: awali baris persis "${RESULT_MARKER} ${k}===",`,
      'lalu di baris berikutnya sebuah JSON valid (tanpa pagar kode) dengan struktur:',
      k === 'PESTLE'
        ? '{ "summary": string, "political": string[], "economic": string[], "social": string[], "technological": string[], "legal": string[], "environmental": string[], "recommendations": string[] }'
        : k === 'COMPETITOR'
          ? '{ "summary": string, "competitors": [{ "name": string, "strengths": string[], "weaknesses": string[], "priceNote": string }], "positioning": string, "recommendations": string[] }'
          : '{ "summary": string, "strengths": string[], "weaknesses": string[], "opportunities": string[], "threats": string[], "recommendations": string[] }',
      '',
      'CATATAN PENTING: kamu BELUM punya akses internet langsung (riset web live = fitur menyusul).',
      'Gunakan pengetahuan umum pasar kos Surabaya + jawaban owner. Bila perlu data terkini yang tak',
      'kamu ketahui (mis. tarif kompetitor terbaru), MINTA owner menyebutkannya, jangan mengarang angka.',
    ].join('\n');
  }

  /**
   * Snapshot data NYATA kos (okupansi, hunian aktif, survei kepuasan) → diberikan ke AI agar
   * analisa berbasis fakta, bukan hanya jawaban verbal owner. Juga ditampilkan di UI.
   */
  async businessSnapshot() {
    const [totalRooms, occupiedRooms, availableRooms, activeStays, surveyAgg, recRows] = await Promise.all([
      this.prisma.room.count(),
      this.prisma.room.count({ where: { status: 'OCCUPIED' as any } }),
      this.prisma.room.count({ where: { status: 'AVAILABLE' as any } }),
      this.prisma.stay.count({ where: { status: 'ACTIVE' as any } }),
      this.prisma.satisfactionSurvey.aggregate({ _count: { _all: true }, _avg: { overallRating: true } }),
      this.prisma.satisfactionSurvey.findMany({ select: { wouldRecommend: true } }),
    ]);
    const rec = recRows.map((r) => r.wouldRecommend).filter((v): v is boolean => v !== null);
    return {
      rooms: { total: totalRooms, occupied: occupiedRooms, available: availableRooms },
      occupancyPercent: totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      activeStays,
      survey: {
        count: surveyAgg._count._all,
        avgOverall: surveyAgg._avg.overallRating != null ? Math.round(surveyAgg._avg.overallRating * 10) / 10 : null,
        recommendRate: rec.length ? Math.round((rec.filter(Boolean).length / rec.length) * 100) : null,
      },
    };
  }

  // ─── CAC/CLV Lite ─────────────────────────────────────────────────────────────
  // Agregat akuisisi & retensi dari data sistem. Offline-first: tanpa AI pun tetap
  // menampilkan chart + metrik. AI digunakan untuk insight naratif.

  /** System prompt khusus untuk analisa CAC/CLV */
  private cacClvSystemPrompt(): string {
    return [
      'Kamu analis growth untuk KOST48. Tugas: analisa CAC (biaya akuisisi) & CLV (nilai seumur hidup tenant).',
      'Bahasa Indonesia, ringkas, ramah, berdasarkan DATA NYATA dari sistem.',
      'Jangan meminta wawancara — langsung analisa data yang diberikan.',
      '',
      'HASILKAN output JSON dengan struktur:',
      '{ "summary": string, "channelInsights": [{ "channel": string, "volume": number, "conversionRate": number, "assessment": string }], "retentionInsight": string, "clvEstimate": { "value": number, "explanation": string }, "recommendations": string[] }',
    ].join('\n');
  }

  /** Kirim data CAC/CLV ke DeepSeek untuk insight naratif. Fallback offline bila gagal. */
  async analyzeCacClv(actor: CurrentUserPayload) {
    this.rateLimit(actor.id);
    const snapshot = await this.cacClvSnapshot();
    if (!deepseekConfigured()) {
      return this.cacClvFallback(snapshot);
    }
    const dataPrompt = [
      'DATA AKTUAL KOST48 — pakai sebagai fakta dasar analisa CAC/CLV:',
      `- Periode: ${snapshot.period.from} s.d ${snapshot.period.to}`,
      `- Total booking: ${snapshot.totals.totalBooking}, konversi ke huni: ${snapshot.totals.conversionPercent}%`,
      `- Booking per kanal:`,
      ...snapshot.bookingByChannel.map((c) =>
        `  ${c.source}: ${c.total} booking (${c.active} aktif, ${c.completed} selesai, konversi ${c.conversionPercent}%)`
      ),
      `- Retensi: ${snapshot.retention.renewalRate}% renewal, rata-rata ${snapshot.retention.avgStayMonths ?? '?'} bulan tinggal`,
      `- Estimasi CLV: Rp ${(snapshot.clvEstimate?.value ?? 0).toLocaleString('id-ID')}`,
      `- Referral ${snapshot.referral.total} total, ${snapshot.referral.active} aktif`,
      `- Loyalitas: ${snapshot.loyalty.pointsGiven} poin diberikan, ${snapshot.loyalty.redemptionCount} penukaran`,
      'Jangan mengarang angka di luar data ini.',
    ].join('\n');

    const messages: ChatMsg[] = [
      { role: 'system', content: this.cacClvSystemPrompt() },
      { role: 'system', content: dataPrompt },
      { role: 'user', content: 'Analisa data CAC/CLV di atas dan berikan insight serta rekomendasi.' },
    ];
    try {
      const raw = await deepseekChat(messages, { temperature: 0.4 });
      const parsed = this.extractCacClvResult(raw.content);
      return { configured: true, mode: 'DEEPSEEK', reply: raw.content, result: parsed, snapshot, fallback: false };
    } catch {
      return this.cacClvFallback(snapshot);
    }
  }

  /** Fallback offline: tanpa AI, tetap tampilkan data lengkap + pesan jinak. */
  private cacClvFallback(snapshot: Awaited<ReturnType<MarketAnalysisService['cacClvSnapshot']>>) {
    return {
      configured: deepseekConfigured(),
      mode: 'RULE_FALLBACK',
      reply: null,
      result: null,
      snapshot,
      fallback: true,
      message: 'Analisa AI tidak tersedia. Data di bawah dihitung langsung dari sistem KOST48.',
    };
  }

  /** Ekstrak JSON hasil analisa CAC/CLV. */
  private extractCacClvResult(text: string): Record<string, unknown> | null {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  async cacClvSnapshot(fromMonth?: string, toMonth?: string) {
    const now = new Date();
    const rawFrom = fromMonth ? new Date(fromMonth + '-01T00:00:00.000Z') : new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const rawTo = toMonth ? new Date(toMonth + '-01T00:00:00.000Z') : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 1. Booking per kanal per bulan — rawQuery karena Prisma groupBy terbatas
    const bookingByChannel = await this.prisma.$queryRaw<Array<{ bookingSource: string; total: bigint; active: bigint; completed: bigint; cancelled: bigint }>>`
      SELECT
        "bookingSource" AS "bookingSource",
        COUNT(*)::int8 AS total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE'::text)::int8 AS active,
        COUNT(*) FILTER (WHERE status = 'COMPLETED'::text)::int8 AS completed,
        COUNT(*) FILTER (WHERE status = 'CANCELLED'::text)::int8 AS cancelled
      FROM "Stay"
      WHERE "bookingSource" IS NOT NULL
        AND "createdAt" >= ${rawFrom} AND "createdAt" < ${rawTo}
      GROUP BY "bookingSource"
      ORDER BY total DESC
    `;

    // 2. Total booking, konversi ke stay promoted (ada initialMetersPromotedAt)
    const [bookingTotals] = await this.prisma.$queryRaw<[{ total: bigint; promoted: bigint; avgStayDays: number | null }]>`
      SELECT
        COUNT(*)::int8 AS total,
        COUNT(*) FILTER (WHERE "initialMetersPromotedAt" IS NOT NULL)::int8 AS promoted,
        AVG(
          CASE
            WHEN "actualCheckOutDate" IS NOT NULL AND "checkInDate" IS NOT NULL
            THEN ("actualCheckOutDate" - "checkInDate")
            WHEN "plannedCheckOutDate" IS NOT NULL AND "checkInDate" IS NOT NULL
            THEN ("plannedCheckOutDate" - "checkInDate")
            ELSE NULL
          END
        ) AS "avgStayDays"
      FROM "Stay"
      WHERE "createdAt" >= ${rawFrom} AND "createdAt" < ${rawTo}
    `;

    // 3. Renewal rate — stay yang punya renewRequest COMPLETED
    const [renewalAgg] = await this.prisma.$queryRaw<[{ renewed: bigint; total: bigint }]>`
      SELECT
        COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM "RenewRequest" r WHERE r."stayId" = s."id" AND r.status = 'COMPLETED'
        ))::int8 AS renewed,
        COUNT(*)::int8 AS total
      FROM "Stay" s
      WHERE s.status IN ('ACTIVE', 'COMPLETED')
        AND s."createdAt" >= ${rawFrom} AND s."createdAt" < ${rawTo}
    `;

    // 4. Referral impact — count tenant referral yang jadi stay aktif
    const [referralAgg] = await this.prisma.$queryRaw<[{ total: bigint; active: bigint }]>`
      SELECT
        COUNT(*)::int8 AS total,
        COUNT(*) FILTER (WHERE s.status = 'ACTIVE')::int8 AS active
      FROM "TenantReferral" tr
      JOIN "Tenant" t ON t.id = tr."referredTenantId"
      JOIN "Stay" s ON s."tenantId" = t.id AND s.status IN ('ACTIVE', 'COMPLETED')
      WHERE tr.status = 'REWARDED'
    `;

    // 5. Loyalty impact — total poin diberikan & ditukar
    const [loyaltyAgg] = await this.prisma.$queryRaw<[{ given: bigint; redeemed: bigint; redemptionCount: bigint }]>`
      SELECT
        COALESCE(SUM("pointAmount"), 0)::int8 AS given,
        COALESCE((SELECT SUM(r."pointCost") FROM "Redemption" r WHERE r.status = 'APPROVED'), 0)::int8 AS redeemed,
        (SELECT COUNT(*)::int8 FROM "Redemption" WHERE status = 'APPROVED') AS "redemptionCount"
      FROM "LoyaltyPoint"
    `;

    // 6. Rata-rata harga sewa bulanan (dari stay COMPLETED/ACTIVE)
    const [rentAvg] = await this.prisma.$queryRaw<[{ avgRent: number | null }]>`
      SELECT AVG("agreedRentAmountRupiah")::int AS "avgRent"
      FROM "Stay"
      WHERE status IN ('ACTIVE', 'COMPLETED')
    `;

    const toNumber = (v: bigint | null | undefined): number => (v ? Number(v) : 0);
    const totalBooking = toNumber(bookingTotals?.total);
    const promoted = toNumber(bookingTotals?.promoted);
    const avgStayDays = bookingTotals?.avgStayDays != null ? Math.round(Number(bookingTotals.avgStayDays)) : null;
    const avgRent = rentAvg?.avgRent ?? 0;
    const avgStayMonths = avgStayDays ? Math.round((avgStayDays / 30.5) * 10) / 10 : null;

    // CLV = rata-rata lama tinggal (bulan) × rata-rata harga sewa bulanan × renewal rate
    const renewalRate = toNumber(renewalAgg?.total) > 0
      ? Math.round((toNumber(renewalAgg?.renewed) / toNumber(renewalAgg?.total)) * 100)
      : 0;
    const clvEstimate = avgStayMonths && avgRent
      ? Math.round(avgStayMonths * avgRent * (1 + renewalRate / 100))
      : null;

    return {
      period: { from: rawFrom.toISOString().slice(0, 7), to: rawTo.toISOString().slice(0, 7) },
      bookingByChannel: bookingByChannel.map((r) => ({
        source: r.bookingSource,
        total: toNumber(r.total),
        active: toNumber(r.active),
        completed: toNumber(r.completed),
        cancelled: toNumber(r.cancelled),
        conversionPercent: toNumber(r.total) > 0
          ? Math.round(((toNumber(r.active) + toNumber(r.completed)) / toNumber(r.total)) * 100)
          : 0,
      })),
      totals: {
        totalBooking,
        promoted,
        conversionPercent: totalBooking > 0 ? Math.round((promoted / totalBooking) * 100) : 0,
      },
      retention: {
        avgStayDays,
        avgStayMonths,
        avgMonthlyRent: avgRent,
        renewalRate,
      },
      clvEstimate: clvEstimate != null ? { value: clvEstimate, months: avgStayMonths, multiplier: 1 + renewalRate / 100 } : null,
      referral: {
        total: toNumber(referralAgg?.total),
        active: toNumber(referralAgg?.active),
      },
      loyalty: {
        pointsGiven: toNumber(loyaltyAgg?.given),
        pointsRedeemed: toNumber(loyaltyAgg?.redeemed),
        redemptionCount: toNumber(loyaltyAgg?.redemptionCount),
      },
    };
  }

  private snapshotPrompt(s: Awaited<ReturnType<MarketAnalysisService['businessSnapshot']>>) {
    return [
      'DATA AKTUAL KOST48 (per hari ini, dari sistem) — pakai sebagai fakta dasar analisamu:',
      `- Kamar: ${s.rooms.total} total, ${s.rooms.occupied} terisi, ${s.rooms.available} kosong (okupansi ${s.occupancyPercent}%).`,
      `- Hunian aktif: ${s.activeStays}.`,
      s.survey.count > 0
        ? `- Survei kepuasan: ${s.survey.count} responden, rata-rata ${s.survey.avgOverall}/5, ${s.survey.recommendRate ?? '-'}% merekomendasikan.`
        : '- Survei kepuasan: belum ada responden.',
      'Jangan mengarang angka di luar data ini; bila perlu data lain, tanyakan ke owner.',
    ].join('\n');
  }

  /** Multi-turn: frontend kirim seluruh riwayat (tanpa system); kita sisipkan system prompt + data nyata. */
  async chat(dto: MarketAnalysisChatDto, actor: CurrentUserPayload) {
    this.rateLimit(actor.id);
    const kind = (dto.kind || 'SWOT').toUpperCase();
    const snapshot = await this.businessSnapshot();
    if (!deepseekConfigured()) {
      return {
        configured: false,
        mode: 'RULE_FALLBACK',
        reply:
          'Fitur analisa AI DeepSeek belum aktif. Setel DEEPSEEK_API_KEY di backend/.env lalu restart backend. ' +
          `Saat aktif, AI memakai data nyata kos (okupansi ${snapshot.occupancyPercent}%, ` +
          `${snapshot.survey.count} survei) + wawancara untuk menyusun analisa ${kind}.`,
        done: false,
        snapshot,
      };
    }
    const messages: ChatMsg[] = [
      { role: 'system', content: this.systemPrompt(kind) },
      { role: 'system', content: this.snapshotPrompt(snapshot) },
      ...dto.messages.map((m) => ({ role: m.role, content: m.content }) as ChatMsg),
    ];
    const raw = await deepseekChat(messages, { temperature: 0.5 });
    const parsed = this.extractResult(raw.content, kind);
    return { configured: true, mode: 'DEEPSEEK', reply: raw.content, done: parsed.done, result: parsed.result, snapshot };
  }

  /** Deteksi blok HASIL + JSON terstruktur dari balasan AI. */
  private extractResult(text: string, kind: string): { done: boolean; result: Record<string, unknown> | null } {
    const idx = text.indexOf(`${RESULT_MARKER} ${kind}===`);
    if (idx < 0) return { done: false, result: null };
    const after = text.slice(idx).replace(`${RESULT_MARKER} ${kind}===`, '');
    const start = after.indexOf('{');
    const end = after.lastIndexOf('}');
    if (start < 0 || end <= start) return { done: true, result: null };
    try {
      return { done: true, result: JSON.parse(after.slice(start, end + 1)) };
    } catch {
      return { done: true, result: null };
    }
  }

  async save(dto: SaveMarketAnalysisDto, actor: CurrentUserPayload) {
    return this.prisma.marketAnalysis.create({
      data: {
        kind: dto.kind,
        title: dto.title.trim(),
        summary: dto.summary?.trim() || null,
        resultJson: (dto.resultJson ?? undefined) as Prisma.InputJsonValue | undefined,
        transcriptJson: (dto.transcript ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
        createdById: actor.id,
      },
    });
  }

  async findAll() {
    return this.prisma.marketAnalysis.findMany({
      orderBy: { id: 'desc' },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
  }

  async findOne(id: number) {
    const row = await this.prisma.marketAnalysis.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, fullName: true } } },
    });
    if (!row) throw new NotFoundException('Analisa tidak ditemukan.');
    return row;
  }

  async remove(id: number) {
    await this.prisma.marketAnalysis.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Analisa tidak ditemukan.');
    });
    return { deleted: true };
  }
}
