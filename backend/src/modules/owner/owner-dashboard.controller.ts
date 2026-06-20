import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OwnerDashboardService } from './owner-dashboard.service';

class OwnerDashboardAggregateQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(2020) @Max(2100)
  year?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(12)
  month?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(24)
  trendMonths?: number;
}

@ApiTags('owner-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('owner/dashboard')
export class OwnerDashboardController {
  constructor(private readonly service: OwnerDashboardService) {}

  @Get('aggregate')
  @Roles(UserRole.OWNER)
  async aggregate(@Query() query: OwnerDashboardAggregateQueryDto) {
    const data = await this.service.aggregate(query.year, query.month, query.trendMonths);
    return { message: 'Agregat dashboard owner berhasil diambil', data };
  }
}
