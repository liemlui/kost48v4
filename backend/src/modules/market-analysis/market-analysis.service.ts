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
    const parsed = this.extractResult(raw, kind);
    return { configured: true, mode: 'DEEPSEEK', reply: raw, done: parsed.done, result: parsed.result, snapshot };
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
