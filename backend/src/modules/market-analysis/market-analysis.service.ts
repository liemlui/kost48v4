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

  /** Multi-turn: frontend kirim seluruh riwayat (tanpa system); kita sisipkan system prompt. */
  async chat(dto: MarketAnalysisChatDto, actor: CurrentUserPayload) {
    this.rateLimit(actor.id);
    const kind = (dto.kind || 'SWOT').toUpperCase();
    if (!deepseekConfigured()) {
      return {
        configured: false,
        mode: 'RULE_FALLBACK',
        reply:
          'Fitur analisa AI DeepSeek belum aktif. Setel DEEPSEEK_API_KEY di backend/.env lalu restart backend. ' +
          'Setelah itu, AI akan mewawancarai kamu dan menyusun analisa ' + kind + ' otomatis.',
        done: false,
      };
    }
    const messages: ChatMsg[] = [
      { role: 'system', content: this.systemPrompt(kind) },
      ...dto.messages.map((m) => ({ role: m.role, content: m.content }) as ChatMsg),
    ];
    const raw = await deepseekChat(messages, { temperature: 0.5 });
    const parsed = this.extractResult(raw, kind);
    return { configured: true, mode: 'DEEPSEEK', reply: raw, done: parsed.done, result: parsed.result };
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
