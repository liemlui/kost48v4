import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReminderPreviewService } from './reminder-preview.service';

@ApiTags('admin-reminder-preview')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('admin/reminders/preview')
export class ReminderPreviewController {
  constructor(private readonly reminderPreviewService: ReminderPreviewService) {}

  @Get('booking-expiry')
  @ApiOperation({ summary: 'Pratinjau pengingat booking hampir kedaluwarsa' })
  async getBookingExpiry() {
    return {
      message: 'Pratinjau pengingat booking hampir kadaluarsa berhasil diambil',
      data: await this.reminderPreviewService.getBookingExpiryPreview(),
    };
  }

  @Get('invoice-due')
  @ApiOperation({ summary: 'Pratinjau pengingat invoice jatuh tempo' })
  async getInvoiceDue() {
    return {
      message: 'Pratinjau pengingat invoice jatuh tempo berhasil diambil',
      data: await this.reminderPreviewService.getInvoiceDuePreview(),
    };
  }

  @Get('invoice-overdue')
  @ApiOperation({ summary: 'Pratinjau pengingat invoice terlambat' })
  async getInvoiceOverdue() {
    return {
      message: 'Pratinjau pengingat invoice terlambat berhasil diambil',
      data: await this.reminderPreviewService.getInvoiceOverduePreview(),
    };
  }

  @Get('checkout')
  @ApiOperation({ summary: 'Pratinjau pengingat checkout' })
  async getCheckout() {
    return {
      message: 'Pratinjau pengingat checkout berhasil diambil',
      data: await this.reminderPreviewService.getCheckoutPreview(),
    };
  }

  @Get('all')
  @ApiOperation({ summary: 'Pratinjau semua pengingat' })
  async getAll() {
    return {
      message: 'Pratinjau semua pengingat berhasil diambil',
      data: await this.reminderPreviewService.getAllPreviews(),
    };
  }
}
