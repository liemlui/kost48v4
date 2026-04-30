import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePhone, denormalizePhone } from '../common/utils/phone.util';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
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

    if (!user.isActive) {
      throw new ForbiddenException('User tidak aktif');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException(invalidCredentialsMessage);
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
        console.error('[forgotPassword] Gagal mengirim email reset password:', err?.message ?? err);
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

    return { success: true, userId: user.id };
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

    return { userId: user.id };
  }

  // ---- Private helpers ----

  private async findUserForLogin(identifier: string, normalizedPhone: string | null) {
    const lowered = identifier.trim().toLowerCase();

    const userByEmail = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: lowered,
          mode: 'insensitive',
        },
        isActive: true,
      },
      include: {
        tenant: true,
      },
    });

    if (userByEmail) {
      return userByEmail;
    }

    if (!normalizedPhone) {
      return null;
    }

    const denormalized = denormalizePhone(normalizedPhone);
    const digitsOnly = identifier.replace(/\D/g, '');

    const phoneConditions: Array<{ phone: string }> = [
      { phone: normalizedPhone },
      { phone: denormalized },
    ];

    if (!phoneConditions.some((c) => c.phone === identifier)) {
      phoneConditions.push({ phone: identifier });
    }
    if (digitsOnly !== identifier && !phoneConditions.some((c) => c.phone === digitsOnly)) {
      phoneConditions.push({ phone: digitsOnly });
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: phoneConditions,
        isActive: true,
      },
    });

    if (!tenant) {
      return null;
    }

    return this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        role: 'TENANT',
        isActive: true,
      },
      include: {
        tenant: true,
      },
    });
  }

  private async findUserForForgotPassword(identifier: string, normalizedPhone: string | null) {
    const lowered = identifier.trim().toLowerCase();

    const userByEmail = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: lowered,
          mode: 'insensitive',
        },
        isActive: true,
      },
      include: {
        tenant: true,
      },
    });

    if (userByEmail) {
      return userByEmail;
    }

    if (!normalizedPhone) {
      return null;
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { phone: denormalizePhone(normalizedPhone) },
        ],
        isActive: true,
      },
    });

    if (!tenant) {
      return null;
    }

    return this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        role: 'TENANT',
        isActive: true,
      },
      include: {
        tenant: true,
      },
    });
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