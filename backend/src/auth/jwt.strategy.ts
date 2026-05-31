import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User pada token tidak ditemukan');
    if (!user.isActive) throw new UnauthorizedException('User tidak aktif atau akses dicabut');

    // Reject tokens issued before the most recent password change/reset.
    if (user.passwordChangedAt) {
      const pwdAtMs: number = payload.pwdAt ?? 0;
      if (user.passwordChangedAt.getTime() > pwdAtMs) {
        throw new UnauthorizedException('Sesi kedaluwarsa karena password telah diubah, silakan login ulang');
      }
    }

    // Always return role from DB so a role downgrade takes effect immediately.
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      tenantId: user.tenantId,
      isActive: user.isActive,
    };
  }
}
