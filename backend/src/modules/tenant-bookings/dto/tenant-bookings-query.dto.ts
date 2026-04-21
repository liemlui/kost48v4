import { IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class TenantBookingsQueryDto extends PaginationQueryDto {
  @IsOptional()
  search?: string;
}
