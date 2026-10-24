// FILE: auth.service.ts — autentikasi user: login, register, refresh token, role guard
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, createHmac, randomBytes } from 'crypto';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone, denormalizePhone } from '../common/utils/phone.util';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMyTipInfoDto } from './dto/update-my-tip-info.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserRole } from '../common/enums/app.enums';

/**
 * S5 — hash tiruan untuk jalur "identifier tidak ditemukan".
 *
 * Dibuat **sekali saat modul dimuat** dengan cost yang sama dengan seluruh hash
 * sandi di repo ini (`bcrypt.hash(..., 10)`), lalu dipakai sebagai sasaran
 * `bcrypt.compare` ketika identifier tidak ada. Tanpa langkah ini jalur "identifier
 * tak dikenal" selesai tanpa `bcrypt.compare`, sehingga waktu responsnya lebih
 * pendek dan keberadaan akun bisa ditebak dari stopwatch (OWASP Authentication
 * Cheat Sheet: pesan generik **dan** waktu respons seragam). Sandi asal hash ini
 * acak dan tidak pernah dipakai untuk masuk.
 */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(randomBytes(24).toString('hex'), 10);

/** S5 — penguncian percobaan: jumlah kegagalan yang memicu kunci, dan durasi kunci. */
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
/** Batas jumlah kunci yang dilacak supaya serangan identifier unik tidak menghabiskan memori. */
const FAILED_LOGIN_MAX_KEYS = 10_000;

/** Konteks request yang dibutuhkan `login()` — sekarang hanya IP klien. */
export interface LoginRequestContext {
  ip?: string;
}

interface FailedLoginEntry {
  failedAttempts: number;
  firstFailedAt: number;
  lockedUntil: number | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /** Refresh token expiry: 7 hari */
  private readonly REFRESH_TOKEN_DAYS = 7;
  /** Access token expiry: 15 menit (dalam detik) */
  private readonly ACCESS_TOKEN_EXPIRY_SEC = 900;

  /**
   * S5 — penghitung percobaan gagal per `identifier` + IP.
   *
   * **Batas yang wajib ditulis**: peta ini hidup di memori proses. Ia hanya benar
   * untuk satu proses API (produksi sekarang satu proses Passenger) dan **tidak**
   * berlaku lintas replika — replika kedua punya hitungan sendiri. Tidak ada
   * Redis/dependency baru; kalau kelak produksi multi-replika, penguncian harus
   * dipindah ke penyimpanan bersama. `AuthService` adalah provider singleton Nest,
   * jadi satu peta per proses.
   */
  private readonly failedLoginAttempts = new Map<string, FailedLoginEntry>();

  /** Kunci HMAC untuk bentuk tersamar identifier di AuditLog — dibuat sekali per proses. */
  private readonly identifierMaskKey = randomBytes(32);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Pendaftaran akun penghuni (publik, rate-limited).
   * Bila email cocok dengan data Tenant yang dibuat admin dan belum punya akun,
   * akun ditempelkan ke tenant itu; kalau belum ada, Tenant baru dibuat.
   * KTP tetap menyusul saat check-in — pendaftaran hanya membuka akses portal.
   */
  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    const phone = normalizePhone(dto.phone);

    if (!phone || phone.length < 8) {
      throw new ConflictException('Nomor HP tidak valid. Gunakan format 08xx atau 62xx.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar. Masuk, atau gunakan menu lupa password.');
    }

