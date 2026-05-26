import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { AssetsService } from './assets.service';
import { CreateFixedAssetDto, RunDepreciationDto, UpdateFixedAssetDto } from './dto/asset.dto';
import { DepreciationPreviewQueryDto, FixedAssetsQueryDto } from './dto/asset-query.dto';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('readiness')
  async readiness() {
    return { message: 'Kesiapan asset register berhasil diambil', data: await this.assetsService.readiness() };
  }

  @Get('depreciation/preview')
  async depreciationPreview(@Query() query: DepreciationPreviewQueryDto) {
    return { message: 'Preview depresiasi berhasil diambil', data: await this.assetsService.depreciationPreview(query) };
  }

  @Roles(UserRole.OWNER)
  @Post('depreciation/run')
  async runDepreciation(@Body() dto: RunDepreciationDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Depresiasi bulanan berhasil diposting', data: await this.assetsService.runDepreciation(dto, user) };
  }

  @Get()
  async findAll(@Query() query: FixedAssetsQueryDto) {
    return { message: 'Daftar aset berhasil diambil', data: await this.assetsService.findAll(query) };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail aset berhasil diambil', data: await this.assetsService.findOne(id) };
  }

  @Post()
  async create(@Body() dto: CreateFixedAssetDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Aset berhasil dibuat', data: await this.assetsService.create(dto, user) };
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFixedAssetDto) {
    return { message: 'Aset berhasil diperbarui', data: await this.assetsService.update(id, dto) };
  }
}
