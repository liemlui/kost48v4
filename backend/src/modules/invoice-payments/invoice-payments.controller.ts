import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateInvoicePaymentDto, UpdateInvoicePaymentDto } from './dto/invoice-payment.dto';
import { InvoicePaymentsQueryDto } from './dto/invoice-payments-query.dto';
import { InvoicePaymentsService } from './invoice-payments.service';

@ApiTags('invoice-payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoice-payments')
export class InvoicePaymentsController {
  constructor(private readonly invoicePaymentsService: InvoicePaymentsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query() query: InvoicePaymentsQueryDto) {
    return { message: 'Daftar pembayaran berhasil diambil', data: await this.invoicePaymentsService.findAll(query) };
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return { message: 'Detail pembayaran berhasil diambil', data: await this.invoicePaymentsService.findOne(id) };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  async create(@Body() dto: CreateInvoicePaymentDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Pembayaran berhasil dicatat', data: await this.invoicePaymentsService.create(dto, user) };
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInvoicePaymentDto, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Pembayaran berhasil diperbarui', data: await this.invoicePaymentsService.update(id, dto, user) };
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUserPayload) {
    return { message: 'Pembayaran berhasil dihapus', data: await this.invoicePaymentsService.remove(id, user) };
  }
}
