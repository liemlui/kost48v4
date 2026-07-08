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
import { KtpAiApprovalService } from './ktp-ai-approval.service';
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
type CountByValueRow = { value: string | null; count: bigint };
type AgeGroupRow = {
  age17_25: bigint | null;
  age26_35: bigint | null;
  age36_45: bigint | null;
  age46_plus: bigint | null;
  unknown: bigint | null;
};
type CompletenessRow = {
  total: bigint | null;
  gender: bigint | null;
  origin_city: bigint | null;
  origin_province: bigint | null;
  occupation: bigint | null;
  birth_date: bigint | null;
  marital_status: bigint | null;
  how_did_you_hear: bigint | null;
};

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly loyalty: LoyaltyService,
    private readonly referral: ReferralService,
    private readonly ktpAiApproval: KtpAiApprovalService,
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

  private toCountMap(rows: CountByValueRow[]) {
    return rows.reduce<Record<string, number>>((acc, row) => {
      if (!row.value) return acc;
      acc[row.value] = Number(row.count ?? 0);
      return acc;
    }, {});
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

  /** Verifikasi KTP tenant. OWNER/ADMIN. Menerima metadata metode verifikasi & catatan. */
  async verifyKtp(
    id: number,
    actor: CurrentUserPayload,
    opts?: { method?: string; notes?: string },
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true, ktpImageFileKey: true, ktpVerifiedAt: true },
    });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');
    if (!tenant.ktpImageFileKey) throw new ConflictException('Tenant belum mengunggah foto KTP.');
    if (tenant.ktpVerifiedAt) throw new ConflictException('KTP sudah terverifikasi.');

    const method = opts?.method || 'MANUAL';
    const validMethods = ['AI', 'AI_FAILED_MANUAL', 'MANUAL'];
    if (!validMethods.includes(method)) {
      throw new BadRequestException(`Metode verifikasi tidak valid: ${method}. Gunakan: ${validMethods.join(', ')}`);
    }
    // G5+ fix #3: method AI hanya sah bila ada bukti sukses AI dari alur validateKtpOcr
    // (dicatat in-memory oleh OwnerAiService, TTL 30 menit, sekali pakai) — payload
    // frontend tidak dipercaya buta. Admin tetap bisa memilih AI_FAILED_MANUAL atau MANUAL.
    if (method === 'AI' && !this.ktpAiApproval.consume(id)) {
      throw new BadRequestException(
        'Method AI hanya valid setelah validasi AI sukses (maks. 30 menit terakhir). Ulangi "Bantu Validasi KTP", atau gunakan AI_FAILED_MANUAL/MANUAL.',
      );
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: {
        ktpVerifiedAt: new Date(),
        ktpVerifiedById: actor.id,
        ktpVerificationMethod: method,
        ktpVerificationNotes: opts?.notes?.slice(0, 500) ?? null,
      },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: 'KTP_VERIFY',
      entityType: 'Tenant',
      entityId: String(id),
      meta: { method, notes: opts?.notes?.slice(0, 200) },
    });
    return updated;
  }

  /**
   * G5+: Perkaya data tenant dari hasil OCR/demografi KTP.
   * Hanya mengisi field yang masih kosong (tidak overwrite data manual).
   */
  async enrichTenantFromKtp(
    id: number,
    data: {
      gender?: string | null;
      birthDate?: string | null;
      originCity?: string | null;
      originProvince?: string | null;
      occupation?: string | null;
    },
    actor?: CurrentUserPayload,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        gender: true,
        birthDate: true,
        originCity: true,
        originProvince: true,
        occupation: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');

    // Hanya isi field yang masih kosong (null)
    const updates: Record<string, unknown> = {};
    if (!tenant.gender && data.gender && ['MALE', 'FEMALE'].includes(data.gender)) {
      updates.gender = data.gender;
    }
    if (!tenant.birthDate && data.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(data.birthDate)) {
      updates.birthDate = new Date(data.birthDate);
    }
    if (!tenant.originCity && data.originCity && data.originCity.trim().length >= 2) {
      updates.originCity = data.originCity.trim().slice(0, 60);
    }
    if (!tenant.originProvince && data.originProvince && data.originProvince.trim().length >= 2) {
      updates.originProvince = data.originProvince.trim().slice(0, 60);
    }
    if (!tenant.occupation && data.occupation && data.occupation.trim().length >= 2) {
      updates.occupation = data.occupation.trim().slice(0, 80);
    }

    if (Object.keys(updates).length === 0) {
      return { enriched: false, fields: [], tenant };
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: updates,
    });

    if (actor) {
      await this.audit.log({
        actorUserId: actor.id,
        action: 'TENANT_ENRICH_FROM_KTP',
        entityType: 'Tenant',
        entityId: String(id),
        meta: { fields: Object.keys(updates) },
      });
    }

    return { enriched: true, fields: Object.keys(updates), tenant: updated };
  }

  /** G5+: Simpan data KTP hasil ekstraksi ke tenant. Admin bisa memilih field yang mau disimpan. */
  async saveKtpData(
    id: number,
    data: {
      gender?: string | null;
      birthDate?: string | null;
      originCity?: string | null;
      originProvince?: string | null;
      occupation?: string | null;
      identityNumber?: string | null;
    },
    actor: CurrentUserPayload,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        identityNumber: true,
        gender: true,
        birthDate: true,
        originCity: true,
        originProvince: true,
        occupation: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant tidak ditemukan');

    // P1-03: Hanya isi field yang masih kosong — jangan overwrite data manual admin
    const updates: Record<string, unknown> = {};

    // NIK hanya bisa di-set sekali (unique constraint)
    if (data.identityNumber && !tenant.identityNumber && /^\d{16}$/.test(data.identityNumber)) {
      updates.identityNumber = data.identityNumber;
    }

    if (!tenant.gender && data.gender && ['MALE', 'FEMALE'].includes(data.gender)) {
      updates.gender = data.gender;
    }
    if (!tenant.birthDate && data.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(data.birthDate)) {
      updates.birthDate = new Date(data.birthDate);
    }
    if (!tenant.originCity && data.originCity?.trim()?.length) {
      updates.originCity = data.originCity.trim().slice(0, 60);
    }
    if (!tenant.originProvince && data.originProvince?.trim()?.length) {
      updates.originProvince = data.originProvince.trim().slice(0, 60);
    }
    if (!tenant.occupation && data.occupation?.trim()?.length) {
      updates.occupation = data.occupation.trim().slice(0, 80);
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('Tidak ada field valid yang bisa disimpan.');
    }

    let updated: typeof tenant & Record<string, unknown>;
    try {
      updated = await this.prisma.tenant.update({
        where: { id },
        data: updates,
      });
    } catch (err: any) {
      // P1-02: Tangkap unique constraint violation (P2002) — NIK duplikat dari request concurrent
      if (err?.code === 'P2002' && err?.meta?.target?.includes('identityNumber')) {
        throw new ConflictException('NIK sudah terdaftar di tenant lain.');
      }
      throw err;
    }

    await this.audit.log({
      actorUserId: actor.id,
      action: 'KTP_DATA_SAVE',
      entityType: 'Tenant',
      entityId: String(id),
      meta: { fields: Object.keys(updates) },
    });

    return { savedFields: Object.keys(updates), tenant: updated };
  }

  /**
   * G5+: Ringkasan demografi tenant untuk marketing analytics.
   * Hanya OWNER — data agregat, bukan individual.
   */
  async getDemographicsSummary() {
    const [
      genderRows,
      cityRows,
      provinceRows,
      occupationRows,
      leadSourceRows,
      maritalRows,
      vehicleRows,
      ageGroupRows,
      completenessRows,
    ] = await Promise.all([
      this.prisma.$queryRaw<Array<CountByValueRow>>`
        SELECT gender::text AS value, COUNT(*)::bigint AS count
        FROM "Tenant"
        WHERE "isActive" = true AND gender IS NOT NULL
        GROUP BY gender
      `,
      this.prisma.$queryRaw<Array<CountByValueRow>>`
        SELECT "originCity" AS value, COUNT(*)::bigint AS count
        FROM "Tenant"
        WHERE "isActive" = true AND "originCity" IS NOT NULL
        GROUP BY "originCity"
        ORDER BY count DESC, value ASC
        LIMIT 10
      `,
      this.prisma.$queryRaw<Array<CountByValueRow>>`
        SELECT "originProvince" AS value, COUNT(*)::bigint AS count
        FROM "Tenant"
        WHERE "isActive" = true AND "originProvince" IS NOT NULL
        GROUP BY "originProvince"
        ORDER BY count DESC, value ASC
        LIMIT 10
      `,
      this.prisma.$queryRaw<Array<CountByValueRow>>`
        SELECT occupation AS value, COUNT(*)::bigint AS count
        FROM "Tenant"
        WHERE "isActive" = true AND occupation IS NOT NULL
        GROUP BY occupation
        ORDER BY count DESC, value ASC
        LIMIT 10
      `,
      this.prisma.$queryRaw<Array<CountByValueRow>>`
        SELECT "howDidYouHear" AS value, COUNT(*)::bigint AS count
        FROM "Tenant"
        WHERE "isActive" = true AND "howDidYouHear" IS NOT NULL
        GROUP BY "howDidYouHear"
      `,
      this.prisma.$queryRaw<Array<CountByValueRow>>`
        SELECT "maritalStatus"::text AS value, COUNT(*)::bigint AS count
        FROM "Tenant"
        WHERE "isActive" = true AND "maritalStatus" IS NOT NULL
        GROUP BY "maritalStatus"
      `,
      this.prisma.$queryRaw<Array<CountByValueRow>>`
        SELECT "vehicleOwnership"::text AS value, COUNT(*)::bigint AS count
        FROM "Tenant"
        WHERE "isActive" = true AND "vehicleOwnership" IS NOT NULL
        GROUP BY "vehicleOwnership"
      `,
      this.prisma.$queryRaw<Array<AgeGroupRow>>`
        SELECT
          COUNT(*) FILTER (WHERE "birthDate" IS NOT NULL AND EXTRACT(YEAR FROM age(CURRENT_DATE, "birthDate")) BETWEEN 17 AND 25)::bigint AS age17_25,
          COUNT(*) FILTER (WHERE "birthDate" IS NOT NULL AND EXTRACT(YEAR FROM age(CURRENT_DATE, "birthDate")) BETWEEN 26 AND 35)::bigint AS age26_35,
          COUNT(*) FILTER (WHERE "birthDate" IS NOT NULL AND EXTRACT(YEAR FROM age(CURRENT_DATE, "birthDate")) BETWEEN 36 AND 45)::bigint AS age36_45,
          COUNT(*) FILTER (WHERE "birthDate" IS NOT NULL AND EXTRACT(YEAR FROM age(CURRENT_DATE, "birthDate")) >= 46)::bigint AS age46_plus,
          COUNT(*) FILTER (WHERE "birthDate" IS NULL)::bigint AS unknown
        FROM "Tenant"
        WHERE "isActive" = true
      `,
      this.prisma.$queryRaw<Array<CompletenessRow>>`
        SELECT
          COUNT(*)::bigint AS total,
          COUNT(gender)::bigint AS gender,
          COUNT("originCity")::bigint AS origin_city,
          COUNT("originProvince")::bigint AS origin_province,
          COUNT(occupation)::bigint AS occupation,
          COUNT("birthDate")::bigint AS birth_date,
          COUNT("maritalStatus")::bigint AS marital_status,
          COUNT("howDidYouHear")::bigint AS how_did_you_hear
        FROM "Tenant"
        WHERE "isActive" = true
      `,
    ]);

    const count = Number(completenessRows[0]?.total ?? 0);
    const ageBucket = ageGroupRows[0];
    const ageGroups: Record<string, number> = {
      '17-25': Number(ageBucket?.age17_25 ?? 0),
      '26-35': Number(ageBucket?.age26_35 ?? 0),
      '36-45': Number(ageBucket?.age36_45 ?? 0),
      '46+': Number(ageBucket?.age46_plus ?? 0),
      unknown: Number(ageBucket?.unknown ?? 0),
    };

    return {
      totalTenants: count,
      gender: this.toCountMap(genderRows),
      topCities: cityRows.map((row) => [row.value, Number(row.count ?? 0)]),
      topProvinces: provinceRows.map((row) => [row.value, Number(row.count ?? 0)]),
      topOccupations: occupationRows.map((row) => [row.value, Number(row.count ?? 0)]),
      ageGroups,
      maritalStatus: this.toCountMap(maritalRows),
      vehicleOwnership: this.toCountMap(vehicleRows),
      leadSources: this.toCountMap(leadSourceRows),
      dataCompleteness: {
        gender: Number(completenessRows[0]?.gender ?? 0),
        originCity: Number(completenessRows[0]?.origin_city ?? 0),
        originProvince: Number(completenessRows[0]?.origin_province ?? 0),
        occupation: Number(completenessRows[0]?.occupation ?? 0),
        birthDate: Number(completenessRows[0]?.birth_date ?? 0),
        maritalStatus: Number(completenessRows[0]?.marital_status ?? 0),
        howDidYouHear: Number(completenessRows[0]?.how_did_you_hear ?? 0),
      },
    };
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
