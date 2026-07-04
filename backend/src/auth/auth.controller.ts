import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/app.enums';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { CurrentUserPayload } from '../common/interfaces/current-user.interface';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMyTipInfoDto } from './dto/update-my-tip-info.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login user — publik, rate-limited' })
  @Public()
  @UseGuards(RateLimitGuard)
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return { message: 'Login berhasil', data };
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
}
