import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone, denormalizePhone } from '../common/utils/phone.util';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMyTipInfoDto } from './dto/update-my-tip-info.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const invalidCredentialsMessage = 'Email/nomor HP atau password salah';

    const identifier = dto.identifier.trim();
    const normalizedPhone = normalizePhone(identifier);

    const user = await this.findUserForLogin(identifier, normalizedPhone);

    if (!user) {
      throw new UnauthorizedException(invalidCredentialsMessage);
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException(invalidCredentialsMessage);
    }

    // AD-02: cek isActive setelah password — hindari enumerasi akun nonaktif
    if (!user.isActive) {
      throw new ForbiddenException(invalidCredentialsMessage);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      pwdAt: user.passwordChangedAt?.getTime() ?? 0,
    });

    return {
      accessToken,
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

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "User"
        SET "passwordHash" = ${passwordHash},
            "passwordChangedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE id = ${user.id}
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE "PasswordResetToken"
        SET "usedAt" = NOW()
        WHERE token = ${tokenHash}
      `);
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

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "User"
      SET "passwordHash" = ${passwordHash},
          "passwordChangedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE id = ${user.id}
    `);

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

  private async sendResetEmail(email: string, rawToken: string): Promise<void> {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    const fromEmail = this.configService.get<string>('MAIL_FROM_EMAIL', 'no-reply@kost48surabaya.com');
    const fromName = this.configService.get<string>('MAIL_FROM_NAME', 'Kost48 Surabaya');
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