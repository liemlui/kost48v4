import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { MarketAnalysisChatDto, SaveMarketAnalysisDto } from './dto/market-analysis.dto';
import { MarketAnalysisService } from './market-analysis.service';

@ApiTags('market-analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('market-analysis')
export class MarketAnalysisController {
  constructor(private readonly service: MarketAnalysisService) {}

  @Get('status')
  @ApiOperation({ summary: 'Status konfigurasi analisa AI — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  status() {
    return { message: 'Status analisa AI', data: this.service.configured() };
  }

  // Data nyata kos yang dipakai AI sebagai fakta dasar (okupansi, hunian, survei).
  @Get('snapshot')
  @ApiOperation({ summary: 'Data aktual kos untuk AI — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async snapshot() {
    return { message: 'Data aktual kos', data: await this.service.businessSnapshot() };
  }

  // Demografi customer teranonim (umur/gender/kota/pekerjaan agregat) — tanpa AI, tanpa PDP mentah.
  @Get('demographics')
  @ApiOperation({ summary: 'Demografi customer agregat — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async demographics() {
    return { message: 'Demografi customer (agregat)', data: await this.service.demographicsSnapshot() };
  }

  // CAC/CLV Lite — data agregat akuisisi & retensi (tanpa AI, offline-first)
  @Get('cac-clv')
  @ApiOperation({ summary: 'CAC/CLV dashboard — OWNER-only' })
  @Roles(UserRole.OWNER)
  async cacClv(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return { message: 'CAC/CLV dashboard', data: await this.service.cacClvSnapshot(from, to) };
  }

  // CAC/CLV analisis mendalam dengan AI DeepSeek + fallback offline
  @Post('cac-clv/analyze')
  @ApiOperation({ summary: 'Analisa CAC/CLV dengan AI — OWNER-only' })
  @Roles(UserRole.OWNER)
  async analyzeCacClv(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Analisa CAC/CLV', data: await this.service.analyzeCacClv(user) };
  }

  // Chat interaktif (AI mewawancarai owner lalu menyusun SWOT/PESTLE). Owner-only (strategi).
  @Post('chat')
  @ApiOperation({ summary: 'Chat dengan analis AI pasar — OWNER-only' })
  @Roles(UserRole.OWNER)
  async chat(@Body() dto: MarketAnalysisChatDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Balasan analis AI', data: await this.service.chat(dto, user) };
  }

  @Post()
  @ApiOperation({ summary: 'Simpan analisa pasar — OWNER-only' })
  @Roles(UserRole.OWNER)
  async save(@Body() dto: SaveMarketAnalysisDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Analisa tersimpan', data: await this.service.save(dto, user) };
  }

  @Get()
  @ApiOperation({ summary: 'Daftar analisa pasar — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async findAll() {
    return { message: 'Daftar analisa pasar', data: await this.service.findAll() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail analisa pasar — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail analisa pasar', data: await this.service.findOne(id) };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus analisa pasar — OWNER-only' })
  @Roles(UserRole.OWNER)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Analisa dihapus', data: await this.service.remove(id) };
  }
}