    const existingTenant = await this.prisma.tenant.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, user: { is: null } },
      select: { id: true },
    });

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const tenantId =
        existingTenant?.id ??
        (
          await tx.tenant.create({
            data: { fullName, phone, email },
            select: { id: true },
          })
        ).id;

      return tx.user.create({
        data: {
          fullName,
          email,
          passwordHash,
          role: UserRole.TENANT,
          tenantId,
          isActive: true,
        },
        select: { id: true, fullName: true, email: true, role: true, tenantId: true },
      });
    });

    return created;
  }

  async login(dto: LoginDto, context?: LoginRequestContext) {
    const invalidCredentialsMessage = 'Email/nomor HP atau password salah';

    const identifier = dto.identifier.trim();
    const normalizedPhone = normalizePhone(identifier);

    // S5: kunci percobaan per `identifier` + IP, diperiksa SEBELUM menyentuh DB.
    const attemptKey = this.buildLoginAttemptKey(identifier, normalizedPhone, context?.ip);
    this.assertLoginNotLocked(attemptKey);

    const user = await this.findUserForLogin(identifier, normalizedPhone);

    if (!user) {
      // S5 anti-enumerasi: tetap bayar satu `bcrypt.compare` terhadap hash tiruan
      // supaya waktu respons jalur ini setara dengan jalur "password salah".
      await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH);
      await this.registerFailedLogin(attemptKey, identifier, normalizedPhone, context?.ip);
      throw new UnauthorizedException(invalidCredentialsMessage);
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      await this.registerFailedLogin(attemptKey, identifier, normalizedPhone, context?.ip);
      throw new UnauthorizedException(invalidCredentialsMessage);
    }

    // AD-02: cek isActive setelah password — hindari enumerasi akun nonaktif
    if (!user.isActive) {
      throw new ForbiddenException(invalidCredentialsMessage);
    }

    // Sandi benar: hitungan gagal untuk kombinasi ini dihapus.
    this.failedLoginAttempts.delete(attemptKey);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        pwdAt: user.passwordChangedAt?.getTime() ?? 0,
      },
      { expiresIn: this.ACCESS_TOKEN_EXPIRY_SEC },
    );

    // P3-01: Generate refresh token — SHA-256 hash, simpan di DB
    const { refreshToken: refreshTokenRaw } = await this.createRefreshToken(user.id);

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        isActive: user.isActive,
      },
    };
  }

  /**
   * P3-01: Validasi refresh token — jika valid, rotasi (hapus lama + buat baru).
   * @param rawToken — raw refresh token dari cookie/body
   * @returns { accessToken, refreshToken } — access token baru + refresh token baru (rotated)
   */
  async refresh(rawToken: string) {
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token tidak ditemukan');
    }

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    if (stored.revokedAt) {
      throw new UnauthorizedException('Refresh token sudah dicabut');
    }

    if (new Date(stored.expiresAt).getTime() < Date.now()) {
      // Hapus token kedaluwarsa
      await this.prisma.refreshToken.delete({ where: { id: stored.id } }).catch((e) => this.logger.warn('Gagal hapus refresh token kedaluwarsa', { error: e?.message ?? e }));
      throw new UnauthorizedException('Refresh token sudah kedaluwarsa, silakan login ulang');
    }

    // 🔴 P0-01: Bungkus rotasi dalam transaksi — cegah race condition
    // Dua request concurrent dengan token yang sama tidak bisa lolos berdua
    return this.prisma.$transaction(async (tx) => {
      // Claim token secara atomik. Kondisi revokedAt wajib berada pada operasi
      // delete agar refresh yang berlomba dengan logout hanya punya satu pemenang.
      const claimed = await tx.refreshToken.deleteMany({
        where: {
          id: stored.id,
          revokedAt: null,
          expiresAt: { gte: new Date() },
        },
      });

      if (claimed.count !== 1) {
        throw new UnauthorizedException('Refresh token sudah digunakan atau dicabut');
      }

      // Cari user
      const user = await tx.user.findUnique({
        where: { id: stored.userId, isActive: true },
      });

      if (!user) {
        throw new UnauthorizedException('User tidak ditemukan atau tidak aktif');
      }

      const accessToken = await this.jwtService.signAsync(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          pwdAt: user.passwordChangedAt?.getTime() ?? 0,
        },
        { expiresIn: this.ACCESS_TOKEN_EXPIRY_SEC },
      );

      // Buat refresh token baru (rotasi) — inline untuk gunakan tx
      const newRawToken = randomBytes(32).toString('hex');
      const newTokenHash = createHash('sha256').update(newRawToken).digest('hex');

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          token: newTokenHash,
          expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
        },
      });

      return {
        accessToken,
        refreshToken: newRawToken,
      };
    });
  }

  /**
   * P3-01: Mencabut refresh token.
   * - `rawToken` diberikan → cabut HANYA sesi itu (single-session logout).
   * - `rawToken` kosong    → cabut SEMUA refresh token user (global logout); dipakai
   *   saat password diganti/di-reset (T1 audit FE-002).
   *
   * @param client — opsional: klien transaksi Prisma agar pencabutan bisa atomik
   *                 dengan perubahan password (T1 audit FE-002). Default: klien biasa.
   */
  async revokeRefreshTokens(
    userId: number,
    rawToken?: string,
    client?: Pick<Prisma.TransactionClient, 'refreshToken'>,
  ) {
    const db = client ?? this.prisma;
    if (rawToken) {
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const stored = await db.refreshToken.findUnique({
        where: { token: tokenHash, userId },
      });
      if (stored && !stored.revokedAt) {
        await db.refreshToken.update({
          where: { id: stored.id },
          data: { revokedAt: new Date() },
        });
      }
    } else {
      // Revoke ALL refresh tokens for this user (global logout)
      await db.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  /**
   * P3-01: Helper — generate dan simpan refresh token di DB.
   */
  private async createRefreshToken(userId: number) {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: tokenHash,
        expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
      },
    });

    return { refreshToken: rawToken };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User pada token tidak ditemukan');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User tidak aktif atau akses dicabut');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      isActive: user.isActive,
      // F5-2 (AUD-2): info tip P2P agar staf bisa lihat/edit sendiri.
      tipGopay: user.tipGopay,
      tipOvo: user.tipOvo,
      tipDana: user.tipDana,
      tipShopeepay: user.tipShopeepay,
      tipBank: user.tipBank,
    };
  }

  /**
   * F5-2 (AUD-2 / D-21.2): staf mengisi sendiri info tip P2P (e-wallet/bank).
   * String kosong / hanya spasi → null (hapus). Tidak dijurnal (P2P di luar buku kos).
   */
  async updateMyTipInfo(userId: number, dto: UpdateMyTipInfoDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User pada token tidak ditemukan');
    if (!user.isActive) throw new ForbiddenException('User tidak aktif atau akses dicabut');

    const clean = (v?: string) => {
      if (v === undefined) return undefined; // tak diubah
      const t = v.trim();
      return t.length === 0 ? null : t;
    };
    const data: Record<string, string | null> = {};
    if (dto.tipGopay !== undefined) data.tipGopay = clean(dto.tipGopay) as string | null;
    if (dto.tipOvo !== undefined) data.tipOvo = clean(dto.tipOvo) as string | null;
    if (dto.tipDana !== undefined) data.tipDana = clean(dto.tipDana) as string | null;
    if (dto.tipShopeepay !== undefined) data.tipShopeepay = clean(dto.tipShopeepay) as string | null;
    if (dto.tipBank !== undefined) data.tipBank = clean(dto.tipBank) as string | null;

    const updated = await this.prisma.user.update({ where: { id: userId }, data });
    return {
      tipGopay: updated.tipGopay,
      tipOvo: updated.tipOvo,
      tipDana: updated.tipDana,
      tipShopeepay: updated.tipShopeepay,
      tipBank: updated.tipBank,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const identifier = dto.identifier.trim();
    if (!identifier) {
      return { success: true };
    }

    const normalizedPhone = normalizePhone(identifier);
    const user = await this.findUserForForgotPassword(identifier, normalizedPhone);

    // Enumeration-safe: always return the same response
    if (!user || !user.isActive) {
      return { success: true };
    }

    // Generate cryptographically random token
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Delete old tokens for this user + expired tokens, insert new hashed token
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM "PasswordResetToken"
        WHERE "userId" = ${user.id}
           OR "expiresAt" < NOW()
      `);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "PasswordResetToken" (
          id,
          "userId",
          token,
          "expiresAt",
          "createdAt"
        ) VALUES (
          ${this.buildSimpleId('prt')},
          ${user.id},
          ${tokenHash},
          ${expiresAt},
          NOW()
        )
      `);
    });

    // Send email via Brevo if user has email
    if (user.email) {
      await this.sendResetEmail(user.email, rawToken).catch((err) => {
        // Log but never expose to caller (enumeration-safe)
        this.logger.error(`[forgotPassword] Gagal mengirim email reset password: ${err?.message ?? 'unknown'}`);
      });
    }

    // Always return generic success
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const rawToken = dto.token.trim();
    if (!rawToken) {
      throw new UnauthorizedException('Token reset tidak valid');
    }

    // Hash the incoming raw token to compare with stored hash
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const rows = await this.prisma.$queryRaw<
      Array<{ userId: number; usedAt: Date | null; expiresAt: Date }>
    >(Prisma.sql`
      SELECT "userId", "usedAt", "expiresAt"
      FROM "PasswordResetToken"
      WHERE token = ${tokenHash}
      LIMIT 1
    `);

    const resetToken = rows[0];
    if (!resetToken) {
      throw new UnauthorizedException('Token reset tidak valid atau sudah kedaluwarsa');
    }

    if (resetToken.usedAt) {
      throw new UnauthorizedException('Token reset sudah pernah digunakan');
    }

    if (new Date(resetToken.expiresAt).getTime() < Date.now()) {
      throw new UnauthorizedException('Token reset sudah kedaluwarsa');
    }

    const user = await this.prisma.user.findUnique({ where: { id: resetToken.userId } });
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User tidak aktif atau akses dicabut');
    }

    const sameAsOldPassword = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (sameAsOldPassword) {
      throw new ConflictException('Password baru harus berbeda dari password lama');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    // T1 (audit FE-002/BE-002): ganti password WAJIB mematikan sesi lama.
    // Sebelumnya hanya access token lama yang mati (lewat pwdAt di jwt.strategy), sedangkan
    // refresh token tetap bisa menukar access token baru sampai 7 hari.
    // Pencabutan ditaruh di dalam transaksi yang sama dengan penggantian hash.
    await this.prisma.$transaction(async (tx) => {
      // Claim reset token secara atomik. Dua request yang sebelumnya sama-sama
      // membaca usedAt=null tidak boleh keduanya mengganti password.
      const claimed = await tx.$executeRaw(Prisma.sql`
        UPDATE "PasswordResetToken"
        SET "usedAt" = NOW()
        WHERE token = ${tokenHash}
          AND "usedAt" IS NULL
          AND "expiresAt" >= NOW()
      `);
      if (claimed !== 1) {
        throw new UnauthorizedException('Token reset tidak valid, sudah digunakan, atau kedaluwarsa');
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE "User"
        SET "passwordHash" = ${passwordHash},
            "passwordChangedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE id = ${user.id}
      `);

      // Global logout: cabut semua refresh token user.
      await this.revokeRefreshTokens(user.id, undefined, tx);
    });

    return { success: true };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User tidak aktif atau akses dicabut');
    }

    const passwordMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Password lama tidak sesuai');
    }

    const sameAsOldPassword = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (sameAsOldPassword) {
      throw new ConflictException('Password baru harus berbeda dari password lama');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    // T1 (audit FE-002/BE-002): idem resetPassword — ganti password mencabut seluruh sesi.
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "User"
        SET "passwordHash" = ${passwordHash},
            "passwordChangedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE id = ${user.id}
      `);

      await this.revokeRefreshTokens(user.id, undefined, tx);
    });

    return { success: true };
  }

  // ---- Private helpers ----

  /** Helper bersama: cari user via email dulu, lalu via nomor HP (via Tenant).
   *  @param includeExtraPhoneVariants — true untuk login (coba lebih banyak varian nomor),
   *                                     false/default untuk forgot-password (varian minimal). */
  private async findUserByEmailOrPhone(
    identifier: string,
    normalizedPhone: string | null,
    options?: { includeExtraPhoneVariants?: boolean },
  ) {
    const lowered = identifier.trim().toLowerCase();

    // Email lookup (identik di kedua method)
    const userByEmail = await this.prisma.user.findFirst({
      where: {
        email: { equals: lowered, mode: 'insensitive' },
        isActive: true,
      },
      include: { tenant: true },
    });
    if (userByEmail) return userByEmail;

    if (!normalizedPhone) return null;

    // Phone lookup
    const phoneConditions: Array<{ phone: string }> = [];

    if (options?.includeExtraPhoneVariants) {
      // Login: coba lebih banyak varian (denormalized, raw identifier, digits-only)
      const denormalized = denormalizePhone(normalizedPhone);
      const digitsOnly = identifier.replace(/\D/g, '');
      phoneConditions.push({ phone: normalizedPhone }, { phone: denormalized });
      if (!phoneConditions.some((c) => c.phone === identifier)) {
        phoneConditions.push({ phone: identifier });
      }
      if (digitsOnly !== identifier && !phoneConditions.some((c) => c.phone === digitsOnly)) {
        phoneConditions.push({ phone: digitsOnly });
      }
    } else {
      // Forgot-password: varian minimal
      phoneConditions.push(
        { phone: normalizedPhone },
        { phone: denormalizePhone(normalizedPhone) },
      );
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { OR: phoneConditions, isActive: true },
    });
    if (!tenant) return null;

    return this.prisma.user.findFirst({
      where: { tenantId: tenant.id, role: 'TENANT', isActive: true },
      include: { tenant: true },
    });
  }

  private async findUserForLogin(identifier: string, normalizedPhone: string | null) {
    return this.findUserByEmailOrPhone(identifier, normalizedPhone, { includeExtraPhoneVariants: true });
  }

  private async findUserForForgotPassword(identifier: string, normalizedPhone: string | null) {
    return this.findUserByEmailOrPhone(identifier, normalizedPhone);
  }

  // ---- S5: penguncian percobaan ----

  /**
   * Kunci penghitung = identifier yang sudah dinormalkan + IP klien.
   *
   * Nomor HP dinormalkan lebih dulu supaya `0812…` dan `62812…` berbagi satu
   * hitungan; email di-lowercase. IP ikut masuk kunci sesuai rencana §8.10 S5
   * ("per `identifier` + IP") — tanpa IP, satu penyerang bisa mengunci akun
   * korban hanya dengan lima sandi salah, dan tanpa identifier, satu IP bisa
   * menghabiskan jatah akun lain.
   */
  private buildLoginAttemptKey(
    identifier: string,
    normalizedPhone: string | null,
    ip?: string,
  ): string {
    const subject = this.loginSubject(identifier, normalizedPhone);
    return `${subject}|${ip ?? 'unknown'}`;
  }

  private loginSubject(identifier: string, normalizedPhone: string | null): string {
    const lowered = identifier.trim().toLowerCase();
    if (lowered.includes('@')) return `email:${lowered}`;
    return `phone:${normalizedPhone ?? lowered}`;
  }

  /** Melempar 429 + sisa waktu bila kombinasi ini sedang terkunci. */
  private assertLoginNotLocked(attemptKey: string): void {
    const entry = this.failedLoginAttempts.get(attemptKey);
    if (!entry) return;

    const now = Date.now();

    if (entry.lockedUntil !== null) {
      if (now < entry.lockedUntil) {
        const remainingMinutes = Math.max(1, Math.ceil((entry.lockedUntil - now) / 60_000));
        throw new HttpException(
          `Terlalu banyak percobaan masuk. Coba lagi dalam ${remainingMinutes} menit.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      // Jeda 15 menit lewat → hitungan dibuang, tidak ada kunci permanen.
      this.failedLoginAttempts.delete(attemptKey);
      return;
    }

    if (now - entry.firstFailedAt > LOGIN_LOCKOUT_MS) {
      this.failedLoginAttempts.delete(attemptKey);
    }
  }

  /**
   * Menambah hitungan gagal; pada ambang ke-`MAX_FAILED_LOGIN_ATTEMPTS` kombinasi
   * ini dikunci `LOGIN_LOCKOUT_MS` dan peristiwa itu ditulis ke AuditLog dengan
   * identifier **tersamar** (§8.8: tanpa email/nomor HP utuh di log/audit).
   */
  private async registerFailedLogin(
    attemptKey: string,
    identifier: string,
    normalizedPhone: string | null,
    ip?: string,
  ): Promise<void> {
    const now = Date.now();
    this.pruneFailedLoginAttempts(now);

    const previous = this.failedLoginAttempts.get(attemptKey);
    const entry: FailedLoginEntry =
      !previous || now - previous.firstFailedAt > LOGIN_LOCKOUT_MS
        ? { failedAttempts: 0, firstFailedAt: now, lockedUntil: null }
        : previous;

    entry.failedAttempts += 1;

    let justLocked = false;
    if (entry.failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS && entry.lockedUntil === null) {
      entry.lockedUntil = now + LOGIN_LOCKOUT_MS;
      justLocked = true;
    }

    this.failedLoginAttempts.set(attemptKey, entry);

    if (justLocked) {
      await this.recordLoginLockout(identifier, normalizedPhone, ip, entry);
    }
  }

  /** Menjaga peta tetap terbatas saat penyerang memakai identifier unik tanpa henti. */
  private pruneFailedLoginAttempts(now: number): void {
    if (this.failedLoginAttempts.size < FAILED_LOGIN_MAX_KEYS) return;

    for (const [key, entry] of this.failedLoginAttempts) {
      const expired =
        entry.lockedUntil !== null
          ? entry.lockedUntil <= now
          : now - entry.firstFailedAt > LOGIN_LOCKOUT_MS;
      if (expired) this.failedLoginAttempts.delete(key);
    }
    if (this.failedLoginAttempts.size < FAILED_LOGIN_MAX_KEYS) return;

    let earliestKey: string | undefined;
    let earliestAt = Number.POSITIVE_INFINITY;
    for (const [key, entry] of this.failedLoginAttempts) {
      const at = entry.lockedUntil ?? entry.firstFailedAt;
      if (at < earliestAt) {
        earliestAt = at;
        earliestKey = key;
      }
    }
    if (earliestKey) this.failedLoginAttempts.delete(earliestKey);
  }

  /**
   * Bentuk tersamar untuk log/audit. HMAC-SHA256 dengan kunci **per proses**,
   * bukan `sha256` polos: ruang nomor HP Indonesia cukup kecil untuk dibalik
   * dengan brute force, jadi hash tanpa kunci bukan penyamaran. Konsekuensinya
   * tag ini hanya bisa dikorelasikan di dalam satu proses — dan itu memang batas
   * penguncian in-memory ini.
   */
  private maskIdentifier(identifier: string, normalizedPhone: string | null): string {
    const subject = this.loginSubject(identifier, normalizedPhone);
    const kind = subject.startsWith('email:') ? 'email' : 'phone';
    const digest = createHmac('sha256', this.identifierMaskKey).update(subject).digest('hex');
    return `${kind}:hmac-${digest.slice(0, 12)}`;
  }

  private async recordLoginLockout(
    identifier: string,
    normalizedPhone: string | null,
    ip: string | undefined,
    entry: FailedLoginEntry,
  ): Promise<void> {
    const identifierMask = this.maskIdentifier(identifier, normalizedPhone);
    const lockedForMinutes = Math.round(LOGIN_LOCKOUT_MS / 60_000);
    const clientIp = ip ?? 'unknown';

    this.logger.warn(
      `Login dikunci ${lockedForMinutes} menit untuk ${identifierMask} dari ${clientIp} setelah ${entry.failedAttempts} percobaan gagal`,
    );

    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: null,
          action: 'AUTH_LOGIN_LOCKOUT',
          entityType: 'Auth',
          entityId: identifierMask,
          meta: {
            identifierMask,
            clientIp,
            failedAttempts: entry.failedAttempts,
            lockedForMinutes,
          } as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      // Penguncian tetap berlaku walau audit gagal ditulis; jangan bocorkan identifier.
      this.logger.error(
        `[loginLockout] Gagal menulis AuditLog untuk ${identifierMask}: ${(err as Error)?.message ?? 'unknown'}`,
      );
    }
  }

  private async sendResetEmail(email: string, rawToken: string): Promise<void> {
    // Baca Brevo config dari OperationalSetting (DB), fallback ke env
    const opSetting = await this.prisma.operationalSetting.findUnique({
      where: { id: 1 },
      select: { brevoApiKey: true, mailFromEmail: true, mailFromName: true },
    });
    const apiKey = opSetting?.brevoApiKey?.trim() || this.configService.get<string>('BREVO_API_KEY');
    if (!apiKey) { this.logger.warn('Brevo API key tidak dikonfigurasi — email reset password tidak dikirim'); return; }
    const fromEmail = opSetting?.mailFromEmail?.trim() || this.configService.get<string>('MAIL_FROM_EMAIL', 'no-reply@kost48surabaya.com');
    const fromName = opSetting?.mailFromName?.trim() || this.configService.get<string>('MAIL_FROM_NAME', 'Kost48 Surabaya');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');

    const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    const payload = {
      sender: { name: fromName, email: fromEmail },
      to: [{ email }],
      subject: 'Reset Password Kost48 Surabaya',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">Reset Password Kost48 Surabaya</h2>
          <p>Anda menerima email ini karena ada permintaan reset password untuk akun Anda di Kost48 Surabaya.</p>
          <p>Klik tombol di bawah ini untuk mengatur password baru:</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${resetLink}"
               style="background-color: #0d6efd; color: #fff; padding: 12px 32px;
                      border-radius: 6px; text-decoration: none; font-size: 16px;
                      display: inline-block;">
              Reset Password
            </a>
          </p>
          <p style="font-size: 13px; color: #6c757d;">
            Link ini berlaku selama <strong>30 menit</strong> dan hanya bisa digunakan <strong>satu kali</strong>.
            Jika Anda tidak meminta reset password, abaikan email ini.
          </p>
          <hr style="border: none; border-top: 1px solid #dee2e6; margin: 24px 0;" />
          <p style="font-size: 12px; color: #adb5bd;">
            Jika tombol tidak berfungsi, salin dan tempel link berikut ke browser:<br />
            <a href="${resetLink}" style="color: #0d6efd;">${resetLink}</a>
          </p>
          <p style="font-size: 12px; color: #adb5bd;">
            Kost48 Surabaya &middot; Sistem Manajemen Kos Modern
          </p>
        </div>
      `.trim(),
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Brevo API error ${response.status}: ${body}`);
    }
  }

  private buildSimpleId(prefix: string) {
    return `${prefix}_${randomBytes(10).toString('hex')}`;
  }
}
