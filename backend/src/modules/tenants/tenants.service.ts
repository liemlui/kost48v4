// FILE: tenants.service.ts — CRUD data penghuni + KTP + profil (master data)
import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma, ProfilePhotoSource } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { buildMeta, buildPagination } from '../../common/utils/pagination';
import { CreatePortalAccessDto } from './dto/create-portal-access.dto';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { TenantsQueryDto } from './dto/tenants-query.dto';
import { TogglePortalAccessDto } from './dto/toggle-portal-access.dto';
import { ResetPortalPasswordDto } from './dto/reset-portal-password.dto';
import { TenantProfileOnboardingDto } from './dto/tenant-profile-onboarding.dto';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { ReferralService } from '../loyalty/referral.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { UserRole } from '../../common/enums/app.enums';

const ONBOARDING_FIELDS = [
  'gender',
  'birthDate',
  'originCity',
  'occupation',
  'companyOrCampus',
  'emergencyContactName',
  'emergencyContactPhone',
] as const;

type OnboardingField = typeof ONBOARDING_FIELDS[number];

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly loyalty: LoyaltyService,
    private readonly referral: ReferralService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Tenant CRUD & Queries
  // ═══════════════════════════════════════════════════════════

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

  async findOne(id: number, actor?: CurrentUserPayload) {
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

    // STF-ROLE-SCOPE: STAFF tidak boleh melihat data KTP/PDP (identityNumber, ktp*, ktpVerified*).
    if (actor?.role === UserRole.STAFF) {
      (item as any).identityNumber = undefined;
      (item as any).ktpImageUrl = undefined;
      (item as any).ktpImageFileKey = undefined;
      (item as any).ktpImageOriginalFilename = undefined;
      (item as any).ktpImageMimeType = undefined;
      (item as any).ktpImageFileSizeBytes = undefined;
      (item as any).ktpVerifiedAt = undefined;
      (item as any).ktpVerifiedById = undefined;
      (item as any).ktpDeletedAt = undefined;
      (item as any).profilePhotoUrl = undefined;
      (item as any).profilePhotoFileKey = undefined;
      (item as any).profilePhotoOriginalFilename = undefined;
      (item as any).profilePhotoMimeType = undefined;
      (item as any).profilePhotoFileSizeBytes = undefined;
    }

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

  // ── F3-17: KTP (foto identitas terproteksi + verifikasi + hapus PDP) ─────────

  /** Simpan metadata foto KTP yang sudah diunggah; upload baru me-reset verifikasi. */
  async setKtpImage(
    id: number,
    file: { fileKey: string; fileUrl: string; originalFilename?: string; mimeType: string; fileSizeBytes?: number },
    actor: CurrentUserPayload,
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true, ktpImageFileKey: true, profilePhotoFileKey: true } });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        ktpImageUrl: file.fileUrl,
        ktpImageFileKey: file.fileKey,
        ktpImageOriginalFilename: file.originalFilename ?? null,
        ktpImageMimeType: file.mimeType,
        ktpImageFileSizeBytes: file.fileSizeBytes ?? null,
        ktpVerifiedAt: null,
        ktpVerifiedById: null,
        ktpDeletedAt: null,
      },
    });
    await this.audit.log({ actorUserId: actor.id, action: 'KTP_UPLOAD', entityType: 'Tenant', entityId: String(id) });
    // fileKey lama (jika ada) dikembalikan agar controller bisa hapus file fisiknya.
    // PUB-FOTO-PROFIL-KTP: hadProfilePhoto menentukan apakah controller perlu auto-derive avatar.
    return { tenant: updated, previousFileKey: tenant.ktpImageFileKey, hadProfilePhoto: Boolean(tenant.profilePhotoFileKey) };
  }

  /** OWNER memverifikasi KTP (gate aktivasi kamar bila diaktifkan). */
  async verifyKtp(id: number, actor: CurrentUserPayload) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true, ktpImageFileKey: true, ktpVerifiedAt: true } });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');
    if (!tenant.ktpImageFileKey) throw new ConflictException('Tenant belum mengunggah foto KTP.');
    if (tenant.ktpVerifiedAt) throw new ConflictException('KTP sudah terverifikasi.');
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { ktpVerifiedAt: new Date(), ktpVerifiedById: actor.id },
    });
    await this.audit.log({ actorUserId: actor.id, action: 'KTP_VERIFY', entityType: 'Tenant', entityId: String(id) });
    return updated;
  }

  /** fileKey untuk penyajian terproteksi (controller batasi role OWNER/ADMIN). */
  async getKtpImageKey(id: number): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, select: { ktpImageFileKey: true } });
    if (!tenant?.ktpImageFileKey) throw new NotFoundException('Foto KTP tidak ditemukan');
    return tenant.ktpImageFileKey;
  }

  /** Hapus data KTP (UU PDP) — kembalikan fileKey agar controller hapus file fisik. */
  async clearKtp(id: number, actor: CurrentUserPayload, reason: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true, ktpImageFileKey: true, profilePhotoFileKey: true, profilePhotoSource: true },
    });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');
    const previousFileKey = tenant.ktpImageFileKey;
    // PUB-FOTO-PROFIL-KTP (UU PDP): avatar yang DITURUNKAN dari KTP (KTP_AUTO) ikut dihapus
    // saat KTP dihapus — tak menyisakan turunan data identitas. Avatar MANUAL tetap (foto terpisah).
    const clearAutoPhoto = tenant.profilePhotoSource === ProfilePhotoSource.KTP_AUTO;
    const previousProfilePhotoFileKey = clearAutoPhoto ? tenant.profilePhotoFileKey : null;
    await this.prisma.tenant.update({
      where: { id },
      data: {
        ktpImageUrl: null,
        ktpImageFileKey: null,
        ktpImageOriginalFilename: null,
        ktpImageMimeType: null,
        ktpImageFileSizeBytes: null,
        ktpVerifiedAt: null,
        ktpVerifiedById: null,
        ktpDeletedAt: new Date(),
        ...(clearAutoPhoto
          ? {
              profilePhotoUrl: null,
              profilePhotoFileKey: null,
              profilePhotoMimeType: null,
              profilePhotoFileSizeBytes: null,
              profilePhotoSource: null,
              profilePhotoUpdatedAt: null,
            }
          : {}),
      },
    });
    await this.audit.log({ actorUserId: actor.id, action: 'KTP_DELETE', entityType: 'Tenant', entityId: String(id), meta: { reason } });
    return { previousFileKey, previousProfilePhotoFileKey };
  }

  // ── PUB-FOTO-PROFIL-KTP: foto profil/avatar tenant ──────────────────────────

  /** Set foto profil (KTP_AUTO saat diturunkan dari KTP, MANUAL saat owner/admin unggah ulang). */
  async setProfilePhoto(
    id: number,
    file: { fileKey: string; fileUrl: string; mimeType: string; fileSizeBytes?: number },
    source: ProfilePhotoSource,
    actor: CurrentUserPayload,
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true, profilePhotoFileKey: true } });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');
    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        profilePhotoUrl: file.fileUrl,
        profilePhotoFileKey: file.fileKey,
        profilePhotoMimeType: file.mimeType,
        profilePhotoFileSizeBytes: file.fileSizeBytes ?? null,
        profilePhotoSource: source,
        profilePhotoUpdatedAt: new Date(),
      },
    });
    await this.audit.log({ actorUserId: actor.id, action: 'PROFILE_PHOTO_SET', entityType: 'Tenant', entityId: String(id), meta: { source } });
    return { tenant: updated, previousFileKey: tenant.profilePhotoFileKey };
  }

  /** fileKey untuk penyajian terproteksi avatar. Null bila belum ada foto. */
  async getProfilePhotoKey(id: number): Promise<string | null> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, select: { profilePhotoFileKey: true } });
    return tenant?.profilePhotoFileKey ?? null;
  }

  /** Hapus foto profil — kembalikan fileKey agar controller hapus file fisik. */
  async clearProfilePhoto(id: number, actor: CurrentUserPayload) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true, profilePhotoFileKey: true } });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');
    const previousFileKey = tenant.profilePhotoFileKey;
    await this.prisma.tenant.update({
      where: { id },
      data: {
        profilePhotoUrl: null,
        profilePhotoFileKey: null,
        profilePhotoMimeType: null,
        profilePhotoFileSizeBytes: null,
        profilePhotoSource: null,
        profilePhotoUpdatedAt: null,
      },
    });
    await this.audit.log({ actorUserId: actor.id, action: 'PROFILE_PHOTO_DELETE', entityType: 'Tenant', entityId: String(id) });
    return { previousFileKey };
  }

  async create(dto: CreateTenantDto, actor: CurrentUserPayload) {
    // B-9 (F5-5): kode referral teman yang merekomendasikan tenant baru ini (BUKAN kolom
    // referralCode milik tenant sendiri). Dibaca dari dto; normalizeTenantData men-strip-nya.
    const referredByCode = typeof dto.referredByCode === 'string' && dto.referredByCode.trim() !== '' ? dto.referredByCode.trim() : undefined;
    const data = this.normalizeTenantData(dto);
    await this.validateTenantUniqueness(data);
    const created = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: data as Prisma.TenantCreateInput });
      if (referredByCode) {
        // Idempotent + anti self-referral di dalam linkReferralTx; reward menyusul saat tenant aktif.
        await this.referral.linkReferralTx(tx, { referralCode: referredByCode, referredTenantId: tenant.id });
      }
      return tenant;
    });
    await this.audit.log({ actorUserId: actor.id, action: 'CREATE', entityType: 'Tenant', entityId: String(created.id), newData: created });
    return created;
  }

  async update(id: number, dto: UpdateTenantDto, actor: CurrentUserPayload) {
    const existing = await this.prisma.tenant.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tenant tidak ditemukan');
    const data = this.normalizeTenantData(dto);
    await this.validateTenantUniqueness(data, id);
    const updated = await this.prisma.tenant.update({ where: { id }, data: data as Prisma.TenantUpdateInput });
    await this.audit.log({ actorUserId: actor.id, action: 'UPDATE', entityType: 'Tenant', entityId: String(updated.id), oldData: existing, newData: updated });

    // F4-9: poin quest onboarding — sekali, saat seluruh field profil (kecuali KTP) terisi.
    // Idempotent per tenantId (earnSafe), best-effort.
    const onboardingComplete = ONBOARDING_FIELDS.every((field) => {
      const value = (updated as Record<string, unknown>)[field];
      return value !== null && value !== undefined && String(value).trim() !== '';
    });
    if (onboardingComplete) {
      await this.loyalty.earnSafe(updated.id, 'ONBOARDING_QUEST', String(updated.id), {
        note: 'Profil onboarding lengkap',
        createdById: actor.id,
      });
    }

    return updated;
  }

  private async validateTenantUniqueness(data: Record<string, unknown>, excludeId?: number) {
    const idFilter = excludeId ? { not: excludeId } : undefined;

    if (data.identityNumber) {
      const dupNik = await this.prisma.tenant.findFirst({
        where: { identityNumber: data.identityNumber as string, id: idFilter } as Prisma.TenantWhereInput,
      });
      if (dupNik) throw new ConflictException('No KTP sudah digunakan oleh tenant lain');
    }

    if (data.phone) {
      const dupPhone = await this.prisma.tenant.findFirst({
        where: { phone: data.phone as string, id: idFilter } as Prisma.TenantWhereInput,
      });
      if (dupPhone) throw new ConflictException('No HP sudah digunakan oleh tenant lain');
    }

    if (data.email) {
      const dupTenantEmail = await this.prisma.tenant.findFirst({
        where: { email: data.email as string, id: idFilter } as Prisma.TenantWhereInput,
      });
      if (dupTenantEmail) throw new ConflictException('Email sudah digunakan oleh tenant lain');

      const dupUser = await this.prisma.user.findUnique({ where: { email: data.email as string } });
      if (dupUser) {
        if (!excludeId || dupUser.tenantId !== excludeId) {
          throw new ConflictException('Email sudah digunakan oleh user lain');
        }
      }
    }
  }

  private normalizeTenantData(dto: CreateTenantDto | UpdateTenantDto): Record<string, unknown> {
    const data: Record<string, unknown> = { ...dto };
    // B-9 (F5-5): referredByCode bukan kolom Tenant — jangan diteruskan ke Prisma.
    delete (data as { referredByCode?: unknown }).referredByCode;

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

  // ── Tenant self-service profile ───────────────────────────────────────────

  private isOnboardingFieldFilled(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return true;
  }

  private buildCompletionSummary(tenant: Record<string, unknown>) {
    const completedFields = ONBOARDING_FIELDS.filter((f) =>
      this.isOnboardingFieldFilled(tenant[f]),
    );
    const missingFields = ONBOARDING_FIELDS.filter(
      (f) => !this.isOnboardingFieldFilled(tenant[f]),
    );
    const completionPercent = Math.round(
      (completedFields.length / ONBOARDING_FIELDS.length) * 100,
    );
    return {
      requiredFields: [...ONBOARDING_FIELDS] as string[],
      completedFields: completedFields as string[],
      missingFields: missingFields as string[],
      lockedFields: completedFields as string[],
      completionPercent,
      isComplete: missingFields.length === 0,
      isLocked: missingFields.length === 0,
    };
  }

  async getTenantProfile(actor: CurrentUserPayload) {
    if (!actor.tenantId) {
      throw new ConflictException('Akun tidak terhubung ke data penghuni. Hubungi admin.');
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        identityNumber: true,
        gender: true,
        birthDate: true,
        originCity: true,
        originProvince: true,
        occupation: true,
        companyOrCampus: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        maritalStatus: true,
        vehicleOwnership: true,
        smokingHabit: true,
        howDidYouHear: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // PUB-FOTO-PROFIL-KTP: url avatar terproteksi (disajikan via endpoint authed).
        profilePhotoUrl: true,
        // notes deliberately excluded — admin-internal field
      },
    });
    if (!tenant) throw new NotFoundException('Data penghuni tidak ditemukan');

    const tenantRecord = tenant as unknown as Record<string, unknown>;
    return {
      tenant,
      completion: this.buildCompletionSummary(tenantRecord),
    };
  }

  // TEN-PROFILE-NOTIF: ringkasan kelengkapan profil (ringan, untuk badge portal).
  async getMyProfileCompleteness(actor: CurrentUserPayload) {
    if (!actor.tenantId) {
      throw new ConflictException('Akun tidak terhubung ke data penghuni. Hubungi admin.');
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: {
        gender: true,
        birthDate: true,
        originCity: true,
        originProvince: true,
        occupation: true,
        companyOrCampus: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
      },
    });
    if (!tenant) throw new NotFoundException('Data penghuni tidak ditemukan');
    return this.buildCompletionSummary(tenant as unknown as Record<string, unknown>);
  }

  async fillTenantProfileOnboarding(dto: TenantProfileOnboardingDto, actor: CurrentUserPayload) {
    if (!actor.tenantId) {
      throw new ConflictException('Akun tidak terhubung ke data penghuni. Hubungi admin.');
    }

    const existing = await this.prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: {
        id: true,
        gender: true,
        birthDate: true,
        originCity: true,
        originProvince: true,
        occupation: true,
        companyOrCampus: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
      },
    });
    if (!existing) throw new NotFoundException('Data penghuni tidak ditemukan');

    const existingRecord = existing as unknown as Record<string, unknown>;

    // Classify each field in the payload
    const toUpdate: Partial<Record<OnboardingField, unknown>> = {};
    const lockedAttempts: string[] = [];
    let payloadFieldCount = 0;

    for (const field of ONBOARDING_FIELDS) {
      const dtoValue = (dto as unknown as Record<string, unknown>)[field];
      if (dtoValue === undefined) continue;
      payloadFieldCount++;

      if (this.isOnboardingFieldFilled(existingRecord[field])) {
        lockedAttempts.push(field);
      } else {
        toUpdate[field] = dtoValue;
      }
    }

    if (payloadFieldCount === 0) {
      throw new BadRequestException('Tidak ada data valid yang dikirimkan');
    }

    const updatableCount = Object.keys(toUpdate).length;

    if (updatableCount === 0) {
      throw new BadRequestException(
        `Semua field sudah tersimpan dan dikunci: ${lockedAttempts.join(', ')}. Hubungi pengelola untuk mengubah data.`,
      );
    }

    // Build Prisma update data — convert birthDate string to Date
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(toUpdate)) {
      if (key === 'birthDate' && typeof value === 'string' && value.trim() !== '') {
        updateData[key] = /^\d{4}-\d{2}-\d{2}$/.test(value)
          ? new Date(`${value}T00:00:00.000Z`)
          : new Date(value);
      } else {
        updateData[key] = value;
      }
    }

    // Marketing analytics fields — bebas diedit kapan saja (tidak dikunci seperti ONBOARDING_FIELDS)
    const MARKETING_FIELDS = ['maritalStatus', 'vehicleOwnership', 'smokingHabit', 'howDidYouHear'] as const;
    for (const field of MARKETING_FIELDS) {
      const val = (dto as Record<string, unknown>)[field];
      if (val !== undefined) updateData[field] = val;
    }

    const updated = await this.prisma.tenant.update({
      where: { id: actor.tenantId },
      data: updateData as Prisma.TenantUpdateInput,
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        identityNumber: true,
        gender: true,
        birthDate: true,
        originCity: true,
        originProvince: true,
        occupation: true,
        companyOrCampus: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        maritalStatus: true,
        vehicleOwnership: true,
        smokingHabit: true,
        howDidYouHear: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.audit.log({
      actorUserId: actor.id,
      action: 'TENANT_PROFILE_ONBOARDING_UPDATE',
      entityType: 'Tenant',
      entityId: String(actor.tenantId),
      oldData: Object.fromEntries(
        Object.keys(toUpdate).map((f) => [f, existingRecord[f] ?? null]),
      ),
      newData: Object.fromEntries(
        Object.keys(toUpdate).map((f) => [f, (updated as unknown as Record<string, unknown>)[f] ?? null]),
      ),
    });

    const updatedRecord = updated as unknown as Record<string, unknown>;
    return {
      tenant: updated,
      completion: this.buildCompletionSummary(updatedRecord),
    };
  }
}
