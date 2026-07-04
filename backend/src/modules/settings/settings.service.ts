import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { setDeepseekApiKey } from '../market-analysis/deepseek.client';
import { UpdateOperationalSettingDto } from './dto/operational-setting.dto';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Muat API key DeepSeek dari DB ke runtime saat boot (env tetap fallback). */
  async onModuleInit() {
    try {
      const s = await this.prisma.operationalSetting.findUnique({ where: { id: 1 }, select: { deepseekApiKey: true } });
      if (s?.deepseekApiKey?.trim()) setDeepseekApiKey(s.deepseekApiKey);
    } catch (err: any) {
      this.logger.warn('Gagal memuat API key DeepSeek dari DB (pakai env fallback)', err?.message ?? err);
    }
  }

  /** Singleton id=1; buat dengan default bila belum ada. RAW — internal saja, JANGAN kirim langsung ke client. */
  async getOperational() {
    const existing = await this.prisma.operationalSetting.findUnique({ where: { id: 1 } });
    if (existing) return existing;
    return this.prisma.operationalSetting.create({ data: { id: 1 } });
  }

  /** Versi AMAN untuk respons API: API key TIDAK pernah ikut — hanya status + preview (preview khusus OWNER). */
  async getOperationalView(role?: string) {
    return this.toSafeView(await this.getOperational(), role);
  }

  async updateOperational(dto: UpdateOperationalSettingDto, userId?: number) {
    await this.getOperational();
    const { deepseekApiKey, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest, updatedById: userId ?? null };
    if (deepseekApiKey !== undefined) data.deepseekApiKey = deepseekApiKey.trim();

    const updated = await this.prisma.operationalSetting.update({ where: { id: 1 }, data });

    // Aktifkan key baru tanpa restart backend (kosong = kembali ke env fallback).
    if (deepseekApiKey !== undefined) setDeepseekApiKey(updated.deepseekApiKey);

    return this.toSafeView(updated, 'OWNER');
  }

  /** Buang kolom rahasia dari payload; sisipkan status key agar UI tahu kondisi tanpa membocorkan nilai. */
  private toSafeView(setting: Awaited<ReturnType<SettingsService['getOperational']>>, role?: string) {
    const { deepseekApiKey, ...safe } = setting;
    const dbKey = (deepseekApiKey ?? '').trim();
    const fromDb = dbKey.length > 0;
    const fromEnv = Boolean(process.env.DEEPSEEK_API_KEY || process.env.AI_PROVIDER_KEY);
    return {
      ...safe,
      deepseekApiKeySet: fromDb || fromEnv,
      deepseekApiKeySource: fromDb ? ('settings' as const) : fromEnv ? ('env' as const) : null,
      deepseekApiKeyPreview: role === 'OWNER' && fromDb ? `••••${dbKey.slice(-4)}` : null,
    };
  }
}
