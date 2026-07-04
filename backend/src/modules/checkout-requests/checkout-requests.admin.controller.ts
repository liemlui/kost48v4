import {
  BadRequestException,
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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Daftar permintaan checkout — filter status/stay' })
  @ApiQuery({ name: 'status', enum: CheckoutRequestStatus, required: false })
  @ApiQuery({ name: 'stayId', type: Number, required: false })
  async findAll(
    @Query('status') status?: CheckoutRequestStatus,
    @Query('stayId') stayId?: string,
  ) {
    const parsedStayId = this.parseOptionalStayId(stayId);

    return this.checkoutRequestsService.findAll(status, parsedStayId);
  }

  private parseOptionalStayId(stayId?: string): number | undefined {
    if (stayId === undefined || stayId === null || stayId === '') {
      return undefined;
    }

    const parsed = Number(stayId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('stayId harus berupa angka positif');
    }

    return parsed;
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Setujui permintaan checkout' })
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
  @ApiOperation({ summary: 'Tolak permintaan checkout' })
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