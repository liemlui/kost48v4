import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateOperationalSettingDto } from './dto/operational-setting.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Singleton id=1; buat dengan default bila belum ada. */
  async getOperational() {
    const existing = await this.prisma.operationalSetting.findUnique({ where: { id: 1 } });
    if (existing) return existing;
    return this.prisma.operationalSetting.create({ data: { id: 1 } });
  }

  async updateOperational(dto: UpdateOperationalSettingDto, userId?: number) {
    await this.getOperational();
    return this.prisma.operationalSetting.update({
      where: { id: 1 },
      data: { ...dto, updatedById: userId ?? null },
    });
  }
}
