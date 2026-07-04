import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CancelInvoiceDto, CreateInvoiceDto, CreateInvoiceLineDto, CreateInvoiceWithLinesAndIssueDto, UpdateInvoiceDto, UpdateInvoiceLineDto } from './dto/invoice.dto';
import { InvoicesQueryDto } from './dto/invoices-query.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar invoice — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async findAll(@Query() query: InvoicesQueryDto) {
    return { message: 'Daftar invoice berhasil diambil', data: await this.invoicesService.findAll(query) };
  }

  @Get('my')
  @ApiOperation({ summary: 'Daftar invoice saya — TENANT' })
  @Roles(UserRole.TENANT)
  async mine(@CurrentUser() user: CurrentUserPayload, @Query() query: InvoicesQueryDto) {
    return { message: 'Daftar invoice saya berhasil diambil', data: await this.invoicesService.findMine(user, query) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail invoice — OWNER/ADMIN/TENANT' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TENANT)
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail invoice berhasil diambil', data: await this.invoicesService.findOne(id, user) };
  }

  @Post()
  @ApiOperation({ summary: 'Buat draft invoice — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Invoice draft berhasil dibuat', data: await this.invoicesService.create(dto, user) };
  }


  @Post('create-with-lines-and-issue')
  @ApiOperation({ summary: 'Buat invoice + lines + terbitkan — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async createWithLinesAndIssue(@Body() dto: CreateInvoiceWithLinesAndIssueDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Invoice berhasil dibuat dan diterbitkan', data: await this.invoicesService.createWithLinesAndIssue(dto, user) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Perbarui invoice — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInvoiceDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Invoice berhasil diperbarui', data: await this.invoicesService.update(id, dto, user) };
  }

  @Post(':id/lines')
  @ApiOperation({ summary: 'Tambah line item ke invoice — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async addLine(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateInvoiceLineDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail invoice berhasil ditambahkan', data: await this.invoicesService.addLine(id, dto, user) };
  }

  @Patch(':id/lines/:lineId')
  @ApiOperation({ summary: 'Perbarui line item invoice — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async updateLine(@Param('id', ParseIntPipe) id: number, @Param('lineId', ParseIntPipe) lineId: number, @Body() dto: UpdateInvoiceLineDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail invoice berhasil diperbarui', data: await this.invoicesService.updateLine(id, lineId, dto, user) };
  }

  @Delete(':id/lines/:lineId')
  @ApiOperation({ summary: 'Hapus line item invoice — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async removeLine(@Param('id', ParseIntPipe) id: number, @Param('lineId', ParseIntPipe) lineId: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Detail invoice berhasil dihapus', data: await this.invoicesService.removeLine(id, lineId, user) };
  }

  @Post(':id/issue')
  @ApiOperation({ summary: 'Terbitkan invoice — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async issue(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Invoice berhasil diterbitkan', data: await this.invoicesService.issue(id, user) };
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Batalkan invoice — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelInvoiceDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Invoice berhasil dibatalkan', data: await this.invoicesService.cancel(id, dto, user) };
  }
}
