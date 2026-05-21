import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AiCacheService } from './ai-cache.service';
import { BusinessNarrativeDto, ClassifyTextDto, PaymentProofAnalyzeDto, ReminderPersonalizeDto } from './dto/ai.dto';

type AiMode = 'RULE_FALLBACK' | 'PROVIDER_READY_BUT_DISABLED';

type Bucket = { count: number; resetAt: number };

function stableHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value ?? {})).digest('hex');
}

function currency(value?: number) {
  return `Rp ${Number(value ?? 0).toLocaleString('id-ID')}`;
}

@Injectable()
export class AiService {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly cache: AiCacheService) {}

  private checkRate(actor: CurrentUserPayload, feature: string) {
    const key = `${actor.id}:${feature}`;
    const now = Date.now();
    const existing = this.buckets.get(key);
    const limit = 12;
    const windowMs = 60 * 1000;
    if (!existing || existing.resetAt < now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    existing.count += 1;
    if (existing.count > limit) {
      throw new HttpException('Terlalu banyak permintaan AI. Coba lagi sebentar lagi.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private fromCache<T>(actor: CurrentUserPayload, feature: string, input: unknown, compute: () => T, ttlMs = 24 * 60 * 60 * 1000) {
    this.checkRate(actor, feature);
    const cacheKey = `${feature}:${stableHash(input)}`;
    const cached = this.cache.get<T & { cached?: boolean }>(cacheKey);
    if (cached) return { ...cached, cached: true };
    const value = compute() as T & { cached?: boolean };
    this.cache.set(cacheKey, value, ttlMs);
    return { ...value, cached: false };
  }

  private mode(): AiMode {
    return process.env.AI_PROVIDER_KEY ? 'PROVIDER_READY_BUT_DISABLED' : 'RULE_FALLBACK';
  }

  businessNarrative(dto: BusinessNarrativeDto, actor: CurrentUserPayload) {
    return this.fromCache(actor, 'business-narrative', dto, () => {
      const metrics = dto.metrics ?? {};
      const score = Number(metrics['score'] ?? metrics['businessScore'] ?? 0);
      const overdue = Number(metrics['overdueRupiah'] ?? 0);
      const pendingPayment = Number(metrics['pendingPaymentCount'] ?? 0);
      const occupancy = Number(metrics['occupancyRatePercent'] ?? 0);
      const warnings: string[] = [];
      if (pendingPayment > 0) warnings.push(`${pendingPayment} pembayaran perlu diverifikasi agar cashflow tidak tertahan.`);
      if (overdue > 0) warnings.push(`Ada tunggakan sekitar ${currency(overdue)} yang perlu follow-up.`);
      if (occupancy > 0 && occupancy < 70) warnings.push(`Okupansi ${occupancy}% perlu dorongan marketing atau evaluasi kamar kosong.`);
      if (!warnings.length) warnings.push('Tidak ada blocker besar dari ringkasan yang dikirim. Tetap pantau collection dan okupansi.');

      return {
        mode: this.mode(),
        title: score >= 80 ? 'Bisnis relatif stabil' : 'Ada prioritas operasional',
        summary: warnings[0],
        recommendations: warnings.slice(0, 3),
        disclaimer: 'Hasil ini adalah assistant on-demand berbasis rule/cache; tidak mengubah data bisnis.',
      };
    }, 60 * 60 * 1000);
  }

  analyzePaymentProof(dto: PaymentProofAnalyzeDto, actor: CurrentUserPayload) {
    return this.fromCache(actor, 'payment-proof-analyze', dto, () => {
      const warnings: string[] = [];
      const matches: string[] = [];
      const expected = Number(dto.expectedAmountRupiah ?? 0);
      const submitted = Number(dto.submittedAmountRupiah ?? 0);
      if (expected > 0 && submitted > 0) {
        if (expected === submitted) matches.push('Nominal cocok dengan target pembayaran.');
        if (submitted < expected) warnings.push(`Nominal kurang ${currency(expected - submitted)} dari target.`);
        if (submitted > expected) warnings.push(`Nominal lebih ${currency(submitted - expected)} dari target. Periksa overpay rule.`);
      } else {
        warnings.push('Nominal target atau nominal submission belum lengkap untuk dibandingkan otomatis.');
      }
      if (!dto.referenceNumber?.trim()) warnings.push('Nomor referensi belum terbaca/diisi.');
      else matches.push('Nomor referensi tersedia.');
      if (!dto.senderName?.trim()) warnings.push('Nama pengirim belum tersedia.');
      else matches.push('Nama pengirim tersedia.');
      if (!dto.paidAt?.trim()) warnings.push('Tanggal bayar belum tersedia.');
      else matches.push('Tanggal bayar tersedia.');

      const confidence = warnings.length === 0 ? 'HIGH' : matches.length >= 2 ? 'MEDIUM' : 'LOW';
      return {
        mode: this.mode(),
        submissionId: dto.submissionId ?? null,
        detectedAmountRupiah: submitted || null,
        detectedDate: dto.paidAt ?? null,
        confidence,
        matches,
        warnings,
        recommendedAction: warnings.length ? 'Periksa manual sebelum approve/reject.' : 'Data submission terlihat konsisten, tetap validasi bukti sebelum approve.',
        disclaimer: 'Tidak ada approval otomatis. Admin tetap menentukan keputusan final.',
      };
    }, 7 * 24 * 60 * 60 * 1000);
  }

  personalizeReminder(dto: ReminderPersonalizeDto, actor: CurrentUserPayload) {
    return this.fromCache(actor, 'reminder-personalize', dto, () => {
      const audience = dto.audience || 'tenant';
      const purpose = dto.purpose || 'payment';
      const base = purpose.includes('checkout')
        ? 'Halo, proses keluar kamu hampir selesai. Mohon pastikan semua tagihan sudah beres agar checkout bisa difinalkan.'
        : 'Halo, tagihan kamu sudah mendekati jatuh tempo. Mohon cek portal dan lakukan pembayaran bila sudah sesuai.';
      return {
        mode: this.mode(),
        audience,
        tone: dto.tone || 'ramah-profesional',
        message: base,
        alternatives: [base, `${base} Terima kasih sudah membantu proses operasional tetap lancar.`],
        disclaimer: 'Copy ini saran on-demand; admin boleh edit sebelum dikirim.',
      };
    });
  }

  classifyText(dto: ClassifyTextDto, actor: CurrentUserPayload) {
    return this.fromCache(actor, 'classify-text', dto, () => {
      const text = dto.text.toLowerCase();
      const labels = dto.labels?.length ? dto.labels : ['payment', 'checkout', 'renew', 'ticket', 'complaint', 'other'];
      const scored = labels.map((label) => {
        const l = String(label).toLowerCase();
        let score = text.includes(l) ? 0.9 : 0.25;
        if (l.includes('payment') && /(bayar|transfer|qris|invoice|tagihan)/i.test(text)) score = 0.85;
        if (l.includes('checkout') && /(keluar|checkout|deposit|kembali)/i.test(text)) score = 0.85;
        if (l.includes('renew') && /(perpanjang|renew|lanjut)/i.test(text)) score = 0.85;
        if (l.includes('ticket') && /(rusak|bocor|lampu|komplain|maintenance)/i.test(text)) score = 0.85;
        return { label, score: Math.round(score * 100) / 100 };
      }).sort((a, b) => b.score - a.score).slice(0, dto.maxLabels ?? 3);
      return {
        mode: this.mode(),
        labels: scored,
        disclaimer: 'Klasifikasi rule-based on-demand, bukan keputusan final.',
      };
    });
  }
}
