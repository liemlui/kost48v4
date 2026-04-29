import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
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
  ) {}

  async login(dto: LoginDto) {
    const invalidCredentialsMessage = 'Email atau password salah';

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

    if (!user || !user.isActive) {
      return { success: true };
    }

    const token = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

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
          ${token},
          ${expiresAt},
          NOW()
        )
      `);
    });

    const destination = user.email ?? normalizedPhone ?? null;

    return {
      success: true,
      resetTokenPreview: token,
      expiresAt,
      channel: user.email ? 'EMAIL' : 'PHONE',
      destination,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const token = dto.token.trim();
    if (!token) {
      throw new UnauthorizedException('Token reset tidak valid');
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ userId: number; usedAt: Date | null; expiresAt: Date }>
    >(Prisma.sql`
      SELECT "userId", "usedAt", "expiresAt"
      FROM "PasswordResetToken"
      WHERE token = ${token}
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
        WHERE token = ${token}
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

  private buildSimpleId(prefix: string) {
    return `${prefix}_${randomBytes(10).toString('hex')}`;
  }
}