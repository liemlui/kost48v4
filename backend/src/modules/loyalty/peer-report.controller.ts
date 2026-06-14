import { Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PeerReportService } from './peer-report.service';
import { CreatePeerReportDto, ModeratePeerReportDto } from './dto/loyalty.dto';

@ApiTags('Peer Behavior Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PeerReportController {
  constructor(private readonly peer: PeerReportService) {}

  private tenantId(user: CurrentUserPayload): number {
    if (!user.tenantId) throw new ForbiddenException('Hanya tenant yang dapat mengakses fitur ini.');
    return user.tenantId;
  }

  // ── Tenant (pelapor A) ──────────────────────────────
  @Post('me/peer-reports')
  @Roles(UserRole.TENANT)
  async create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreatePeerReportDto) {
    return { message: 'Laporan terkirim untuk moderasi', data: await this.peer.create(this.tenantId(user), dto) };
  }

  @Get('me/peer-reports/made')
  @Roles(UserRole.TENANT)
  async made(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Laporan yang Anda buat', data: await this.peer.listMadeBy(this.tenantId(user)) };
  }

  @Get('me/peer-reports/co-tenants')
  @Roles(UserRole.TENANT)
  async coTenants(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Penghuni lain', data: await this.peer.listCoTenants(this.tenantId(user)) };
  }

  // ── Tenant (reportee B) — ANONIM ───────────────────
  @Get('me/peer-reports/about-me')
  @Roles(UserRole.TENANT)
  async aboutMe(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Masukan untuk Anda', data: await this.peer.listAboutMe(this.tenantId(user)) };
  }

  @Post('me/peer-reports/:id/improved')
  @Roles(UserRole.TENANT)
  async improved(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseIntPipe) id: number) {
    return { message: 'Ditandai sudah diperbaiki', data: await this.peer.markImproved(this.tenantId(user), id) };
  }

  // Konfirmasi membaik: pelapor (TENANT) ATAU admin/owner.
  @Post('peer-reports/:id/confirm')
  @Roles(UserRole.TENANT, UserRole.ADMIN, UserRole.OWNER)
  async confirm(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseIntPipe) id: number) {
    return { message: 'Perbaikan dikonfirmasi, poin diberikan', data: await this.peer.confirm(id, { id: user.id, role: user.role, tenantId: user.tenantId }) };
  }

  // ── Admin/owner moderasi ───────────────────────────
  @Get('peer-reports')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async list(@Query('status') status?: string) {
    return { message: 'Daftar laporan sikap', data: await this.peer.listForAdmin(status) };
  }

  @Post('peer-reports/:id/moderate')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async moderate(@CurrentUser() user: CurrentUserPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ModeratePeerReportDto) {
    return { message: 'Laporan dimoderasi', data: await this.peer.moderate(id, dto.decision, user.id) };
  }
}
