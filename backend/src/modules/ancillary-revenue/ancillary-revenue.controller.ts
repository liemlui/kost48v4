import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AncillaryRevenueService } from './ancillary-revenue.service';

@ApiTags('ancillary-revenue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ancillary-revenue')
export class AncillaryRevenueController {
  constructor(private readonly service: AncillaryRevenueService) {}

  @Get('streams')
  @ApiOperation({ summary: 'Daftar revenue stream tambahan — OWNER/ADMIN' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getStreams() {
    const data = await this.service.getStreams();
    return { message: 'Revenue streams berhasil diambil', data };
  }
}
