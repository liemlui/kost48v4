import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { createHash } from 'crypto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/app.enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { CurrentUserPayload } from '../common/interfaces/current-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMyTipInfoDto } from './dto/update-my-tip-info.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly REFRESH_COOKIE = 'kost48_refresh_token';
  private readonly COOKIE_PATH = '/api/auth';

  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login user — publik, rate-limited' })
  @Public()
  @UseGuards(RateLimitGuard)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.login(dto);
    // P3-01: set refresh token sebagai httpOnly cookie (XSS-safe)
    this.setRefreshCookie(res, data.refreshToken);
    return { message: 'Login berhasil', data: { accessToken: data.accessToken, user: data.user } };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token via refresh token cookie' })
  @Public()
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = this.extractRefreshToken(req);
    const data = await this.authService.refresh(rawToken);
    // Rotasi refresh token: set cookie baru
    this.setRefreshCookie(res, data.refreshToken);
    return { message: 'Token berhasil diperbarui', data: { accessToken: data.accessToken } };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout — revoke refresh token' })
  @Public()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response, @CurrentUser() user?: CurrentUserPayload) {
    const rawToken = this.extractRefreshToken(req);
    if (user) {
      // Jika ada user (akses token valid), revoke spesifik
      await this.authService.revokeRefreshTokens(user.id, rawToken);
    } else if (rawToken) {
      // Tanpa user, coba revoke via token saja
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const stored = await this.prisma.refreshToken.findUnique({ where: { token: tokenHash } });
      if (stored && !stored.revokedAt) {
        await this.prisma.refreshToken.update({
          where: { id: stored.id },
          data: { revokedAt: new Date() },
        });
      }
    }
    this.clearRefreshCookie(res);
    return { message: 'Logout berhasil' };
  }

  @Get('me')
  @ApiOperation({ summary: 'Ambil profil user saat ini' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async me(@CurrentUser() user: CurrentUserPayload) {
    const data = await this.authService.me(user.id);
    return { message: 'Profil user berhasil diambil', data };
  }


  @Post('forgot-password')
  @ApiOperation({ summary: 'Kirim instruksi reset password email/HP — publik, rate-limited' })
  @Public()
  @UseGuards(RateLimitGuard)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const data = await this.authService.forgotPassword(dto);
    return { message: 'Jika akun ditemukan, instruksi reset password telah dikirim.', data };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password dengan token — publik, rate-limited' })
  @Public()
  @UseGuards(RateLimitGuard)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const data = await this.authService.resetPassword(dto);
    return { message: 'Password berhasil diperbarui. Silakan login dengan password baru Anda.', data };
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Ubah password user saat ini' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async changePassword(@CurrentUser() user: CurrentUserPayload, @Body() dto: ChangePasswordDto) {
    const data = await this.authService.changePassword(user.id, dto);
    return { message: 'Password berhasil diperbarui', data };
  }

  // F5-2 (AUD-2 / D-21.2): staf mengisi sendiri info tip P2P (e-wallet/bank). Self-service STAFF.
  @Patch('me/tip-info')
  @ApiOperation({ summary: 'Perbarui info tip P2P staf (e-wallet/bank) — self-service STAFF' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF)
  @ApiBearerAuth()
  async updateMyTipInfo(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpdateMyTipInfoDto) {
    const data = await this.authService.updateMyTipInfo(user.id, dto);
    return { message: 'Info tip berhasil diperbarui', data };
  }

  // ── P3-01: Refresh Token Cookie Helpers ──────────────────────────────────

  private setRefreshCookie(res: Response, token: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie(this.REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: this.COOKIE_PATH,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(this.REFRESH_COOKIE, {
      httpOnly: true,
      path: this.COOKIE_PATH,
    });
  }

  private extractRefreshToken(req: Request): string | null {
    const header = req.headers.cookie;
    if (!header) return null;
    // Parse manual: cari cookie dengan nama yang sesuai
    const match = header.match(new RegExp(`(?:^|;)\\s*${this.REFRESH_COOKIE}=([^;]*)`));
    return match ? decodeURIComponent(match[1].trim()) : null;
  }
}
