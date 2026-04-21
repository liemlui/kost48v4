import { IsBooleanString, IsDateString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class WifiSalesQueryDto extends PaginationQueryDto {
  @IsOptional() @IsBooleanString() isActive?: string;
  @IsOptional() @IsDateString() saleDateFrom?: string;
  @IsOptional() @IsDateString() saleDateTo?: string;
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() packageName?: string;
}
