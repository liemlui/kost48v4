import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { DepositLedgerDryRunDto, DepositLedgerQueryDto, DepositLedgerSummaryQueryDto } from './dto/deposit-ledger-query.dto';
import { DepositLedgerService } from './deposit-ledger.service';

@ApiTags('deposit-ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('deposit-ledger')
export class DepositLedgerController {
  constructor(private readonly depositLedgerService: DepositLedgerService) {}

  @Get('stays/:stayId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TENANT)
  async listByStay(
    @Param('stayId', ParseIntPipe) stayId: number,
    @Query() query: DepositLedgerQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return {
      message: 'Riwayat deposit stay berhasil diambil',
      data: await this.depositLedgerService.listByStay(stayId, query, user),
    };
  }

  @Get('tenants/:tenantId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TENANT)
  async listByTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Query() query: DepositLedgerQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return {
      message: 'Riwayat deposit tenant berhasil diambil',
      data: await this.depositLedgerService.listByTenant(tenantId, query, user),
    };
  }

  @Get('summary')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async summary(@Query() query: DepositLedgerSummaryQueryDto) {
    return {
      message: 'Ringkasan deposit ledger berhasil diambil',
      data: await this.depositLedgerService.summary(query),
    };
  }

  @Get('reconciliation-lite')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async reconciliationLite(@Query() query: DepositLedgerSummaryQueryDto) {
    return {
      message: 'Rekonsiliasi ringan deposit ledger berhasil diambil',
      data: await this.depositLedgerService.reconciliationLite(query),
    };
  }

  @Post('backfill/dry-run')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async backfillDryRun(@Body() dto: DepositLedgerDryRunDto = {}) {
    return {
      message: 'Dry-run backfill deposit ledger berhasil diproses',
      data: await this.depositLedgerService.backfillDryRun(dto),
    };
  }
}
