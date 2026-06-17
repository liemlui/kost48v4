import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import {
  AdditionalServicesQueryDto,
  CreateAdditionalServiceDto,
  UpdateAdditionalServiceDto,
} from './dto/additional-service.dto';

// PUB-LAYANAN-TAMBAHAN: layanan tambahan (galon/TV/WiFi/dll) + tarif.
@Injectable()
export class AdditionalServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AdditionalServicesQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where =
      typeof query.isActive === 'string' ? { isActive: query.isActive === 'true' } : {};
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.additionalService.findMany({
        where,
        skip,
        take,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.additionalService.count({ where }),
    ]);
    return { items, meta: buildMeta(page, limit, totalItems) };
  }

  async listActive() {
    const items = await this.prisma.additionalService.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return { items };
  }

  async findOne(id: number) {
    const item = await this.prisma.additionalService.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Layanan tambahan tidak ditemukan');
    return item;
  }

  create(dto: CreateAdditionalServiceDto) {
    return this.prisma.additionalService.create({ data: { ...dto } });
  }

  async update(id: number, dto: UpdateAdditionalServiceDto) {
    await this.findOne(id);
    return this.prisma.additionalService.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.additionalService.delete({ where: { id } });
    return { id };
  }
}
