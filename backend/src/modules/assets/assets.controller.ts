import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AssetsService } from './assets.service';
import { CreateFixedAssetDto, RunDepreciationDto, UpdateFixedAssetDto } from './dto/asset.dto';
import { AssetLedgerAlignmentDto } from './dto/asset-ledger-alignment.dto';
import { DepreciationPreviewQueryDto, FixedAssetsQueryDto } from './dto/asset-query.dto';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('readiness')
  @ApiOperation({ summary: 'Kesiapan asset register — OWNER/ADMIN' })
  async readiness() {
    return { message: 'Kesiapan asset register berhasil diambil', data: await this.assetsService.readiness() };
  }

  @Get('depreciation/preview')
  @ApiOperation({ summary: 'Preview depresiasi aset — OWNER/ADMIN' })
  async depreciationPreview(@Query() query: DepreciationPreviewQueryDto) {
    return { message: 'Preview depresiasi berhasil diambil', data: await this.assetsService.depreciationPreview(query) };
  }

  @Get('ledger-alignment')
  @ApiOperation({ summary: 'Ringkasan alignment ledger aset — OWNER/ADMIN' })
  async ledgerAlignmentSummary() {
    return { message: 'Ringkasan alignment ledger aset berhasil diambil', data: await this.assetsService.ledgerAlignmentSummary() };
  }

  @Post(':id/ledger-alignment/preview')
  @ApiOperation({ summary: 'Preview alignment ledger aset — OWNER/ADMIN' })
  async previewLedgerAlignment(@Param('id', ParseIntPipe) id: number, @Body() dto: AssetLedgerAlignmentDto) {
    return { message: 'Preview alignment ledger aset berhasil dibuat', data: await this.assetsService.previewLedgerAlignment(id, dto) };
  }

  @Roles(UserRole.OWNER)
  @Post(':id/ledger-alignment/post')
  @ApiOperation({ summary: 'Posting alignment ledger aset — OWNER-only' })
  async postLedgerAlignment(@Param('id', ParseIntPipe) id: number, @Body() dto: AssetLedgerAlignmentDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Alignment ledger aset berhasil diposting', data: await this.assetsService.postLedgerAlignment(id, dto, user) };
  }


  @Roles(UserRole.OWNER)
  @Post('depreciation/run')
  @ApiOperation({ summary: 'Jalankan depresiasi bulanan — OWNER-only' })
  async runDepreciation(@Body() dto: RunDepreciationDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Depresiasi bulanan berhasil diposting', data: await this.assetsService.runDepreciation(dto, user) };
  }

  @Get()
  @ApiOperation({ summary: 'Daftar aset tetap — OWNER/ADMIN' })
  async findAll(@Query() query: FixedAssetsQueryDto) {
    return { message: 'Daftar aset berhasil diambil', data: await this.assetsService.findAll(query) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail aset tetap — OWNER/ADMIN' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail aset berhasil diambil', data: await this.assetsService.findOne(id) };
  }

  @Post()
  @ApiOperation({ summary: 'Buat aset tetap — OWNER/ADMIN' })
  async create(@Body() dto: CreateFixedAssetDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Aset berhasil dibuat', data: await this.assetsService.create(dto, user) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Perbarui aset tetap — OWNER/ADMIN' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFixedAssetDto) {
    return { message: 'Aset berhasil diperbarui', data: await this.assetsService.update(id, dto) };
  }
}
