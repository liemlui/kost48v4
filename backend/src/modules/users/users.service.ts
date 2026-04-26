import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UsersQueryDto } from './dto/users-query.dto';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { UserRole } from '../../common/enums/app.enums';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogService) {}

  async findAll(query: UsersQueryDto) {
    const { page, limit, skip, take } = buildPagination(query.page, query.limit);
    const where: Prisma.UserWhereInput = {
      AND: [
        query.search
          ? {
              OR: [
                { fullName: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
                { email: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
              ],
            }
          : undefined,
        query.role ? { role: query.role } : undefined,
        typeof query.isActive === 'string' ? { isActive: query.isActive === 'true' } : undefined,
      ].filter(Boolean),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          tenantId: true,
          isActive: true,
          tenant: { select: { id: true, fullName: true, phone: true, email: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, meta: buildMeta(page, limit, totalItems) };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        tenantId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        tenant: { select: { id: true, fullName: true, phone: true, email: true } },
      },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return user;
  }

  async create(dto: CreateUserDto, actor: CurrentUserPayload) {
    this.assertAdminRoleBoundaryOnCreate(actor, dto.role);

    if (dto.role === UserRole.TENANT && !dto.tenantId) {
      throw new ConflictException('Role TENANT wajib memiliki tenantId');
    }

    if (dto.role !== UserRole.TENANT && dto.tenantId) {
      throw new ConflictException('Role non-TENANT tidak boleh membawa tenantId');
    }

    if (dto.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
      if (!tenant) throw new NotFoundException('Tenant terkait tidak ditemukan');
    }

    const emailExists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (emailExists) throw new ConflictException('Email sudah digunakan');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        role: dto.role,
        tenantId: dto.tenantId ?? null,
        isActive: dto.isActive ?? true,
      },
      select: { id: true, fullName: true, email: true, role: true, tenantId: true, isActive: true },
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'CREATE',
      entityType: 'User',
      entityId: String(created.id),
      newData: created,
    });

    return created;
  }

  async update(id: number, dto: UpdateUserDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User tidak ditemukan');

    this.assertAdminRoleBoundaryOnUpdate(actor, existing.role, dto.role);

    const nextRole = dto.role ?? existing.role;
    const nextTenantId = dto.tenantId !== undefined ? dto.tenantId : existing.tenantId;

    if (nextRole === UserRole.TENANT && !nextTenantId) {
      throw new ConflictException('Role TENANT wajib memiliki tenantId');
    }

    if (nextRole !== UserRole.TENANT && nextTenantId) {
      throw new ConflictException('Role non-TENANT tidak boleh membawa tenantId');
    }

    if (dto.email && dto.email !== existing.email) {
      const emailExists = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (emailExists) throw new ConflictException('Email sudah digunakan');
    }

    if (nextTenantId) {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: nextTenantId } });
      if (!tenant) throw new NotFoundException('Tenant terkait tidak ditemukan');
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        role: nextRole,
        tenantId: nextRole === UserRole.TENANT ? nextTenantId ?? null : null,
        isActive: dto.isActive,
      },
      select: { id: true, fullName: true, email: true, role: true, tenantId: true, isActive: true },
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'UPDATE',
      entityType: 'User',
      entityId: String(updated.id),
      oldData: existing,
      newData: updated,
      meta: {
        sensitiveUpdate: true,
        previousRole: existing.role,
        nextRole,
      },
    });

    return updated;
  }

  private assertAdminRoleBoundaryOnCreate(actor: CurrentUserPayload, role: UserRole) {
    if (actor.role === UserRole.ADMIN && role === UserRole.OWNER) {
      throw new ForbiddenException('Admin tidak dapat membuat akun OWNER');
    }
  }

  private assertAdminRoleBoundaryOnUpdate(
    actor: CurrentUserPayload,
    existingRole: UserRole | string,
    requestedRole?: UserRole | string,
  ) {
    if (actor.role !== UserRole.ADMIN) {
      return;
    }

    if (existingRole === UserRole.OWNER) {
      throw new ForbiddenException('Admin tidak dapat mengubah akun OWNER');
    }

    if (requestedRole === UserRole.OWNER) {
      throw new ForbiddenException('Admin tidak dapat mengubah role menjadi OWNER');
    }
  }
}
