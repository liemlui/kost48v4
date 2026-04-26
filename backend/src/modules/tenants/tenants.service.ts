import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { CreatePortalAccessDto } from './dto/create-portal-access.dto';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { TenantsQueryDto } from './dto/tenants-query.dto';
import { TogglePortalAccessDto } from './dto/toggle-portal-access.dto';
import { ResetPortalPasswordDto } from './dto/reset-portal-password.dto';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { UserRole } from '../../common/enums/app.enums';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  private attachPortalSummary<T extends { id: number }>(tenant: T, portalUser?: { id: number; email: string; isActive: boolean; lastLoginAt: Date | null } | null) {
    return {
      ...tenant,
      portalUserSummary: portalUser
        ? {
            portalUserId: portalUser.id,
            portalEmail: portalUser.email,
            portalIsActive: portalUser.isActive,
            lastLoginAt: portalUser.lastLoginAt,
          }
        : null,
    };
  }

  async findAll(query: TenantsQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: Prisma.TenantWhereInput = {
      AND: [
        query.search
          ? {
              OR: [
                { fullName: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                { phone: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                { email: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
              ],
            }
          : undefined,
        typeof query.isActive === 'string' ? { isActive: query.isActive === 'true' } : undefined,
        query.gender ? { gender: query.gender } : undefined,
        query.originCity ? { originCity: { contains: query.originCity, mode: Prisma.QueryMode.insensitive } } : undefined,
        query.occupation ? { occupation: { contains: query.occupation, mode: Prisma.QueryMode.insensitive } } : undefined,
        query.companyOrCampus ? { companyOrCampus: { contains: query.companyOrCampus, mode: Prisma.QueryMode.insensitive } } : undefined,
      ].filter(Boolean),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          stays: {
            where: { status: 'ACTIVE' },
            take: 1,
            include: { room: { select: { code: true, id: true } } },
            orderBy: { id: 'desc' },
          },
          user: {
            select: { id: true, email: true, isActive: true, lastLoginAt: true },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    const transformedItems = items.map((tenant) => {
      const activeStay = tenant.stays[0];
      const portalUser = tenant.user;
      return this.attachPortalSummary(
        {
          ...tenant,
          activeStayId: activeStay?.id || null,
          currentStay: activeStay
            ? {
                id: activeStay.id,
                room: activeStay.room ? { code: activeStay.room.code, id: activeStay.room.id } : null,
              }
            : null,
          stays: undefined,
          user: undefined,
        },
        portalUser,
      );
    });

    return { items: transformedItems, meta: buildMeta(page, limit, totalItems) };
  }

  async findOne(id: number) {
    const item = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        stays: {
          where: { status: 'ACTIVE' },
          take: 1,
          include: { room: { select: { code: true, id: true } } },
          orderBy: { id: 'desc' },
        },
        user: {
          select: { id: true, email: true, isActive: true, lastLoginAt: true },
        },
      },
    });
    if (!item) throw new NotFoundException('Tenant tidak ditemukan');

    const activeStay = item.stays[0];
    return this.attachPortalSummary(
      {
        ...item,
        activeStayId: activeStay?.id || null,
        currentStay: activeStay
          ? {
              id: activeStay.id,
              room: activeStay.room ? { code: activeStay.room.code, id: activeStay.room.id } : null,
            }
          : null,
        stays: undefined,
        user: undefined,
      },
      item.user,
    );
  }

  async create(dto: CreateTenantDto, actor: CurrentUserPayload) {
    const data = this.normalizeTenantData(dto);
    const created = await this.prisma.tenant.create({ data: data as Prisma.TenantCreateInput });
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'Tenant', entityId: String(created.id), newData: created });
    return created;
  }

  async update(id: number, dto: UpdateTenantDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tenant tidak ditemukan');
    const data = this.normalizeTenantData(dto);
    const updated = await this.prisma.tenant.update({ where: { id }, data: data as Prisma.TenantUpdateInput });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'Tenant', entityId: String(updated.id), oldData: existing, newData: updated });
    return updated;
  }

  private normalizeTenantData(dto: CreateTenantDto | UpdateTenantDto): Record<string, unknown> {
    const data: Record<string, unknown> = { ...dto };

    if (data.birthDate !== undefined && data.birthDate !== null) {
      if (typeof data.birthDate === 'string' && data.birthDate.trim() !== '') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(data.birthDate)) {
          data.birthDate = new Date(`${data.birthDate}T00:00:00.000Z`);
        } else {
          data.birthDate = new Date(data.birthDate);
        }
      } else if (data.birthDate === '') {
        delete data.birthDate;
      }
    }

    Object.keys(data).forEach((key) => {
      if (data[key] === '') {
        delete data[key];
      }
    });

    return data;
  }

  async togglePortalAccess(id: number, dto: TogglePortalAccessDto, actor: CurrentUserPayload) {
    // 1. Validasi tenant ada
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, isActive: true, lastLoginAt: true, role: true, tenantId: true },
        },
      },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant tidak ditemukan');
    }

    // 2. Validasi tenant punya portal user
    if (!tenant.user) {
      throw new BadRequestException('Tenant ini belum memiliki akun portal');
    }

    // 3. Validasi user terkait benar-benar role TENANT
    if (tenant.user.role !== UserRole.TENANT) {
      throw new BadRequestException('User terkait bukan role TENANT');
    }

    // 4. Validasi user.tenantId match dengan :id
    if (tenant.user.tenantId !== id) {
      throw new BadRequestException('User portal tidak terkait dengan tenant ini');
    }

    // 5. Validasi tidak toggle ke status yang sama
    if (tenant.user.isActive === dto.isActive) {
      throw new BadRequestException(
        `Portal sudah ${dto.isActive ? 'aktif' : 'nonaktif'}. Tidak ada perubahan yang diperlukan.`
      );
    }

    // 6. Update isActive user
    const previousIsActive = tenant.user.isActive;
    const updatedUser = await this.prisma.user.update({
      where: { id: tenant.user.id },
      data: { isActive: dto.isActive },
      select: { id: true, email: true, isActive: true, lastLoginAt: true },
    });

    // 7. Audit log
    await this.audit.log({
      actorUserId: actor.id,
      action: 'UPDATE',
      entityType: 'User',
      entityId: String(updatedUser.id),
      oldData: { isActive: previousIsActive },
      newData: { isActive: dto.isActive },
      meta: { tenantId: id, action: 'TOGGLE_PORTAL_ACCESS' },
    });

    // 8. Return response konsisten dengan portalUserSummary
    return {
      tenantId: id,
      portalUserId: updatedUser.id,
      portalEmail: updatedUser.email,
      portalIsActive: updatedUser.isActive,
      previousPortalIsActive: previousIsActive,
      lastLoginAt: updatedUser.lastLoginAt,
    };
  }

  async createPortalAccess(id: number, dto: CreatePortalAccessDto, actor: CurrentUserPayload) {
    // 1. Validasi tenant ada
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true },
        },
      },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant tidak ditemukan');
    }

    // 2. Validasi tenant belum punya portal user
    if (tenant.user) {
      throw new BadRequestException('Tenant ini sudah memiliki akun portal');
    }

    // 3. Validasi email tidak duplicate dengan user lain
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar');
    }

    // 4. Gunakan transaction untuk create user + attach ke tenant
    const result = await this.prisma.$transaction(async (tx) => {
      // 4a. Hash password sebelum menyimpan
      const passwordHash = await bcrypt.hash(dto.password, 10);
      
      // 4b. Create user dengan role TENANT
      const user = await tx.user.create({
        data: {
          fullName: dto.fullName || tenant.fullName,
          email: dto.email,
          passwordHash,
          role: UserRole.TENANT,
          tenantId: id,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          isActive: true,
          lastLoginAt: true,
        },
      });

      // 4b. Audit log
      await this.audit.log({
        actorUserId: actor.id,
        action: 'CREATE',
        entityType: 'User',
        entityId: String(user.id),
        newData: user,
        meta: { tenantId: id, action: 'CREATE_PORTAL_ACCESS' },
      });

      return user;
    });

    // 5. Return response konsisten dengan portalUserSummary
    return {
      tenantId: id,
      portalUserId: result.id,
      portalEmail: result.email,
      portalIsActive: result.isActive,
      lastLoginAt: result.lastLoginAt,
    };
  }

  async resetPortalPassword(id: number, dto: ResetPortalPasswordDto, actor: CurrentUserPayload) {
    // 1. Validasi tenant ada
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, isActive: true, lastLoginAt: true, role: true, tenantId: true },
        },
      },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant tidak ditemukan');
    }

    // 2. Validasi tenant punya portal user
    if (!tenant.user) {
      throw new BadRequestException('Tenant ini belum memiliki akun portal');
    }

    // 3. Validasi user terkait benar-benar role TENANT
    if (tenant.user.role !== UserRole.TENANT) {
      throw new BadRequestException('User terkait bukan role TENANT');
    }

    // 4. Validasi user.tenantId match dengan :id
    if (tenant.user.tenantId !== id) {
      throw new BadRequestException('User portal tidak terkait dengan tenant ini');
    }

    // 5. Hash password baru
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    // 6. Update password user
    const updatedUser = await this.prisma.user.update({
      where: { id: tenant.user.id },
      data: { passwordHash },
      select: {
        id: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
      },
    });

    // 7. Audit log
    await this.audit.log({
      actorUserId: actor.id,
      action: 'UPDATE',
      entityType: 'User',
      entityId: String(updatedUser.id),
      oldData: { passwordChanged: true },
      newData: { passwordChanged: true },
      meta: { tenantId: id, action: 'RESET_PORTAL_PASSWORD' },
    });

    // 8. Return response konsisten dengan portalUserSummary
    return {
      tenantId: id,
      portalUserId: updatedUser.id,
      portalEmail: updatedUser.email,
      portalIsActive: updatedUser.isActive,
      passwordChangedAt: new Date().toISOString(),
      lastLoginAt: updatedUser.lastLoginAt,
    };
  }
}
