import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  status() {
    return { message: 'Status analisa AI', data: this.service.configured() };
  }

  // Data nyata kos yang dipakai AI sebagai fakta dasar (okupansi, hunian, survei).
  @Get('snapshot')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async snapshot() {
    return { message: 'Data aktual kos', data: await this.service.businessSnapshot() };
  }

  // CAC/CLV Lite — data agregat akuisisi & retensi (tanpa AI, offline-first)
  @Get('cac-clv')
  @Roles(UserRole.OWNER)
  async cacClv(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return { message: 'CAC/CLV dashboard', data: await this.service.cacClvSnapshot(from, to) };
  }

  // CAC/CLV analisis mendalam dengan AI DeepSeek + fallback offline
  @Post('cac-clv/analyze')
  @Roles(UserRole.OWNER)
  async analyzeCacClv(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Analisa CAC/CLV', data: await this.service.analyzeCacClv(user) };
  }

  // Chat interaktif (AI mewawancarai owner lalu menyusun SWOT/PESTLE). Owner-only (strategi).
  @Post('chat')
  @Roles(UserRole.OWNER)
  async chat(@Body() dto: MarketAnalysisChatDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Balasan analis AI', data: await this.service.chat(dto, user) };
  }

  @Post()
  @Roles(UserRole.OWNER)
  async save(@Body() dto: SaveMarketAnalysisDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Analisa tersimpan', data: await this.service.save(dto, user) };
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async findAll() {
    return { message: 'Daftar analisa pasar', data: await this.service.findAll() };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail analisa pasar', data: await this.service.findOne(id) };
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Analisa dihapus', data: await this.service.remove(id) };
  }
}
