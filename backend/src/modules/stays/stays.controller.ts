import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CancelStayDto, CompleteStayDto, CreateStayDto, ForcedCheckoutDto, MarkBelongingsDto, ProcessDepositDto, ProcessLossRefundDto, RenewStayDto, UpdateStayDto } from './dto/stay.dto';
import { PrepayExtensionDto, TransferRoomDto } from './dto/room-transfer.dto';
import { StaysQueryDto } from './dto/stays-query.dto';
import { StaysQueryService } from './stays-query.service';
import { StaysService } from './stays.service';
import { RoomTransferService } from './room-transfer.service';
import { PrepayExtensionService } from './prepay-extension.service';

@ApiTags('stays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stays')
export class StaysController {
  constructor(
    private readonly staysService: StaysService,
    private readonly staysQueryService: StaysQueryService,
    private readonly roomTransferService: RoomTransferService,
    private readonly prepayExtensionService: PrepayExtensionService,
  ) {}

  // F4-8: pindah kamar resmi (OWNER/ADMIN; override harga OWNER-only di service).
  @Post(':id/transfer-room')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async transferRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransferRoomDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return { message: 'Pindah kamar berhasil', data: await this.roomTransferService.transferRoom(id, dto, user) };
  }

  // F4-11: prabayar/perpanjangan N bulan (harga bulanan), bayar penuh di muka (OWNER/ADMIN).
  @Post(':id/prepay-extension')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async prepayExtension(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PrepayExtensionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return { message: 'Prabayar perpanjangan berhasil', data: await this.prepayExtensionService.prepayExtension(id, dto, user) };
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: StaysQueryDto) {
    return { message: 'Daftar stay berhasil diambil', data: await this.staysQueryService.findAll(query) };
  }

  @Get('me/current')
  @Roles(UserRole.TENANT)
  async meCurrent(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay aktif berhasil diambil', data: await this.staysQueryService.findCurrentForTenant(user) };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async create(@Body() dto: CreateStayDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay berhasil dibuat', data: await this.staysService.create(dto, user) };
  }

  // F2-3b: daftar refund kalah-cepat menunggu proses (rute statik SEBELUM :id).
  @Get('loss-refunds/pending')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async pendingLossRefunds() {
    return { message: 'Daftar refund kalah-cepat berhasil diambil', data: await this.staysService.listPendingLossRefunds() };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail stay berhasil diambil', data: await this.staysQueryService.findOne(id, user) };
  }

  @Get(':id/invoice-suggestion')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async getInvoiceSuggestion(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Saran invoice berhasil diambil',
      data: await this.staysQueryService.getInvoiceSuggestion(id, user),
    };
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStayDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay berhasil diperbarui', data: await this.staysService.update(id, dto, user) };
  }

  @Post(':id/complete')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async complete(@Param('id', ParseIntPipe) id: number, @Body() dto: CompleteStayDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay berhasil diselesaikan', data: await this.staysService.complete(id, dto, user) };
  }

  @Post(':id/cancel')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelStayDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay berhasil dibatalkan', data: await this.staysService.cancel(id, dto, user) };
  }

  // F2-16 (D-17): proses deposit & refund settlement (PARTIAL/FULL/FORFEIT) — OWNER-only.
  @Post(':id/deposit/process')
  @Roles(UserRole.OWNER)
  async processDeposit(@Param('id', ParseIntPipe) id: number, @Body() dto: ProcessDepositDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Deposit berhasil diproses', data: await this.staysService.processDeposit(id, dto, user) };
  }

  // F2-3b: proses refund kalah-cepat (tandai sudah dikembalikan + bukti) — OWNER-only (D-17).
  @Post(':id/loss-refund/process')
  @Roles(UserRole.OWNER)
  async processLossRefund(@Param('id', ParseIntPipe) id: number, @Body() dto: ProcessLossRefundDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Refund kalah-cepat berhasil diproses', data: await this.staysService.processLossRefund(id, dto, user) };
  }

  @Post(':id/renew')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async renewStay(@Param('id', ParseIntPipe) id: number, @Body() dto: RenewStayDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay berhasil diperpanjang', data: await this.staysService.renewStay(id, dto, user) };
  }

  // F3-14/F3-16: paksa-checkout admin (overstay nunggak / tenant kabur) + settle deposit -> AR. OWNER-only.
  @Post(':id/forced-checkout')
  @Roles(UserRole.OWNER)
  async forcedCheckout(@Param('id', ParseIntPipe) id: number, @Body() dto: ForcedCheckoutDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Forced checkout berhasil diproses', data: await this.staysService.forcedCheckout(id, dto, user) };
  }

  // F3-15: tandai barang tenant pasca-checkout (CLAIMED/ABANDONED).
  @Post(':id/belongings')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async markBelongings(@Param('id', ParseIntPipe) id: number, @Body() dto: MarkBelongingsDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Status barang tenant berhasil diperbarui', data: await this.staysService.markBelongings(id, dto, user) };
  }
}
