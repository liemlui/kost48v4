import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { CreateCheckoutRequestDto } from './dto/create-checkout-request.dto';
import { CheckoutRequestsService } from './checkout-requests.service';

@ApiTags('tenant/checkout-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TENANT)
@Controller('tenant/checkout-requests')
export class CheckoutRequestsTenantController {
  constructor(
    private readonly checkoutRequestsService: CheckoutRequestsService,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateCheckoutRequestDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return {
      message: 'Permintaan checkout berhasil diajukan',
      data: await this.checkoutRequestsService.createRequest(dto, user),
    };
  }

  @Get('my')
  async findMine(@CurrentUser() user: CurrentUserPayload) {
    return {
      message: 'Daftar permintaan checkout berhasil diambil',
      data: await this.checkoutRequestsService.findMine(user),
    };
  }
}