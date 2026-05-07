import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UserRole,
  CheckoutRequestStatus,
} from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { ApproveCheckoutRequestDto } from './dto/approve-checkout-request.dto';
import { RejectCheckoutRequestDto } from './dto/reject-checkout-request.dto';
import { CheckoutRequestsService } from './checkout-requests.service';

@ApiTags('admin/checkout-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('admin/checkout-requests')
export class CheckoutRequestsAdminController {
  constructor(
    private readonly checkoutRequestsService: CheckoutRequestsService,
  ) {}

  @Get()
  @ApiQuery({ name: 'status', enum: CheckoutRequestStatus, required: false })
  async findAll(@Query('status') status?: CheckoutRequestStatus) {
    return {
      message: 'Daftar permintaan checkout berhasil diambil',
      data: await this.checkoutRequestsService.findAll(status),
    };
  }

  @Patch(':id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveCheckoutRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return {
      message: 'Permintaan checkout disetujui',
      data: await this.checkoutRequestsService.approveRequest(id, dto, user),
    };
  }

  @Patch(':id/reject')
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectCheckoutRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return {
      message: 'Permintaan checkout ditolak',
      data: await this.checkoutRequestsService.rejectRequest(id, dto, user),
    };
  }
}