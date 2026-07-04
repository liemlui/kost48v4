import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Pindah kamar — OWNER/ADMIN' })
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
  @ApiOperation({ summary: 'Prabayar perpanjangan — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async prepayExtension(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PrepayExtensionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return { message: 'Prabayar perpanjangan berhasil', data: await this.prepayExtensionService.prepayExtension(id, dto, user) };
  }

  @Get()
  @ApiOperation({ summary: 'Daftar stay — OWNER/ADMIN/STAFF' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: StaysQueryDto) {
    return { message: 'Daftar stay berhasil diambil', data: await this.staysQueryService.findAll(query) };
  }

  @Get('me/current')
  @ApiOperation({ summary: 'Stay aktif saya — TENANT' })
  @Roles(UserRole.TENANT)
  async meCurrent(@CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay aktif berhasil diambil', data: await this.staysQueryService.findCurrentForTenant(user) };
  }

  @Post()
  @ApiOperation({ summary: 'Buat stay baru — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async create(@Body() dto: CreateStayDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay berhasil dibuat', data: await this.staysService.create(dto, user) };
  }

  // F2-3b: daftar refund kalah-cepat menunggu proses (rute statik SEBELUM :id).
  @Get('loss-refunds/pending')
  @ApiOperation({ summary: 'Daftar refund kalah-cepat pending — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async pendingLossRefunds() {
    return { message: 'Daftar refund kalah-cepat berhasil diambil', data: await this.staysService.listPendingLossRefunds() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail stay — semua role' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF, UserRole.TENANT)
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail stay berhasil diambil', data: await this.staysQueryService.findOne(id, user) };
  }

  @Get(':id/invoice-suggestion')
  @ApiOperation({ summary: 'Saran invoice untuk stay — OWNER/ADMIN/STAFF' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async getInvoiceSuggestion(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Saran invoice berhasil diambil',
      data: await this.staysQueryService.getInvoiceSuggestion(id, user),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Perbarui stay — OWNER/ADMIN/STAFF' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStayDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay berhasil diperbarui', data: await this.staysService.update(id, dto, user) };
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Selesaikan stay — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async complete(@Param('id', ParseIntPipe) id: number, @Body() dto: CompleteStayDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay berhasil diselesaikan', data: await this.staysService.complete(id, dto, user) };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Batalkan stay — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelStayDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay berhasil dibatalkan', data: await this.staysService.cancel(id, dto, user) };
  }

  // F2-16 (D-17): proses deposit & refund settlement (PARTIAL/FULL/FORFEIT) — OWNER-only.
  @Post(':id/deposit/process')
  @ApiOperation({ summary: 'Proses deposit/refund settlement — OWNER-only' })
  @Roles(UserRole.OWNER)
  async processDeposit(@Param('id', ParseIntPipe) id: number, @Body() dto: ProcessDepositDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Deposit berhasil diproses', data: await this.staysService.processDeposit(id, dto, user) };
  }

  // F2-3b: proses refund kalah-cepat (tandai sudah dikembalikan + bukti) — OWNER-only (D-17).
  @Post(':id/loss-refund/process')
  @ApiOperation({ summary: 'Proses refund kalah-cepat — OWNER-only' })
  @Roles(UserRole.OWNER)
  async processLossRefund(@Param('id', ParseIntPipe) id: number, @Body() dto: ProcessLossRefundDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Refund kalah-cepat berhasil diproses', data: await this.staysService.processLossRefund(id, dto, user) };
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Perpanjang stay — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async renewStay(@Param('id', ParseIntPipe) id: number, @Body() dto: RenewStayDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Stay berhasil diperpanjang', data: await this.staysService.renewStay(id, dto, user) };
  }

  // F3-14/F3-16: paksa-checkout admin (overstay nunggak / tenant kabur) + settle deposit -> AR. OWNER-only.
  @Post(':id/forced-checkout')
  @ApiOperation({ summary: 'Paksa checkout (overstay/kabur) — OWNER-only' })
  @Roles(UserRole.OWNER)
  async forcedCheckout(@Param('id', ParseIntPipe) id: number, @Body() dto: ForcedCheckoutDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Forced checkout berhasil diproses', data: await this.staysService.forcedCheckout(id, dto, user) };
  }

  // F3-15: tandai barang tenant pasca-checkout (CLAIMED/ABANDONED).
  @Post(':id/belongings')
  @ApiOperation({ summary: 'Tandai status barang pasca-checkout — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async markBelongings(@Param('id', ParseIntPipe) id: number, @Body() dto: MarkBelongingsDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Status barang tenant berhasil diperbarui', data: await this.staysService.markBelongings(id, dto, user) };
  }
}
